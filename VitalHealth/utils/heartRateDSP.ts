// utils/heartRateDSP.ts
// ─────────────────────────────────────────────────────────────────────────────
// DSP primitives for PPG heart rate detection.
// All fps-dependent — nothing hardcoded for 30fps.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Biquad filter — transposed Direct Form II ────────────────────────────
export class BiquadFilter {
  private b0 = 1; private b1 = 0; private b2 = 0;
  private a1 = 0; private a2 = 0;
  private z1 = 0; private z2 = 0;

  setCoefficients(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1  = this.b1 * x - this.a1 * y + this.z2;
    this.z2  = this.b2 * x - this.a2 * y;
    return y;
  }

  reset() { this.z1 = 0; this.z2 = 0; }
}

export class CascadedBiquad {
  constructor(private sections: BiquadFilter[]) {}
  process(x: number): number { return this.sections.reduce((v, f) => f.process(v), x); }
  reset() { this.sections.forEach(f => f.reset()); }
}

// ─── Runtime coefficient design (bilinear transform) ─────────────────────
function hp1Coeffs(cutHz: number, fps: number): [number,number,number,number,number,number] {
  const K  = Math.tan(Math.PI * cutHz / fps);
  const a0 = K + 1;
  return [1, -1, 0, a0, K - 1, 0];
}

function lp1Coeffs(cutHz: number, fps: number): [number,number,number,number,number,number] {
  const K  = Math.tan(Math.PI * cutHz / fps);
  const a0 = K + 1;
  return [K, K, 0, a0, K - 1, 0];
}

function makeFilter(coeffs: [number,number,number,number,number,number]): BiquadFilter {
  const f = new BiquadFilter();
  f.setCoefficients(...coeffs);
  return f;
}

/**
 * Bandpass for PPG. Pass actual measured fps.
 * Default band: 0.5–3.5 Hz = 30–210 BPM.
 */
export function createBandpass(fps: number, loHz = 0.5, hiHz = 3.5): CascadedBiquad {
  const nyq = fps / 2;
  const lo  = Math.min(loHz, nyq * 0.45);
  const hi  = Math.min(hiHz, nyq * 0.45);
  return new CascadedBiquad([makeFilter(hp1Coeffs(lo, fps)), makeFilter(lp1Coeffs(hi, fps))]);
}

/** Low-pass smoother for waveform display. */
export function createLowpass(fps: number, cutHz = 4): CascadedBiquad {
  const cut = Math.min(cutHz, fps / 2 * 0.45);
  return new CascadedBiquad([makeFilter(lp1Coeffs(cut, fps))]);
}

// ─── Resampling ───────────────────────────────────────────────────────────
/**
 * Linear-interpolation resample to a uniform grid.
 * values and timestamps MUST be the same length — enforced here.
 * @returns uniform samples at targetFps
 */
export function resample(values: number[], timestamps: number[], targetFps: number): number[] {
  // Guard: lengths must match
  const len = Math.min(values.length, timestamps.length);
  if (len < 2) return values.slice(0, len);

  const v  = values.slice(0, len);
  const ts = timestamps.slice(0, len);
  const dt = 1000 / targetFps;
  const out: number[] = [];

  for (let t = ts[0]; t <= ts[len - 1]; t += dt) {
    let hi = 1;
    while (hi < len - 1 && ts[hi] < t) hi++;
    const lo   = hi - 1;
    const span = ts[hi] - ts[lo];
    if (span < 1e-6) {
      out.push(v[lo]);
    } else {
      out.push(v[lo] + ((t - ts[lo]) / span) * (v[hi] - v[lo]));
    }
  }

  return out;
}

// ─── FFT ──────────────────────────────────────────────────────────────────
export function nextPow2(n: number): number {
  let p = 1; while (p < n) p <<= 1; return p;
}

export function hannWindow(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1))));
}

/** In-place Cooley-Tukey radix-2 DIT FFT. Length must be power of 2. */
export function fft(re: number[], im: number[]) {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = -Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i+k], uIm = im[i+k];
        const vRe = re[i+k+len/2]*cRe - im[i+k+len/2]*cIm;
        const vIm = re[i+k+len/2]*cIm + im[i+k+len/2]*cRe;
        re[i+k] = uRe+vRe; im[i+k] = uIm+vIm;
        re[i+k+len/2] = uRe-vRe; im[i+k+len/2] = uIm-vIm;
        [cRe, cIm] = [cRe*wRe - cIm*wIm, cRe*wIm + cIm*wRe];
      }
    }
  }
}

/** Power spectrum (re²+im²). Signal windowed with Hann before transform. */
export function powerSpectrum(signal: number[]): number[] {
  const n   = nextPow2(signal.length);
  const win = hannWindow(signal.length);
  const re  = new Array<number>(n).fill(0);
  const im  = new Array<number>(n).fill(0);
  signal.forEach((v, i) => { re[i] = v * win[i]; });
  fft(re, im);
  return Array.from({ length: n / 2 }, (_, i) => re[i] ** 2 + im[i] ** 2);
}

/** Convert FFT bin index to BPM. */
export function binToBpm(bin: number, fps: number, fftSize: number): number {
  return (bin * fps / fftSize) * 60;
}

/**
 * Find dominant BPM from power spectrum.
 * Confidence = spectral concentration (peak power / total band power).
 */
export function peakBpmFromSpectrum(
  signal: number[], fps: number, minBpm = 40, maxBpm = 210,
): { bpm: number; confidence: number } {
  if (signal.length < 4) return { bpm: 0, confidence: 0 };
  const n      = nextPow2(signal.length);
  const ps     = powerSpectrum(signal);
  const minBin = Math.ceil(minBpm  / 60 * n / fps);
  const maxBin = Math.floor(maxBpm / 60 * n / fps);
  if (minBin >= maxBin || maxBin >= ps.length) return { bpm: 0, confidence: 0 };

  let peakBin = minBin;
  for (let i = minBin + 1; i <= maxBin; i++) if (ps[i] > ps[peakBin]) peakBin = i;

  const bpm       = Math.round(binToBpm(peakBin, fps, n));
  const bandPower = ps.slice(minBin, maxBin + 1).reduce((a, b) => a + b, 0);
  const confidence = bandPower > 0 ? Math.min(1, ps[peakBin] / bandPower) : 0;
  return { bpm, confidence };
}

// ─── Signal utilities ─────────────────────────────────────────────────────
/** Z-score normalisation. Returns original if signal is flat. */
export function zscore(sig: number[]): number[] {
  const mu = sig.reduce((a, b) => a + b, 0) / sig.length;
  const sd = Math.sqrt(sig.map(v => (v - mu) ** 2).reduce((a, b) => a + b, 0) / sig.length);
  if (sd < 1e-6) return [...sig];
  return sig.map(v => (v - mu) / sd);
}

/**
 * Estimate fps from capture timestamps (ms).
 * Returns median inter-frame rate — robust to occasional slow frames.
 */
export function estimateFps(timestamps: number[]): number {
  if (timestamps.length < 2) return 10;
  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const dt = timestamps[i] - timestamps[i - 1];
    if (dt > 10 && dt < 2000) deltas.push(1000 / dt);
  }
  if (deltas.length === 0) return 10;
  const sorted = [...deltas].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}