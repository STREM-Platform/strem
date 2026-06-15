/**
 * Shared brand primitives, ported from `design-spec/strem-kit.jsx`:
 * `Bar`, `Chip`, `Panel`, `SectionHead`, `ScreenHead`, `IconTile`.
 *
 * CSS-isms translated: `box-shadow` glows use RN's cross-platform `boxShadow`
 * (RN 0.85 + react-native-web). The `raised` panel's subtle top→bottom gradient
 * is approximated with a solid elevated surface + shadow (the difference reads
 * the same at panel scale); gradient-critical surfaces use expo-linear-gradient
 * directly.
 */

import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { T, disp, mono, ui } from "@/constants/theme";

// ── Bar ──────────────────────────────────────────────────────────────────────
interface BarProps {
  pct?: number;
  color?: string;
  h?: number;
  track?: string;
  glow?: boolean;
}

export function Bar({ pct = 0.4, color = T.green, h = 6, track = "rgba(255,255,255,0.08)", glow = true }: BarProps) {
  const width = `${Math.min(100, Math.max(0, pct * 100))}%` as const;
  return (
    <View style={{ height: h, borderRadius: h, backgroundColor: track, overflow: "hidden" }}>
      <View
        style={{
          width,
          height: "100%",
          borderRadius: h,
          backgroundColor: color,
          boxShadow: glow ? `0px 0px 8px ${color}88` : undefined,
        }}
      />
    </View>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  icon?: IconName;
  iconFill?: boolean;
  color?: string;
  bg?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, icon, iconFill = true, color = T.green, bg = T.greenSoft, border = T.greenLine, style }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }, style]}>
      {icon ? <Icon name={icon} size={11} color={color} fill={iconFill} sw={2} /> : null}
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────
interface PanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
  radius?: number;
  raised?: boolean;
  accent?: string;
}

export function Panel({ children, style, pad = 16, radius = 16, raised, accent }: PanelProps) {
  return (
    <View
      style={[
        {
          padding: pad,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: raised ? "#10141b" : T.surf,
          borderWidth: 1,
          borderColor: accent ?? T.line,
          boxShadow: raised ? "0px 14px 30px rgba(0,0,0,0.35)" : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── SectionHead ──────────────────────────────────────────────────────────────
interface SectionHeadProps {
  icon?: IconName;
  title: string;
  sub?: string;
  action?: ReactNode;
  color?: string;
}

export function SectionHead({ icon, title, sub, action, color = T.green }: SectionHeadProps) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLeft}>
        {icon ? <Icon name={icon} size={17} color={color} /> : null}
        <View style={styles.shrink}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
        </View>
      </View>
      {action}
    </View>
  );
}

// ── ScreenHead ───────────────────────────────────────────────────────────────
interface ScreenHeadProps {
  overline?: string;
  title: string;
  action?: ReactNode;
}

export function ScreenHead({ overline, title, action }: ScreenHeadProps) {
  return (
    <View style={styles.screenHead}>
      <View style={styles.shrink}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

// ── IconTile ─────────────────────────────────────────────────────────────────
interface IconTileProps {
  name: IconName;
  color?: string;
  size?: number;
  iconSize?: number;
  bg?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconTile({ name, color = T.green, size = 42, iconSize = 21, bg = T.greenSoft, border = T.greenLine, style }: IconTileProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  chipText: {
    ...mono(10, 700),
    letterSpacing: 0.5,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 12,
    gap: 12,
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  sectionTitle: {
    ...disp(17, 800),
    letterSpacing: 1,
    color: T.text,
  },
  sectionSub: {
    ...ui(12, 500),
    color: T.sub,
    marginTop: 1,
  },
  screenHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 16,
    gap: 12,
  },
  overline: {
    ...mono(10, 700),
    letterSpacing: 1.6,
    color: T.sub,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  screenTitle: {
    ...disp(30, 800),
    color: T.text,
    letterSpacing: 0.5,
  },
});
