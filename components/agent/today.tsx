/**
 * Today (Home) AI surfaces — ported from `prototype/screens/screen-home-ai.jsx`.
 *
 *  - ProactiveCheckin : the 06:48 nudge + 10-second check-in (Phase 6). Submitting
 *    it records a readiness update in the agent Activity feed.
 *  - TodaysClimb      : readiness ring + the one coached action + the data behind
 *    the call (C2). The action photo degrades to a HeroBackdrop.
 *  - CoachSees        : "What your coach sees" — connected sources + live signals,
 *    with "Manage" → Privacy (A3/A4/A7).
 *  - CoachChatTeaser  : "Ask Forge" → Coach.
 *
 * All read the one assembled context through `forge`.
 */

import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { CiteChips, ReadinessRing } from "@/components/agent/shared";
import { Icon, type IconName } from "@/components/ui/icon";
import { Btn, IconTile, Panel } from "@/components/ui/primitives";
import { T, disp, mono, readinessColor, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import { agentApi } from "@/lib/api/agent";
import type { AthleteContext, Checkin, ContextSignals, Nudge, TodayBrief } from "@/lib/agent/types";
import { checkinInCooldown, markCheckinDone } from "@/lib/checkin-cooldown";
import { PHOTOS } from "@/lib/photos";
import { useAsync } from "@/lib/use-async";

/** Readiness drivers from the *real* signals (A4) — sleep, HRV, load. */
function realWhy(s: ContextSignals): { icon: IconName; text: string; em: string }[] {
  const why: { icon: IconName; text: string; em: string }[] = [];
  if (s.sleepHours) why.push({ icon: "moon", text: "Sleep", em: s.sleepHours });
  if (s.hrv) why.push({ icon: "heart", text: "HRV", em: `${s.hrv}ms ${s.hrvDelta}`.trim() });
  why.push({ icon: "bolt", text: "Load", em: s.loadLabel });
  return why;
}

// ── Proactive nudge + 10-second check-in ─────────────────────────────────────
export function ProactiveCheckin() {
  const { data } = useAsync(() => Promise.all([forge.getNudge(), forge.getCheckin()]));
  // A periodic nudge, not a daily chore: once done it hides for ~3 days (persisted).
  const { data: inCooldown } = useAsync(checkinInCooldown);
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  // While the cooldown check is loading (undefined) or active (true), stay hidden.
  if (inCooldown !== false) return null;
  if (!data) return null;
  const [n, ci]: [Nudge, Checkin] = data;
  const allPicked = ci.fields.every((f) => picks[f.id] != null);

  const submit = () => {
    setDone(true);
    void markCheckinDone(); // start the ~3-day cooldown
    // The agent records the readiness it derived from the check-in (AUTO → feed).
    forge.updateReadiness(
      `Set readiness to ${ci.result.readiness} from your check-in`,
      ci.result.line,
      [
        { icon: "moon", text: "Sleep 5h24m" },
        { icon: "heart", text: "HRV −12%" },
      ],
    );
  };

  if (done) {
    return (
      <Panel accent={T.greenLine} style={[styles.sideMargin, styles.doneCard]} pad={14}>
        <View style={styles.doneRow}>
          <IconTile name="check" size={34} iconSize={18} />
          <Text style={styles.doneText}>
            <Text style={styles.forgeName}>Forge: </Text>
            {ci.result.line}
          </Text>
        </View>
      </Panel>
    );
  }

  return (
    <Panel accent={T.amberLine} style={[styles.sideMargin, styles.nudgeCard]} pad={0}>
      <View style={styles.nudgeInner}>
        <View style={styles.nudgeTagRow}>
          <View style={styles.pulse} />
          <Text style={styles.nudgeTag}>{n.tag}</Text>
        </View>
        <View style={styles.nudgeBody}>
          <IconTile name={n.icon} size={40} iconSize={20} color={T.amber} bg={T.amberSoft} border={T.amberLine} />
          <View style={styles.shrink}>
            <Text style={styles.nudgeTitle}>{n.title}</Text>
            <Text style={styles.nudgeText}>{n.body}</Text>
          </View>
        </View>
      </View>

      {!open ? (
        <View style={styles.nudgeCta}>
          <Btn kind="primary" full icon="bolt" label="Quick check-in · 10s" onPress={() => setOpen(true)} />
        </View>
      ) : (
        <View style={styles.checkin}>
          {ci.fields.map((f) => (
            <View key={f.id}>
              <View style={styles.fieldHead}>
                <Icon name={f.icon} size={13} color={T.sub} />
                <Text style={styles.fieldLabel}>{f.label.toUpperCase()}</Text>
              </View>
              <View style={styles.opts}>
                {f.opts.map((o, oi) => {
                  const on = picks[f.id] === oi;
                  return (
                    <Pressable
                      key={oi}
                      onPress={() => setPicks((p) => ({ ...p, [f.id]: oi }))}
                      style={[styles.opt, on ? styles.optOn : styles.optOff]}
                    >
                      <Text style={[styles.optText, { color: on ? "#06130D" : T.text }]}>{o}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Btn kind="primary" full icon="check" label="Send to Forge" onPress={submit} disabled={!allPicked} />
        </View>
      )}
    </Panel>
  );
}

// ── Today's Climb — readiness + one coached action ───────────────────────────
export function TodaysClimb({ onStart }: { onStart: () => void }) {
  const { data: b } = useAsync<TodayBrief>(forge.getTodayBrief);
  // Real readiness/signals from the live context graph (A4/A6), overlaid on the
  // brief's narrative; falls back to the brief if context isn't available yet.
  const { data: ctx } = useAsync<AthleteContext | null>(() =>
    agentApi.getContext().catch(() => null),
  );
  if (!b) return null;
  const s = ctx?.signals;
  const readiness = s ? s.readiness : b.readiness;
  const label = s ? s.readinessLabel : b.label;
  const why = s ? realWhy(s) : b.why;
  const c = readinessColor(readiness);
  return (
    <Panel raised accent={T.amberLine} style={styles.sideMargin} pad={0}>
      <View style={styles.climbTop}>
        <View style={styles.climbHead}>
          <ReadinessRing v={readiness} />
          <View style={styles.shrink}>
            <View style={styles.climbEyebrowRow}>
              <Icon name="bot" size={14} color={T.green} />
              <Text style={styles.climbEyebrow}>TODAY’S CLIMB</Text>
            </View>
            <Text style={styles.climbHeadline}>{b.headline}</Text>
            <Text style={[styles.climbReadiness, { color: c }]}>◇ {label.toUpperCase()} READINESS</Text>
          </View>
        </View>

        <Text style={styles.climbBody}>{b.body}</Text>

        <View style={styles.whyRow}>
          {why.map((w, i) => (
            <View key={i} style={styles.whyChip}>
              <Icon name={w.icon} size={12} color={T.sub} />
              <Text style={styles.whyText}>{w.text}</Text>
              <Text style={[styles.whyEm, { color: c }]}>{w.em}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* recommended action — photo-backed, settles fully visible */}
      <View style={styles.actionWrap}>
        <Image source={PHOTOS.heroRun} style={styles.actionImg} resizeMode="cover" />
        <View style={styles.actionScrim} />
        <View style={styles.actionRow}>
          <View style={styles.shrink}>
            <Text style={styles.actionEyebrow}>RECOMMENDED NOW</Text>
            <Text style={styles.actionLabel}>{b.action.label}</Text>
            <Text style={styles.actionSub}>
              {b.action.sub.toUpperCase()} · +{b.action.xp} XP
            </Text>
          </View>
          <Btn kind="primary" label="Start" onPress={onStart} style={styles.startBtn} />
        </View>
      </View>
    </Panel>
  );
}

// ── What your coach sees — sources + signals ─────────────────────────────────
export function CoachSees({ onManage }: { onManage: () => void }) {
  const { data: ctx } = useAsync<AthleteContext>(forge.getContext);
  if (!ctx) return null;
  const s = ctx.signals;
  const signals = [
    { k: "SLEEP", v: s.sleepHours, d: s.sleepDelta, tone: T.red },
    { k: "HRV", v: `${s.hrv}ms`, d: s.hrvDelta, tone: T.red },
    { k: "LOAD", v: String(s.acwr), d: s.loadLabel, tone: T.green },
  ];
  return (
    <Panel style={styles.sideMargin} pad={15}>
      <View style={styles.seesHead}>
        <View style={styles.seesHeadLeft}>
          <Icon name="bot" size={15} color={T.green} />
          <Text style={styles.seesTitle}>WHAT YOUR COACH SEES</Text>
        </View>
        <Pressable onPress={onManage} style={styles.manage}>
          <Text style={styles.manageText}>Manage</Text>
          <Icon name="chevron" size={12} color={T.green} />
        </Pressable>
      </View>

      <View style={styles.sourceGrid}>
        {ctx.sources.map((src) => (
          <View key={src.id} style={styles.source}>
            <View style={styles.sourceIcon}>
              <Icon name={src.icon} size={15} color={T.green} />
            </View>
            <View style={styles.shrink}>
              <Text style={styles.sourceLabel}>{src.label}</Text>
              <Text style={styles.sourceLast} numberOfLines={1}>
                {src.last}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.signalRow}>
        {signals.map((sig) => (
          <View key={sig.k} style={styles.signal}>
            <Text style={styles.signalK}>{sig.k}</Text>
            <Text style={styles.signalV}>{sig.v}</Text>
            <Text style={[styles.signalD, { color: sig.tone }]}>{sig.d}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

// ── Ask Forge teaser ─────────────────────────────────────────────────────────
export function CoachChatTeaser({ onPress }: { onPress: () => void }) {
  return (
    <Panel raised accent={T.greenLine} style={styles.sideMargin} pad={0}>
      <Pressable onPress={onPress} style={styles.teaser}>
        <IconTile name="send" size={46} iconSize={22} />
        <View style={styles.shrink}>
          <Text style={styles.teaserLabel}>ASK FORGE · AI COACH</Text>
          <Text style={styles.teaserText}>“What should I train today?”</Text>
        </View>
        <Icon name="chevron" size={18} color={T.sub} />
      </Pressable>
    </Panel>
  );
}

// re-export for the cite chip row if a caller wants it directly
export { CiteChips };

const styles = StyleSheet.create({
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1, flex: 1 },

  // nudge / check-in
  doneCard: { backgroundColor: "rgba(52,226,160,0.05)" },
  doneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  doneText: { ...ui(13.5, 500), color: "#dfe4e3", lineHeight: 20, flex: 1 },
  forgeName: { ...ui(13.5, 700), color: T.green },
  nudgeCard: { backgroundColor: "#16130d" },
  nudgeInner: { padding: 15 },
  nudgeTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.amber, boxShadow: "0px 0px 8px #F4B740" },
  nudgeTag: { ...mono(9, 700), letterSpacing: 1.4, color: T.amber },
  nudgeBody: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  nudgeTitle: { ...disp(19, 800), color: "#fff" },
  nudgeText: { ...ui(13.5, 500), color: "#c9cdcf", lineHeight: 19, marginTop: 4 },
  nudgeCta: { paddingHorizontal: 15, paddingBottom: 15 },
  checkin: { paddingHorizontal: 15, paddingBottom: 15, paddingTop: 4, gap: 12 },
  fieldHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 },
  fieldLabel: { ...mono(9, 700), letterSpacing: 1, color: T.sub },
  opts: { flexDirection: "row", gap: 7 },
  opt: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  optOn: { backgroundColor: T.green, borderColor: "transparent" },
  optOff: { backgroundColor: T.surf, borderColor: T.line2 },
  optText: { ...ui(12.5, 700) },

  // today's climb
  climbTop: { padding: 16, paddingBottom: 0 },
  climbHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  climbEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  climbEyebrow: { ...mono(10, 700), letterSpacing: 1.6, color: T.green },
  climbHeadline: { ...disp(22, 800), color: "#fff", marginTop: 5, lineHeight: 26 },
  climbReadiness: { ...mono(9, 700), letterSpacing: 1, marginTop: 10 },
  climbBody: { ...ui(14, 500), color: "#cdd3d8", lineHeight: 22, marginTop: 14 },
  whyRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  whyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: T.line,
  },
  whyText: { ...mono(10, 700), color: T.mut },
  whyEm: { ...mono(10, 700) },
  actionWrap: { marginTop: 15, height: 96, overflow: "hidden", borderTopWidth: 1, borderTopColor: T.line },
  actionImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  actionScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(13,16,21,0.62)" },
  actionRow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  actionEyebrow: { ...mono(8, 700), letterSpacing: 1, color: T.green },
  actionLabel: { ...disp(20, 800), color: "#fff", marginTop: 3, lineHeight: 21 },
  actionSub: { ...mono(9, 700), letterSpacing: 0.6, color: "#cdd3d8", marginTop: 4 },
  startBtn: { paddingHorizontal: 18, paddingVertical: 11 },

  // coach sees
  seesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  seesHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  seesTitle: { ...mono(11, 700), letterSpacing: 1, color: T.mut },
  manage: { flexDirection: "row", alignItems: "center", gap: 5 },
  manageText: { ...mono(9, 700), letterSpacing: 0.8, color: T.green },
  sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  source: {
    width: "47.5%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: T.surf2,
    borderWidth: 1,
    borderColor: T.line,
  },
  sourceIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greenSoft,
    borderWidth: 1,
    borderColor: T.greenLine,
  },
  sourceLabel: { ...ui(12, 700), color: T.text },
  sourceLast: { ...mono(8, 600), color: T.sub, letterSpacing: 0.2 },
  signalRow: { flexDirection: "row", gap: 8 },
  signal: { flex: 1, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 11, backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line },
  signalK: { ...mono(8, 700), letterSpacing: 1.4, color: T.sub },
  signalV: { ...ui(17, 800), color: T.text, marginTop: 3 },
  signalD: { ...mono(9, 700), marginTop: 1 },

  // teaser
  teaser: { flexDirection: "row", gap: 13, padding: 16, alignItems: "center" },
  teaserLabel: { ...mono(10, 700), letterSpacing: 1.4, color: T.green },
  teaserText: { ...ui(15, 600), color: T.text, marginTop: 3, lineHeight: 19 },
});
