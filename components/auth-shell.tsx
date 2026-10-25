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
                    Save the race you chose, keep your facts together, and stay in control of your data. Course intelligence and AI planning are not available yet.
                  </Text>
                ) : null}
              </View>

              {wide ? (
                <LinearGradient colors={["rgba(25,48,33,0.96)", "rgba(10,23,16,0.94)"]} style={styles.raceCard}>
                  <View style={styles.raceCardTop}>
                    <View>
                      <Text style={styles.cardOverline}>YOUR OWN RACE / YOUR OWN FACTS</Text>
                      <Text style={styles.raceName}>THE NEXT START LINE</Text>
                    </View>
                    <View style={styles.raceBadge}>
                      <Icon name="mountain" size={18} color={Trail.lime} />
                    </View>
                  </View>
                  <View style={styles.metrics}>
                    <Metric value="SAVE" label="YOUR EVENT" />
                    <Metric value="EDIT" label="YOUR GOAL" />
                    <Metric value="OWN" label="YOUR DATA" />
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
