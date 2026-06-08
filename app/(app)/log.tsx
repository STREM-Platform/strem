import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { Colors } from "@/constants/Colors";
import { ApiError, api } from "@/lib/api/client";
import type { SessionType } from "@/lib/api/types";

const TYPES: Option<SessionType>[] = [
  { value: "strength", label: "Strength" },
  { value: "running", label: "Running" },
  { value: "mobility", label: "Mobility" },
];

/** Training log — log a session and watch XP/rank respond on the profile. */
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
        <Text style={styles.successTitle}>Logged.</Text>
        <Text style={styles.successBody}>
          Your XP is updating now — check your profile to watch your rank respond.
        </Text>
        <PrimaryButton label="View progress" onPress={() => router.replace("/(app)/profile")} />
        <PrimaryButton
          label="Log another"
          onPress={() => {
            setLogged(false);
            setDuration("");
            setDistance("");
            setNotes("");
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={styles.title}>Log a session</Text>
      <OptionSelect options={TYPES} selected={sessionType} onSelect={setSessionType} />
      <TextField
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
        placeholder="45"
      />
      {sessionType === "running" ? (
        <TextField
          label="Distance (km, optional)"
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          placeholder="8.2"
        />
      ) : null}
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="How did it go?"
        multiline
        maxLength={500}
      />
      {error ? <FormError message={error} /> : null}
      <View style={styles.actions}>
        <PrimaryButton label="Log session" onPress={onSubmit} loading={submitting} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 24, fontWeight: "800" },
  actions: { marginTop: 4 },
  successTitle: { color: Colors.text, fontSize: 28, fontWeight: "800" },
  successBody: { color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
});
