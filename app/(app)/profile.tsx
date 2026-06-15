/**
 * Profile — progression showcase + trophy case + celebration, ported from
 * `design-spec/screen-profile.jsx`. Rank ring, identity, stat tiles, a real
 * consistency calendar, the premium medal trophy case (Medal engine from step 2),
 * a recap teaser, and the accountability reminders card (existing feature, kept).
 *
 * Data is live: rank/XP/streak from the XP API, earned medals from the medals
 * API, and the consistency calendar from real training + nutrition activity
 * dates. Locked medals show as aspiration with static display metadata only — no
 * fabricated progress. The rank-up / new-medal celebration fires once when a
 * reload reveals real advancement (unchanged mechanism).
 */

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

import { BottomNav } from "@/components/bottom-nav";
import { MedalCard } from "@/components/medals/medal-card";
import { NotificationsCard } from "@/components/notifications-card";
import { Celebration, celebrationFromMoment, type CelebrationData } from "@/components/ui/celebration";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel, SectionHead } from "@/components/ui/primitives";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { EarnedMedal, XPSummary } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { MEDAL_CATALOGUE } from "@/lib/medals";
import { detectMoment, type ProgressionSnapshot } from "@/lib/progression";
import { useAsync } from "@/lib/use-async";

const RANKS = ["Initiate", "Builder", "Forged", "Hybrid", "Warrior", "Titan", "Ascended"];

interface ProfileData {
  xp: XPSummary;
  medals: EarnedMedal[];
  activeDates: Set<string>;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadProfile(): Promise<ProfileData> {
  const [xp, medals] = await Promise.all([api.getXpSummary(), api.getMedals()]);
  const activeDates = new Set<string>();
  try {
    const [sessions, nutrition] = await Promise.all([
      api.listTrainingSessions(60),
      api.listNutritionDays(40),
    ]);
    sessions.items.forEach((s) => activeDates.add(dayKey(new Date(s.logged_at))));
    nutrition.items.forEach((n) => activeDates.add(dayKey(new Date(`${n.date}T12:00:00`))));
  } catch {
    // Calendar degrades to "no recorded activity" if these fail.
  }
  return { xp, medals: medals.items, activeDates };
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
    const snapshot: ProgressionSnapshot = {
      rank: data.xp.rank,
      medalTypes: new Set(data.medals.map((m) => m.medal_type)),
    };
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

  const earnedByType = new Map((data?.medals ?? []).map((m) => [m.medal_type, m]));
  const earnedCount = data?.medals.length ?? 0;

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
          <ProfileBody
            data={data}
            topInset={insets.top}
            earnedByType={earnedByType}
            earnedCount={earnedCount}
            onCelebrate={setCelebration}
          />
        ) : null}
      </ScrollView>
      <BottomNav />
      <Celebration data={celebration} onClose={() => setCelebration(null)} />
    </View>
  );
}

