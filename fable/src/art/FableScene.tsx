// 寓話の挿絵 — シードから一枚かぎりの夜景を描く。
// 空・星・月・霧・山並み、そして物語の主を見守る「光の精霊」。
// 全て手続き生成。同じ種からは、必ず同じ夜が描かれる。

import React, { useEffect, useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { mulberry32, range, int, Rng } from '../engine/prng';
import { ThemeId } from '../engine/fable';
import { PALETTES } from '../theme';

interface Props {
  width: number;
  height: number;
  seed: number;
  themeId: ThemeId;
}

interface Star {
  x: number;
  y: number;
  r: number;
  group: 0 | 1;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/** 中点変位法で山の稜線を描く */
function ridgePath(rng: Rng, w: number, h: number, baseY: number, amp: number): string {
  let pts: { x: number; y: number }[] = [
    { x: -24, y: baseY + range(rng, -amp, amp) * 0.5 },
    { x: w + 24, y: baseY + range(rng, -amp, amp) * 0.5 },
  ];
  let a = amp;
  for (let it = 0; it < 6; it++) {
    const next: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      next.push(p);
      next.push({
        x: (p.x + q.x) / 2,
        y: (p.y + q.y) / 2 + range(rng, -a, a),
      });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    a *= 0.55;
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return `${d} L ${w + 24} ${h + 24} L -24 ${h + 24} Z`;
}

export default function FableScene({ width: w, height: h, seed, themeId }: Props) {
  const pal = PALETTES[themeId];

  // ---- シードから一夜ぶんの風景を決める(本文とは別系統の乱数) ----
  const scene = useMemo(() => {
    const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    const stars: Star[] = [];
    const n = int(rng, 60, 90);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rng() * w,
        y: rng() * h * 0.62,
        r: range(rng, 0.5, 1.6),
        group: rng() < 0.5 ? 0 : 1,
      });
    }
    const moon = {
      x: range(rng, 0.18, 0.82) * w,
      y: range(rng, 0.14, 0.3) * h,
      r: range(rng, 0.055, 0.085) * Math.max(w, h),
      phase: range(rng, -0.9, 0.9), // 影のずらし量(満ち欠け)
    };
    const ridges = [
      { d: ridgePath(rng, w, h, h * 0.6, h * 0.075), color: shade(pal.mountain, 1.0) },
      { d: ridgePath(rng, w, h, h * 0.71, h * 0.06), color: shade(pal.mountain, 0.62) },
      { d: ridgePath(rng, w, h, h * 0.82, h * 0.05), color: shade(pal.mountain, 0.34) },
    ];
    const spirit = {
      x: range(rng, 0.28, 0.72) * w,
      y: range(rng, 0.46, 0.56) * h,
      r: range(rng, 7, 10),
      motes: Array.from({ length: 6 }, (_, i) => ({
        radius: range(rng, 16, 34),
        speed: range(rng, 0.5, 1.4) * (rng() < 0.5 ? -1 : 1),
        phase: rng() * Math.PI * 2,
        r: range(rng, 1.2, 2.4),
        wobble: range(rng, 0.3, 0.9),
      })),
    };
    return { stars, moon, ridges, spirit };
  }, [seed, themeId, w, h]);

  // ---- 鼓動 ----
  const clock = useSharedValue(0);
  const twinkleA = useSharedValue(0.85);
  const twinkleB = useSharedValue(0.35);
  const breath = useSharedValue(0);

  useEffect(() => {
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 11000, easing: Easing.linear }),
      -1
    );
    twinkleA.value = withRepeat(
      withTiming(0.3, { duration: 2300, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    twinkleB.value = withRepeat(
      withTiming(0.9, { duration: 3100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    breath.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [clock, twinkleA, twinkleB, breath]);

  const spiritY = useDerivedValue(() => scene.spirit.y + Math.sin(clock.value) * 6);
  const haloR = useDerivedValue(() => scene.spirit.r * (2.6 + breath.value * 1.1));
  const haloOpacity = useDerivedValue(() => 0.22 + breath.value * 0.16);

  const starPaths = useMemo(() => {
    const make = (group: 0 | 1) =>
      scene.stars
        .filter((s) => s.group === group)
        .map((s) => `M ${s.x} ${s.y} a ${s.r} ${s.r} 0 1 0 ${s.r * 2} 0 a ${s.r} ${s.r} 0 1 0 ${-s.r * 2} 0`)
        .join(' ');
    return [make(0), make(1)];
  }, [scene]);

  return (
    <Canvas style={{ width: w, height: h }}>
      {/* 空 */}
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={pal.sky} />
      </Rect>

      {/* 星(二群がそれぞれ瞬く) */}
      <Path path={starPaths[0]} color={pal.star} opacity={twinkleA} />
      <Path path={starPaths[1]} color={pal.star} opacity={twinkleB} />

      {/* 月 — 暈・本体・満ち欠けの影 */}
      <Circle cx={scene.moon.x} cy={scene.moon.y} r={scene.moon.r * 2.1} color={pal.moon} opacity={0.16}>
        <BlurMask blur={22} style="normal" />
      </Circle>
      <Circle cx={scene.moon.x} cy={scene.moon.y} r={scene.moon.r} color={pal.moon} />
      <Circle
        cx={scene.moon.x + scene.moon.phase * scene.moon.r}
        cy={scene.moon.y - Math.abs(scene.moon.phase) * scene.moon.r * 0.18}
        r={scene.moon.r * 0.92}
        color={pal.sky[0]}
        opacity={Math.min(1, Math.abs(scene.moon.phase) + 0.08)}
      />

      {/* 山並み(奥から手前へ) */}
      {scene.ridges.map((ridge, i) => (
        <Path key={i} path={ridge.d} color={ridge.color} />
      ))}

      {/* 地霧 */}
      <Rect x={0} y={h * 0.58} width={w} height={h * 0.2} opacity={0.5}>
        <LinearGradient
          start={vec(0, h * 0.58)}
          end={vec(0, h * 0.78)}
          colors={['transparent', pal.sky[2]]}
        />
        <BlurMask blur={14} style="normal" />
      </Rect>

      {/* 光の精霊 — 暈・芯・巡る光の粒 */}
      <Circle cx={scene.spirit.x} cy={spiritY} r={haloR} color={pal.spirit} opacity={haloOpacity}>
        <BlurMask blur={16} style="normal" />
      </Circle>
      <Circle cx={scene.spirit.x} cy={spiritY} r={scene.spirit.r}>
        <RadialGradient
          c={vec(scene.spirit.x, scene.spirit.y)}
          r={scene.spirit.r * 1.4}
          colors={['#ffffff', pal.spirit]}
        />
      </Circle>
      {scene.spirit.motes.map((m, i) => (
        <Mote key={i} clock={clock} cx={scene.spirit.x} cy={spiritY} mote={m} color={pal.spirit} />
      ))}

      {/* 周辺減光 — 一枚の絵としての奥行き */}
      <Rect x={0} y={0} width={w} height={h}>
        <RadialGradient
          c={vec(w / 2, h * 0.45)}
          r={Math.max(w, h) * 0.75}
          colors={['transparent', 'rgba(4, 5, 12, 0.42)']}
        />
      </Rect>
    </Canvas>
  );
}

interface MoteDef {
  radius: number;
  speed: number;
  phase: number;
  r: number;
  wobble: number;
}

function Mote({
  clock,
  cx,
  cy,
  mote,
  color,
}: {
  clock: { value: number };
  cx: number;
  cy: { value: number };
  mote: MoteDef;
  color: string;
}) {
  const x = useDerivedValue(
    () => cx + Math.cos(clock.value * mote.speed + mote.phase) * mote.radius
  );
  const y = useDerivedValue(
    () =>
      cy.value +
      Math.sin(clock.value * mote.speed + mote.phase) * mote.radius * 0.55 +
      Math.sin(clock.value * 2 + mote.phase) * mote.wobble * 4
  );
  const o = useDerivedValue(() => 0.45 + 0.4 * Math.sin(clock.value * 1.7 + mote.phase));
  return <Circle cx={x} cy={y} r={mote.r} color={color} opacity={o} />;
}
