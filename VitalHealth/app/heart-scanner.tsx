// app/heart-scanner.tsx
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { HeartRateProcessor } from '../utils/HeartRateProcessor';

const { width } = Dimensions.get('window');
const WAVE_W = width - 64;
const WAVE_H = 60;

// ── JPEG → R, G, B ────────────────────────────────────────────────────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64T: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) B64T[B64[i]] = i;

function base64ToBytes(b64: string): Uint8Array {
  const s   = (b64.includes(',') ? b64.split(',')[1] : b64).replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let bi = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64T[s[i]] ?? 0, b = B64T[s[i+1]] ?? 0;
    const c = B64T[s[i+2]] ?? 0, d = B64T[s[i+3]] ?? 0;
    if (bi < out.length) out[bi++] = (a << 2) | (b >> 4);
    if (bi < out.length) out[bi++] = ((b & 0xF) << 4) | (c >> 2);
    if (bi < out.length) out[bi++] = ((c & 0x3) << 6) | d;
  }
  return out;
}

let _canvas: any = null, _ctx: any = null;
function getCanvas() {
  try {
    if (!_canvas) {
      _canvas = (document as any).createElement('canvas');
      _canvas.width = _canvas.height = 32;
      _ctx = _canvas.getContext('2d');
    }
    return _canvas && _ctx ? { canvas: _canvas, ctx: _ctx } : null;
  } catch { return null; }
}

function decodeJpegRgb(b64: string): Promise<{ r: number; g: number; b: number } | null> {
  return new Promise(resolve => {
    try {
      const cc = getCanvas();
      if (!cc) { resolve(null); return; }
      const img: any = new (Image as any)();
      img.onload = () => {
        try {
          cc.ctx.drawImage(img, 0, 0, 32, 32);
          const d = cc.ctx.getImageData(0, 0, 32, 32).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
          const n = 32 * 32;
          resolve({ r: r/n, g: g/n, b: b/n });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
    } catch { resolve(null); }
  });
}

function fallbackRgb(b64: string): { r: number; g: number; b: number } {
  try {
    const bytes = base64ToBytes(b64);
    let sos = -1;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xFF && bytes[i+1] === 0xDA) { sos = i; break; }
    }
    const start = sos >= 0 ? sos + 12 : Math.floor(bytes.length * 0.1);
    const end   = Math.min(start + 400, bytes.length - 2);
    let sum = 0, cnt = 0;
    for (let i = start; i < end; i++) {
      if (bytes[i] === 0xFF) { i++; continue; }
      sum += bytes[i]; cnt++;
    }
    const lum = cnt > 0 ? sum / cnt : 0;
    return { r: Math.min(255, lum * 1.6), g: lum * 0.6, b: lum * 0.5 };
  } catch { return { r: 0, g: 0, b: 0 }; }
}

// ── Waveform — imperative, zero re-renders on the parent ──────────────────
// The parent passes a ref. This component registers an updater into it.
// Signal data flows: processor → waveRef.current(data) → setPts (local only)
// The parent tree never re-renders for waveform changes.
const WaveformView = React.memo(({
  updateRef,
}: {
  updateRef: React.MutableRefObject<((d: number[]) => void) | null>;
}) => {
  const [pts, setPts] = useState('');

  useEffect(() => {
    updateRef.current = (data: number[]) => {
      if (data.length < 2) return;
      const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
      const p = data.map((v, i) => {
        const x = (i / (data.length - 1)) * WAVE_W;
        const y = 4 + (1 - (v - min) / range) * (WAVE_H - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      setPts(p);
    };
    return () => { updateRef.current = null; };
  }, [updateRef]);

  if (!pts) return (
    <View style={wv.empty}>
      <Text style={wv.emptyText}>waiting for signal</Text>
    </View>
  );

  return (
    <Svg width={WAVE_W} height={WAVE_H}>
      <Polyline
        points={pts}
        fill="none"
        stroke="#FF3355"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
      />
    </Svg>
  );
});

const wv = StyleSheet.create({
  empty:     { height: WAVE_H, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#2a2a2a', fontSize: 11, letterSpacing: 1.5 },
});

// ── Pulse dot ─────────────────────────────────────────────────────────────
const PulseDot = React.memo(({ bpm, active }: { bpm: number | null; active: boolean }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const loop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loop.current?.stop();
    scale.setValue(1);
    if (!active || !bpm || bpm <= 0) return;
    const interval = Math.max(285, Math.round(60000 / bpm));
    const a = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(scale, { toValue: 1,   duration: interval - 100, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]));
    loop.current = a;
    a.start();
    return () => a.stop();
  }, [bpm, active]);

  return <Animated.View style={[pd.dot, { transform: [{ scale }] }]} />;
});

const pd = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3355' },
});

// ── Screen state (kept minimal — only changes that need a re-render) ───────
interface ScreenState {
  bpm:      number | null;
  status:   string;
  scanning: boolean;
  fingerOn: boolean;
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function HeartScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [s, setS] = useState<ScreenState>({
    bpm:      null,
    status:   'Place finger over camera and flash',
    scanning: false,
    fingerOn: false,
  });

  const cameraRef   = useRef<CameraView>(null);
  const processor   = useRef(new HeartRateProcessor());
  const loopActive  = useRef(false);
  const inFlight    = useRef(false);
  const waveUpdater = useRef<((d: number[]) => void) | null>(null);

