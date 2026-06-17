/**
 * Agent transparency UI.
 *
 *  - ActivityFeed     : every autonomous action Forge has taken, with its
 *    reasoning, the exact data it cited, and an Undo (or Approve, for ASK
 *    proposals). This is the proof it's an agent, not a chatbot.
 *  - AutonomyControls : per-capability AUTO / ASK / OFF, user-controlled. Lives on
 *    the Privacy screen (A7).
 */

import { StyleSheet, Text, View } from "react-native";

import { CiteChips } from "@/components/agent/shared";
import { Icon } from "@/components/ui/icon";
import { Btn, Panel } from "@/components/ui/primitives";
import { T, mono, ui } from "@/constants/theme";
import { CAPABILITIES, CAPABILITY_BY_KEY, forge, useAgentActivity, useAutonomy } from "@/lib/agent";
import type { AgentAction, AutonomyLevel } from "@/lib/agent/types";

function relTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<AgentAction["status"], { label: string; color: string }> = {
  proposed: { label: "AWAITING YOU", color: T.amber },
  done: { label: "DONE · UNDOABLE", color: T.green },
  undone: { label: "UNDONE", color: T.sub },
};

function ActionRow({ action }: { action: AgentAction }) {
  const meta = CAPABILITY_BY_KEY[action.capability];
  const status = STATUS_META[action.status];
  const tone = action.status === "proposed" ? T.amber : action.status === "undone" ? T.sub : T.green;
  return (
    <Panel pad={14} accent={action.status === "proposed" ? T.amberLine : T.line} style={styles.action}>
      <View style={styles.actionHead}>
        <View style={[styles.actionIcon, { backgroundColor: action.status === "proposed" ? T.amberSoft : T.greenSoft, borderColor: action.status === "proposed" ? T.amberLine : T.greenLine }]}>
          <Icon name={meta.icon} size={16} color={tone} />
        </View>
        <View style={styles.shrink}>
          <Text style={styles.actionType}>{action.type}</Text>
          <Text style={styles.actionWhen}>
            {relTime(action.createdAt)} · {meta.label}
          </Text>
        </View>
        <Text style={[styles.actionStatus, { color: status.color }]}>{status.label}</Text>
      </View>

      <Text style={[styles.actionSummary, action.status === "undone" && styles.struck]}>{action.summary}</Text>
      <Text style={styles.actionReason}>{action.reasoning}</Text>
      <CiteChips cites={action.citedData} />

      {action.status === "proposed" ? (
        <View style={styles.actionActions}>
          <Btn kind="ghost" icon="plus" label="Dismiss" onPress={() => forge.undo(action.id)} style={styles.flexOne} />
          <Btn kind="primary" icon="check" label="Approve" onPress={() => forge.approve(action.id)} style={styles.flexTwo} />
        </View>
      ) : action.status === "done" ? (
        <View style={styles.actionActions}>
          <Btn kind="ghost" icon="refresh" label="Undo" onPress={() => forge.undo(action.id)} style={styles.flexOne} />
        </View>
      ) : null}
    </Panel>
  );
}

export function ActivityFeed() {
  const actions = useAgentActivity();
  const pending = actions.filter((a) => a.status === "proposed").length;
  return (
    <View style={styles.feed}>
      <Panel accent={T.greenLine} pad={13} style={styles.intro}>
        <View style={styles.introRow}>
          <Icon name="bot" size={16} color={T.green} />
          <Text style={styles.introText}>
            Everything Forge does on its own lands here — with the reasoning, the data it used, and an Undo.
            {pending > 0 ? <Text style={styles.introPending}> {pending} awaiting you.</Text> : null}
          </Text>
        </View>
      </Panel>
      {actions.map((a) => (
        <ActionRow key={a.id} action={a} />
      ))}
    </View>
  );
}

// ── Autonomy controls (per capability) ───────────────────────────────────────
const LEVELS: { id: AutonomyLevel; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "ask", label: "Ask" },
  { id: "off", label: "Off" },
];

export function AutonomyControls() {
  const { autonomy, setAutonomy } = useAutonomy();
  return (
    <View style={styles.autonomy}>
      <Text style={styles.autonomyIntro}>
        How much Forge can do on its own, per ability. <Text style={styles.autonomyBold}>Auto</Text> acts and tells you ·{" "}
        <Text style={styles.autonomyBold}>Ask</Text> proposes first · <Text style={styles.autonomyBold}>Off</Text> never.
      </Text>
      {CAPABILITIES.map((c) => (
        <Panel key={c.capability} pad={13} style={styles.capCard}>
          <View style={styles.capRow}>
            <View style={styles.capIcon}>
              <Icon name={c.icon} size={15} color={T.green} />
            </View>
            <View style={styles.shrink}>
              <Text style={styles.capLabel}>{c.label}</Text>
              <Text style={styles.capDesc}>{c.description}</Text>
            </View>
          </View>
          <View style={styles.segment}>
            {LEVELS.map((lv) => {
              const on = autonomy[c.capability] === lv.id;
              return (
                <Text
                  key={lv.id}
                  onPress={() => setAutonomy(c.capability, lv.id)}
                  style={[styles.seg, on ? styles.segOn : styles.segOff]}
                >
                  {lv.label}
                </Text>
              );
            })}
          </View>
        </Panel>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1, flex: 1 },
  flexOne: { flex: 1 },
  flexTwo: { flex: 1.6 },

  feed: { gap: 11 },
  intro: { backgroundColor: "rgba(52,226,160,0.05)" },
  introRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  introText: { ...ui(13, 500), color: "#cdd3d8", lineHeight: 19, flex: 1 },
  introPending: { ...ui(13, 700), color: T.amber },

  action: {},
  actionHead: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  actionType: { ...ui(14.5, 700), color: T.text },
  actionWhen: { ...mono(9, 600), color: T.sub, marginTop: 1 },
  actionStatus: { ...mono(8, 700), letterSpacing: 0.6 },
  actionSummary: { ...ui(14, 600), color: "#dfe4e3", marginBottom: 5 },
  struck: { textDecorationLine: "line-through", color: T.sub },
  actionReason: { ...ui(13, 500), color: T.mut, lineHeight: 19 },
  actionActions: { flexDirection: "row", gap: 9, marginTop: 12 },

  autonomy: { gap: 10 },
  autonomyIntro: { ...ui(13, 500), color: T.mut, lineHeight: 20, marginBottom: 2 },
  autonomyBold: { ...ui(13, 700), color: T.text },
  capCard: {},
  capRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 11 },
  capIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine },
  capLabel: { ...ui(14, 700), color: T.text },
  capDesc: { ...ui(12, 500), color: T.sub, marginTop: 1, lineHeight: 16 },
  segment: { flexDirection: "row", gap: 5, padding: 4, borderRadius: 12, backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line },
  seg: { flex: 1, textAlign: "center", paddingVertical: 9, borderRadius: 9, overflow: "hidden", ...ui(12.5, 700) },
  segOn: { backgroundColor: T.green, color: "#06130D" },
  segOff: { backgroundColor: "transparent", color: T.mut },
});
