/** Numeric stepper (−/value/+), ported from `Stepper` in workout-exec.jsx. */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { T, disp, ui } from "@/constants/theme";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  suffix?: string;
  accent?: string;
}

export function Stepper({ value, onChange, step = 1, suffix, accent = T.text }: StepperProps) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} onPress={() => onChange(Math.max(0, value - step))} accessibilityLabel="Decrease">
        <Icon name="minus" size={18} color={T.mut} sw={2.6} />
      </Pressable>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: accent }]}>{value}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <Pressable style={styles.btn} onPress={() => onChange(Math.max(0, value + step))} accessibilityLabel="Increase">
        <Icon name="plus" size={18} color={T.mut} sw={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  btn: {
    width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center",
    backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line2,
  },
  valueWrap: { minWidth: 78, flexDirection: "row", alignItems: "baseline", justifyContent: "center" },
  value: { ...disp(30, 800) },
  suffix: { ...ui(13, 600), color: T.sub, marginLeft: 3 },
});