function ProfileBody({
  data,
  topInset,
  earnedByType,
  earnedCount,
  onCelebrate,
}: {
  data: ProfileData;
  topInset: number;
  earnedByType: Map<string, EarnedMedal>;
  earnedCount: number;
  onCelebrate: (c: CelebrationData) => void;
}) {
  const { xp } = data;
  const pct = progressFraction(xp);
  const rankIndex = Math.max(0, RANKS.indexOf(xp.rank)) + 1;
  const identity = "Permanent proof of the identity you are building.";

  return (
    <>
      {/* header */}
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{rankIndex.toString().padStart(2, "0")}</Text>
          </View>
          <View style={styles.shrink}>
            <Text style={styles.name}>{xp.rank.toUpperCase()}</Text>
            <Text style={styles.handle}>RANK {String(rankIndex).padStart(2, "0")} OF {String(RANKS.length).padStart(2, "0")}</Text>
          </View>
        </View>
        <View style={styles.settingsTile}>
          <Icon name="settings" size={18} color={T.mut} />
        </View>
      </View>

      {/* rank showcase */}
      <Panel raised style={[styles.sideMargin, styles.showcase]} accent={T.greenLine} pad={0}>
        <View style={styles.showcaseInner}>
          <HeroBackdrop tone="green" />
          <View style={styles.showcaseRow}>
            <Ring size={120} stroke={11} pct={pct}>
              <Text style={styles.ringRank}>RANK {String(rankIndex).padStart(2, "0")}</Text>
              <Text style={styles.ringName}>{xp.rank.toUpperCase()}</Text>
              <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
            </Ring>
            <View style={styles.showcaseCopy}>
              <Text style={styles.showcaseLabel}>IDENTITY</Text>
              <Text style={styles.showcaseIdentity}>{identity}</Text>
              {xp.next_rank ? (
                <Pressable
                  style={styles.previewBtn}
                  onPress={() =>
                    onCelebrate({
                      kind: "rank",
                      title: xp.next_rank as string,
                      line: "A preview of your next unlock. Keep climbing to make it real.",
                    })
                  }
                >
                  <Text style={styles.previewText}>PREVIEW {xp.next_rank.toUpperCase()} UNLOCK</Text>
                  <Icon name="arrowUR" size={12} color={T.green} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Panel>

      {/* stat tiles */}
      <View style={[styles.sideMargin, styles.tiles]}>
        <StatTile icon="bolt" green value={xp.total_xp.toLocaleString()} label="TOTAL XP" />
        <StatTile icon="trophy" value={`${earnedCount}`} label="MEDALS" />
        <StatTile icon="flame" value={`${xp.longest_streak_days}d`} label="LONGEST" />
      </View>

      {/* consistency */}
      <SectionHead icon="flame" title="CONSISTENCY" />
      <StreakCalendar activeDates={data.activeDates} xp={xp} />

      {/* trophy case */}
      <SectionHead
        icon="trophy"
        title="TROPHY CASE"
        sub="Premium, earned the hard way"
        action={<Text style={styles.count}>{earnedCount} / {MEDAL_CATALOGUE.length}</Text>}
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
                          })
                      : undefined
                  }
                />
              </View>
            );
          })}
        </View>
      </Panel>

      {/* recap teaser */}
      <SectionHead icon="sparkles" title="SHARE YOUR PROOF" sub="Story-ready recaps" />
      <Panel raised style={styles.sideMargin} accent={T.greenLine} pad={0}>
        <View style={styles.teaser}>
          <View style={styles.teaserTile}>
            <Icon name="sparkles" size={23} color={T.green} />
          </View>
          <View style={styles.shrink}>
            <Text style={styles.teaserTitle}>Create a recap</Text>
            <Text style={styles.teaserSub}>Weekly, monthly, PRs & medals — built for stories. Coming soon.</Text>
          </View>
          <Icon name="chevron" size={18} color={T.sub} />
        </View>
      </Panel>

      {/* accountability (existing feature, kept) */}
      <SectionHead icon="bell" title="ACCOUNTABILITY" sub="Reminders that keep you honest" />
      <View style={styles.sideMargin}>
        <NotificationsCard xp={xp} />
      </View>
    </>
  );
}

