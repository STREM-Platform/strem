/**
 * Selectable option lists for onboarding — single-select and multi-select.
 * Styled with the STREM color tokens; tap targets are large for single-tap flow.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

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
            style={[styles.option, active ? styles.optionActive : null]}
          >
            <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
              {option.label}
            </Text>
            {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
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
    <View style={styles.group}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onToggle(option.value)}
            style={[styles.option, active ? styles.optionActive : null]}
          >
            <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  option: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  optionActive: { borderColor: Colors.accentGreen, backgroundColor: "#0F1A16" },
  optionLabel: { color: Colors.text, fontSize: 16, fontWeight: "600" },
  optionLabelActive: { color: Colors.text },
  optionHint: { color: Colors.textMuted, fontSize: 13 },
});
