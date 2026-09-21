import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { agentApi, type AgentAction } from "@/lib/api/agent";
import { useAsync } from "@/lib/use-async";

export default function AIActionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useAsync(() => agentApi.getActivity(30));
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (action: AgentAction, operation: "approve" | "undo") => {
    setBusy(action.id);
    try {
      if (operation === "approve") await agentApi.approveAction(action.id);
      else await agentApi.undoAction(action.id);
      reload();
    } catch {
      Alert.alert("Action not changed", "The live AI action service could not complete this request.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={trailStyles.root}>
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/privacy"))}>
          <Icon name="chevronL" size={18} color={Trail.textMuted} />
          <Text style={styles.backText}>Data controls</Text>
        </Pressable>

        <View>
          <Text style={trailStyles.pageOverline}>AI TRANSPARENCY</Text>
          <Text style={trailStyles.pageTitle}>Action history</Text>
          <Text style={trailStyles.pageSub}>Every autonomous or proposed change should leave a receipt: what changed, why, and which evidence supported it.</Text>
        </View>

        <TrailPanel accent style={styles.trustPanel}>
          <View style={styles.trustIcon}><Icon name="lock" size={21} color={Trail.lime} /></View>
          <View style={styles.flex}>
            <Text style={styles.trustOverline}>CONTROL STAYS WITH YOU</Text>
            <Text style={styles.trustTitle}>No invisible plan changes.</Text>
            <Text style={styles.trustBody}>High-impact adaptations require approval. Completed reversible actions can be undone here.</Text>
          </View>
        </TrailPanel>

        <TrailSectionHead title="RECENT RECEIPTS" label={data ? `${data.pagination.total} TOTAL` : "LIVE DATA"} icon="bolt" />

        {error ? (
          <TrailPanel style={styles.errorPanel}>
            <Text style={styles.errorText}>Live action history could not be loaded. No sample activity is being substituted.</Text>
            <Pressable style={styles.retry} onPress={reload}><Text style={styles.retryText}>Try again</Text></Pressable>
          </TrailPanel>
        ) : null}

        {!error && !loading && data?.items.length === 0 ? (
          <TrailPanel style={styles.emptyPanel}>
            <Icon name="check" size={24} color={Trail.lime} />
            <Text style={styles.emptyTitle}>No AI actions yet</Text>
            <Text style={styles.emptyBody}>When STREM proposes or performs a Race Mission change, its reasoning and evidence will appear here.</Text>
          </TrailPanel>
        ) : null}

        <View style={styles.list}>
          {(data?.items ?? []).map((action) => (
            <TrailPanel key={action.id} style={styles.actionCard}>
              <View style={styles.actionTop}>
                <View style={[styles.statusDot, action.status === "proposed" && styles.statusProposed, action.status === "undone" && styles.statusUndone]} />
                <View style={styles.flex}>
                  <Text style={styles.actionOverline}>{action.status.toUpperCase()} · {formatTime(action.createdAt)}</Text>
                  <Text style={styles.actionTitle}>{action.summary}</Text>
                </View>
              </View>
              <Text style={styles.reason}>{action.reasoning}</Text>
              {action.citedData.length ? (
                <View style={styles.cites}>
                  {action.citedData.map((cite, index) => <Text key={`${action.id}-${index}`} style={styles.cite}>• {cite.text}</Text>)}
                </View>
              ) : null}
              {action.status === "proposed" ? (
                <Pressable disabled={busy === action.id} style={styles.primaryAction} onPress={() => void update(action, "approve")}>
                  <Text style={styles.primaryActionText}>{busy === action.id ? "Working…" : "Approve change"}</Text>
                </Pressable>
              ) : action.status === "done" ? (
                <Pressable disabled={busy === action.id} style={styles.secondaryAction} onPress={() => void update(action, "undo")}>
                  <Text style={styles.secondaryActionText}>{busy === action.id ? "Working…" : "Undo"}</Text>
                </Pressable>
              ) : null}
            </TrailPanel>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TIME UNKNOWN" : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).toUpperCase();
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  backText: { ...ui(12, 600), color: Trail.textMuted },
  trustPanel: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  trustIcon: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  trustOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.lime },
  trustTitle: { ...disp(19, 800), color: Trail.text, marginTop: 3 },
  trustBody: { ...ui(10, 500), lineHeight: 15, color: Trail.textMuted, marginTop: 4 },
  errorPanel: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine, gap: 12 },
  errorText: { ...ui(11, 600), lineHeight: 17, color: Trail.orange },
  retry: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Trail.orange },
  retryText: { ...ui(11, 700), color: Trail.limeInk },
  emptyPanel: { alignItems: "center", gap: 7, paddingVertical: 25 },
  emptyTitle: { ...disp(19, 800), color: Trail.text },
  emptyBody: { ...ui(11, 500), lineHeight: 17, color: Trail.textMuted, textAlign: "center" },
  list: { gap: 10 },
  actionCard: { gap: 11 },
  actionTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Trail.lime, marginTop: 5 },
  statusProposed: { backgroundColor: Trail.orange },
  statusUndone: { backgroundColor: Trail.textDim },
  actionOverline: { ...mono(7, 700), letterSpacing: 0.7, color: Trail.textDim },
  actionTitle: { ...ui(14, 700), lineHeight: 19, color: Trail.text, marginTop: 3 },
  reason: { ...ui(11, 500), lineHeight: 17, color: Trail.textMuted },
  cites: { gap: 4, padding: 10, borderRadius: 11, backgroundColor: Trail.panelSoft },
  cite: { ...ui(9, 500), lineHeight: 14, color: Trail.textMuted },
  primaryAction: { alignItems: "center", paddingVertical: 11, borderRadius: 11, backgroundColor: Trail.lime },
  primaryActionText: { ...ui(12, 700), color: Trail.limeInk },
  secondaryAction: { alignItems: "center", paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: Trail.lineStrong },
  secondaryActionText: { ...ui(12, 700), color: Trail.textMuted },
});
