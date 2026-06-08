import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { EmptyState, MetricCard, Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader, ScreenHeader } from "@/components/ui/typography";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { CheckIn, CompletedAction, Tribe } from "@/lib/api/types";
import { titleizeEnum } from "@/lib/format";

const ACTIONS: Option<CompletedAction>[] = [
  { value: "training", label: "Training" },
  { value: "running", label: "Running" },
  { value: "nutrition", label: "Nutrition" },
  { value: "recovery", label: "Recovery" },
  { value: "rest_day", label: "Rest day" },
  { value: "nothing", label: "Nothing today" },
];

interface TribeHomePanelProps {
  tribe: Tribe;
  checkins: CheckIn[];
  onCheckedIn: () => void;
}

export function TribeHomePanel({ tribe, checkins, onCheckedIn }: TribeHomePanelProps) {
  const [action, setAction] = useState<CompletedAction>("training");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onCheckin = async (): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    try {
      await api.createCheckin(tribe.id, {
        completed_action: action,
        status_note: note.trim() || undefined,
      });
      setNote("");
      onCheckedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScreenHeader title={tribe.name} subtitle={tribe.mission_statement ?? "Your accountability locker room."}>
        <StatusPill label={tribe.my_role} tone="green" />
      </ScreenHeader>

      <View style={styles.metrics}>
        <MetricCard
          label="Members"
          value={`${tribe.member_count}/${tribe.max_members}`}
          detail="Small by design"
        />
        <MetricCard
          label="Power"
          value={tribe.tribe_power.toLocaleString()}
          detail="Tribe XP"
          tone="green"
        />
      </View>

      <Surface variant="raised" style={styles.checkin}>
        <SectionHeader title="Check in" subtitle="Short, structured, visible only to your tribe." />
        <OptionSelect options={ACTIONS} selected={action} onSelect={setAction} />
        <TextField
          label="Status"
          helperText="Optional"
          value={note}
          onChangeText={setNote}
          placeholder="Early run before work."
          maxLength={140}
        />
        {error ? <FormError message={error} /> : null}
        <PrimaryButton label="Post check-in" onPress={onCheckin} loading={submitting} />
      </Surface>

      <SectionHeader title="Tribe activity" subtitle="Recent proof from the group." />
      {checkins.length === 0 ? (
        <EmptyState title="No check-ins yet" body="Be the one who starts the room moving today." />
      ) : (
        <View style={styles.activityList}>
          {checkins.map((checkin) => (
            <Surface key={checkin.id} variant="muted" style={styles.checkinRow}>
              <View style={styles.activityMark} />
              <View style={styles.activityCopy}>
                <Text style={styles.checkinAction}>{titleizeEnum(checkin.completed_action)}</Text>
                {checkin.status_note ? (
                  <Text style={styles.checkinNote}>{checkin.status_note}</Text>
                ) : null}
              </View>
            </Surface>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  checkin: {
    gap: Spacing.lg,
  },
  activityList: {
    gap: Spacing.sm,
  },
  checkinRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  activityMark: {
    width: 10,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreenBright,
  },
  activityCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  checkinAction: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  checkinNote: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});
