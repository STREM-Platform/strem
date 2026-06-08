/**
 * Selectable option lists for onboarding and logging.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface OptionSelectProps<T extends string> {
  options: Option<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
}

export function OptionSelect<T extends string>({
  options,
  selected,
  onSelect,
}: OptionSelectProps<T>) {
  return (
    <View style={styles.group}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed ? styles.optionPressed : null,
            ]}
          >
            <View style={[styles.radio, active ? styles.radioActive : null]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
                {option.label}
              </Text>
              {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

interface MultiOptionSelectProps<T extends string> {
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}

export function MultiOptionSelect<T extends string>({
  options,
  selected,
  onToggle,
}: MultiOptionSelectProps<T>) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onToggle(option.value)}
            style={({ pressed }) => [
              styles.tile,
              active ? styles.tileActive : null,
              pressed ? styles.optionPressed : null,
            ]}
          >
            <Text style={[styles.tileLabel, active ? styles.optionLabelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionActive: {
    borderColor: Colors.accentGreen,
    backgroundColor: Colors.accentGreenSoft,
  },
  optionPressed: {
    opacity: 0.82,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: Colors.accentGreenBright,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentGreenBright,
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  optionLabel: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  optionLabelActive: {
    color: Colors.text,
  },
  optionHint: {
    ...Typography.body,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tile: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  tileActive: {
    borderColor: Colors.accentGreen,
    backgroundColor: Colors.accentGreenSoft,
  },
  tileLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
