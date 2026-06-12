// 寓話の挿絵 — シードから一枚かぎりの夜景を描く。
// 構図は四つ(山並み・海・森・平原)、空模様は晴れ・雪・雨・彗星。
// すべて手続き生成。同じ種からは、必ず同じ夜が描かれる。

import React, { useEffect, useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
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
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { mulberry32, range, int, Rng } from '../engine/prng';
import { ThemeId } from '../engine/fable';
import { PALETTES, ArtPalette } from '../theme';

interface Props {
  width: number;
  height: number;
  seed: number;
  themeId: ThemeId;
}

type SceneKind = 'mountains' | 'sea' | 'forest' | 'plains';
type Weather = 'clear' | 'snow' | 'rain' | 'comet';

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

/** 中点変位法で稜線を描く */
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

/** 針葉樹のシルエット列 */
function treeRowPath(rng: Rng, w: number, baseY: number, minH: number, maxH: number, count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = ((i + range(rng, 0.1, 0.9)) / count) * (w + 40) - 20;
    const ht = range(rng, minH, maxH);
    const wd = ht * range(rng, 0.3, 0.42);
    const y = baseY + range(rng, -4, 8);
    parts.push(`M ${x - wd} ${y} L ${x} ${y - ht} L ${x + wd} ${y} Z`);
  }
  return parts.join(' ');
}

