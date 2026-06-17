/**
 * Tribe — small accountability locker room, ported from
 * `design-spec/screen-tribe.jsx`. Premium re-skin over the real community API:
 * tribe power gauge, the active collective challenge, a quick check-in grid, and
 * the tribe activity timeline. No likes, no followers — just proof.
 *
 * Data is live: `getMyTribe`, `listCheckins`, `listChallenges`, `createCheckin`.
 * Join flow (no tribe yet) keeps the existing `JoinTribePanel`.
 */

/* eslint-disable react-hooks/set-state-in-effect -- the initial tribe fetch is async; setState runs in the promise, not synchronously. */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { JoinTribePanel } from "@/components/tribe/join-tribe-panel";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Bar, Btn, Chip, IconTile, Panel, ScreenHead, SectionHead } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { Challenge, ChallengeTargetType, CheckIn, CompletedAction, Tribe } from "@/lib/api/types";
import { useAuth } from "@/lib/session/auth-context";

type Status = "loading" | "no_tribe" | "pending" | "in_tribe" | "error";

const ACTIONS: { id: CompletedAction; icon: IconName; label: string }[] = [
  { id: "training", icon: "dumbbell", label: "Trained" },
  { id: "running", icon: "route", label: "Ran" },
  { id: "nutrition", icon: "leaf", label: "Fueled" },
  { id: "recovery", icon: "moon", label: "Recovered" },
  { id: "rest_day", icon: "heart", label: "Rest day" },
  { id: "nothing", icon: "minus", label: "Nothing yet" },
];
const ACTION_META: Record<CompletedAction, { icon: IconName; label: string }> = Object.fromEntries(
  ACTIONS.map((a) => [a.id, { icon: a.icon, label: a.label }]),
) as Record<CompletedAction, { icon: IconName; label: string }>;

const CHALLENGE_META: Record<ChallengeTargetType, { unit: string; icon: IconName }> = {
  training_sessions: { unit: "sessions", icon: "dumbbell" },
  running_distance_km: { unit: "km", icon: "route" },
  checkins: { unit: "check-ins", icon: "check" },
};

