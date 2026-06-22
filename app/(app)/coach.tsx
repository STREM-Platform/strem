/**
 * Coach — "Forge": the AI brain, a primary surface.
 *
 * One agent, three ways in: Chat (B1/B6 omniscient, cited), Plan (B4 adaptive
 * missions + import-a-plan-from-image → adapt), Insights (B8 cross-domain
 * correlations). All read the one assembled context (A6). The weekly-recap and
 * mission endpoints stay live behind Home's teaser and the recaps screen; here
 * Forge is the standing agent, not a one-shot recap reader.
 *
 * Reachable as a bottom-nav tab and as a pushed route from Today's teasers.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatView, InsightsView, PlanView } from "@/components/agent/forge-coach";
import { BottomNav } from "@/components/bottom-nav";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { FLAGS } from "@/lib/flags";

type CoachMode = "chat" | "plan" | "insights";
const TABS: { id: CoachMode; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "plan", label: "Plan" },
  { id: "insights", label: "Insights" },
];

export default function CoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CoachMode>("chat");
  const navClearance = Math.max(insets.bottom, 12) + 74;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/home"))} style={styles.back}>
            <Icon name="chevronL" size={20} color={T.mut} />
            <Text style={styles.backText}>Home</Text>
          </Pressable>
          <View style={styles.identity}>
            <IconTile name="bot" size={34} iconSize={18} />
            <View>
              <Text style={styles.identityName}>FORGE</Text>
              <Text style={styles.identityRole}>AI COACH</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/(app)/recaps")} style={styles.actionBtn} accessibilityLabel="Weekly recaps">
              <Icon name="star" size={18} color={T.sub} />
            </Pressable>
            <Pressable onPress={() => router.push("/(app)/privacy")} style={styles.actionBtn} accessibilityLabel="What your coach sees">
              <Icon name="lock" size={18} color={T.sub} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Reading Whoop · Strava · Health · 47 days of logs</Text>
        </View>

        <View style={styles.segment}>
          {TABS.map((t) => {
            const on = mode === t.id;
            return (
              <Text key={t.id} onPress={() => setMode(t.id)} style={[styles.seg, on ? styles.segOn : styles.segOff]}>
                {t.label}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={[styles.body, { paddingBottom: navClearance }]}>
        {!FLAGS.forgeAgentMock ? (
          <View style={styles.off}>
            <Text style={styles.offText}>Forge is warming up.</Text>
          </View>
        ) : mode === "chat" ? (
          <ChatView />
        ) : mode === "plan" ? (
          <PlanView />
        ) : (
          <InsightsView />
        )}
      </View>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.line, backgroundColor: "#0d1015" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { flexDirection: "row", alignItems: "center", gap: 6, width: 64 },
  backText: { ...ui(13, 600), color: T.mut },
  identity: { flexDirection: "row", alignItems: "center", gap: 8 },
  identityName: { ...disp(16, 800), color: T.text, letterSpacing: 0.6, lineHeight: 16 },
  identityRole: { ...mono(8, 700), letterSpacing: 0.8, color: T.green },
  headerActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, minWidth: 64 },
  actionBtn: { padding: 5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginVertical: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.green, boxShadow: "0px 0px 8px #34E2A0" },
  statusText: { ...mono(9, 600), letterSpacing: 0.4, color: T.sub },
  segment: { flexDirection: "row", gap: 5, padding: 4, borderRadius: 13, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  seg: { flex: 1, textAlign: "center", paddingVertical: 9, borderRadius: 10, overflow: "hidden", ...ui(13, 700) },
  segOn: { backgroundColor: T.green, color: "#06130D" },
  segOff: { backgroundColor: "transparent", color: T.mut },
  body: { flex: 1 },
  off: { flex: 1, alignItems: "center", justifyContent: "center" },
  offText: { ...ui(14, 600), color: T.mut },
});
