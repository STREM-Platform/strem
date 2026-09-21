import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrailAtmosphere, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { agentApi, type IntegrationSource } from "@/lib/api/agent";
import { STRAVA_CLIENT_ID, extractOAuthCode, stravaAuthUrl, stravaRedirectUri } from "@/lib/config";
import { useAsync } from "@/lib/use-async";

const CONNECTABLE = new Set(["strava"]);
const SOURCE_ICON: Record<string, IconName> = { strava: "route", whoop: "heart", health: "clock" };

export default function ConnectedSourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const { data, error, reload } = useAsync(() => agentApi.listSources());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const autoHandled = useRef(false);

  const start = (id: string) => {
    setMessage(null);
    if (!STRAVA_CLIENT_ID) {
      setMessage("Strava is not configured in this build.");
      return;
    }
    setConnecting(id);
    void Linking.openURL(stravaAuthUrl());
  };

  const finish = async (id: string, incomingCode?: string) => {
    const value = incomingCode ?? code;
    if (!value.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await agentApi.connectSource(id, extractOAuthCode(value), stravaRedirectUri());
      const result = await agentApi.syncSource(id);
      setMessage(`Connected and synced ${result.syncedSessions} session(s).`);
      setConnecting(null);
      setCode("");
      reload();
    } catch {
      setMessage("Connection failed. Re-check the authorization code and backend status.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const incoming = typeof params.code === "string" ? params.code : undefined;
    if (incoming && !autoHandled.current) {
      autoHandled.current = true;
      setConnecting("strava");
      void finish("strava", incoming).then(() => router.replace("/(app)/integrations"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handle the OAuth redirect once.
  }, [params.code]);

  const sync = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await agentApi.syncSource(id);
      setMessage(`Synced ${result.syncedSessions} session(s) and ${result.syncedRecovery} recovery sample(s).`);
      reload();
    } catch {
      setMessage("Sync failed. Existing data and permissions were not changed.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await agentApi.disconnectSource(id);
      setMessage("Source disconnected.");
      reload();
    } catch {
      setMessage("Disconnect failed. The source may still be authorized; try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/profile"))}>
          <Icon name="chevronL" size={18} color={Trail.textMuted} /><Text style={styles.backText}>Athlete</Text>
        </Pressable>

        <View>
          <Text style={trailStyles.pageOverline}>EVIDENCE SOURCES</Text>
          <Text style={trailStyles.pageTitle}>Connected data</Text>
          <Text style={trailStyles.pageSub}>Bring in signals that improve a Race Mission decision. Every connection remains optional and revocable.</Text>
        </View>

        <TrailPanel accent style={styles.principle}>
          <View style={styles.principleIcon}><Icon name="shield" size={21} color={Trail.lime} /></View>
          <View style={styles.flex}>
            <Text style={styles.principleOverline}>DATA MINIMIZATION</Text>
            <Text style={styles.principleTitle}>Useful evidence, not total surveillance.</Text>
            <Text style={styles.principleBody}>STREM should store provenance and freshness, and say when a source is missing or stale.</Text>
          </View>
        </TrailPanel>

        {message ? <TrailPanel style={styles.messagePanel}><Text style={styles.messageText}>{message}</Text></TrailPanel> : null}
        {error ? <TrailPanel style={styles.errorPanel}><Text style={styles.errorText}>Live source status could not be loaded. No connection state is being invented.</Text></TrailPanel> : null}

        <TrailSectionHead title="SOURCES" label="LIVE STATUS" icon="route" />
        <View style={styles.list}>
          {(data?.items ?? []).map((source: IntegrationSource) => (
            <TrailPanel key={source.id} style={styles.sourceCard}>
              <View style={styles.sourceTop}>
                <View style={[styles.sourceIcon, source.on && styles.sourceIconOn]}><Icon name={SOURCE_ICON[source.id] ?? "route"} size={21} color={source.on ? Trail.lime : Trail.textDim} /></View>
                <View style={styles.flex}>
                  <Text style={styles.sourceName}>{source.label}</Text>
                  <Text style={styles.sourceMetric}>{source.on ? source.metric : "Not connected"}</Text>
                </View>
                <View style={[styles.status, source.on && styles.statusOn]}><Text style={[styles.statusText, source.on && styles.statusTextOn]}>{source.on ? "CONNECTED" : "OFF"}</Text></View>
              </View>

              {source.on ? (
                <View style={styles.actions}>
                  <Pressable disabled={busy} style={styles.secondaryButton} onPress={() => void sync(source.id)}><Text style={styles.secondaryButtonText}>Sync now</Text></Pressable>
                  <Pressable disabled={busy} style={styles.dangerButton} onPress={() => void disconnect(source.id)}><Text style={styles.dangerButtonText}>Disconnect</Text></Pressable>
                </View>
              ) : CONNECTABLE.has(source.id) ? (
                connecting === source.id ? (
                  <View style={styles.connectBox}>
                    <Text style={styles.hint}>Approve in Strava. If the redirect does not complete automatically, paste its URL or authorization code.</Text>
                    <TextInput value={code} onChangeText={setCode} placeholder="Paste redirect URL or code" placeholderTextColor={Trail.textDim} autoCapitalize="none" autoCorrect={false} style={styles.input} />
                    <Pressable disabled={busy || !code.trim()} style={[styles.primaryButton, (busy || !code.trim()) && styles.disabled]} onPress={() => void finish(source.id)}><Text style={styles.primaryButtonText}>{busy ? "Connecting…" : "Finish connection"}</Text></Pressable>
                  </View>
                ) : (
                  <Pressable disabled={busy} style={styles.primaryButton} onPress={() => start(source.id)}><Text style={styles.primaryButtonText}>Connect {source.label}</Text></Pressable>
                )
              ) : (
                <Text style={styles.unavailable}>This provider needs a reviewed mobile integration before it can be enabled.</Text>
              )}
            </TrailPanel>
          ))}
          {!data && !error ? <Text style={styles.loading}>Loading live source status…</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  backText: { ...ui(12, 600), color: Trail.textMuted },
  principle: { flexDirection: "row", gap: 12 },
  principleIcon: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  principleOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.lime },
  principleTitle: { ...disp(18, 800), color: Trail.text, marginTop: 3 },
  principleBody: { ...ui(10, 500), lineHeight: 15, color: Trail.textMuted, marginTop: 4 },
  messagePanel: { backgroundColor: Trail.skySoft, borderColor: "rgba(120,199,214,0.26)" },
  messageText: { ...ui(11, 600), color: Trail.sky },
  errorPanel: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine },
  errorText: { ...ui(11, 600), lineHeight: 17, color: Trail.orange },
  list: { gap: 10 },
  sourceCard: { gap: 14 },
  sourceTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  sourceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Trail.panelSoft },
  sourceIconOn: { backgroundColor: Trail.limeSoft },
  sourceName: { ...ui(14, 700), color: Trail.text },
  sourceMetric: { ...ui(10, 500), color: Trail.textMuted, marginTop: 2 },
  status: { paddingVertical: 5, paddingHorizontal: 7, borderRadius: 8, backgroundColor: Trail.panelSoft },
  statusOn: { backgroundColor: Trail.limeSoft },
  statusText: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.5 },
  statusTextOn: { color: Trail.lime },
  actions: { flexDirection: "row", gap: 9 },
  primaryButton: { minHeight: 45, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: Trail.lime },
  primaryButtonText: { ...ui(12, 800), color: Trail.limeInk },
  secondaryButton: { flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: Trail.limeLine, backgroundColor: Trail.limeSoft },
  secondaryButtonText: { ...ui(11, 700), color: Trail.lime },
  dangerButton: { flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: Trail.orangeLine, backgroundColor: Trail.orangeSoft },
  dangerButtonText: { ...ui(11, 700), color: Trail.orange },
  connectBox: { gap: 10 },
  hint: { ...ui(10, 500), lineHeight: 16, color: Trail.textMuted },
  input: { minHeight: 47, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: Trail.lineStrong, backgroundColor: Trail.panelSoft, ...ui(13, 600), color: Trail.text },
  unavailable: { ...ui(10, 500), lineHeight: 16, color: Trail.textDim },
  loading: { ...ui(11, 500), color: Trail.textMuted, textAlign: "center", paddingVertical: 12 },
  disabled: { opacity: 0.5 },
});
