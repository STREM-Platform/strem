import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { EmptyState, Surface } from "@/components/ui/surface";
import { ScreenHeader } from "@/components/ui/typography";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { SessionType } from "@/lib/api/types";

const TYPES: Option<SessionType>[] = [
  { value: "strength", label: "Strength", hint: "Lift, accessories, loaded movement" },
  { value: "running", label: "Running", hint: "Distance, tempo, intervals, easy miles" },
  { value: "mobility", label: "Mobility", hint: "Recovery, movement quality, reset work" },
];

/** Training log - log a session and let XP/rank update on the backend. */
export default function LogScreen() {
  const router = useRouter();
  const [sessionType, setSessionType] = useState<SessionType>("strength");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [logged, setLogged] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setError(undefined);
    const minutes = Number.parseInt(duration, 10);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setError("Enter a duration of at least 1 minute.");
      return;
    }
    const distanceKm = distance.trim().length > 0 ? Number.parseFloat(distance) : undefined;
    if (distanceKm !== undefined && (Number.isNaN(distanceKm) || distanceKm < 0)) {
      setError("Enter a valid distance.");
      return;
    }

    setSubmitting(true);
    try {
      await api.logTrainingSession({
        session_type: sessionType,
        duration_minutes: minutes,
        distance_km: sessionType === "running" ? distanceKm : undefined,
        notes: notes.trim() || undefined,
      });
      setLogged(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (logged) {
    return (
      <AppScreen>
        <EmptyState
          title="Session logged"
          body="That action is now part of your proof. XP updates through the progression ledger."
        >
          <PrimaryButton label="View progress" onPress={() => router.replace("/(app)/profile")} />
          <PrimaryButton
            label="Log another"
            variant="secondary"
            onPress={() => {
              setLogged(false);
              setDuration("");
              setDistance("");
              setNotes("");
            }}
          />
        </EmptyState>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScreenHeader
        title="Log a session"
        subtitle="Record the work quickly. STREM turns the action into visible progression."
      />

      <Surface variant="raised" style={styles.form}>
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Session type</Text>
          <OptionSelect options={TYPES} selected={sessionType} onSelect={setSessionType} />
        </View>
        <TextField
          label="Duration"
          helperText="Minutes"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="45"
        />
        {sessionType === "running" ? (
          <TextField
            label="Distance"
            helperText="Km optional"
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            placeholder="8.2"
          />
        ) : null}
        <TextField
          label="Notes"
          helperText="Optional"
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it go?"
          multiline
          maxLength={500}
        />
        {error ? <FormError message={error} /> : null}
        <PrimaryButton label="Log session" onPress={onSubmit} loading={submitting} />
      </Surface>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
  },
  block: {
    gap: Spacing.sm,
  },
  blockLabel: {
    ...Typography.label,
    color: Colors.textMuted,
  },
});
