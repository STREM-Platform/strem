/**
 * Home — the Ascent hero + this-week proof, ported from
 * `design-spec/screen-home.jsx`. Full-bleed mountain hero with rank, altitude
 * track and progress, a week training ridge, this week's coached missions, and
 * an AI coach recap teaser.
 *
 * Data: rank/XP/streak from the user XP API, missions from the AI missions API,
 * the week ridge from real training sessions, the teaser from the latest recap.
 * Missions show their condition + reward only — the contract has no per-mission
 * progress field, so no progress is fabricated (gap analysis guardrail).
 */

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { AscentTrack } from "@/components/ui/ascent";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Bar, Chip, IconTile, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type {
  Mission,
  MissionType,
  TrainingSession,
  UserProfile,
  WeeklyRecap,
  XPSummary,
} from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

const RANKS = ["Initiate", "Builder", "Forged", "Hybrid", "Warrior", "Titan", "Ascended"];

interface HomeData {
  profile: UserProfile;
  xp: XPSummary;
  missions: Mission[];
  recap: WeeklyRecap | null;
  sessions: TrainingSession[];
}

async function loadHome(): Promise<HomeData> {
  const [profile, xp, missions] = await Promise.all([
    api.getUserProfile(),
    api.getXpSummary(),
    api.getActiveMissions(),
  ]);
  let recap: WeeklyRecap | null = null;
  try {
    recap = await api.getLatestRecap();
  } catch {
    recap = null;
  }
  let sessions: TrainingSession[] = [];
  try {
    sessions = (await api.listTrainingSessions(50)).items;
  } catch {
    sessions = [];
  }
  return { profile, xp, missions: missions.items, recap, sessions };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface WeekCell {
  d: string;
  on: boolean;
  type?: TrainingSession["session_type"];
}

function buildWeek(sessions: TrainingSession[]): { cells: WeekCell[]; count: number } {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const cells = labels.map((d, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const inDay = sessions.filter((s) => {
      const t = new Date(s.logged_at);
      return t >= start && t < end;
    });
    return { d, on: inDay.length > 0, type: inDay[0]?.session_type };
  });
  return { cells, count: cells.filter((c) => c.on).length };
}

const MISSION_ICON: Record<MissionType, IconName> = {
  performance: "bolt",
  discipline: "dumbbell",
  recovery: "moon",
  nutrition: "leaf",
  tribe: "users",
  hybrid: "flame",
};

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useAsync(loadHome);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />
        }
      >
        {loading && !data ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <ActivityIndicator color={T.green} />
            <Text style={styles.muted}>Loading your proof…</Text>
          </View>
        ) : null}
        {error && !data ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <Text style={styles.errorTitle}>This didn’t load</Text>
            <Text style={styles.muted}>{error}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <HeroAscent data={data} topInset={insets.top} onNav={(p) => router.push(p)} />
            <View style={styles.stack}>
              <WeekRidge
                data={data}
                onShare={() => router.push("/(app)/recaps")}
              />
              <View>
                <SectionHead
                  icon="target"
                  title="THIS WEEK’S MISSIONS"
                  sub="Coached commitments from your AI"
                  action={
                    <Pressable onPress={() => router.push("/(app)/coach")}>
                      <Text style={styles.seeAll}>SEE ALL</Text>
                    </Pressable>
                  }
                />
                <View style={styles.missions}>
                  {data.missions.length > 0 ? (
                    data.missions.slice(0, 3).map((m) => (
                      <MissionRow key={m.id} mission={m} onPress={() => router.push("/(app)/coach")} />
                    ))
                  ) : (
                    <Panel style={styles.sideMargin}>
                      <Text style={styles.emptyTitle}>No active missions yet</Text>
                      <Text style={styles.muted}>Your coach turns your logs into a clear next step.</Text>
                    </Panel>
                  )}
                </View>
              </View>
              <CoachTeaser recap={data.recap} onNav={() => router.push("/(app)/coach")} />
            </View>
          </>
        ) : null}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function HeroAscent({ data, topInset, onNav }: { data: HomeData; topInset: number; onNav: (p: "/(app)/profile") => void }) {
  const { profile, xp } = data;
  const span = xp.rank_xp_ceiling - xp.rank_xp_floor;
  const pct = span > 0 ? Math.min(1, Math.max(0, xp.xp_into_rank / span)) : 1;
  const rankIndex = Math.max(0, RANKS.indexOf(profile.rank)) + 1;
  const isMax = !xp.next_rank;
  const nextRank = xp.next_rank ?? "Summit";
  const initials = (profile.display_name || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = (profile.display_name || "Athlete").split(" ")[0];

  return (
    <View style={[styles.hero, { paddingTop: topInset + 18 }]}>
      <HeroBackdrop tone="green" />
      <MountainMark size={300} color="#9fb0a8" style={styles.watermark} />
      <LinearGradient
        colors={["rgba(8,9,11,0.55)", "rgba(8,9,11,0.12)", "rgba(8,9,11,0.5)", "#08090b"]}
        locations={[0, 0.26, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* brand + greeting */}
      <View style={styles.sideMargin}>
          <View style={styles.heroTopRow}>
            <View style={styles.brand}>
              <MountainMark size={24} />
              <Text style={styles.brandText}>STREM</Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable onPress={() => onNav("/(app)/profile")} style={styles.iconBtn} accessibilityLabel="Notifications">
                <Icon name="bell" size={17} color="#cdd3d8" />
              </Pressable>
              <Pressable onPress={() => onNav("/(app)/profile")} style={styles.avatar} accessibilityLabel="Profile">
                <Text style={styles.avatarText}>{initials || "·"}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.greeting}>{greeting()}, {firstName}.</Text>
          {profile.identity_statement ? (
            <Text style={styles.identity} numberOfLines={1}>◇ {profile.identity_statement}</Text>
          ) : null}
        </View>

        <View style={styles.heroGap} />

        {/* rank block + altitude track */}
        <View style={[styles.sideMargin, styles.rankRow]}>
          <View style={styles.shrink}>
            <Text style={styles.rankOverline}>
              RANK {String(rankIndex).padStart(2, "0")} OF {String(RANKS.length).padStart(2, "0")}
            </Text>
            <Text style={styles.rankName}>{profile.rank.toUpperCase()}</Text>
          </View>
          <AscentTrack pct={pct} nextRank={nextRank.toUpperCase()} height={104} />
        </View>

        {/* progress + chips */}
        <View style={styles.heroFooter}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel} numberOfLines={1}>
              {isMax ? (
                <Text style={styles.progressGreen}>Max rank reached</Text>
              ) : (
                <>
                  <Text style={styles.progressGreen}>{xp.xp_to_next_rank.toLocaleString()} XP</Text>
                  <Text> to {nextRank}</Text>
                </>
              )}
            </Text>
            <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
          </View>
          <Bar pct={pct} />
          <View style={styles.chips}>
            <Chip label={`${profile.total_xp.toLocaleString()} XP`} icon="bolt" />
            {xp.current_streak_days > 0 ? (
              <Chip
                label={`${xp.current_streak_days}-DAY STREAK`}
                icon="flame"
                color={T.red}
                bg={T.redSoft}
                border={T.redLine}
              />
            ) : null}
          </View>
        </View>
      </View>
  );
}