  // Wire processor callbacks
  useEffect(() => {
    const p = processor.current;

    // BPM update → re-render (infrequent, every ~2s)
    p.onBpmUpdate = (bpm) => setS(prev => ({ ...prev, bpm }));

    // Status update → re-render only when text changes
    p.onStatusUpdate = (status) =>
      setS(prev => prev.status === status ? prev : { ...prev, status });

    // Signal update → imperative, NO re-render on parent
    p.onSignalUpdate = (signal) => waveUpdater.current?.(Array.from(signal));

    return () => p.reset();
  }, []);

  // ── Capture loop ──────────────────────────────────────────────────────
  const captureLoop = useCallback(async () => {
    while (loopActive.current) {
      if (inFlight.current || !cameraRef.current) {
        await new Promise(r => setTimeout(r, 16));
        continue;
      }
      inFlight.current = true;
      try {
        const photo = await (cameraRef.current as any).takePictureAsync({
          quality:        0.15,
          base64:         true,
          skipProcessing: true,
          exif:           false,
          shutterSound:   false,
        });

        if (photo?.base64 && loopActive.current) {
          const ts  = Date.now();
          let rgb   = await decodeJpegRgb(photo.base64);
          if (!rgb) rgb = fallbackRgb(photo.base64);

          const fingerOn = rgb.r > 80 && (rgb.r - (rgb.g + rgb.b) / 2) > 25;

          // Only trigger re-render if fingerOn state actually changed
          setS(prev => prev.fingerOn === fingerOn ? prev : { ...prev, fingerOn });

          processor.current.addSample(ts, rgb.r, rgb.g, rgb.b);
        }
      } catch {
        await new Promise(r => setTimeout(r, 50));
      } finally {
        inFlight.current = false;
      }
    }
  }, []);

  const startScan = useCallback(async () => {
    if (!permission?.granted) { await requestPermission(); return; }
    processor.current.reset();
    setS({ bpm: null, status: 'Place finger over camera and flash', scanning: true, fingerOn: false });
    loopActive.current = true;
    inFlight.current   = false;
    captureLoop();
  }, [permission, requestPermission, captureLoop]);

  const stopScan = useCallback(() => {
    loopActive.current = false;
    inFlight.current   = false;
    processor.current.reset();
    setS({ bpm: null, status: 'Place finger over camera and flash', scanning: false, fingerOn: false });
  }, []);

  useEffect(() => () => { loopActive.current = false; }, []);

  if (!permission) return <View style={st.root} />;

  if (!permission.granted) return (
    <View style={[st.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
      <Text style={st.permTitle}>Camera access needed</Text>
      <TouchableOpacity style={st.btn} onPress={requestPermission}>
        <Text style={st.btnText}>Allow Camera</Text>
      </TouchableOpacity>
    </View>
  );

  const { bpm, status, scanning, fingerOn } = s;

  return (
    <View style={st.root}>
      {/* Camera runs behind full black overlay — torch fires, no visible flicker */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={scanning}
      />
      {/* Black overlay hides the camera preview entirely */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* Back button */}
      <TouchableOpacity
        style={st.back}
        onPress={() => { stopScan(); router.back(); }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={22} color="#444" />
      </TouchableOpacity>

      {/* Main content */}
      <View style={st.content}>

        {/* BPM display */}
        <View style={st.bpmRow}>
          <PulseDot bpm={bpm} active={scanning && bpm !== null} />
          <Text style={st.bpmNum}>{bpm ?? '--'}</Text>
          <Text style={st.bpmUnit}>BPM</Text>
        </View>

        {/* Status line */}
        <Text style={[st.status, fingerOn && st.statusActive]}>
          {status}
        </Text>

        {/* Waveform — only mounted during scan */}
        {scanning ? (
          <View style={st.waveWrap}>
            <WaveformView updateRef={waveUpdater} />
          </View>
        ) : (
          // Instructions when idle
          <View style={st.instructions}>
            {[
              'Cover the camera lens and flash completely with your fingertip',
              'Press firmly — no light gaps',
              'Hold perfectly still for 15 seconds',
            ].map((t, i) => (
              <View key={i} style={st.step}>
                <Text style={st.stepNum}>{i + 1}</Text>
                <Text style={st.stepText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Start / Stop */}
        <TouchableOpacity
          style={[st.btn, scanning && st.btnStop]}
          onPress={scanning ? stopScan : startScan}
          activeOpacity={0.7}
        >
          <Text style={st.btnText}>{scanning ? 'Stop' : 'Start scan'}</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#000' },
  back:          { position: 'absolute', top: 52, left: 16, zIndex: 10, padding: 8 },
  content:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 28 },
  bpmRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  bpmNum:        { color: '#fff', fontSize: 88, fontWeight: '100', lineHeight: 88, letterSpacing: -3 },
  bpmUnit:       { color: '#333', fontSize: 15, fontWeight: '300', marginBottom: 12, letterSpacing: 1 },
  status:        { color: '#333', fontSize: 13, textAlign: 'center', letterSpacing: 0.3 },
  statusActive:  { color: '#666' },
  waveWrap:      {
    width: WAVE_W,
    height: WAVE_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#111',
  },
  instructions:  { gap: 18, width: '100%' },
  step:          { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  stepNum:       { color: '#FF3355', fontSize: 12, fontWeight: '500', width: 16, marginTop: 2 },
  stepText:      { color: '#333', fontSize: 13, flex: 1, lineHeight: 20 },
  btn:           { backgroundColor: '#FF3355', paddingHorizontal: 44, paddingVertical: 15, borderRadius: 32 },
  btnStop:       { backgroundColor: '#111', borderWidth: StyleSheet.hairlineWidth, borderColor: '#222' },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '400', letterSpacing: 0.5 },
  permTitle:     { color: '#fff', fontSize: 17, marginBottom: 28, textAlign: 'center' },
});