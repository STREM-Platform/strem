import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { EmptyState, Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader, ScreenHeader } from "@/components/ui/typography";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";
import type { NutritionDay } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Nutrition log - consistency-first daily logging, not calorie obsession.
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
      <ScreenHeader
        title="Nutrition"
        subtitle="Log alignment for the day. Keep it honest, simple, and repeatable."
      />

      <Surface variant="raised" style={styles.form}>
        <TextField label="Date" value={date} onChangeText={setDate} placeholder="2026-06-08" />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchLabel}>Targets met</Text>
            <Text style={styles.switchHint}>Consistency over perfect macro math.</Text>
          </View>
          <Switch
            value={targetsMet}
            onValueChange={setTargetsMet}
            trackColor={{ true: Colors.accentGreen, false: Colors.surfaceMuted }}
            thumbColor={targetsMet ? Colors.surfaceInverse : Colors.textMuted}
          />
        </View>
        <TextField
          label="Notes"
          helperText="Optional"
          value={notes}
          onChangeText={setNotes}
          placeholder="Hit protein, light on vegetables"
          multiline
          maxLength={500}
        />
        {formError ? <FormError message={formError} /> : null}
        <PrimaryButton label="Log day" onPress={onSubmit} loading={submitting} />
      </Surface>

      <SectionHeader title="Recent days" subtitle="A short ledger of nutrition proof." />
      {data && data.items.length === 0 ? (
        <EmptyState title="No days logged yet" body="Your first nutrition proof starts with one honest entry." />
      ) : (
        <View style={styles.list}>
          {(data?.items ?? []).map((day: NutritionDay) => (
            <Surface key={day.id} variant="muted" style={styles.dayRow}>
              <View>
                <Text style={styles.dayDate}>{formatShortDate(day.date)}</Text>
                <Text style={styles.dayRaw}>{day.date}</Text>
              </View>
              <StatusPill label={day.targets_met ? "Targets met" : "Off target"} tone={day.targets_met ? "green" : "neutral"} />
            </Surface>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  switchLabel: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  switchHint: {
    ...Typography.body,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: Spacing.sm,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    borderRadius: Radius.lg,
  },
  dayDate: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  dayRaw: {
    ...Typography.caption,
    color: Colors.textSubtle,
    fontWeight: "600",
  },
});
