/**
 * "Complete your athlete profile" prompt (issue #61) — a non-blocking card on
 * Today, shown only until the athlete baseline is started. Tapping it opens the
 * Athlete Baseline form. Re-checks on focus so it disappears once completed.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { T, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { AthleteProfile } from "@/lib/api/types";

export function AthleteProfileCard() {
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .getAthleteProfile()
        .then((p) => {
          if (active) {
            setProfile(p);
            setChecked(true);
          }
        })
        .catch(() => {
          if (active) setChecked(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  // Stay quiet until we know, and once the baseline is started.
  if (!checked || !profile || profile.is_started) return null;

  return (
    <Pressable
      onPress={() => router.push("/(app)/athlete-profile")}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Complete your athlete profile"
    >
      <View style={styles.icon}>
        <Icon name="compass" size={18} color={T.green} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Complete your athlete profile</Text>
        <Text style={styles.sub}>
          Tell Forge your PRs, injuries & equipment so it can coach the real you.
        </Text>
      </View>
      <Icon name="chevron" size={18} color={T.sub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: T.surf,
    borderWidth: 1,
    borderColor: T.greenLine,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greenSoft,
    borderWidth: 1,
    borderColor: T.greenLine,
  },
  body: { flex: 1, flexShrink: 1 },
  title: { ...ui(15, 700), color: T.text },
  sub: { ...ui(12, 500), color: T.sub, marginTop: 2, lineHeight: 16 },
});
