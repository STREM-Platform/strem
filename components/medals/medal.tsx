/**
 * Premium medal artwork engine — ported from `design-spec/medal-art.jsx` to
 * react-native-svg. Collectible game-badge quality: metallic rim gradients per
 * rarity, knurled coin ticks, glowing core, ribbon banner, sport emblem,
 * holographic sheen, and a desaturated locked state. Pure SVG, crisp at any size.
 *
 * Translation notes vs. the web original:
 * - Per-element `transform="rotate(a cx cy)"` → `rotation`/`originX`/`originY`.
 * - Composed `transform="translate scale translate"` → nested <G> (parent →
 *   child applies the ops in order).
 * - The svg-level `drop-shadow` and the CSS `blur()` halo aren't reliable in
 *   react-native-svg across platforms, so the glow is a soft RadialGradient
 *   halo instead — same read, fully cross-platform.
 */

import { memo, useRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { PATHS } from "@/constants/theme";
import { MEDAL_META, type MedalMeta } from "@/lib/medals";
import type { IconName, Rarity } from "@/constants/theme";

// Desaturated palette used when a medal is not yet earned.
const LOCKED: Pick<MedalMeta, "rim" | "core" | "accent" | "glow"> = {
  rim: ["#3A4047", "#272D33", "#15191D"],
  core: ["#1B2026", "#0C0F12"],
  accent: "#5A636B",
  glow: "rgba(0,0,0,0)",
};

let medalSeq = 0;

const TICKS = Array.from({ length: 40 }, (_, i) => i);
const RAYS = Array.from({ length: 16 }, (_, i) => i);

const CX = 60;
const CY = 58;

interface MedalProps {
  rarity?: Rarity;
  emblem?: IconName;
  size?: number;
  earned?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Medal = memo(function Medal({
  rarity = "epic",
  emblem = "mountain",
  size = 96,
  earned = true,
  style,
}: MedalProps) {
  const m = MEDAL_META[rarity] ?? MEDAL_META.epic;
  // Stable, unique gradient-id prefix per instance (mirrors the web `_medalSeq`).
  const uid = useRef(`md${medalSeq++}`).current;

  const rim = earned ? m.rim : LOCKED.rim;
  const core = earned ? m.core : LOCKED.core;
  const accent = earned ? m.accent : LOCKED.accent;
  const glow = earned ? m.glow : LOCKED.glow;

  const embRaw: string | readonly string[] = PATHS[emblem] ?? PATHS.mountain;
  const embArr: readonly string[] = Array.isArray(embRaw) ? embRaw : [embRaw];

  return (
    <Svg
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      fill="none"
      style={style}
    >
      <Defs>
        <LinearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={rim[0]} />
          <Stop offset="42%" stopColor={rim[1]} />
          <Stop offset="100%" stopColor={rim[2]} />
        </LinearGradient>
        <LinearGradient id={`${uid}-rim2`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0%" stopColor={rim[0]} />
          <Stop offset="50%" stopColor={rim[1]} />
          <Stop offset="100%" stopColor={rim[2]} />
        </LinearGradient>
        <RadialGradient id={`${uid}-core`} cx="50%" cy="36%" r="72%">
          <Stop offset="0%" stopColor={core[0]} />
          <Stop offset="100%" stopColor={core[1]} />
        </RadialGradient>
        <LinearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={earned ? 0.5 : 0.12} />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={rim[1]} />
          <Stop offset="100%" stopColor={rim[2]} />
        </LinearGradient>
        {/* Soft glow halo (replaces the web CSS blur). */}
        <RadialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
          <Stop offset="55%" stopColor={glow} stopOpacity={earned ? 0.55 : 0} />
          <Stop offset="100%" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* glow halo */}
      {earned ? <Circle cx={CX} cy={CY} r={58} fill={`url(#${uid}-halo)`} /> : null}

      {/* back rays */}
      {earned && m.rays
        ? RAYS.map((i) => (
            <Rect
              key={`ray-${i}`}
              x={CX - 1.2}
              y={CY - 56}
              width={2.4}
              height={20}
              rx={1.2}
              fill={accent}
              opacity={i % 2 ? 0.16 : 0.28}
              transform={`rotate(${(i / RAYS.length) * 360} ${CX} ${CY})`}
            />
          ))
        : null}

      {/* ribbon banner */}
      <G>
        <Path
          d={`M${CX - 26} ${CY + 30} L${CX - 26} ${CY + 64} L${CX} ${CY + 54} L${CX + 26} ${CY + 64} L${CX + 26} ${CY + 30} Z`}
          fill={`url(#${uid}-ribbon)`}
          opacity={earned ? 0.95 : 0.5}
        />
        <Path
          d={`M${CX - 26} ${CY + 30} L${CX - 26} ${CY + 64} L${CX} ${CY + 54} L${CX + 26} ${CY + 64} L${CX + 26} ${CY + 30} Z`}
          fill="none"
          stroke={rim[2]}
          strokeWidth={1}
          opacity={0.6}
        />
        {/* star on ribbon */}
        <G transform={`translate(${CX} ${CY + 40}) scale(0.5) translate(-12 -12)`}>
          <Path d={PATHS.star} fill={earned ? accent : "#3A4047"} />
        </G>
      </G>

      {/* outer coin */}
      <Circle cx={CX} cy={CY} r={44} fill={`url(#${uid}-rim)`} />
      <Circle cx={CX} cy={CY} r={44} fill="none" stroke={rim[2]} strokeWidth={1.5} opacity={0.7} />

      {/* knurled ticks */}
      {TICKS.map((i) => (
        <Rect
          key={`tick-${i}`}
          x={CX - 0.7}
          y={CY - 43.5}
          width={1.4}
          height={4}
          rx={0.7}
          fill={rim[2]}
          opacity={0.55}
          transform={`rotate(${(i / TICKS.length) * 360} ${CX} ${CY})`}
        />
      ))}

      {/* inner bevel ring + core */}
      <Circle cx={CX} cy={CY} r={36.5} fill="none" stroke={`url(#${uid}-rim2)`} strokeWidth={4} />
      <Circle cx={CX} cy={CY} r={34} fill={`url(#${uid}-core)`} />
      <Circle cx={CX} cy={CY} r={34} fill="none" stroke="#000" strokeWidth={2} opacity={0.35} />

      {/* emblem (earned) or lock (locked) */}
      <G transform={`translate(${CX} ${CY}) scale(${earned ? 1.42 : 1.2}) translate(-12 -12)`}>
        {earned ? (
          embArr.map((p, i) => (
            <Path
              key={`emb-${i}`}
              d={p}
              stroke={accent}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))
        ) : (
          <>
            <Path d={PATHS.lock[0]} stroke="#69727B" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={PATHS.lock[1]} stroke="#69727B" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </G>

      {/* glossy sheen over the top */}
      <Path
        d={`M${CX - 34} ${CY} A34 34 0 0 1 ${CX + 34} ${CY} A40 26 0 0 0 ${CX - 34} ${CY} Z`}
        fill={`url(#${uid}-sheen)`}
      />
    </Svg>
  );
});