function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function TribeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const current = await api.getMyTribe();
      const [activity, challengePage] = await Promise.all([
        api.listCheckins(current.id),
        api.listChallenges(current.id),
      ]);
      setTribe(current);
      setCheckins(activity.items);
      setChallenges(challengePage.items);
      setStatus("in_tribe");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setStatus("no_tribe");
      else if (!(err instanceof SessionExpiredError)) setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeChallenge = challenges.find((c) => c.state === "active") ?? challenges[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={T.text} colors={[T.green]} />}
      >
        {status === "loading" ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <ActivityIndicator color={T.green} />
            <Text style={styles.muted}>Loading your tribe…</Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <Text style={styles.errTitle}>Couldn’t load your tribe</Text>
            <Btn kind="soft" label="Retry" icon="refresh" onPress={() => void load()} />
          </View>
        ) : null}

        {status === "pending" ? (
          <>
            <ScreenHead overline="Request sent" title="Tribe" />
            <Panel style={styles.sideMargin}>
              <Text style={styles.emptyTitle}>Request sent</Text>
              <Text style={styles.muted}>An admin will approve your request. Check back shortly.</Text>
              <View style={{ marginTop: 14 }}>
                <Btn kind="soft" full icon="refresh" label="Refresh" onPress={() => void load()} />
              </View>
            </Panel>
          </>
        ) : null}

        {status === "no_tribe" ? (
          <>
            <ScreenHead overline="Climb with others" title="Tribe" />
            <View style={styles.sideMargin}>
              <JoinTribePanel onPending={() => setStatus("pending")} onJoined={() => void load()} />
            </View>
          </>
        ) : null}

        {status === "in_tribe" && tribe ? (
          <InTribe
            tribe={tribe}
            checkins={checkins}
            challenge={activeChallenge}
            currentUserId={user?.user_id}
            onChanged={() => void load()}
          />
        ) : null}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function InTribe({
  tribe,
  checkins,
  challenge,
  currentUserId,
  onChanged,
}: {
  tribe: Tribe;
  checkins: CheckIn[];
  challenge: Challenge | undefined;
  currentUserId: string | undefined;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<CompletedAction | null>(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const post = async () => {
    if (!selected) return;
    setPosting(true);
    try {
      await api.createCheckin(tribe.id, { completed_action: selected });
      setPosted(true);
      onChanged();
    } catch {
      // surfaced via reload; keep the grid intact
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <ScreenHead
        overline={`${tribe.my_role} · ${tribe.member_count}/${tribe.max_members} members`}
        title="Tribe"
        action={<Chip label="PRIVATE" icon="users" color={T.red} bg={T.redSoft} border={T.redLine} iconFill={false} />}
      />

      {/* power gauge */}
      <Panel raised style={styles.sideMargin} accent={T.redLine} pad={18}>
        <MountainMark size={210} color="#9fb0a8" style={styles.gaugeWatermark} />
        <View style={styles.gaugeTop}>
          <View style={styles.shrink}>
            <Text style={styles.gaugeLabel}>YOUR TRIBE</Text>
            <Text style={styles.gaugeName}>{tribe.name.toUpperCase()}</Text>
            {tribe.mission_statement ? <Text style={styles.gaugeMission}>{tribe.mission_statement}</Text> : null}
          </View>
          <IconTile name="users" size={46} iconSize={24} color={T.red} bg={T.redSoft} border={T.redLine} />
        </View>
        <View style={styles.powerRow}>
          <Text style={styles.powerNum}>{tribe.tribe_power.toLocaleString()}</Text>
          <Text style={styles.powerLabel}>TRIBE POWER</Text>
        </View>
        <View style={styles.capRow}>
          <Text style={styles.capLabel}>CAPACITY</Text>
          <Text style={styles.capValue}>{tribe.member_count} / {tribe.max_members} · small by design</Text>
        </View>
        <View style={styles.capBar}>
          {Array.from({ length: tribe.max_members }, (_, i) => (
            <View key={i} style={[styles.capSeg, i < tribe.member_count ? styles.capSegOn : styles.capSegOff]} />
          ))}
        </View>
      </Panel>

      {/* collective challenge */}
      {challenge ? (
        <>
          <SectionHead icon="flag" title="COLLECTIVE CHALLENGE" sub={`${daysLeft(challenge.ends_at)} days left`} />
          <Panel style={styles.sideMargin} pad={16}>
            <View style={styles.chalHead}>
              <IconTile name={CHALLENGE_META[challenge.target_type].icon} size={44} iconSize={22} />
              <View style={styles.shrink}>
                <Text style={styles.chalTitle}>{challenge.title}</Text>
                <Text style={styles.chalSub}>Every logged effort counts for the group</Text>
              </View>
            </View>
            <View style={styles.chalProgRow}>
              <Text style={styles.chalCur}>
                {Math.round(challenge.current_value)}
                <Text style={styles.chalTarget}> / {challenge.target_value} {CHALLENGE_META[challenge.target_type].unit}</Text>
              </Text>
              <Text style={styles.chalPct}>{Math.round((challenge.current_value / challenge.target_value) * 100)}%</Text>
            </View>
            <Bar pct={challenge.current_value / challenge.target_value} h={8} />
          </Panel>
        </>
      ) : null}

      {/* check in */}
      <SectionHead icon="check" title="CHECK IN" sub="What did you do today?" />
      <View style={styles.sideMargin}>
        <View style={styles.actionGrid}>
          {ACTIONS.map((a) => {
            const on = selected === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  setSelected(a.id);
                  setPosted(false);
                }}
                style={[styles.actionCell, on ? styles.actionOn : styles.actionOff]}
              >
                <Icon name={a.icon} size={20} color={on ? T.green : T.mut} />
                <Text style={[styles.actionLabel, { color: on ? T.text : T.mut }]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: 12 }}>
          <Btn
            kind={selected ? "primary" : "ghost"}
            full
            icon={posted ? "check" : "send"}
            label={posted ? "Checked in" : "Post check-in"}
            onPress={post}
            loading={posting}
            disabled={!selected}
          />
        </View>
      </View>

      {/* activity timeline */}
      <SectionHead icon="users" title="TRIBE ACTIVITY" sub="No likes. No followers. Just proof." />
      <View style={[styles.sideMargin, styles.timeline]}>
        {checkins.length > 0 ? (
          <>
            <View style={styles.timelineSpine} />
            {checkins.map((c) => {
              const meta = ACTION_META[c.completed_action];
              const mine = currentUserId != null && c.user_id === currentUserId;
              return (
                <View key={c.id} style={styles.feedRow}>
                  <View style={[styles.feedDot, mine ? styles.feedDotMine : styles.feedDotOther]}>
                    <Icon name={meta.icon} size={17} color={mine ? T.green : T.mut} />
                  </View>
                  <View style={styles.shrink}>
                    <View style={styles.feedMeta}>
                      <Text style={[styles.feedWho, { color: mine ? T.green : T.text }]}>{mine ? "You" : "Tribe member"}</Text>
                      <Text style={styles.feedWhen}>{relativeTime(c.checked_in_at)}</Text>
                    </View>
                    <Text style={styles.feedNote}>{c.status_note || `${meta.label} today.`}</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <Panel>
            <Text style={styles.muted}>No check-ins yet. Be the one who starts the room moving.</Text>
          </Panel>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 124 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1, flex: 1 },
  center: { alignItems: "center", gap: 12, paddingHorizontal: 24 },
  muted: { ...ui(13, 500), color: T.mut, textAlign: "center", lineHeight: 19 },
  errTitle: { ...disp(20, 800), color: T.text },
  emptyTitle: { ...disp(20, 800), color: T.text, marginBottom: 4 },

  gaugeWatermark: { position: "absolute", top: -30, right: -60, opacity: 0.06 },
  gaugeTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  gaugeLabel: { ...mono(10, 700), letterSpacing: 1.4, color: T.sub },
  gaugeName: { ...disp(26, 800), color: T.text, letterSpacing: 0.4, marginTop: 3 },
  gaugeMission: { ...ui(12, 500), color: T.mut, marginTop: 3 },
  powerRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 16 },
  powerNum: { ...disp(44, 800), color: T.green },
  powerLabel: { ...mono(11, 700), color: T.sub, letterSpacing: 1 },
  capRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 6 },
  capLabel: { ...mono(9, 700), color: T.sub, letterSpacing: 0.8 },
  capValue: { ...mono(9, 700), color: T.mut },
  capBar: { flexDirection: "row", gap: 5 },
  capSeg: { flex: 1, height: 8, borderRadius: 3 },
  capSegOn: { backgroundColor: T.green, boxShadow: "0px 0px 6px rgba(52,226,160,0.4)" },
  capSegOff: { backgroundColor: "rgba(255,255,255,0.08)" },

  chalHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  chalTitle: { ...ui(16, 700), color: T.text },
  chalSub: { ...ui(12, 500), color: T.sub, marginTop: 1 },
  chalProgRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 14, marginBottom: 7 },
  chalCur: { ...disp(22, 800), color: T.green },
  chalTarget: { ...ui(13, 500), color: T.sub },
  chalPct: { ...mono(11, 700), color: T.mut },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  actionCell: { width: "31.5%", flexGrow: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  actionOn: { backgroundColor: T.greenSoft, borderColor: T.greenLine },
  actionOff: { backgroundColor: T.surf, borderColor: T.line },
  actionLabel: { ...ui(12, 700) },

  timeline: { position: "relative" },
  timelineSpine: { position: "absolute", left: 34, top: 8, bottom: 8, width: 2, backgroundColor: "rgba(255,255,255,0.07)" },
  feedRow: { flexDirection: "row", gap: 13, paddingVertical: 9 },
  feedDot: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, zIndex: 1 },
  feedDotMine: { backgroundColor: T.greenSoft, borderColor: T.greenLine },
  feedDotOther: { backgroundColor: T.surf2, borderColor: T.line2 },
  feedMeta: { flexDirection: "row", alignItems: "center", gap: 7 },
  feedWho: { ...ui(14, 700) },
  feedWhen: { ...mono(9, 600), color: T.sub },
  feedNote: { ...ui(13, 500), color: T.mut, marginTop: 1 },
});
