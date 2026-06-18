/**
 * Small Forge-shared primitives reused across the AI surfaces: the cite-chip row
 * (the model grounding its answer in retrieved context), the readiness ring, and
 * a "Forge says" line. Ported from the prototype's `CiteChips` / `ReadinessRing`.
 */

import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, readinessColor } from "@/constants/theme";
import type { CitedDatum } from "@/lib/agent/types";

/** Grounding chips — every cited datum is one of the user's own signals. */
export function CiteChips({ cites }: { cites?: CitedDatum[] }) {
  if (!cites || cites.length === 0) return null;
  return (
    <View style={styles.chips}>
      {cites.map((c, i) => (
        <View key={i} style={styles.chip}>
          <Icon name={c.icon} size={11} color={T.green} />
          <Text style={styles.chipText}>{c.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function ReadinessRing({ v, size = 92 }: { v: number; size?: number }) {
  const c = readinessColor(v);
  return (
    <Ring size={size} stroke={9} pct={v / 100} color={c}>
      <Text style={styles.ringNum}>{v}</Text>
      <Text style={[styles.ringLabel, { color: c }]}>READY</Text>
    </Ring>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: T.greenSoft,
    borderWidth: 1,
    borderColor: T.greenLine,
  },
  chipText: { ...mono(9, 700), color: T.green, letterSpacing: 0.2 },
  ringNum: { ...disp(30, 800), color: "#fff", lineHeight: 30 },
  ringLabel: { ...mono(8, 700), letterSpacing: 1.4, marginTop: 2 },
});
