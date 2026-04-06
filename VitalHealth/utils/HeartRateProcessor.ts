// utils/HeartRateProcessor.ts
// ─────────────────────────────────────────────────────────────────────────────
// PPG processor. Receives raw R/G/B pixel averages per frame.
//
// How the camera screen feeds this:
//   processor.addSample(Date.now(), avgR, avgG, avgB)
//
// R/G/B must come from actual decoded pixel values, NOT JPEG scan bytes.
// See heart-scanner.tsx — it uses expo-gl or canvas to decode a frame
// and compute channel averages before calling here.
//
// Pipeline:
//   R channel → DC removal → bandpass → peak detection  ─┐
//                                      └→ FFT check       ├→ BPM + confidence
// ─────────────────────────────────────────────────────────────────────────────

import {
  createBandpass,
  estimateFps,
  peakBpmFromSpectrum,
  resample,
  zscore,
} from './heartRateDSP';

const MIN_BPM       = 40;
const MAX_BPM       = 210;
const MIN_IBI_MS    = Math.round(60000 / MAX_BPM); // 285 ms
const MAX_IBI_MS    = Math.round(60000 / MIN_BPM); // 1500 ms
const REFRACTORY_MS = MIN_IBI_MS;
const CALIBRATION_S = 6;   // seconds before first BPM attempt
const BUFFER_S      = 12;  // rolling window length

// Finger detection — loose thresholds with hysteresis for mid-range devices
const FINGER_R_MIN      = 80;
const FINGER_SCORE_MIN  = 25;  // R - mean(G,B)
const FINGER_SCORE_OFF  = 15;  // hysteresis: must drop below this to lose finger

export type BpmCallback    = (bpm: number, confidence: number) => void;
export type StatusCallback = (status: string) => void;
export type SignalCallback = (signal: Float32Array) => void;

// Which BPM method produced the last accepted reading.
// Used to detect method switches and flush the smoother.
type BpmMethod = 'ibi' | 'fft' | 'both';

export class HeartRateProcessor {
  onBpmUpdate:    BpmCallback    = () => {};
  onStatusUpdate: StatusCallback = () => {};
  onSignalUpdate: SignalCallback = () => {};

  private rawR:       number[] = [];
  private filtered:   number[] = [];
  private timestamps: number[] = [];

  private currentFps          = 10;
  private dcAlpha             = 0.93;
  private dcMean              = 0;
  private bpf                 = createBandpass(10);
  private lastFpsForFilter    = 0;

  private peaks:     number[] = [];
  private lastPeakTs = 0;

  private fingerOn    = false;
  private sampleCount = 0;

  // Smoother — flushed when the contributing method changes
  private bpmHistory:    number[]   = [];
  private lastBpmMethod: BpmMethod | null = null;
  private currentBpm:    number | null    = null;

