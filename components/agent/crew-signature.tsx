/**
 * Crew attribution primitives (issue #73 — The Crew, slice 1).
 *
 *  - PersonaAvatar  : the specialist's face — soft-fill rounded tile + icon.
 *  - CrewSignature  : avatar + NAME + · ROLE, the byline every signed surface
 *    carries. Same mono/letterspacing treatment as the shipped kickers.
 *
 * Callers must gate on `FLAGS.crewPersonas` — these render unconditionally so
 * they stay dumb and reusable (faces row, chat bubbles, grid tiles).
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { T, mono } from "@/constants/theme";
import { PERSONAS, type Persona, type PersonaId } from "@/lib/agent/personas";

function resolve(p: PersonaId | Persona): Persona {
  return typeof p === "string" ? PERSONAS[p] : p;
}

export function PersonaAvatar({
  persona,
  size = 28,
  style,
}: {
  persona: PersonaId | Persona;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = resolve(persona);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: p.soft,
          borderColor: p.line,
        },
        style,
      ]}
    >
      <Icon name={p.icon} size={Math.round(size * 0.54)} color={p.color} />
    </View>
  );
}

export function CrewSignature({
  persona,
  role,
  style,
}: {
  persona: PersonaId | Persona;
  /** Override the role text (defaults to the persona's specialty). */
  role?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = resolve(persona);
  return (
    <View style={[styles.row, style]}>
      <PersonaAvatar persona={p} />
      <Text style={[styles.who, { color: p.color }]}>{p.name.toUpperCase()}</Text>
      <Text style={styles.role}>· {(role ?? p.role).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  who: { ...mono(9.5, 700), letterSpacing: 1.3 },
  role: { ...mono(9.5, 700), letterSpacing: 1, color: T.sub, flexShrink: 1 },
});