function StatTile({ icon, value, label, green }: { icon: IconName; value: string; label: string; green?: boolean }) {
  return (
    <Panel style={styles.tile} pad={13}>
      <Icon name={icon} size={15} color={green ? T.green : T.mut} fill={green} />
      <Text style={[styles.tileValue, { color: green ? T.green : T.text }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Panel>
  );
}

function StreakCalendar({ activeDates, xp }: { activeDates: Set<string>; xp: XPSummary }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (34 - i));
    const on = activeDates.has(dayKey(d));
    const inStreak = i > 34 - xp.current_streak_days;
    return { on, inStreak, isToday: i === 34 };
  });
  const statusLine =
    xp.streak_state === "active"
      ? `${xp.current_streak_days}-day streak active`
      : xp.streak_state === "at_risk"
        ? `${xp.current_streak_days}-day streak · at risk`
        : xp.current_streak_days > 0
          ? `${xp.current_streak_days}-day streak`
          : "No active streak";

  return (
    <Panel style={styles.sideMargin} pad={15}>
      <View style={styles.calHead}>
        <Text style={styles.calLabel}>LAST 5 WEEKS</Text>
        <Text style={styles.calStatus}>{statusLine}</Text>
      </View>
      <View style={styles.calGrid}>
        {cells.map((c, i) => (
          <View key={i} style={styles.calCellWrap}>
            <View
              style={[
                styles.calSquare,
                c.on ? (c.inStreak ? styles.calOnStreak : styles.calOn) : styles.calOff,
                c.isToday ? styles.calToday : null,
              ]}
            />
          </View>
        ))}
      </View>
    </Panel>
  );
}

const CELL_GAP = 6;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 124 },
  center: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  muted: { ...ui(13, 500), color: T.mut, textAlign: "center" },
  errorTitle: { ...disp(20, 800), color: T.text },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, gap: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: T.greenLine,
    backgroundColor: "#12161c", alignItems: "center", justifyContent: "center",
  },
  avatarText: { ...disp(18, 800), color: T.green },
  name: { ...disp(22, 800), color: T.text, letterSpacing: 0.5 },
  handle: { ...mono(11, 600), color: T.sub, marginTop: 2 },
  settingsTile: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: T.surf,
    borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center",
  },

  showcase: { marginTop: 18 },
  showcaseInner: { padding: 18, overflow: "hidden" },
  showcaseRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringRank: { ...mono(8, 700), color: T.green, letterSpacing: 1 },
  ringName: { ...disp(22, 800), color: "#fff", marginTop: 1 },
  ringPct: { ...mono(10, 700), color: T.green, marginTop: 3 },
  showcaseCopy: { flex: 1 },
  showcaseLabel: { ...mono(10, 700), letterSpacing: 1.2, color: T.sub },
  showcaseIdentity: { ...ui(16, 700), color: T.text, marginTop: 4, lineHeight: 21 },
  previewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11, alignSelf: "flex-start",
    borderWidth: 1, borderColor: T.greenLine, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 9,
  },
  previewText: { ...mono(10, 700), letterSpacing: 0.8, color: T.green },

  tiles: { flexDirection: "row", gap: 10, marginTop: 12 },
  tile: { flex: 1, alignItems: "center" },
  tileValue: { ...disp(24, 800), marginTop: 7 },
  tileLabel: { ...mono(8, 600), color: T.sub, letterSpacing: 0.8, marginTop: 5 },

  calHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  calLabel: { ...mono(10, 700), letterSpacing: 1, color: T.mut },
  calStatus: { ...ui(12, 600), color: T.green },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: CELL_GAP / 2 },
  calSquare: { flex: 1, borderRadius: 5, borderWidth: 1, borderColor: "transparent" },
  calOff: { backgroundColor: "rgba(255,255,255,0.05)" },
  calOn: { backgroundColor: T.greenSoft, borderColor: T.greenLine },
  calOnStreak: { backgroundColor: T.green, borderColor: T.greenLine, boxShadow: "0px 0px 6px rgba(52,226,160,0.4)" },
  calToday: { borderColor: "#fff", borderWidth: 1.5 },

  count: { ...mono(11, 700), color: T.green },
  medalGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 20 },
  medalCell: { width: "31%", alignItems: "center" },

  teaser: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16 },
  teaserTile: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: T.greenSoft,
    borderWidth: 1, borderColor: T.greenLine, alignItems: "center", justifyContent: "center",
  },
  teaserTitle: { ...ui(15, 700), color: T.text },
  teaserSub: { ...ui(12, 500), color: T.sub, marginTop: 2, lineHeight: 16 },
});