export default function FableScene({ width: w, height: h, seed, themeId }: Props) {
  const pal = PALETTES[themeId];
  const horizon = h * 0.62;

  // ---- シードから一夜ぶんの風景を決める(本文とは別系統の乱数) ----
  const scene = useMemo(() => {
    const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);

    const kindRoll = rng();
    const kind: SceneKind =
      kindRoll < 0.38 ? 'mountains' : kindRoll < 0.62 ? 'sea' : kindRoll < 0.84 ? 'forest' : 'plains';
    const weatherRoll = rng();
    const weather: Weather =
      weatherRoll < 0.52 ? 'clear' : weatherRoll < 0.68 ? 'snow' : weatherRoll < 0.84 ? 'rain' : 'comet';

    const stars: Star[] = [];
    const n = int(rng, 60, 90);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rng() * w,
        y: rng() * horizon,
        r: range(rng, 0.5, 1.6),
        group: rng() < 0.5 ? 0 : 1,
      });
    }

    const moon = {
      x: range(rng, 0.18, 0.82) * w,
      y: range(rng, 0.13, kind === 'sea' ? 0.24 : 0.3) * h,
      r: range(rng, 0.055, kind === 'plains' ? 0.1 : 0.085) * Math.max(w, h),
      phase: range(rng, -0.9, 0.9), // 影のずらし量(満ち欠け)
    };

    // 構図ごとの地形
    const ridges: { d: string; color: string }[] = [];
    let trees: { d: string; color: string }[] = [];
    let glints: { x: number; y: number; hw: number; group: 0 | 1 }[] = [];

    if (kind === 'mountains') {
      ridges.push(
        { d: ridgePath(rng, w, h, h * 0.6, h * 0.075), color: shade(pal.mountain, 1.0) },
        { d: ridgePath(rng, w, h, h * 0.71, h * 0.06), color: shade(pal.mountain, 0.62) },
        { d: ridgePath(rng, w, h, h * 0.82, h * 0.05), color: shade(pal.mountain, 0.34) }
      );
    } else if (kind === 'sea') {
      ridges.push({ d: ridgePath(rng, w, h, horizon - h * 0.015, h * 0.018), color: shade(pal.mountain, 0.9) });
      // 月明かりの水面の照り返し
      const gx = moon.x;
      const gn = int(rng, 8, 12);
      for (let i = 0; i < gn; i++) {
        const t = i / gn;
        glints.push({
          x: gx + range(rng, -1, 1) * (6 + t * 30),
          y: horizon + 10 + t * (h - horizon - 26),
          hw: range(rng, 4, 16) * (1 + t * 1.6),
          group: rng() < 0.5 ? 0 : 1,
        });
      }
    } else if (kind === 'forest') {
      ridges.push({ d: ridgePath(rng, w, h, h * 0.64, h * 0.04), color: shade(pal.mountain, 0.95) });
      trees = [
        { d: treeRowPath(rng, w, h * 0.7, h * 0.06, h * 0.12, int(rng, 9, 13)), color: shade(pal.mountain, 0.6) },
        { d: treeRowPath(rng, w, h * 0.84, h * 0.1, h * 0.19, int(rng, 6, 9)), color: shade(pal.mountain, 0.32) },
      ];
      ridges.push({ d: ridgePath(rng, w, h, h * 0.86, h * 0.015), color: shade(pal.mountain, 0.22) });
    } else {
      // plains — 低い丘がふたつ、空の広い夜
      ridges.push(
        { d: ridgePath(rng, w, h, h * 0.68, h * 0.022), color: shade(pal.mountain, 0.8) },
        { d: ridgePath(rng, w, h, h * 0.8, h * 0.018), color: shade(pal.mountain, 0.4) }
      );
    }

    const spiritBand: [number, number] =
      kind === 'sea' ? [0.46, 0.56] : kind === 'forest' ? [0.5, 0.6] : kind === 'plains' ? [0.44, 0.58] : [0.46, 0.56];
    const spirit = {
      x: range(rng, 0.28, 0.72) * w,
      y: range(rng, spiritBand[0], spiritBand[1]) * h,
      r: range(rng, 7, 10),
      motes: Array.from({ length: 6 }, () => ({
        radius: range(rng, 16, 34),
        speed: range(rng, 0.5, 1.4) * (rng() < 0.5 ? -1 : 1),
        phase: rng() * Math.PI * 2,
        r: range(rng, 1.2, 2.4),
        wobble: range(rng, 0.3, 0.9),
      })),
    };

    const flakes = Array.from({ length: weather === 'snow' ? 20 : weather === 'rain' ? 16 : 0 }, () => ({
      x: rng() * w,
      y0: rng(),
      speed: weather === 'snow' ? range(rng, 0.35, 0.9) : range(rng, 3.2, 5.6),
      phase: rng() * Math.PI * 2,
      r: range(rng, 1, 2.4),
      len: range(rng, 9, 16),
    }));

    const comet =
      weather === 'comet'
        ? {
            x: range(rng, 0.2, 0.8) * w,
            y: range(rng, 0.08, 0.3) * h,
            angle: range(rng, 0.5, 0.9) * (rng() < 0.5 ? 1 : -1),
            len: range(rng, 0.18, 0.3) * w,
          }
        : null;

    return { kind, weather, stars, moon, ridges, trees, glints, spirit, flakes, comet };
  }, [seed, themeId, w, h, horizon]);

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
  const glintA = useDerivedValue(() => 0.18 + twinkleA.value * 0.3);
  const glintB = useDerivedValue(() => 0.18 + twinkleB.value * 0.3);
  const cometOpacity = useDerivedValue(() => 0.55 + breath.value * 0.35);

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

      {/* 彗星 */}
      {scene.comet && (
        <Group opacity={cometOpacity}>
          <Line
            p1={vec(scene.comet.x, scene.comet.y)}
            p2={vec(
              scene.comet.x - scene.comet.len * Math.cos(scene.comet.angle),
              scene.comet.y - scene.comet.len * Math.sin(scene.comet.angle)
            )}
            color={pal.star}
            strokeWidth={1.8}
          >
            <BlurMask blur={3} style="normal" />
          </Line>
          <Circle cx={scene.comet.x} cy={scene.comet.y} r={2.6} color="#ffffff">
            <BlurMask blur={2} style="solid" />
          </Circle>
        </Group>
      )}

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

      {/* 地形(奥から手前へ) */}
      {scene.kind === 'sea' ? (
        <>
          {scene.ridges.map((ridge, i) => (
            <Path key={`r${i}`} path={ridge.d} color={ridge.color} />
          ))}
          <Rect x={0} y={horizon} width={w} height={h - horizon}>
            <LinearGradient
              start={vec(0, horizon)}
              end={vec(0, h)}
              colors={[shade(pal.mountain, 0.85), shade(pal.mountain, 0.25)]}
            />
          </Rect>
          {scene.glints.map((g, i) => (
            <Rect
              key={`g${i}`}
              x={g.x - g.hw}
              y={g.y}
              width={g.hw * 2}
              height={1.6}
              color={pal.moon}
              opacity={g.group === 0 ? glintA : glintB}
            />
          ))}
        </>
      ) : (
        <>
          {scene.ridges.slice(0, scene.kind === 'forest' ? 1 : scene.ridges.length).map((ridge, i) => (
            <Path key={`r${i}`} path={ridge.d} color={ridge.color} />
          ))}
          {scene.trees.map((row, i) => (
            <Path key={`t${i}`} path={row.d} color={row.color} />
          ))}
          {scene.kind === 'forest' && scene.ridges[1] && (
            <Path path={scene.ridges[1].d} color={scene.ridges[1].color} />
          )}
        </>
      )}

      {/* 地霧 */}
      {scene.kind !== 'sea' && (
        <Rect x={0} y={horizon - h * 0.04} width={w} height={h * 0.2} opacity={0.45}>
          <LinearGradient
            start={vec(0, horizon - h * 0.04)}
            end={vec(0, horizon + h * 0.16)}
            colors={['transparent', pal.sky[2]]}
          />
          <BlurMask blur={14} style="normal" />
        </Rect>
      )}

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

      {/* 雪・雨 */}
      {scene.weather === 'snow' &&
        scene.flakes.map((f, i) => (
          <Flake key={i} clock={clock} flake={f} w={w} h={h} color={pal.star} />
        ))}
      {scene.weather === 'rain' &&
        scene.flakes.map((f, i) => (
          <RainStreak key={i} clock={clock} flake={f} h={h} color={pal.star} />
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
  clock: SharedValue<number>;
  cx: number;
  cy: SharedValue<number>;
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

interface FlakeDef {
  x: number;
  y0: number;
  speed: number;
  phase: number;
  r: number;
  len: number;
}

function Flake({
  clock,
  flake,
  w,
  h,
  color,
}: {
  clock: SharedValue<number>;
  flake: FlakeDef;
  w: number;
  h: number;
  color: string;
}) {
  const cy = useDerivedValue(() => {
    const t = clock.value / (Math.PI * 2);
    return ((flake.y0 + t * flake.speed) % 1) * (h + 12) - 6;
  });
  const cx = useDerivedValue(
    () => ((flake.x + Math.sin(clock.value * 1.3 + flake.phase) * 9) % (w + 8) + (w + 8)) % (w + 8) - 4
  );
  return <Circle cx={cx} cy={cy} r={flake.r} color={color} opacity={0.7} />;
}

function RainStreak({
  clock,
  flake,
  h,
  color,
}: {
  clock: SharedValue<number>;
  flake: FlakeDef;
  h: number;
  color: string;
}) {
  const p1 = useDerivedValue(() => {
    const t = clock.value / (Math.PI * 2);
    const y = ((flake.y0 + t * flake.speed) % 1) * (h + 40) - 20;
    return vec(flake.x - flake.len * 0.18, y);
  });
  const p2 = useDerivedValue(() => {
    const t = clock.value / (Math.PI * 2);
    const y = ((flake.y0 + t * flake.speed) % 1) * (h + 40) - 20;
    return vec(flake.x, y + flake.len);
  });
  return <Line p1={p1} p2={p2} color={color} strokeWidth={1.1} opacity={0.3} />;
}
