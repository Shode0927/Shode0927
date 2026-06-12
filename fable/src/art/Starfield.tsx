// 表紙の星空。
// 端末を傾けると星layerごとに視差で揺れ、ときどき星が流れる。

import React, { useEffect, useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';
import { mulberry32, range, Rng } from '../engine/prng';

interface Props {
  width: number;
  height: number;
}

const SKY: [string, string, string] = ['#05060f', '#0c1126', '#1c2342'];
const STAR = '#e9ecff';

function starLayerPath(rng: Rng, w: number, h: number, count: number, maxR: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = range(rng, 0.4, maxR);
    parts.push(`M ${x} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`);
  }
  return parts.join(' ');
}

export default function Starfield({ width: w, height: h }: Props) {
  const layers = useMemo(() => {
    const rng = mulberry32(0x517a5e);
    return [
      { path: starLayerPath(rng, w, h, 70, 1.0), depth: 0.35, opacity: 0.5 },
      { path: starLayerPath(rng, w, h, 45, 1.5), depth: 0.7, opacity: 0.75 },
      { path: starLayerPath(rng, w, h, 22, 2.1), depth: 1.15, opacity: 1.0 },
    ];
  }, [w, h]);

  // ---- 傾きによる視差 ----
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    let mounted = true;
    (async () => {
      try {
        const { granted } = await DeviceMotion.requestPermissionsAsync();
        if (!granted || !mounted) return;
        DeviceMotion.setUpdateInterval(80);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          const gx = Math.max(-0.6, Math.min(0.6, rotation.gamma ?? 0));
          const gy = Math.max(-0.6, Math.min(0.6, (rotation.beta ?? 0) - 0.8));
          tiltX.value = withTiming(gx * 30, { duration: 120 });
          tiltY.value = withTiming(gy * 18, { duration: 120 });
        });
      } catch {
        // センサーが使えない環境では、星は静かに留まる
      }
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [tiltX, tiltY]);

  const twinkle = useSharedValue(0.4);
  useEffect(() => {
    twinkle.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [twinkle]);

  return (
    <Canvas style={{ width: w, height: h }}>
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={SKY} />
      </Rect>

      {layers.map((layer, i) => (
        <ParallaxLayer key={i} layer={layer} tiltX={tiltX} tiltY={tiltY} twinkle={twinkle} index={i} />
      ))}

      <ShootingStar w={w} h={h} y0={h * 0.18} dir={1} period={6800} delay={2200} />
      <ShootingStar w={w} h={h} y0={h * 0.34} dir={-1} period={10400} delay={6400} />

      {/* 地平の仄明かり */}
      <Rect x={0} y={0} width={w} height={h}>
        <RadialGradient
          c={vec(w * 0.5, h * 1.08)}
          r={h * 0.55}
          colors={['rgba(201, 168, 106, 0.16)', 'transparent']}
        />
      </Rect>
    </Canvas>
  );
}

function ParallaxLayer({
  layer,
  tiltX,
  tiltY,
  twinkle,
  index,
}: {
  layer: { path: string; depth: number; opacity: number };
  tiltX: { value: number };
  tiltY: { value: number };
  twinkle: { value: number };
  index: number;
}) {
  const transform = useDerivedValue(() => [
    { translateX: tiltX.value * layer.depth },
    { translateY: tiltY.value * layer.depth },
  ]);
  const opacity = useDerivedValue(() => {
    const base = layer.opacity;
    const wave = index === 1 ? twinkle.value : 1 - twinkle.value * 0.5;
    return base * (0.55 + wave * 0.45);
  });
  return (
    <Group transform={transform}>
      <Path path={layer.path} color={STAR} opacity={opacity} />
    </Group>
  );
}

function ShootingStar({
  w,
  h,
  y0,
  dir,
  period,
  delay,
}: {
  w: number;
  h: number;
  y0: number;
  dir: 1 | -1;
  period: number;
  delay: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: period })
        ),
        -1
      )
    );
  }, [t, period, delay]);

  const startX = dir === 1 ? -60 : w + 60;
  const travel = (w + 120) * dir;

  const p1 = useDerivedValue(() =>
    vec(startX + travel * t.value, y0 + h * 0.16 * t.value)
  );
  const p2 = useDerivedValue(() =>
    vec(startX + travel * t.value - 70 * dir, y0 + h * 0.16 * t.value - 70 * 0.16)
  );
  const opacity = useDerivedValue(() => Math.sin(Math.min(1, t.value) * Math.PI) * 0.9);

  return (
    <Line p1={p1} p2={p2} color={STAR} strokeWidth={1.6} opacity={opacity}>
      <BlurMask blur={2} style="solid" />
    </Line>
  );
}
