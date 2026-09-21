import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { BrandLogo } from "@/components/brand-logo";
import { TrailAtmosphere } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const contentWidth = Math.max(0, Math.min(width - (wide ? 104 : 40), 1120));

  return (
    <SafeAreaView style={styles.safeArea}>
      <TrailAtmosphere />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: contentWidth }, wide && styles.contentWide]}>
            <View style={[styles.story, wide && styles.storyWide]}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <BrandLogo variant="symbol" style={styles.logo} />
                </View>
                <View>
                  <Text style={styles.brandName}>STREM</Text>
                  <Text style={styles.brandSub}>ALTITUDE INTELLIGENCE</Text>
                </View>
              </View>

              <View style={styles.storyCopy}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.eyebrow}>BUILT FOR THE VERTICAL WORLD</Text>
                </View>
                <Text style={[styles.storyTitle, !wide && styles.storyTitleCompact]}>
                  YOUR RACE HAS TERRAIN.{"\n"}<Text style={styles.storyAccent}>YOUR PLAN SHOULD TOO.</Text>
                </Text>
                {wide ? (
                  <Text style={styles.storyBody}>
                    One adaptive race mission connecting course demands, training evidence, recovery, gear and execution.
                  </Text>
                ) : null}
              </View>

              {wide ? (
                <LinearGradient colors={["rgba(25,48,33,0.96)", "rgba(10,23,16,0.94)"]} style={styles.raceCard}>
                  <View style={styles.raceCardTop}>
                    <View>
                      <Text style={styles.cardOverline}>MISSION PREVIEW / 01</Text>
                      <Text style={styles.raceName}>RILA RIDGE</Text>
                    </View>
                    <View style={styles.raceBadge}>
                      <Icon name="mountain" size={18} color={Trail.lime} />
                    </View>
                  </View>
                  <AuthElevation />
                  <View style={styles.metrics}>
                    <Metric value="32K" label="DISTANCE" />
                    <Metric value="1,850M" label="VERTICAL" />
                    <Metric value="06:45" label="TARGET" />
                  </View>
                </LinearGradient>
              ) : null}
            </View>

            <View style={[styles.formColumn, wide && styles.formColumnWide]}>
              <View style={styles.panel}>
                <LinearGradient
                  colors={["rgba(22,42,30,0.98)", "rgba(12,25,18,0.98)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.panelLine} />
                <View style={styles.copy}>
                  <Text style={styles.panelIndex}>ACCESS / RACE CONTROL</Text>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <View style={styles.fields}>{children}</View>
                <View style={styles.divider} />
                <View style={styles.footer}>{footer}</View>
              </View>
              <View style={styles.trustRow}>
                <Icon name="shield" size={14} color={Trail.textDim} />
                <Text style={styles.trustText}>PRIVATE BY DEFAULT · EVIDENCE YOU CONTROL</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AuthElevation() {
  return (
    <View style={styles.elevation}>
      <Svg width="100%" height="82" viewBox="0 0 420 82" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="authElevation" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Trail.lime} stopOpacity="0.34" />
            <Stop offset="1" stopColor={Trail.lime} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d="M0 69L31 64L58 49L87 55L116 33L145 42L175 18L204 27L236 10L265 37L297 29L328 51L361 41L392 61L420 56L420 82L0 82Z" fill="url(#authElevation)" />
        <Path d="M0 69L31 64L58 49L87 55L116 33L145 42L175 18L204 27L236 10L265 37L297 29L328 51L361 41L392 61L420 56" fill="none" stroke={Trail.lime} strokeWidth="2.2" />
      </Svg>
      <View style={styles.elevationMeta}>
        <Text style={styles.elevationLabel}>START · BOROVETS</Text>
        <Text style={styles.elevationLabel}>FINISH · MUSALA GATE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Trail.bg },
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingVertical: 28, justifyContent: "center", alignItems: "center" },
  scrollWide: { paddingVertical: 44 },
  content: { alignSelf: "center", gap: 28 },
  contentWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 72 },
  story: { alignSelf: "stretch", gap: 25 },
  storyWide: { flex: 1, maxWidth: 620, gap: 34 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(183,237,98,0.08)", borderWidth: 1, borderColor: Trail.limeLine },
  logo: { width: 34, height: 34 },
  brandName: { ...disp(23, 800), color: Trail.text, letterSpacing: 3.8, lineHeight: 23 },
  brandSub: { ...mono(7, 700), color: Trail.lime, letterSpacing: 1.5, marginTop: 3 },
  storyCopy: { gap: 13 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Trail.lime, boxShadow: "0px 0px 12px rgba(183,237,98,0.8)" },
  eyebrow: { ...mono(9, 700), color: Trail.lime, letterSpacing: 1.4 },
  storyTitle: { ...disp(56, 800), color: Trail.text, lineHeight: 56, letterSpacing: 0.4 },
  storyTitleCompact: { ...disp(37, 800), lineHeight: 39 },
  storyAccent: { color: Trail.lime },
  storyBody: { ...ui(16, 500), color: Trail.textMuted, lineHeight: 25, maxWidth: 540 },
  raceCard: { boxSizing: "border-box", borderRadius: 26, padding: 20, overflow: "hidden", borderWidth: 1, borderColor: Trail.lineStrong, boxShadow: "0px 24px 56px rgba(0,0,0,0.34)" },
  raceCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardOverline: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 1.2 },
  raceName: { ...disp(26, 800), color: Trail.text, letterSpacing: 1, marginTop: 2 },
  raceBadge: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  elevation: { marginTop: 15 },
  elevationMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  elevationLabel: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.5 },
  metrics: { flexDirection: "row", borderTopWidth: 1, borderTopColor: Trail.line, marginTop: 14, paddingTop: 14 },
  metric: { flex: 1 },
  metricValue: { ...disp(22, 800), color: Trail.text },
  metricLabel: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.8, marginTop: 1 },
  formColumn: { alignSelf: "stretch", maxWidth: 460, gap: 14 },
  formColumnWide: { flex: 1, maxWidth: 430 },
  panel: { boxSizing: "border-box", gap: 22, padding: 26, borderRadius: 28, borderWidth: 1, borderColor: Trail.lineStrong, overflow: "hidden", boxShadow: "0px 30px 70px rgba(0,0,0,0.48)" },
  panelLine: { position: "absolute", top: 0, left: 28, right: 28, height: 2, backgroundColor: Trail.lime, opacity: 0.78, boxShadow: "0px 0px 18px rgba(183,237,98,0.62)" },
  copy: { gap: 7 },
  panelIndex: { ...mono(8, 700), color: Trail.lime, letterSpacing: 1.2, marginBottom: 5 },
  title: { ...disp(31, 800), lineHeight: 34, color: Trail.text },
  subtitle: { ...ui(14, 500), lineHeight: 21, color: Trail.textMuted },
  fields: { gap: 18 },
  divider: { height: 1, backgroundColor: Trail.line },
  footer: { alignItems: "center" },
  trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  trustText: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.7 },
});
