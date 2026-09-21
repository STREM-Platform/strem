import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";

export function PrototypeLabel() {
  return (
    <View style={styles.preview}>
      <View style={styles.previewDot} />
      <Text style={styles.previewText}>PROTOTYPE MISSION · SAMPLE RACE DATA</Text>
    </View>
  );
}

export function TrailPanel({ children, style, accent = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[styles.panel, accent && styles.panelAccent, style]}>{children}</View>;
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
    <LinearGradient colors={["#17291E", "#0C1711"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlow} />
      <View style={styles.heroTop}>
        <View style={styles.heroMark}>
          <Icon name="mountain" size={24} color={Trail.lime} sw={2.2} />
        </View>
        <View style={styles.heroDate}>
          <Text style={styles.heroDateText}>18 OCT 2026</Text>
          <Text style={styles.heroLocation}>BOROVETS · BULGARIA</Text>
        </View>
      </View>
      <Text style={styles.heroOverline}>ACTIVE RACE MISSION</Text>
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
  root: { flex: 1, backgroundColor: Trail.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 126, gap: 18 },
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
  preview: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Trail.orange },
  previewText: { ...mono(8, 700), letterSpacing: 0.7, color: Trail.orange },
  panel: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: Trail.line, backgroundColor: Trail.panel },
  panelAccent: { borderColor: Trail.limeLine, backgroundColor: Trail.panelRaised },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...disp(18, 800), letterSpacing: 0.5, color: Trail.text },
  sectionLabel: { ...mono(9, 700), letterSpacing: 0.7, color: Trail.textDim },
  hero: { borderRadius: 26, padding: 20, overflow: "hidden", borderWidth: 1, borderColor: Trail.limeLine, boxShadow: "0px 18px 36px rgba(0,0,0,0.34)" },
  heroGlow: { position: "absolute", width: 210, height: 210, borderRadius: 105, right: -90, top: -90, backgroundColor: "rgba(183,237,98,0.08)" },
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
