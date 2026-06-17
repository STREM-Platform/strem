/**
 * Grid card: medal art + name + rarity/locked label. Ported from `MedalCard` in
 * `design-spec/medal-art.jsx`. Tappable when `onPress` is provided.
 */

import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Medal } from "@/components/medals/medal";
import { RARITY, T, mono, ui } from "@/constants/theme";
import { MEDAL_META, type MedalDefinition } from "@/lib/medals";

interface MedalCardProps {
  def: MedalDefinition;
  earned?: boolean;
  size?: number;
  onPress?: (def: MedalDefinition) => void;
}

export const MedalCard = memo(function MedalCard({
  def,
  earned = false,
  size = 92,
  onPress,
}: MedalCardProps) {
  const m = MEDAL_META[def.rarity] ?? MEDAL_META.epic;
  const label = earned ? RARITY[def.rarity].label.toUpperCase() : "LOCKED";

  const body = (
    <View style={[styles.card, { opacity: earned ? 1 : 0.78 }]}>
      <Medal rarity={def.rarity} emblem={def.emblem} size={size} earned={earned} />
      <Text style={[styles.title, { color: earned ? T.text : T.sub }]} numberOfLines={2}>
        {def.title}
      </Text>
      <Text style={[styles.label, { color: earned ? m.rim[1] : T.sub }]}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return body;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${def.title}, ${earned ? RARITY[def.rarity].label : "locked"}`}
      onPress={() => onPress(def)}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    ...ui(12, 700),
    textAlign: "center",
    lineHeight: 14,
    marginTop: 2,
  },
  label: {
    ...mono(8, 700),
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
