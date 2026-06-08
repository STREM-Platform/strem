import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { Colors } from "@/constants/Colors";
import { ApiError, api } from "@/lib/api/client";
import type { NutritionDay } from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Nutrition log — record whether the day's targets were met (consistency-first,
 * not macros) and review recent days. Logging refreshes the recent list; XP from
 * the backend consumer appears on the profile.
 */
export default function NutritionScreen() {
  const { data, loading, error, reload } = useAsync(() => api.listNutritionDays());
  const [date, setDate] = useState(today());
  const [targetsMet, setTargetsMet] = useState(true);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setFormError(undefined);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError("Enter the date as YYYY-MM-DD.");
      return;
    }
    setSubmitting(true);
    try {
      await api.logNutritionDay({
        date,
        targets_met: targetsMet,
        notes: notes.trim() || undefined,
      });
      setNotes("");
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't log that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen loading={loading} error={error} onRefresh={reload}>
      <Text style={styles.title}>Nutrition</Text>

      <TextField label="Date" value={date} onChangeText={setDate} placeholder="2026-06-08" />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Targets met</Text>
        <Switch
          value={targetsMet}
          onValueChange={setTargetsMet}
          trackColor={{ true: Colors.accentGreen, false: Colors.border }}
        />
      </View>
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Hit protein, light on veg"
        multiline
        maxLength={500}
      />
      {formError ? <FormError message={formError} /> : null}
      <PrimaryButton label="Log day" onPress={onSubmit} loading={submitting} />

      <Text style={styles.sectionTitle}>Recent days</Text>
      {data && data.items.length === 0 ? (
        <Text style={styles.empty}>No nutrition logged yet — your first day starts now.</Text>
      ) : (
        (data?.items ?? []).map((day: NutritionDay) => (
          <View key={day.id} style={styles.dayRow}>
            <Text style={styles.dayDate}>{day.date}</Text>
            <Text style={[styles.dayStatus, day.targets_met ? styles.met : styles.missed]}>
              {day.targets_met ? "Targets met" : "Off target"}
            </Text>
          </View>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 24, fontWeight: "800" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { color: Colors.text, fontSize: 16 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 12 },
  empty: { color: Colors.textMuted, fontSize: 14 },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayDate: { color: Colors.text, fontSize: 15 },
  dayStatus: { fontSize: 14, fontWeight: "600" },
  met: { color: Colors.accentGreen },
  missed: { color: Colors.textMuted },
});
