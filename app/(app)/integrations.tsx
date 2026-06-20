/**
 * Connected sources (A3) — connect / sync / disconnect external data sources.
 *
 * Strava uses server-side OAuth: we open Strava's authorization page, the user
 * approves, Strava redirects to the configured URI with a `?code=`, and the user
 * brings that code back here. We POST it to `/v1/integrations/strava/connect`
 * (the client secret never touches the app — it lives in strem-training-service),
 * then trigger a sync. The encrypted token, registry state, and synced runs all
 * live server-side. Reached from the Privacy screen.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/components/ui/icon";
import { Btn, Chip, IconTile, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { agentApi, type IntegrationSource } from "@/lib/api/agent";
import { STRAVA_CLIENT_ID, extractOAuthCode, stravaAuthUrl, stravaRedirectUri } from "@/lib/config";
import { useAsync } from "@/lib/use-async";

const CONNECTABLE = new Set(["strava"]);
const ICON_FOR: Record<string, IconName> = { strava: "route", whoop: "heart", health: "clock" };

export default function IntegrationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const { data: sources, reload } = useAsync(() => agentApi.listSources());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const autoHandled = useRef(false);

  const start = (id: string) => {
    setMsg(null);
    if (!STRAVA_CLIENT_ID) {
      setMsg("Set EXPO_PUBLIC_STRAVA_CLIENT_ID in strem-mobile/.env, then restart Expo.");
      return;
    }
    setConnecting(id);
    void Linking.openURL(stravaAuthUrl());
  };

  const finish = async (id: string, rawCode?: string) => {
    const value = rawCode ?? code;
    if (!value.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await agentApi.connectSource(id, extractOAuthCode(value), stravaRedirectUri());
      const res = await agentApi.syncSource(id);
      setMsg(`Connected · synced ${res.syncedSessions} session(s), ${res.syncedRecovery} recovery.`);
      setConnecting(null);
      setCode("");
      reload();
    } catch {
      setMsg("Couldn't connect — re-check the code and that the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  // Strava redirected back here with ?code= (web): finish automatically, then
  // strip the code from the URL so a refresh doesn't replay it.
  useEffect(() => {
    const incoming = typeof params.code === "string" ? params.code : undefined;
    if (incoming && !autoHandled.current) {
      autoHandled.current = true;
      setConnecting("strava");
      void finish("strava", incoming).then(() => router.replace("/(app)/integrations"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on the redirect param
  }, [params.code]);

  const sync = async (id: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await agentApi.syncSource(id);
      setMsg(`Synced ${res.syncedSessions} session(s), ${res.syncedRecovery} recovery.`);
      reload();
    } catch {
      setMsg("Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (id: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await agentApi.disconnectSource(id);
      reload();
    } catch {
      setMsg("Disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/privacy"))}
          style={styles.back}
        >
          ‹ Privacy
        </Text>

        <SectionHead icon="route" title="CONNECTED SOURCES" sub="What Forge can pull in for you" />

        {msg ? (
          <Panel style={styles.msg} pad={12}>
            <Text style={styles.msgText}>{msg}</Text>
          </Panel>
        ) : null}

        {(sources?.items ?? []).map((s: IntegrationSource) => (
          <Panel key={s.id} style={styles.card} pad={14}>
            <View style={styles.row}>
              <IconTile name={ICON_FOR[s.id] ?? "route"} />
              <View style={styles.meta}>
                <Text style={styles.label}>{s.label}</Text>
                <Text style={styles.metric}>{s.metric}</Text>
              </View>
              <Chip
                label={s.on ? `On · ${s.last}` : "Off"}
                color={s.on ? T.green : T.mut}
                bg={s.on ? T.greenSoft : T.surf2}
                border={s.on ? T.greenLine : T.line2}
              />
            </View>

            {s.on ? (
              <View style={styles.actions}>
                <Btn label="Sync now" icon="refresh" kind="ghost" onPress={() => sync(s.id)} loading={busy} />
                <Btn label="Disconnect" kind="danger" onPress={() => disconnect(s.id)} disabled={busy} />
              </View>
            ) : CONNECTABLE.has(s.id) ? (
              connecting === s.id ? (
                <View style={styles.connectBox}>
                  <Text style={styles.hint}>
                    Approve in Strava — it connects automatically when you land back here. If it
                    does not, paste the redirect URL (or just the code) below.
                  </Text>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="paste ?code=… or the code"
                    placeholderTextColor={T.mut}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <Btn label="Finish connecting" icon="check" onPress={() => finish(s.id)} loading={busy} disabled={!code.trim()} full />
                </View>
              ) : (
                <View style={styles.actions}>
                  <Btn label={`Connect ${s.label}`} icon="bolt" onPress={() => start(s.id)} />
                </View>
              )
            ) : (
              <Text style={styles.soon}>Connect from the app coming soon.</Text>
            )}
          </Panel>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 18, gap: 14 },
  back: { ...mono(12), color: T.mut, marginBottom: 4 },
  msg: { backgroundColor: T.surf2 },
  msgText: { ...ui(13), color: T.text },
  card: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  meta: { flex: 1, gap: 2 },
  label: { ...disp(16), color: T.text },
  metric: { ...mono(11), color: T.mut },
  actions: { flexDirection: "row", gap: 10 },
  connectBox: { gap: 10 },
  hint: { ...ui(12), color: T.sub },
  input: {
    ...ui(14),
    color: T.text,
    backgroundColor: T.surf2,
    borderWidth: 1,
    borderColor: T.line2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  soon: { ...mono(11), color: T.mut },
});
