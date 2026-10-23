import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Body, Button, Card, Divider, ListRow, Overline, Page, Row, StatTile, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { checkinsApi, historyApi, sourcesApi, type Checkin, type IntegrationSource, type RaceResult } from "@/lib/api/race";
import type { AthleteProfile, UserProfile } from "@/lib/api/types";
import { todayIn } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";
import { useAuth } from "@/lib/session/auth-context";

export default function AthleteScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const race = useRace();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [races, setRaces] = useState<RaceResult[]>([]);
  const [sources, setSources] = useState<IntegrationSource[]>([]);
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);

  const load = useCallback(async () => {
    const [p, a, r, s, c] = await Promise.allSettled([api.getUserProfile(), api.getAthleteProfile(), historyApi.list(), sourcesApi.list(), checkinsApi.list(7)]);
    if (p.status === "fulfilled") setProfile(p.value);
    if (a.status === "fulfilled") setAthlete(a.value);
    if (r.status === "fulfilled") setRaces(r.value);
    if (s.status === "fulfilled") setSources(s.value);
    setCheckins(c.status === "fulfilled" ? c.value : []);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const finished = races.filter((r) => r.status === "finished");
  const longest = finished.reduce<RaceResult | null>((best, r) => ((r.distance_km ?? 0) > (best?.distance_km ?? 0) ? r : best), null);
  const connected = sources.filter((s) => s.on);
  const today = todayIn(race.mission?.event.timezone);
  const checkedToday = checkins?.some((c) => c.day === today) ?? false;

  return (
    <Page>
      <View style={{ gap: 6 }}>
        <Overline>Athlete</Overline>
        <Title size={40}>{profile?.display_name || "You"}</Title>
        <Body muted>Everything STREM knows about you — and what your race team may use. You can correct or delete any of it.</Body>
      </View>
      <Row gap={10} wrap>
        <StatTile label="Races finished" value={String(finished.length)} note={races.length > finished.length ? `${races.length - finished.length} DNF/DNS` : undefined} />
        <StatTile label="Longest race" value={longest?.distance_km ? String(longest.distance_km) : "–"} unit={longest ? "km" : undefined} note={longest?.name} />
        <StatTile label="Connected" value={String(connected.length)} note={connected.map((s) => s.label).join(", ") || "manual only"} />
      </Row>
      {checkins && !checkedToday ? (
        <Card tone="accent" pad={16}>
          <Row gap={12}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[ui(15, 700), { color: C.text }]}>60-second check-in</Text>
              <Text style={[ui(13, 500), { color: C.textMuted }]}>Sleep, energy, soreness — your race team adapts to how you actually feel.</Text>
            </View>
            <Button label="Check in" size="sm" onPress={() => router.push("/(app)/checkin")} />
          </Row>
        </Card>
      ) : null}
      <Card pad={6}>
        <ListRow icon="trophy" iconColor={LAYER_COLOR.strategy} title="Race history" subtitle={races.length ? `${races.length} races · latest ${races[0]?.name}` : "Add past races so your team learns from them"} onPress={() => router.push("/(app)/history")} />
        <Divider />
        <ListRow icon="flag" iconColor={C.flame} title="My races" subtitle={race.missions.length ? `${race.missions.length} active mission${race.missions.length === 1 ? "" : "s"}` : "No active mission"} onPress={() => router.push("/(app)/missions")} />
        <Divider />
        <ListRow icon="watch" iconColor={LAYER_COLOR.training} title="Connected sources" subtitle={connected.length ? connected.map((s) => `${s.label} · synced ${s.last}`).join(" · ") : "Connect Strava so training counts automatically"} onPress={() => router.push("/(app)/integrations")} />
        <Divider />
        <ListRow
          icon="heart"
          iconColor={LAYER_COLOR.logistics}
          title="Check-ins"
          subtitle={checkins?.length ? `${checkins.length} in the last week${checkedToday ? " · done today" : ""}` : "No check-ins yet"}
          onPress={() => router.push("/(app)/checkin")}
        />
        <Divider />
        <ListRow
          icon="user"
          iconColor={LAYER_COLOR.gear}
          title="Body & health basics"
          subtitle={athlete?.is_started ? [athlete.weight_kg ? `${athlete.weight_kg} kg` : null, athlete.years_training != null ? `${athlete.years_training} years training` : null, athlete.injuries.length ? `${athlete.injuries.length} injury note(s)` : null].filter(Boolean).join(" · ") || "Started" : "Weight sets fueling grams; injuries shape the plan"}
          onPress={() => router.push("/(app)/athlete-profile")}
        />
      </Card>
      <Card pad={6}>
        <ListRow icon="database" title="Mission data & export" subtitle="Download or delete your race data" onPress={() => router.push("/(app)/mission-data")} />
        <Divider />
        <ListRow icon="shield" title="Privacy policy" onPress={() => router.push("/(legal)/privacy")} />
        <Divider />
        <ListRow icon="info" title="Terms & medical disclaimer" onPress={() => router.push("/(legal)/terms")} />
      </Card>
      {checkins?.[0]?.updated_at ? <Text style={[ui(12, 500), { color: C.textDim }]}>Last check-in {checkins[0].day}</Text> : null}
      <Button label="Sign out" kind="ghost" icon="logout" onPress={() => void signOut()} style={{ alignSelf: "flex-start" }} />
    </Page>
  );
}