  // ── Public entry point ─────────────────────────────────────────────────
  /**
   * Call once per decoded camera frame.
   * r, g, b are average pixel values in [0, 255] for the frame.
   */
  addSample(timestampMs: number, r: number, g: number, b: number) {
    this.sampleCount++;

    // ── 1. Finger detection (hysteresis) ──────────────────────────────
    const score  = r - (g + b) / 2;
    const wasOn  = this.fingerOn;

    if (!this.fingerOn) {
      this.fingerOn = r > FINGER_R_MIN && score > FINGER_SCORE_MIN;
    } else {
      this.fingerOn = !(r < FINGER_R_MIN * 0.7 || score < FINGER_SCORE_OFF);
    }

    if (!this.fingerOn) {
      if (this.sampleCount > 5) this.onStatusUpdate('👆 Cover camera fully with fingertip');
      if (wasOn) this.softReset();
      return;
    }
    if (!wasOn) {
      this.onStatusUpdate('🔴 Finger detected — hold still…');
      this.dcMean = r; // seed tracker to skip long transient
    }

    // ── 2. Update FPS estimate ────────────────────────────────────────
    // Store timestamp now; update fps every 5 frames after we have 10.
    this.timestamps.push(timestampMs);
    const tLen = this.timestamps.length;
    if (tLen >= 10 && tLen % 5 === 0) this.updateFps();

    // ── 3. DC removal ─────────────────────────────────────────────────
    // dcAlpha targets a ~1.5s time constant at any fps:
    //   alpha = exp(-1 / (fps * TC))
    this.dcMean = this.dcAlpha * this.dcMean + (1 - this.dcAlpha) * r;
    const acR   = r - this.dcMean;

    // ── 4. Bandpass filter ────────────────────────────────────────────
    const filt = this.bpf.process(acR);

    // ── 5. Store ──────────────────────────────────────────────────────
    this.rawR.push(r);
    this.filtered.push(filt);

    // Trim rolling buffer — keyed off fps so it's always BUFFER_S seconds
    const maxSamples = Math.round(this.currentFps * BUFFER_S);
    if (this.rawR.length > maxSamples) {
      this.rawR.shift();
      this.filtered.shift();
      this.timestamps.shift();
      // After trim, lengths are equal — this is the invariant we rely on.
    }

    // ── 6. Waveform (z-scored last 3s) ───────────────────────────────
    if (this.filtered.length >= 4) {
      const n       = Math.max(4, Math.round(this.currentFps * 3));
      const display = zscore(this.filtered.slice(-n));
      this.onSignalUpdate(new Float32Array(display));
    }

    // ── 7. Peak detection ─────────────────────────────────────────────
    this.detectPeak(filt, timestampMs);

    // ── 8. BPM ────────────────────────────────────────────────────────
    const minSamples = Math.round(this.currentFps * CALIBRATION_S);
    if (this.filtered.length >= minSamples) {
      this.computeBpm();
    } else {
      const pct = Math.round((this.filtered.length / minSamples) * 100);
      this.onStatusUpdate(`📊 Calibrating… ${pct}%`);
    }
  }

  // ── Update fps + rebuild fps-dependent objects ─────────────────────────
  private updateFps() {
    // Use only the timestamps still in the rolling buffer
    const fps = estimateFps(this.timestamps.slice(-30));
    if (fps < 1 || fps > 60) return;

    this.currentFps = fps;
    const TC        = 1.5;
    this.dcAlpha    = Math.exp(-1 / (fps * TC));

    if (Math.abs(fps - this.lastFpsForFilter) > 0.5) {
      this.bpf = createBandpass(fps);
      this.lastFpsForFilter = fps;
      // Intentionally NOT resetting filter state — brief transient is
      // less disruptive than losing accumulated history.
    }
  }

  // ── Peak detector (prominence-based) ──────────────────────────────────
  private detectPeak(value: number, ts: number) {
    const N = this.filtered.length;
    if (N < 5) return;

    const winN   = Math.max(5, Math.round(this.currentFps * 2));
    const window = this.filtered.slice(-Math.min(winN, N));
    const minV   = Math.min(...window);
    const maxV   = Math.max(...window);
    const range  = maxV - minV;
    if (range < 1e-4) return;

    const p2 = this.filtered[N - 3];
    const p1 = this.filtered[N - 2]; // candidate
    const c  = this.filtered[N - 1];
    if (!(p1 > p2 && p1 > c)) return;
    if (ts - this.lastPeakTs < REFRACTORY_MS) return;

    // Prominence: candidate in upper 35% of local range (sign-invariant)
    if ((p1 - minV) / range < 0.35) return;

    this.peaks.push(ts);
    this.lastPeakTs = ts;
    this.peaks = this.peaks.filter(p => p > ts - 20000);
  }