function WeekRidge({ data, onShare }: { data: HomeData; onShare: () => void }) {
  const { cells, count } = buildWeek(data.sessions);
  const target = data.profile.weekly_target_days ?? 5;
  return (
    <Panel style={styles.sideMargin} pad={15}>
      <View style={styles.ridgeHead}>
        <View style={styles.ridgeHeadLeft}>
          <Icon name="chart" size={15} color={T.green} />
          <Text style={styles.ridgeLabel}>THIS WEEK</Text>
        </View>
        <View style={styles.ridgeHeadRight}>
          <Text style={styles.ridgeCount}>
            {count}
            <Text style={styles.ridgeCountMuted}> / {target} sessions</Text>
          </Text>
          <Pressable onPress={onShare} accessibilityLabel="Share weekly recap">
            <Icon name="arrowUR" size={15} color={T.green} />
          </Pressable>
        </View>
      </View>
      <View style={styles.ridgeBars}>
        {cells.map((c, i) => (
          <View key={i} style={styles.ridgeCol}>
            <View style={[styles.ridgeBar, c.on ? styles.ridgeBarOn : styles.ridgeBarOff]}>
              {c.on ? (
                <Icon name={c.type === "running" ? "route" : "dumbbell"} size={11} color="#06130D" />
              ) : null}
            </View>
            <Text style={[styles.ridgeDay, { color: c.on ? T.mut : "#4b535a" }]}>{c.d}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function MissionRow({ mission, onPress }: { mission: Mission; onPress: () => void }) {
  const red = mission.type === "hybrid" || mission.difficulty === "challenge";
  const tone = red ? T.red : T.green;
  const icon = MISSION_ICON[mission.type] ?? "target";
  const left = daysLeft(mission.expires_at);
  return (
    <Pressable onPress={onPress} style={styles.missionCard}>
      <View style={styles.missionThumb}>
        <HeroBackdrop tone={red ? "red" : "green"} glow={false} />
        <View style={styles.missionThumbCenter}>
          <View style={[styles.missionIconTile, { borderColor: `${tone}55` }]}>
            <Icon name={icon} size={20} color={tone} />
          </View>
        </View>
      </View>
      <View style={styles.missionBody}>
        <View style={styles.missionMeta}>
          <Text style={[styles.missionType, { color: tone }]}>{mission.type.toUpperCase()}</Text>
          <Text style={styles.missionDays}>· {left}D LEFT</Text>
        </View>
        <Text style={styles.missionTitle} numberOfLines={2}>{mission.title}</Text>
        <View style={styles.missionFooter}>
          <Text style={styles.missionCond} numberOfLines={1}>{mission.completion_condition}</Text>
          <Chip
            label={`+${mission.xp_reward} XP`}
            color={tone}
            bg={red ? T.redSoft : T.greenSoft}
            border={red ? T.redLine : T.greenLine}
          />
        </View>
      </View>
    </Pressable>
  );
}

function CoachTeaser({ recap, onNav }: { recap: WeeklyRecap | null; onNav: () => void }) {
  const line = recap
    ? firstSentence(recap.narrative)
    : "Log your week — your AI coach turns it into a clear recap and next step.";
  return (
    <Panel raised style={styles.sideMargin} accent={T.greenLine} pad={0}>
      <Pressable onPress={onNav} style={styles.teaser}>
        <IconTile name="bot" size={46} iconSize={23} />
        <View style={styles.shrink}>
          <Text style={styles.teaserLabel}>AI COACH · WEEKLY RECAP</Text>
          <Text style={styles.teaserText} numberOfLines={2}>“{line}”</Text>
        </View>
        <Icon name="chevron" size={18} color={T.sub} />
      </Pressable>
    </Panel>
  );
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  const s = (match ? match[0] : text).trim();
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 116 },
  center: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  muted: { ...ui(13, 500), color: T.mut, textAlign: "center" },
  errorTitle: { ...disp(20, 800), color: T.text },
  stack: { gap: 18, marginTop: 18 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1 },

  // hero
  hero: { width: "100%", overflow: "hidden", backgroundColor: "#0a0c10" },
  watermark: { position: "absolute", top: 70, right: -70, opacity: 0.07 },
  heroGap: { height: 26 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandText: { ...disp(14, 700), letterSpacing: 3.4, color: "#fff" },
  heroActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, overflow: "hidden",
    borderWidth: 1.5, borderColor: "rgba(52,226,160,0.5)", backgroundColor: "#12161c",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { ...mono(12, 700), color: T.green },
  greeting: { ...ui(14, 700), color: "rgba(255,255,255,0.72)", marginTop: 13 },
  identity: { ...mono(11, 600), color: T.green, letterSpacing: 0.6, marginTop: 4 },
  rankRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  rankOverline: { ...mono(10, 700), color: T.sub, letterSpacing: 1.6 },
  rankName: { ...disp(62, 800), color: "#fff", lineHeight: 58, letterSpacing: 0.6, marginTop: 4 },
  heroFooter: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7, gap: 10 },
  progressLabel: { ...ui(13, 600), color: "#cdd3d8", flexShrink: 1 },
  progressGreen: { ...ui(13, 800), color: T.green },
  progressPct: { ...mono(11, 700), color: T.green },
  chips: { flexDirection: "row", gap: 8, marginTop: 12 },

  // week ridge
  ridgeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  ridgeHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  ridgeLabel: { ...mono(11, 700), letterSpacing: 1, color: T.mut },
  ridgeHeadRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  ridgeCount: { ...ui(13, 700), color: T.text },
  ridgeCountMuted: { ...ui(13, 500), color: T.sub },
  ridgeBars: { flexDirection: "row", alignItems: "flex-end", gap: 7, height: 40 },
  ridgeCol: { flex: 1, alignItems: "center", gap: 6 },
  ridgeBar: { width: "100%", borderRadius: 5, alignItems: "center", justifyContent: "flex-start", paddingTop: 4 },
  ridgeBarOn: { height: 26, backgroundColor: T.green, boxShadow: "0px 0px 10px rgba(52,226,160,0.35)" },
  ridgeBarOff: { height: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  ridgeDay: { ...mono(9, 600) },

  // missions
  seeAll: { ...mono(10, 700), color: T.green, letterSpacing: 0.8 },
  missions: { gap: 11, marginHorizontal: 16 },
  emptyTitle: { ...ui(15, 700), color: T.text, marginBottom: 4 },
  missionCard: {
    flexDirection: "row", borderRadius: 16, overflow: "hidden",
    backgroundColor: T.surf, borderWidth: 1, borderColor: T.line,
  },
  missionThumb: { width: 84, position: "relative" },
  missionThumbCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  missionIconTile: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(8,10,12,0.5)", borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  missionBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: "center" },
  missionMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 3 },
  missionType: { ...mono(9, 700), letterSpacing: 1 },
  missionDays: { ...mono(9, 600), color: T.sub },
  missionTitle: { ...ui(16, 600), color: T.text, lineHeight: 18 },
  missionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  missionCond: { ...ui(12, 500), color: T.mut, flexShrink: 1 },

  // coach teaser
  teaser: { flexDirection: "row", gap: 13, padding: 16, alignItems: "center" },
  teaserLabel: { ...mono(10, 700), letterSpacing: 1.2, color: T.green },
  teaserText: { ...ui(15, 600), color: T.text, marginTop: 3, lineHeight: 19 },
});
