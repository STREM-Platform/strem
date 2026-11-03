/** Ask the race team to adapt the next two weeks; inspect, accept or reject. */

import { useState } from "react";
import { Text } from "react-native";

import { AdjustBox, ProposalChanges } from "@/components/plan/proposal-card";
import { Choices, Input } from "@/components/ui/fields";
import { Body, Button, ErrorBanner, Notice, OriginBadge, Row } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceAi, type Proposal } from "@/lib/api/race";

const REASONS = [
  { value: "I'm sick — cold symptoms and low energy", label: "I'm sick" },
  { value: "I have pain or an injury", label: "Pain / injury" },
  { value: "Very busy week with work and family — less time to train", label: "Busy week" },
  { value: "I'm travelling this week", label: "Travelling" },
  { value: "I feel tired and sore, sleep has been poor", label: "Tired & sore" },
];

export function AdaptSheet({ visible, onClose, missionId, onAccepted }: { visible: boolean; onClose: () => void; missionId: string; onAccepted: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setProposal(null);
    setError(null);
    setReason("");
    onClose();
  };
  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      setProposal(await raceAi.adapt(missionId, reason));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The race team could not prepare a proposal. Retry.");
    } finally {
      setBusy(false);
    }
  };
  const decide = async (decision: "accept" | "reject") => {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      await raceAi.decide(missionId, proposal.id, decision);
      if (decision === "accept") onAccepted();
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't go through. Retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={proposal ? "Proposed changes" : "What changed?"}
      footer={
        proposal ? (
          <Row gap={10}>
            <Button label="Keep my plan" kind="secondary" onPress={() => void decide("reject")} disabled={busy} style={{ flex: 1 }} />
            <Button label="Apply changes" icon="check" onPress={() => void decide("accept")} loading={busy} disabled={!proposal.changes.length} style={{ flex: 1 }} />
          </Row>
        ) : (
          <Button label="Ask the race team" icon="sparkles" onPress={() => void ask()} loading={busy} disabled={reason.trim().length < 3} />
        )
      }
    >
      {error ? <ErrorBanner message={error} /> : null}
      {!proposal ? (
        <>
          <Body muted>Tell the race team what’s going on. It proposes changes to the next two weeks — nothing changes until you accept.</Body>
          <Choices options={REASONS} value={reason} onChange={setReason} />
          <Input label="In your own words" value={reason} onChangeText={setReason} multiline placeholder="e.g. My left knee hurts on downhills since Sunday" />
        </>
      ) : (
        <>
          <OriginBadge origin={proposal.origin} model={proposal.model} />
          <Body>{proposal.summary}</Body>
          {proposal.safety_note ? <Notice icon="shield" tone="attention" title="Health first" body={proposal.safety_note} /> : null}
          {proposal.ai_reason ? <Text style={[ui(12, 500), { color: C.textDim }]}>AI unavailable: {proposal.ai_reason} These are the race engine’s rule-based changes.</Text> : null}
          {proposal.changes.length === 0 ? <Notice icon="info" title="No changes needed" body="Your plan already fits what you described." /> : null}
          <ProposalChanges proposal={proposal} />
          <AdjustBox missionId={missionId} proposal={proposal} onAdjusted={setProposal} />
        </>
      )}
    </Sheet>
  );
}
