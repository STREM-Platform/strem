import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/ui/fields";
import { Icon, type IconName } from "@/components/ui/icon";
import { Body, Button, Card, Chip, Divider, ErrorBanner, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { sourcesApi, type IntegrationSource } from "@/lib/api/race";
import { STRAVA_CLIENT_ID, extractOAuthCode, stravaAuthUrl, stravaRedirectUri } from "@/lib/config";
import { useRace } from "@/lib/race/race-context";

const LATER: { label: string; icon: IconName; note: string }[] = [
  { label: "Garmin, COROS, Polar, Suunto", icon: "watch", note: "Sync your watch to Strava and it reaches STREM automatically." },
  { label: "Apple Health", icon: "heart", note: "Arrives with the STREM iOS app (needs a native build)." },
  { label: "Google Health Connect", icon: "heart", note: "Arrives with the STREM Android app (needs a native build)." },
];

export default function SourcesScreen() {
  const router = useRouter();
  const race = useRace();
  const params = useLocalSearchParams<{ code?: string }>();
  const [sources, setSources] = useState<IntegrationSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const handled = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSources(await sourcesApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sources could not load.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const afterSync = useCallback(
    (sessions: number) => {
      setMessage(sessions ? `Synced ${sessions} new activit${sessions === 1 ? "y" : "ies"}. Your plan and tracker now include them.` : "Up to date — no new activities.");
      void race.refresh(["progress", "brief"], { briefRefresh: true });
    },
    [race],
  );

  const connect = useCallback(
    async (code: string) => {
      setBusy("strava");
      setMessage(null);
      setError(null);
      try {
        await sourcesApi.connect("strava", extractOAuthCode(code), stravaRedirectUri());
        setMessage("Strava connected. Importing your history — this can take a moment…");
        const result = await sourcesApi.sync("strava");
        afterSync(result.synced_sessions);
        setAwaitingCode(false);
        setPasted("");
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Connecting Strava failed. Try again.");
      } finally {
        setBusy(null);
      }
    },
    [afterSync, load],
  );

  useEffect(() => {
    const code = typeof params.code === "string" ? params.code : undefined;
    if (code && !handled.current) {
      handled.current = true;
      void connect(code).then(() => router.replace("/(app)/integrations"));
    }
  }, [params.code, connect, router]);

  const sync = async (id: string) => {
    setBusy(id);
    setMessage(null);
    setError(null);
    try {
      const result = await sourcesApi.sync(id);
      afterSync(result.synced_sessions);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync failed. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };
  const disconnect = async (id: string) => {
    setBusy(id);
    try {
      await sourcesApi.disconnect(id);
      setMessage("Disconnected. Your race team no longer reads this source. Imported activities stay until you delete them.");
      await load();
    } catch {
      setError("Disconnect failed. Retry.");
    } finally {
      setBusy(null);
    }
  };

  const strava = sources?.find((s) => s.id === "strava");
  const whoop = sources?.find((s) => s.id === "whoop");
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>Connected sources</Overline>
        <Title size={40}>Your training, counted automatically</Title>
        <Body muted>Connected activities match your plan, fill the tracker and give your race team real evidence. Each source is optional and can be disconnected anytime.</Body>
      </View>
      {message ? <Notice icon="checkCircle" tone="accent" title={message} /> : null}
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      <Card pad={18} style={{ gap: 14 }}>
        <Row gap={12}>
          <View style={[styles.logo, { backgroundColor: "#FC4C0222" }]}>
            <Icon name="route" size={22} color="#FC4C02" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ui(17, 700), { color: C.text }]}>Strava</Text>
            <Text style={[ui(13, 500), { color: C.textMuted }]}>Runs, rides, swims, hikes, races, heart rate</Text>
          </View>
          {strava?.on ? <Chip icon="check" label={`Synced ${strava.last}`} color={C.accent} bg={C.accentSoft} border={C.accentLine} /> : null}
        </Row>
        {strava?.on ? (
          <Row gap={10} wrap>
            <Button label="Sync now" icon="refresh" loading={busy === "strava"} onPress={() => void sync("strava")} />
            <Button label="Disconnect" kind="ghost" onPress={() => void disconnect("strava")} />
          </Row>
        ) : (
          <>
            <Button
              label="Connect Strava"
              icon="link"
              loading={busy === "strava"}
              disabled={!STRAVA_CLIENT_ID}
              onPress={() => {
                setAwaitingCode(true);
                void Linking.openURL(stravaAuthUrl());
              }}
            />
            {!STRAVA_CLIENT_ID ? <Text style={[ui(12, 500), { color: C.textDim }]}>Strava isn’t configured in this build (EXPO_PUBLIC_STRAVA_CLIENT_ID).</Text> : null}
            {awaitingCode ? (
              <View style={{ gap: 8 }}>
                <Text style={[ui(12, 500), { color: C.textMuted }]}>Approved in another tab? STREM picks it up automatically when Strava sends you back. If not, paste the address you landed on:</Text>
                <Row gap={8} align="flex-end">
                  <Input label="Strava redirect address" value={pasted} onChangeText={setPasted} autoCapitalize="none" placeholder="http://localhost…?code=…" />
                  <Button label="Finish" kind="secondary" onPress={() => void connect(pasted)} disabled={!pasted.trim()} />
                </Row>
              </View>
            ) : null}
          </>
        )}
        <Text style={[ui(12, 500), { color: C.textDim, lineHeight: 17 }]}>First sync imports up to a year of history. Activities you marked as “Race” in Strava can be added to your race history.</Text>
      </Card>
      <Card pad={18} style={{ gap: 10 }}>
        <Row gap={12}>
          <View style={[styles.logo, { backgroundColor: `${LAYER_COLOR.logistics}22` }]}>
            <Icon name="heart" size={22} color={LAYER_COLOR.logistics} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ui(17, 700), { color: C.text }]}>Whoop</Text>
            <Text style={[ui(13, 500), { color: C.textMuted }]}>Recovery, HRV, resting heart rate, sleep</Text>
          </View>
          {whoop?.on ? <Chip icon="check" label={`Synced ${whoop.last}`} color={C.accent} bg={C.accentSoft} border={C.accentLine} /> : null}
        </Row>
        {whoop?.on ? (
          <Row gap={10} wrap>
            <Button label="Sync now" icon="refresh" loading={busy === "whoop"} onPress={() => void sync("whoop")} />
            <Button label="Disconnect" kind="ghost" onPress={() => void disconnect("whoop")} />
          </Row>
        ) : (
          <Text style={[ui(13, 500), { color: C.textMuted }]}>Not available on this server yet — the Whoop app keys still need to be configured.</Text>
        )}
      </Card>
      <Card pad={6}>
        {LATER.map((item, i) => (
          <View key={item.label}>
            {i ? <Divider /> : null}
            <Row gap={12} style={{ padding: 12 }} align="flex-start">
              <Icon name={item.icon} size={20} color={C.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[ui(15, 700), { color: C.text }]}>{item.label}</Text>
                <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]}>{item.note}</Text>
              </View>
            </Row>
          </View>
        ))}
      </Card>
      <Text style={[ui(12, 500), { color: C.textDim }]}>No device? Log sessions from any plan session — manual evidence counts too.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  logo: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
