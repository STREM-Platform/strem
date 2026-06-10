import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { EmptyState, Surface } from "@/components/ui/surface";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/typography";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { Challenge, ChallengeTargetType } from "@/lib/api/types";

const UNIT: Record<ChallengeTargetType, string> = {
  training_sessions: "sessions",
  running_distance_km: "km",
  checkins: "check-ins",
};

const TARGET_OPTIONS: Option<ChallengeTargetType>[] = [
  { value: "training_sessions", label: "Training sessions", hint: "Sessions logged across the tribe" },
  { value: "running_distance_km", label: "Running distance", hint: "Combined kilometers run" },
  { value: "checkins", label: "Check-ins", hint: "Total tribe check-ins" },
];

const PILL_TONE = { completed: "green", active: "neutral", failed: "red", abandoned: "neutral" } as const;

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

/** A single collective challenge: progress, contribute, and complete when met. */
function ChallengeCard({
  tribeId,
  challenge,
  onChanged,
}: {
  tribeId: string;
  challenge: Challenge;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const unit = UNIT[challenge.target_type];
  const ratio = challenge.target_value > 0 ? challenge.current_value / challenge.target_value : 0;
  const isActive = challenge.state === "active";
  const reached = challenge.current_value >= challenge.target_value;

  const contribute = async (): Promise<void> => {
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await api.contributeToChallenge(tribeId, challenge.id, value);
      setAmount("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log progress. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const complete = async (): Promise<void> => {
    setError(undefined);
    setBusy(true);
    try {
      await api.completeChallenge(tribeId, challenge.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete the challenge.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface variant="raised" style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <StatusPill label={challenge.state} tone={PILL_TONE[challenge.state]} />
      </View>
      {challenge.description ? <Text style={styles.cardBody}>{challenge.description}</Text> : null}

      <ProgressBar
        value={ratio}
        label={`${challenge.current_value} / ${challenge.target_value} ${unit}`}
        helper={`Ends ${formatDeadline(challenge.ends_at)}`}
      />

      {isActive ? (
        <View style={styles.actions}>
          <View style={styles.amountFieldWrap}>
            <TextField
              label="Log progress"
              helperText={unit}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <PrimaryButton label="Add" onPress={contribute} loading={busy} style={styles.addButton} />
        </View>
      ) : null}

      {isActive && reached ? (
        <PrimaryButton label="Mark challenge complete" onPress={complete} loading={busy} variant="secondary" />
      ) : null}

      {error ? <FormError message={error} /> : null}
    </Surface>
  );
}

/** Admin-only: start a collective challenge for the tribe. */
function CreateChallengeForm({ tribeId, onCreated }: { tribeId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<ChallengeTargetType>("training_sessions");
  const [targetValue, setTargetValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const create = async (): Promise<void> => {
    const value = Number.parseFloat(targetValue);
    if (!title.trim()) {
      setError("Give the challenge a name.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Set a positive target.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      // Default to a one-week window — the MVP collective sprint length.
      const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await api.createChallenge(tribeId, {
        title: title.trim(),
        target_type: targetType,
        target_value: value,
        ends_at: endsAt,
      });
      setTitle("");
      setTargetValue("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the challenge. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface variant="outline" style={styles.createForm}>
      <Text style={styles.createTitle}>Start a challenge</Text>
      <TextField
        label="Name"
        value={title}
        onChangeText={setTitle}
        placeholder="Forge week: 20 sessions"
        maxLength={80}
      />
      <Text style={styles.fieldLabel}>Target</Text>
      <OptionSelect options={TARGET_OPTIONS} selected={targetType} onSelect={setTargetType} />
      <TextField
        label="Target amount"
        helperText={UNIT[targetType]}
        value={targetValue}
        onChangeText={setTargetValue}
        keyboardType="numeric"
        placeholder="20"
      />
      {error ? <FormError message={error} /> : null}
      <PrimaryButton label="Start challenge" onPress={create} loading={busy} />
    </Surface>
  );
}

interface ChallengesPanelProps {
  tribeId: string;
  isAdmin: boolean;
  challenges: Challenge[];
  onChanged: () => void;
}

/** Tribe collective challenges: shared targets everyone's reps count toward. */
export function ChallengesPanel({ tribeId, isAdmin, challenges, onChanged }: ChallengesPanelProps) {
  return (
    <>
      <SectionHeader
        title="Tribe challenges"
        subtitle="Collective goals — every member's reps count toward one shared target."
      />

      {challenges.length === 0 ? (
        <EmptyState
          title="No active challenge"
          body={
            isAdmin
              ? "Start one below to rally the tribe around a shared target."
              : "An admin can start a collective challenge for the tribe."
          }
        />
      ) : (
        <View style={styles.list}>
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              tribeId={tribeId}
              challenge={challenge}
              onChanged={onChanged}
            />
          ))}
        </View>
      )}

      {isAdmin ? <CreateChallengeForm tribeId={tribeId} onCreated={onChanged} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cardTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  cardBody: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  amountFieldWrap: {
    flex: 1,
  },
  addButton: {
    width: 96,
    alignSelf: "flex-end",
  },
  createForm: {
    gap: Spacing.md,
  },
  createTitle: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textMuted,
  },
});
