/** The race team's proposed changes: shown, explained, applied only when accepted. */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, Notice, OriginBadge, Row, TextLink } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceAi, type Proposal } from "@/lib/api/race";
import { dayLabel, hm } from "@/lib/race/format";

export function ProposalChanges({ proposal }: { proposal: Proposal }) {
  return (
    <View style={{ gap: 8 }}>
      {proposal.changes.map((change) => (
        <View key={change.session_id} style={styles.change}>
          <Text style={[ui(12, 700), { color: C.textMuted }]}>{dayLabel(change.date)}</Text>
          <Text style={[ui(14, 600), { color: C.textMuted, textDecorationLine: "line-through" }]} numberOfLines={1}>
            {String(change.before.title ?? "")} · {hm(Number(change.before.duration_minutes ?? 0))}
          </Text>
          <Row gap={6}>
            <Icon name="chevron" size={14} color={C.accent} />
            <Text style={[ui(15, 700), { color: C.text, flex: 1 }]} numberOfLines={2}>
              {change.change === "modify" ? `${String(change.after.title ?? "")} · ${hm(Number(change.after.duration_minutes ?? 0))}` : "Rest"}
            </Text>
          </Row>
          <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 18 }]}>{change.reason}</Text>
        </View>
      ))}
    </View>
  );
}

/** Tell the race team what to change; it redrafts and the proposal waits for review again. */
export function AdjustBox({ missionId, proposal, onAdjusted }: { missionId: string; proposal: Proposal; onAdjusted: (next: Proposal) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      onAdjusted(await raceAi.adjust(missionId, proposal.id, note.trim()));
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The race team couldn't redraft it. Retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {(proposal.notes ?? []).map((n, i) => (
        <Row key={i} gap={8} align="flex-start">
          <Icon name="message" size={14} color={C.textMuted} style={{ marginTop: 2 }} />
          <Text style={[ui(12.5, 500), { color: C.textMuted, flex: 1 }]}>You asked: “{n}”</Text>
        </Row>
      ))}
      <Input label="Ask for different changes" value={note} onChangeText={setNote} multiline maxLength={600} placeholder="e.g. Keep Saturday's long run, cut the intervals instead" />
      {error ? <ErrorBanner message={error} /> : null}
      <Button label="Redraft with this" icon="sparkles" kind="secondary" size="sm" loading={busy} disabled={note.trim().length < 3} onPress={() => void send()} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

/** A proposal waiting for the athlete: apply, adjust (redraft with their words) or keep the plan. */
export function ProposalCard({ missionId, proposal: initial, onDecided }: { missionId: string; proposal: Proposal; onDecided: (accepted: boolean) => void }) {
  const [proposal, setProposal] = useState(initial);
  const [open, setOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decide = async (decision: "accept" | "reject") => {
    setBusy(decision);
    setError(null);
    try {
      await raceAi.decide(missionId, proposal.id, decision);
      onDecided(decision === "accept");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't go through. Retry.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card testID={`proposal-${proposal.id}`} pad={18} tone="accent" style={{ gap: 12 }}>
      <Row gap={8}>
        <Icon name="refresh" size={18} color={C.accent} />
        <Text style={[ui(14, 800), { color: C.text, flex: 1 }]}>{proposal.category === "missed" ? "Your race team adjusted this week" : "Proposed changes"}</Text>
        <OriginBadge origin={proposal.origin} model={proposal.model} />
      </Row>
      <Body size={14}>{proposal.summary}</Body>
      {proposal.safety_note ? <Notice icon="shield" tone="attention" title="Health first" body={proposal.safety_note} /> : null}
      <TextLink
        label={open ? "Hide the changes" : `See ${proposal.changes.length} change${proposal.changes.length === 1 ? "" : "s"}`}
        icon={open ? "chevronUp" : "chevronDown"}
        onPress={() => setOpen((v) => !v)}
      />
      {open ? <ProposalChanges proposal={proposal} /> : null}
      {adjusting || proposal.notes?.length ? (
        <AdjustBox
          missionId={missionId}
          proposal={proposal}
          onAdjusted={(next) => {
            setProposal(next);
            setOpen(true);
            setAdjusting(false);
          }}
        />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <Row gap={10} wrap>
        <Button label="Apply changes" icon="check" size="sm" loading={busy === "accept"} disabled={busy != null} onPress={() => void decide("accept")} />
        {!adjusting && !proposal.notes?.length ? <Button label="Adjust" icon="edit" kind="secondary" size="sm" disabled={busy != null} onPress={() => setAdjusting(true)} /> : null}
        <Button label="Keep my plan" kind="ghost" size="sm" loading={busy === "reject"} disabled={busy != null} onPress={() => void decide("reject")} />
      </Row>
      <Text style={[ui(11, 500), { color: C.textDim }]}>Nothing changes until you apply it. Missed sessions are never made up.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  change: { gap: 6, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
