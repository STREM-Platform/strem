import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { MissionHero, PrototypeLabel, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { TRAIL_MISSION_PREVIEW, daysUntilRace } from "@/lib/trail/mission-preview";
import { syncConnectedSources } from "@/lib/sync-sources";

export default function MissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mission = TRAIL_MISSION_PREVIEW;

  useEffect(() => {
    void syncConnectedSources();
  }, []);

  return (
    <View style={trailStyles.root}>
      <ScrollView
        contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandLockup}>
            <BrandLogo variant="symbol" style={styles.brandMark} />
            <View>
              <Text style={styles.brand}>STREM</Text>
              <Text style={styles.brandSub}>TRAIL RACE TEAM</Text>
            </View>
          </View>
          <Pressable style={styles.profileButton} onPress={() => router.push("/(app)/profile")}>
            <Icon name="shield" size={19} color={Trail.textMuted} />
          </Pressable>
        </View>

        <PrototypeLabel />
        <MissionHero days={daysUntilRace()} />

        <View style={styles.phaseBlock}>
          <View style={trailStyles.between}>
            <View>
              <Text style={styles.phaseOverline}>WEEK {mission.phase.week} OF {mission.phase.totalWeeks}</Text>
              <Text style={styles.phaseTitle}>{mission.phase.name}</Text>
            </View>
            <View style={styles.readinessPill}>
              <Text style={styles.readinessScore}>{mission.readiness.score}</Text>
              <Text style={styles.readinessLabel}>{mission.readiness.label.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${mission.phase.completion * 100}%` }]} />
          </View>
          <Text style={styles.readinessCopy}>{mission.readiness.explanation}</Text>
        </View>

        <TrailSectionHead title="TODAY'S DECISION" label="AI RACE TEAM" icon="bot" />
        <TrailPanel accent>
          <Text style={styles.actionOverline}>{mission.today.overline.toUpperCase()}</Text>
          <Text style={styles.actionTitle}>{mission.today.title}</Text>
          <Text style={styles.actionDetail}>{mission.today.detail}</Text>
          <View style={styles.reasonBox}>
            <Icon name="sparkles" size={16} color={Trail.lime} />
            <Text style={styles.reasonText}>{mission.today.reason}</Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.primaryButton} onPress={() => router.push("/(app)/plan")}>
              <Text style={styles.primaryButtonText}>Open session</Text>
              <Icon name="chevron" size={17} color={Trail.limeInk} />
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/(app)/coach")}>
              <Text style={styles.secondaryButtonText}>Ask why</Text>
            </Pressable>
          </View>
        </TrailPanel>

        <TrailSectionHead title="MISSION EVIDENCE" label="NOT VANITY METRICS" icon="target" />
        <View style={styles.evidenceGrid}>
          {mission.evidence.map((item) => {
            const risk = item.status === "Needs proof";
            return (
              <TrailPanel key={item.label} style={styles.evidenceCard}>
                <Text style={styles.evidenceLabel}>{item.label.toUpperCase()}</Text>
                <Text style={styles.evidenceValue}>{item.value}</Text>
                <Text style={[styles.evidenceStatus, risk && styles.evidenceRisk]}>{item.status}</Text>
              </TrailPanel>
            );
          })}
        </View>

        <Pressable style={styles.raceLabLink} onPress={() => router.push("/(app)/race")}>
          <View style={styles.raceLabIcon}>
            <Icon name="mountain" size={21} color={Trail.orange} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.raceLabOverline}>UNRESOLVED RACE RISK</Text>
            <Text style={styles.raceLabTitle}>Fueling has not been proven beyond 90 minutes.</Text>
          </View>
          <Icon name="chevron" size={18} color={Trail.textDim} />
        </Pressable>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 30, height: 30 },
  brand: { ...disp(17, 800), letterSpacing: 2.4, color: Trail.text, lineHeight: 18 },
  brandSub: { ...mono(7, 700), letterSpacing: 1.1, color: Trail.lime, marginTop: 2 },
  profileButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Trail.line, backgroundColor: Trail.panel },
  phaseBlock: { gap: 11, paddingHorizontal: 2 },
  phaseOverline: { ...mono(9, 700), letterSpacing: 1, color: Trail.lime },
  phaseTitle: { ...disp(22, 800), color: Trail.text, marginTop: 2 },
  readinessPill: { flexDirection: "row", alignItems: "baseline", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  readinessScore: { ...disp(22, 800), color: Trail.lime },
  readinessLabel: { ...mono(8, 700), letterSpacing: 0.7, color: Trail.textMuted },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Trail.panelSoft, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: Trail.lime },
  readinessCopy: { ...ui(12, 500), lineHeight: 18, color: Trail.textMuted },
  actionOverline: { ...mono(9, 700), letterSpacing: 1.2, color: Trail.lime },
  actionTitle: { ...disp(28, 800), color: Trail.text, marginTop: 4 },
  actionDetail: { ...ui(13, 600), color: Trail.textMuted, marginTop: 2 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 13, backgroundColor: Trail.limeSoft, marginTop: 16 },
  reasonText: { flex: 1, ...ui(12, 500), color: Trail.text, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryButton: { flex: 1, minHeight: 47, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: Trail.lime },
  primaryButtonText: { ...ui(14, 700), color: Trail.limeInk },
  secondaryButton: { minHeight: 47, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Trail.lineStrong },
  secondaryButtonText: { ...ui(13, 700), color: Trail.text },
  evidenceGrid: { flexDirection: "row", gap: 9 },
  evidenceCard: { flex: 1, minWidth: 0, padding: 12 },
  evidenceLabel: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.6 },
  evidenceValue: { ...disp(17, 800), color: Trail.text, marginTop: 8 },
  evidenceStatus: { ...ui(10, 600), color: Trail.lime, marginTop: 5 },
  evidenceRisk: { color: Trail.orange },
  raceLabLink: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: Trail.orangeSoft, borderWidth: 1, borderColor: Trail.orangeLine },
  raceLabIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,138,76,0.08)" },
  raceLabOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.orange },
  raceLabTitle: { ...ui(12, 600), color: Trail.text, lineHeight: 17, marginTop: 2 },
  flex: { flex: 1 },
});
