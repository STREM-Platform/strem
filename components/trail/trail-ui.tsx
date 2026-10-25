import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";

export function TrailAtmosphere({ quiet = false }: { quiet?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[Trail.bg, "#07140E", "#050A08"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.atmosphereGlow, quiet && styles.atmosphereGlowQuiet]} />
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={styles.topography}>
        <Circle cx="338" cy="112" r="118" fill="none" stroke={Trail.lime} strokeOpacity={quiet ? 0.035 : 0.055} strokeWidth="1" />
        <Circle cx="338" cy="112" r="90" fill="none" stroke={Trail.lime} strokeOpacity={quiet ? 0.025 : 0.045} strokeWidth="1" />
        <Path d="M-45 195C35 119 91 154 143 119S239 45 435 112" fill="none" stroke={Trail.text} strokeOpacity="0.045" strokeWidth="1" />
        <Path d="M-55 226C24 150 92 188 153 146S274 70 446 143" fill="none" stroke={Trail.text} strokeOpacity="0.04" strokeWidth="1" />
        <Path d="M-70 259C20 184 92 218 167 177S295 105 462 177" fill="none" stroke={Trail.text} strokeOpacity="0.035" strokeWidth="1" />
        <Path d="M-74 689C27 610 74 657 147 608S276 532 452 601" fill="none" stroke={Trail.lime} strokeOpacity="0.035" strokeWidth="1" />
        <Path d="M-75 727C27 650 85 695 159 647S291 572 454 639" fill="none" stroke={Trail.lime} strokeOpacity="0.03" strokeWidth="1" />
      </Svg>
    </View>
  );
}

export function TrailPanel({ children, style, accent = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return (
    <LinearGradient
      colors={accent ? ["rgba(24,46,32,0.98)", "rgba(13,27,19,0.98)"] : ["rgba(18,34,25,0.96)", "rgba(11,22,16,0.96)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.panel, accent && styles.panelAccent, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function TrailSectionHead({ title, label, icon }: { title: string; label?: string; icon?: IconName }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTitleRow}>
        {icon ? <Icon name={icon} size={16} color={Trail.lime} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {label ? <Text style={styles.sectionLabel}>{label}</Text> : null}
    </View>
  );
}

export const trailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Trail.bg, overflow: "hidden" },
  scroll: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 18, paddingBottom: 132, gap: 20 },
  pageOverline: { ...mono(10, 700), letterSpacing: 1.4, color: Trail.lime },
  pageTitle: { ...disp(34, 800), letterSpacing: 0.4, color: Trail.text, lineHeight: 37 },
  pageSub: { ...ui(13, 500), color: Trail.textMuted, lineHeight: 19, maxWidth: 330 },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { ...ui(12, 500), color: Trail.textMuted, lineHeight: 18 },
  mono: { ...mono(10, 700), color: Trail.textDim, letterSpacing: 0.7 },
  title: { ...disp(20, 800), color: Trail.text, letterSpacing: 0.3 },
  body: { ...ui(13, 500), color: Trail.textMuted, lineHeight: 20 },
});

const styles = StyleSheet.create({
  atmosphereGlow: { position: "absolute", width: 430, height: 430, borderRadius: 215, top: -245, right: -195, backgroundColor: "rgba(183,237,98,0.07)", boxShadow: "0px 0px 110px rgba(183,237,98,0.09)" },
  atmosphereGlowQuiet: { opacity: 0.55 },
  topography: { position: "absolute", inset: 0 },
  panel: { boxSizing: "border-box", padding: 18, borderRadius: 22, borderWidth: 1, borderColor: Trail.lineStrong, boxShadow: "0px 14px 34px rgba(0,0,0,0.24)" },
  panelAccent: { borderColor: Trail.limeLine, boxShadow: "0px 18px 40px rgba(0,0,0,0.32)" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...disp(18, 800), letterSpacing: 0.5, color: Trail.text },
  sectionLabel: { ...mono(9, 700), letterSpacing: 0.7, color: Trail.textDim },
});
