import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";

export function PrototypeLabel() {
  return (
    <View style={styles.preview}>
      <View style={styles.previewDot} />
      <Text style={styles.previewText}>Prototype · synthetic race and athlete</Text>
    </View>
  );
}

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

export function MissionHero({ days }: { days: number }) {
  return (
    <LinearGradient colors={["#1B3424", "#0B1811", "#07100C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlow} />
      <Svg width="100%" height="100%" viewBox="0 0 720 430" preserveAspectRatio="xMidYMid slice" style={styles.heroTerrain} aria-hidden>
        <Path d="M180 430L280 150L328 213L404 64L443 112L475 88L600 270L720 176L740 450Z" fill="#355342" />
        <Path d="M404 64L370 172L408 150L424 185L443 112Z" fill="#8C9F8E" opacity="0.45" />
        <Path d="M0 390L152 235L209 297L280 214L388 370L455 238L530 346L615 275L740 407V450H0Z" fill="#203E2C" />
        <Path d="M0 450L130 347L246 402L390 318L500 412L620 351L740 403V450Z" fill="#10291D" />
        <Path d="M445 430L429 405L452 388L429 370L444 354L420 336" fill="none" stroke={Trail.lime} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="4 5" />
        <Path d="M-20 260C50 218 88 241 139 202S243 112 390 173" fill="none" stroke={Trail.lime} strokeOpacity="0.11" strokeWidth="1" />
        <Path d="M-20 283C57 238 94 268 151 224S257 141 390 197" fill="none" stroke={Trail.lime} strokeOpacity="0.08" strokeWidth="1" />
        <Path d="M-20 305C63 263 104 291 163 250S274 169 390 221" fill="none" stroke={Trail.lime} strokeOpacity="0.06" strokeWidth="1" />
      </Svg>
      <View style={styles.heroTop}>
        <View style={styles.heroMark}>
          <Icon name="mountain" size={24} color={Trail.lime} sw={2.2} />
        </View>
        <View style={styles.heroDate}>
          <Text style={styles.heroDateText}>18 OCT 2026</Text>
          <Text style={styles.heroLocation}>BOROVETS · BULGARIA</Text>
        </View>
      </View>
      <Text style={styles.heroOverline}>SAMPLE RACE MISSION</Text>
      <Text style={styles.heroName}>RILA RIDGE</Text>
      <View style={styles.heroDistanceRow}>
        <Text style={styles.heroDistance}>32K</Text>
        <View style={styles.heroSpec}>
          <Text style={styles.heroSpecValue}>1,850 M+</Text>
          <Text style={styles.heroSpecLabel}>ELEVATION</Text>
        </View>
        <View style={styles.heroSpec}>
          <Text style={styles.heroSpecValue}>7H</Text>
          <Text style={styles.heroSpecLabel}>CUTOFF</Text>
        </View>
      </View>
      <View style={styles.countdownRow}>
        <Text style={styles.countdownNumber}>{days}</Text>
        <View>
          <Text style={styles.countdownLabel}>DAYS TO START</Text>
          <Text style={styles.countdownGoal}>Goal · finish controlled</Text>
        </View>
      </View>
      <Text style={styles.artCredit}>Illustrated terrain · not a photograph of this event</Text>
    </LinearGradient>
  );
}

export function ElevationProfile({ values }: { values: readonly number[] }) {
  const width = 320;
  const height = 104;
  const points = values.map((v, index) => ({ x: (index / (values.length - 1)) * width, y: height - v * 86 - 8 }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <View style={styles.profileWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="trailFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Trail.lime} stopOpacity="0.32" />
            <Stop offset="1" stopColor={Trail.lime} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={area} fill="url(#trailFill)" />
        <Path d={line} fill="none" stroke={Trail.lime} strokeWidth={2.4} />
      </Svg>
      <View style={styles.profileAxis}>
        <Text style={styles.profileLabel}>START</Text>
        <Text style={styles.profileLabel}>KM 16</Text>
        <Text style={styles.profileLabel}>FINISH</Text>
      </View>
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
  preview: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Trail.orange },
  previewText: { flexShrink: 1, ...mono(11, 600), color: Trail.orange },
  panel: { boxSizing: "border-box", padding: 18, borderRadius: 22, borderWidth: 1, borderColor: Trail.lineStrong, boxShadow: "0px 14px 34px rgba(0,0,0,0.24)" },
  panelAccent: { borderColor: Trail.limeLine, boxShadow: "0px 18px 40px rgba(0,0,0,0.32)" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...disp(18, 800), letterSpacing: 0.5, color: Trail.text },
  sectionLabel: { ...mono(9, 700), letterSpacing: 0.7, color: Trail.textDim },
  hero: { boxSizing: "border-box", minHeight: 420, borderRadius: 22, padding: 24, overflow: "hidden", borderWidth: 1, borderColor: Trail.lineStrong },
  artCredit: { ...ui(11, 500), color: Trail.textMuted, marginTop: 20, backgroundColor: "rgba(7,16,12,0.8)", padding: 6, alignSelf: "flex-start" },
  heroGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -100, top: -110, backgroundColor: "rgba(183,237,98,0.11)", boxShadow: "0px 0px 80px rgba(183,237,98,0.10)" },
  heroTerrain: { position: "absolute", inset: 0 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  heroMark: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  heroDate: { alignItems: "flex-end" },
  heroDateText: { ...mono(10, 700), color: Trail.text, letterSpacing: 1.1 },
  heroLocation: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.7, marginTop: 3 },
  heroOverline: { ...mono(9, 700), letterSpacing: 1.7, color: Trail.lime },
  heroName: { ...disp(40, 800), letterSpacing: 1, color: Trail.text, lineHeight: 43, marginTop: 2 },
  heroDistanceRow: { flexDirection: "row", alignItems: "flex-end", gap: 18, marginTop: 2 },
  heroDistance: { ...disp(42, 800), color: Trail.lime, lineHeight: 46 },
  heroSpec: { paddingBottom: 6 },
  heroSpecValue: { ...mono(11, 700), color: Trail.text },
  heroSpecLabel: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.7, marginTop: 2 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 18, marginTop: 18, borderTopWidth: 1, borderTopColor: Trail.lineStrong },
  countdownNumber: { ...disp(46, 800), color: Trail.text, lineHeight: 46 },
  countdownLabel: { ...mono(9, 700), color: Trail.lime, letterSpacing: 1 },
  countdownGoal: { ...ui(11, 500), color: Trail.textMuted, marginTop: 3 },
  profileWrap: { marginTop: 8 },
  profileAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  profileLabel: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.5 },
});