  // ── Dual BPM: IBI + FFT, with method-aware smoother ───────────────────
  private computeBpm() {
    // ── IBI method ──────────────────────────────────────────────────────
    let ibiBpm = 0, ibiConf = 0;
    if (this.peaks.length >= 4) {
      const ibis: number[] = [];
      for (let i = 1; i < this.peaks.length; i++) {
        const d = this.peaks[i] - this.peaks[i - 1];
        if (d >= MIN_IBI_MS && d <= MAX_IBI_MS) ibis.push(d);
      }
      if (ibis.length >= 3) {
        const sorted = [...ibis].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const raw    = Math.round(60000 / median);
        if (raw >= MIN_BPM && raw <= MAX_BPM) {
          ibiBpm = raw;
          const mean  = ibis.reduce((a, b) => a + b, 0) / ibis.length;
          const std   = Math.sqrt(ibis.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / ibis.length);
          const reg   = Math.max(0, 1 - (std / mean) * 3);
          const pcnt  = Math.min(1, this.peaks.length / 8);
          ibiConf = reg * 0.7 + pcnt * 0.3;
        }
      }
    }

    // ── FFT method ──────────────────────────────────────────────────────
    let fftBpm = 0, fftConf = 0;
    const fftWindow = Math.round(this.currentFps * 6);

    // filtered and timestamps are kept in sync by addSample's trim logic,
    // so slicing the same count from both is safe.
    if (this.filtered.length >= fftWindow && this.timestamps.length >= fftWindow) {
      const sigSlice = this.filtered.slice(-fftWindow);
      const tsSlice  = this.timestamps.slice(-fftWindow);
      const targetFps = Math.max(1, Math.round(this.currentFps));
      const resampled = resample(sigSlice, tsSlice, targetFps);
      const { bpm, confidence } = peakBpmFromSpectrum(resampled, targetFps);
      if (bpm >= MIN_BPM && bpm <= MAX_BPM) { fftBpm = bpm; fftConf = confidence; }
    }

    // ── Combine ──────────────────────────────────────────────────────────
    let finalBpm: number;
    let finalConf: number;
    let method: BpmMethod;

    if (ibiBpm > 0 && fftBpm > 0) {
      const agree = Math.abs(ibiBpm - fftBpm) <= 5;
      if (agree) {
        finalBpm  = Math.round((ibiBpm + fftBpm) / 2);
        finalConf = Math.min(1, (ibiConf + fftConf) / 2 + 0.10);
        method    = 'both';
      } else {
        // Disagree — use higher-confidence method, penalise
        if (ibiConf >= fftConf) { finalBpm = ibiBpm; finalConf = ibiConf * 0.85; method = 'ibi'; }
        else                    { finalBpm = fftBpm; finalConf = fftConf * 0.85; method = 'fft'; }
      }
    } else if (ibiBpm > 0) { finalBpm = ibiBpm; finalConf = ibiConf; method = 'ibi'; }
    else if  (fftBpm > 0)  { finalBpm = fftBpm; finalConf = fftConf; method = 'fft'; }
    else return;

    // ── Method-aware smoother ────────────────────────────────────────────
    // If the contributing method changed, flush history so stale readings
    // from the previous method don't contaminate the weighted average.
    if (this.lastBpmMethod !== null && this.lastBpmMethod !== method) {
      // Keep only the single most recent reading to preserve continuity
      this.bpmHistory = this.bpmHistory.slice(-1);
    }
    this.lastBpmMethod = method;

    this.bpmHistory.push(finalBpm);
    if (this.bpmHistory.length > 6) this.bpmHistory.shift();

    const weights   = this.bpmHistory.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const smoothBpm = Math.round(
      this.bpmHistory.reduce((sum, b, i) => sum + b * weights[i], 0) / weightSum,
    );

    this.currentBpm = smoothBpm;
    this.onBpmUpdate(smoothBpm, Math.min(1, finalConf));

    if      (finalConf > 0.75) this.onStatusUpdate(`✅ Good signal — ${smoothBpm} BPM`);
    else if (finalConf > 0.45) this.onStatusUpdate('🟡 Reading… hold finger steady');
    else                       this.onStatusUpdate('🔴 Weak signal — press finger firmly');
  }

  // ── Soft reset (finger lifted) ─────────────────────────────────────────
  private softReset() {
    this.rawR = []; this.filtered = []; this.timestamps = [];
    this.peaks = []; this.bpmHistory = [];
    this.currentBpm = null; this.lastBpmMethod = null;
    this.lastPeakTs = 0; this.dcMean = 0;
    this.bpf = createBandpass(this.currentFps);
    this.lastFpsForFilter = this.currentFps;
  }

  // ── Full reset ────────────────────────────────────────────────────────
  reset() {
    this.softReset();
    this.sampleCount = 0; this.fingerOn = false;
    this.currentFps = 10; this.dcAlpha = 0.93;
    this.bpf = createBandpass(10); this.lastFpsForFilter = 0;
  }

  getBpm()         { return this.currentBpm; }
  getSampleCount() { return this.sampleCount; }
  isFingerOn()     { return this.fingerOn; }
  getMeasuredFps() { return this.currentFps; }
}