/**
 * Profile — the identity showcase, ported from `prototype/screens/screen-proof.jsx`.
 *
 * Full-bleed identity hero (photo + rank + progress), stat tiles, the premium
 * trophy case, and the Proof / Story / League body of work. Rank / XP / name /
 * identity / medals / active days are live; Proof / Story / League read the one
 * Forge graph. The rank-up / new-medal celebration fires on real advancement.
 */

import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

import { ChaptersView, LeagueView, ProofTimeline } from "@/components/profile/proof-story-league";
import { BottomNav } from "@/components/bottom-nav";
import { MedalCard } from "@/components/medals/medal-card";
import { Celebration, celebrationFromMoment, type CelebrationData } from "@/components/ui/celebration";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon, type IconName } from "@/components/ui/icon";
import { Bar, Panel, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { EarnedMedal, UserProfile, XPSummary } from "@/lib/api/types";
import { FLAGS } from "@/lib/flags";
import { formatShortDate } from "@/lib/format";
import { MEDAL_CATALOGUE } from "@/lib/medals";
import { detectMoment, type ProgressionSnapshot } from "@/lib/progression";
import { useAsync } from "@/lib/use-async";

const RANKS = ["Initiate", "Builder", "Forged", "Hybrid", "Warrior", "Titan", "Ascended"];

type ProofTab = "proof" | "story" | "league";
const PROOF_TABS: { id: ProofTab; label: string }[] = [
  { id: "proof", label: "Proof" },
  { id: "story", label: "Story" },
  { id: "league", label: "League" },
];

interface ProfileData {
  profile: UserProfile;
  xp: XPSummary;
  medals: EarnedMedal[];
  activeDays: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadProfile(): Promise<ProfileData> {
  const [profile, xp, medals] = await Promise.all([api.getUserProfile(), api.getXpSummary(), api.getMedals()]);
  const days = new Set<string>();
  try {
    const [sessions, nutrition] = await Promise.all([api.listTrainingSessions(60), api.listNutritionDays(40)]);
    sessions.items.forEach((s) => days.add(dayKey(new Date(s.logged_at))));
    nutrition.items.forEach((n) => days.add(dayKey(new Date(`${n.date}T12:00:00`))));
  } catch {
    // Active-days degrades to 0 if activity can't load.
  }
  return { profile, xp, medals: medals.items, activeDays: days.size };
}

function progressFraction(xp: XPSummary): number {
  if (xp.next_rank === null) return 1;
  const span = xp.rank_xp_ceiling - xp.rank_xp_floor;
  return span > 0 ? Math.min(1, Math.max(0, xp.xp_into_rank / span)) : 0;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useAsync(loadProfile);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const prevSnapshot = useRef<ProgressionSnapshot | null>(null);

  useEffect(() => {
    if (!data) return;
    const snapshot: ProgressionSnapshot = { rank: data.xp.rank, medalTypes: new Set(data.medals.map((m) => m.medal_type)) };
    const previous = prevSnapshot.current;
    prevSnapshot.current = snapshot;
    if (previous) {
      const detected = detectMoment(previous, { rank: data.xp.rank, medals: data.medals });
      if (detected) {
        const cel = celebrationFromMoment(detected);
        if (cel) setCelebration(cel);
      }
    }
  }, [data]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />}
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

        {data ? <ProfileBody data={data} topInset={insets.top} onCelebrate={setCelebration} /> : null}
      </ScrollView>
      <BottomNav />
      <Celebration data={celebration} onClose={() => setCelebration(null)} />
    </View>
  );
}

function ProfileBody({ data, topInset, onCelebrate }: { data: ProfileData; topInset: number; onCelebrate: (c: CelebrationData) => void }) {
  const router = useRouter();
  const [proofTab, setProofTab] = useState<ProofTab>("proof");
  const { profile, xp } = data;
  const earnedByType = new Map(data.medals.map((m) => [m.medal_type, m]));
  const name = profile.display_name || "Athlete";
  const identity = profile.identity_statement || "Permanent proof of the identity you are building.";

  const tiles: { l: string; v: string; i: IconName; g?: boolean }[] = [
    { l: "TOTAL XP", v: xp.total_xp.toLocaleString(), i: "bolt", g: true },
    { l: "ACTIVE DAYS", v: String(data.activeDays), i: "compass" },
    { l: "LONGEST", v: `${xp.longest_streak_days}d`, i: "flame" },
  ];

  return (
    <>
      <IdentityHero profile={profile} xp={xp} name={name} identity={identity} topInset={topInset} onSettings={() => router.push("/(app)/privacy")} />

      {/* stat tiles */}
      <View style={styles.tiles}>
        {tiles.map((s) => (
          <Panel key={s.l} style={styles.tile} pad={13}>
            <Icon name={s.i} size={15} color={s.g ? T.green : T.mut} fill={s.g} style={styles.tileIcon} />
            <Text style={[styles.tileValue, { color: s.g ? T.green : T.text }]}>{s.v}</Text>
            <Text style={styles.tileLabel}>{s.l}</Text>
          </Panel>
        ))}
      </View>

      {/* trophy case */}
      <SectionHead
        icon="trophy"
        title="TROPHY CASE"
        sub="Premium, earned the hard way"
        action={<Text style={styles.count}>{data.medals.length} / {MEDAL_CATALOGUE.length}</Text>}
      />
      <Panel style={styles.sideMargin} pad={18}>
        <View style={styles.medalGrid}>
          {MEDAL_CATALOGUE.map((def) => {
            const earned = earnedByType.get(def.type);
            return (
              <View key={def.type} style={styles.medalCell}>
                <MedalCard
                  def={def}
                  earned={Boolean(earned)}
                  size={84}
                  onPress={
                    earned
                      ? () =>
                          onCelebrate({
                            kind: "medal",
                            title: def.title,
                            line: def.condition,
                            rarity: def.rarity,
                            emblem: def.emblem,
                            when: formatShortDate(earned.earned_at.slice(0, 10)),
                            onShare: () => router.push("/(app)/recaps"),
                          })
                      : undefined
                  }
                />
              </View>
            );
          })}
        </View>
      </Panel>

      {/* proof / story / league */}
      {FLAGS.forgeAgentMock ? (
        <>
          <View style={styles.proofTabsWrap}>
            <View style={styles.proofTabs}>
              {PROOF_TABS.map((t) => {
                const on = proofTab === t.id;
                return (
                  <Text key={t.id} onPress={() => setProofTab(t.id)} style={[styles.proofTab, on ? styles.proofTabOn : styles.proofTabOff]}>
                    {t.label}
                  </Text>
                );
              })}
            </View>
          </View>
          <View style={styles.proofBody}>
            {proofTab === "proof" ? <ProofTimeline /> : proofTab === "story" ? <ChaptersView /> : <LeagueView />}
          </View>
        </>
      ) : null}
    </>
  );
}

function IdentityHero({
  profile,
  xp,
  name,
  identity,
  topInset,
  onSettings,
}: {
  profile: UserProfile;
  xp: XPSummary;
  name: string;
  identity: string;
  topInset: number;
  onSettings: () => void;
}) {
  const pct = progressFraction(xp);
  const rankIndex = Math.max(0, RANKS.indexOf(profile.rank)) + 1;
  return (
    <View style={styles.hero}>
      <HeroBackdrop tone="green" />
      <View style={styles.heroScrim} />
      <View style={[styles.heroTop, { paddingTop: topInset + 14 }]}>
        <Text style={styles.heroBrand}>STREM</Text>
        <Pressable onPress={onSettings} style={styles.heroSettings} accessibilityLabel="Privacy & settings">
          <Icon name="settings" size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.heroCaption}>
        <Text style={styles.heroRank}>
          RANK {String(rankIndex).padStart(2, "0")} · {profile.rank.toUpperCase()}
        </Text>
        <Text style={styles.heroName}>{name.toUpperCase()}</Text>
        <Text style={styles.heroIdentity} numberOfLines={2}>
          {identity}
        </Text>
        <View style={styles.heroProgress}>
          <View style={styles.heroProgressRow}>
            <Text style={styles.heroProgressLabel}>
              {xp.next_rank
                ? `${xp.xp_into_rank.toLocaleString()} / ${(xp.rank_xp_ceiling - xp.rank_xp_floor).toLocaleString()} XP TO ${xp.next_rank.toUpperCase()}`
                : "MAX RANK REACHED"}
            </Text>
            <Text style={styles.heroProgressPct}>{Math.round(pct * 100)}%</Text>
          </View>
          <Bar pct={pct} h={7} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 120 },
  center: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  muted: { ...ui(13, 500), color: T.mut, textAlign: "center" },
  errorTitle: { ...disp(20, 800), color: T.text },
  sideMargin: { marginHorizontal: 16 },

  // identity hero
  hero: { height: 320, position: "relative", overflow: "hidden", backgroundColor: "#0a0c10" },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,9,11,0.2)" },
  heroTop: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroBrand: { ...disp(13, 700), letterSpacing: 3.4, color: "#fff", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  heroSettings: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(13,16,21,0.5)", borderWidth: 1, borderColor: T.line2 },
  heroCaption: { position: "absolute", left: 18, right: 18, bottom: 16 },
  heroRank: { ...mono(10, 700), letterSpacing: 1.8, color: T.green },
  heroName: { ...disp(36, 800), color: "#fff", letterSpacing: 0.5, marginTop: 3, lineHeight: 36 },
  heroIdentity: { ...ui(13, 500), color: "#dfe4e3", marginTop: 5 },
  heroProgress: { marginTop: 13 },
  heroProgressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  heroProgressLabel: { ...mono(9, 700), letterSpacing: 0.6, color: "#cdd3d8" },
  heroProgressPct: { ...mono(9, 700), color: T.green },

  // stat tiles
  tiles: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 14 },
  tile: { flex: 1, alignItems: "center" },
  tileIcon: { marginBottom: 7 },
  tileValue: { ...disp(24, 800), lineHeight: 24 },
  tileLabel: { ...mono(8, 600), color: T.sub, letterSpacing: 0.8, marginTop: 5 },

  // trophy case
  count: { ...mono(11, 700), color: T.green },
  medalGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 20 },
  medalCell: { width: "31%", alignItems: "center" },

  // proof / story / league
  proofTabsWrap: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 },
  proofTabs: { flexDirection: "row", gap: 5, padding: 4, borderRadius: 13, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  proofTab: { flex: 1, textAlign: "center", paddingVertical: 9, borderRadius: 10, overflow: "hidden", ...ui(13, 700) },
  proofTabOn: { backgroundColor: T.green, color: "#06130D" },
  proofTabOff: { backgroundColor: "transparent", color: T.mut },
  proofBody: { paddingHorizontal: 16 },
});
