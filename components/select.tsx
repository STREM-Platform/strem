/**
 * Selectable option lists for onboarding and logging, in the premium kit
 * Trail option row with a high-contrast selected state.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Trail, ui } from "@/constants/theme";

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
            <View style={styles.optionCopy}>
              <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
                {option.label}
              </Text>
              {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
            </View>
            <View style={[styles.radio, active ? styles.radioActive : null]}>
              {active ? <View style={styles.radioDot} /> : null}
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
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Trail.panel,
    borderColor: Trail.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    gap: 13,
  },
  optionActive: {
    borderColor: Trail.limeLine,
    backgroundColor: Trail.limeSoft,
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionCopy: {
    flex: 1,
    gap: 1,
  },
  optionLabel: {
    ...ui(15, 700),
    color: Trail.text,
  },
  optionLabelActive: {
    color: Trail.text,
  },
  optionHint: {
    ...ui(12, 500),
    color: Trail.textMuted,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Trail.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: Trail.lime,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Trail.lime,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Trail.line,
    backgroundColor: Trail.panel,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  tileActive: {
    borderColor: Trail.limeLine,
    backgroundColor: Trail.limeSoft,
  },
  tileLabel: {
    ...ui(14, 800),
    color: Trail.textMuted,
    textAlign: "center",
  },
});
