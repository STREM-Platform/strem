import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { CourseExplorer } from "@/components/trail/course-explorer";
import { MissionHero, PrototypeLabel, TrailAtmosphere, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { TRAIL_MISSION_PREVIEW, daysUntilRace } from "@/lib/trail/mission-preview";
import { syncConnectedSources } from "@/lib/sync-sources";

export default function MissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 1080 && fontScale < 1.5;
  const [showReason, setShowReason] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<number | null>(null);
  const mission = TRAIL_MISSION_PREVIEW;

  useEffect(() => { void syncConnectedSources(); }, []);

  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandLockup}>
            <BrandLogo variant="symbol" style={styles.brandMark} />
            <Text style={styles.brand}>STREM<Text style={styles.brandSub}> / RACE MISSION</Text></Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open athlete profile" style={styles.profileButton} onPress={() => router.push("/(app)/profile")}>
            <Icon name="shield" size={20} color={Trail.text} />
          </Pressable>
        </View>
        <View style={styles.previewRow}>
          <PrototypeLabel />
          <Text style={styles.snapshot}>Demo snapshot · {mission.asOfLabel}</Text>
        </View>
        <View style={styles.pageHeading}>
          <Text accessibilityRole="header" style={styles.pageTitle}>The start line is earned.</Text>
          <Text style={styles.pageSubtitle}>One race. A clear priority. Evidence you can inspect.</Text>
        </View>

        <View style={[styles.workspace, wide && styles.workspaceWide]}>
          <View style={[styles.mainColumn, wide && styles.mainColumnWide]}>
            <MissionHero days={daysUntilRace()} />
            <View style={styles.phase}>
              <View style={styles.phaseIndex}><Text style={styles.phaseNumber}>{String(mission.phase.week).padStart(2, "0")}<Text style={styles.phaseTotal}> / {String(mission.phase.totalWeeks).padStart(2, "0")}</Text></Text><Text style={styles.smallLabel}>PREPARATION WEEK</Text></View>
              <View style={styles.flex}>
                <Text style={styles.phaseTitle}>{mission.phase.name}</Text>
                <Text style={styles.body}>{mission.readiness.explanation}</Text>
              </View>
            </View>
            {wide && <CourseExplorer />}
          </View>

          <View style={[styles.sideColumn, wide && styles.sideColumnWide]}>
            <View style={styles.decision}>
              <View style={styles.decisionHeader}><Text style={styles.eyebrow}>01 / YOUR NEXT MOVE</Text><Icon name="route" size={20} color={Trail.lime} /></View>
              <Text style={styles.sampleLabel}>Illustrative recommendation · not live AI</Text>
              <Text accessibilityRole="header" style={styles.actionTitle}>{mission.today.title}</Text>
              <Text style={styles.body}>{mission.today.detail}</Text>
              <View style={styles.reason}>
                <Text style={styles.reasonTitle}>Prepare for the final descent.</Text>
                <Text style={styles.body}>The sample mission has a descending-evidence gap. Inspect the reasoning before changing a session.</Text>
              </View>
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => router.push("/(app)/plan")}>
                <Text style={styles.primaryButtonText}>Inspect sample session</Text><Icon name="chevron" size={18} color={Trail.limeInk} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showReason }} onPress={() => setShowReason(!showReason)} style={styles.explainButton}>
                <Text style={styles.explainText}>{showReason ? "Hide reasoning" : "Why this recommendation?"}</Text><Icon name={showReason ? "minus" : "plus"} size={16} color={Trail.textMuted} />
              </Pressable>
              {showReason && <View style={styles.expanded}>
                <Text style={styles.body}>{mission.today.reason}</Text>
                {mission.decisionEvidence.map((line) => <Text key={line} style={styles.evidenceLine}>— {line}</Text>)}
                <Text style={styles.warning}>All inputs are synthetic. Current fatigue, injury status and availability are unknown. No personal plan has been analyzed or changed.</Text>
              </View>}
            </View>

            <View style={styles.evidencePanel}>
              <Text style={styles.eyebrow}>02 / PREPARATION EVIDENCE</Text>
              <Text style={styles.panelIntro}>Progress, not a readiness score.</Text>
              {mission.evidence.map((item, index) => <View key={item.label}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.value}. ${item.status}. Inspect sample evidence.`} accessibilityState={{ expanded: selectedEvidence === index }} onPress={() => setSelectedEvidence(selectedEvidence === index ? null : index)} style={styles.evidenceRow}>
                  <View style={styles.flex}><Text style={styles.evidenceName}>{item.label}</Text><Text style={styles.evidenceStatus}>{item.status} · sample</Text></View>
                  <Text style={styles.evidenceValue}>{item.value}</Text><Icon name={selectedEvidence === index ? "minus" : "plus"} size={16} color={Trail.textMuted} />
                </Pressable>
                {selectedEvidence === index && <Text style={styles.evidenceDetail}>{item.detail}</Text>}
              </View>)}
            </View>
            <Pressable accessibilityRole="button" style={styles.risk} onPress={() => router.push("/(app)/race")}>
              <Text style={styles.riskLabel}>UNRESOLVED / FUEL REHEARSAL</Text>
              <Text style={styles.riskTitle}>90 minutes proven in the sample. What happens after that?</Text>
              <View style={styles.riskAction}><Text style={styles.riskLink}>Explore Race Lab</Text><Icon name="chevron" size={17} color={Trail.orange} /></View>
            </Pressable>
          </View>
        </View>
        {!wide && <CourseExplorer />}
        <View style={styles.footer}>
          <Icon name="lock" size={16} color={Trail.textMuted} />
          <Text style={styles.footerText}>Your real sources are separate from this demo. Connecting an account does not make these sample values personal data.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(app)/integrations")} style={styles.sourcesButton}><Text style={styles.sourcesText}>Manage sources</Text></Pressable>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { width: "100%", maxWidth: 1360, alignSelf: "center", paddingHorizontal: 22, paddingBottom: 140, gap: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandLockup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 30, height: 30 },
  brand: { flexShrink: 1, ...disp(22, 800), letterSpacing: 2, color: Trail.text },
  brandSub: { ...mono(10, 500), letterSpacing: 1, color: Trail.textMuted },
  profileButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Trail.lineStrong },
  previewRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  snapshot: { ...mono(11, 500), color: Trail.textMuted },
  pageHeading: { gap: 6 },
  pageTitle: { ...disp(40, 700), color: Trail.text, lineHeight: 46 },
  pageSubtitle: { ...ui(15, 500), color: Trail.textMuted, lineHeight: 23 },
  workspace: { gap: 24 },
  workspaceWide: { flexDirection: "row", alignItems: "flex-start" },
  mainColumn: { gap: 24, minWidth: 0 },
  mainColumnWide: { flex: 1.35 },
  sideColumn: { gap: 20, minWidth: 0 },
  sideColumnWide: { flex: 1 },
  phase: { flexDirection: "row", gap: 20, alignItems: "center", paddingVertical: 6 },
  phaseIndex: { borderRightWidth: 1, borderRightColor: Trail.lineStrong, paddingRight: 18, gap: 2, maxWidth: 145 },
  phaseNumber: { ...disp(38, 700), color: Trail.text },
  phaseTotal: { ...mono(13, 500), color: Trail.textMuted },
  smallLabel: { ...mono(9, 600), color: Trail.textMuted, lineHeight: 15 },
  phaseTitle: { ...disp(24, 700), color: Trail.text, marginBottom: 5 },
  flex: { flex: 1, minWidth: 0 },
  body: { ...ui(14, 500), color: Trail.textMuted, lineHeight: 22 },
  decision: { padding: 24, gap: 16, borderTopWidth: 3, borderTopColor: Trail.lime, backgroundColor: Trail.panelRaised, borderRadius: 16 },
  decisionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { ...mono(11, 700), letterSpacing: 1, color: Trail.textMuted },
  sampleLabel: { ...ui(12, 500), color: Trail.orange },
  actionTitle: { ...disp(36, 700), color: Trail.text, lineHeight: 40 },
  reason: { paddingTop: 18, gap: 6, borderTopWidth: 1, borderTopColor: Trail.lineStrong },
  reasonTitle: { ...ui(15, 600), color: Trail.text },
  primaryButton: { minHeight: 52, padding: 14, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: Trail.lime },
  primaryButtonText: { flexShrink: 1, ...ui(15, 700), color: Trail.limeInk },
  explainButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  explainText: { flexShrink: 1, ...ui(14, 600), color: Trail.text },
  expanded: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Trail.lineStrong },
  evidenceLine: { ...ui(13, 500), color: Trail.textMuted, lineHeight: 20 },
  warning: { ...ui(12, 500), color: Trail.orange, lineHeight: 19 },
  pressed: { opacity: 0.8 },
  evidencePanel: { padding: 22, borderWidth: 1, borderColor: Trail.lineStrong, borderRadius: 16, backgroundColor: Trail.panel },
  panelIntro: { ...ui(13, 500), color: Trail.textMuted, marginVertical: 12 },
  evidenceRow: { minHeight: 70, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Trail.line },
  evidenceName: { ...ui(15, 600), color: Trail.text },
  evidenceStatus: { ...ui(12, 500), color: Trail.textMuted, marginTop: 3 },
  evidenceValue: { ...mono(13, 600), color: Trail.text },
  evidenceDetail: { ...ui(13, 500), color: Trail.textMuted, lineHeight: 21, paddingBottom: 16 },
  risk: { padding: 22, gap: 12, borderLeftWidth: 2, borderLeftColor: Trail.orange, backgroundColor: Trail.orangeSoft, borderRadius: 8 },
  riskLabel: { ...mono(10, 700), color: Trail.orange, letterSpacing: 0.6 },
  riskTitle: { ...ui(16, 600), color: Trail.text, lineHeight: 24 },
  riskAction: { flexDirection: "row", alignItems: "center", gap: 8 },
  riskLink: { ...ui(14, 600), color: Trail.orange },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: Trail.lineStrong, paddingTop: 18 },
  footerText: { flex: 1, minWidth: 190, ...ui(12, 500), color: Trail.textMuted, lineHeight: 19 },
  sourcesButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  sourcesText: { ...ui(13, 600), color: Trail.lime },
});
