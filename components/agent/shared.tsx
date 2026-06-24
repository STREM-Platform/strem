/**
 * Small Forge-shared primitives reused across the AI surfaces: the cite-chip row
 * (the model grounding its answer in retrieved context), the readiness ring, and
 * a "Forge says" line. Ported from the prototype's `CiteChips` / `ReadinessRing`.
 */

import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, ui, readinessColor } from "@/constants/theme";
import type { CitedDatum } from "@/lib/agent/types";

/** Three dots that pulse in sequence — the heartbeat of "Forge is working". */
function ThinkingDots({ color = T.green }: { color?: string }) {
  const [dots] = useState(() => [
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]);

  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 420,
            delay: i * 160,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.dotRow}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: color, opacity: v, transform: [{ scale: v }] }]}
        />
      ))}
    </View>
  );
}

/**
 * The shared "Forge is working" indicator — one component, two looks: a chat
 * bubble while a reply streams, and a centered block while a plan builds. When
 * `labels` are given it cycles through them so the wait feels alive and honest
 * about what Forge is doing.
 */
export function ForgeThinking({
  labels,
  variant = "bubble",
}: {
  labels?: string[];
  variant?: "bubble" | "block";
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!labels || labels.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % labels.length), 1500);
    return () => clearInterval(t);
  }, [labels]);
  const label = labels && labels.length > 0 ? labels[Math.min(idx, labels.length - 1)] : undefined;

  if (variant === "block") {
    return (
      <View style={styles.thinkBlock}>
        <View style={styles.thinkOrb}>
          <Icon name="sparkles" size={26} color={T.green} />
        </View>
        <ThinkingDots />
        <Text style={styles.thinkBlockLabel}>{label ?? "Forge is working…"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.thinkRow}>
      <View style={styles.thinkAvatar}>
        <Icon name="bot" size={16} color={T.green} />
      </View>
      <View style={styles.thinkBubble}>
        <ThinkingDots />
        <Text style={styles.thinkBubbleLabel}>{label ?? "Forge is thinking…"}</Text>
      </View>
    </View>
  );
}

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

  // ── Forge thinking indicator ──
  dotRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  thinkRow: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginHorizontal: 16 },
  thinkAvatar: {
    width: 30, height: 30, borderRadius: 9, marginTop: 2, backgroundColor: T.greenSoft,
    borderWidth: 1, borderColor: T.greenLine, alignItems: "center", justifyContent: "center",
  },
  thinkBubble: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.surf,
    borderWidth: 1, borderColor: T.line, borderRadius: 14, borderTopLeftRadius: 4,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  thinkBubbleLabel: { ...ui(12.5, 600), color: T.sub },
  thinkBlock: { alignItems: "center", gap: 14, paddingTop: 50 },
  thinkOrb: {
    width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center",
    backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine,
  },
  thinkBlockLabel: { ...ui(13.5, 600), color: T.text, marginTop: 2 },
});
