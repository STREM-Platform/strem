import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "@/components/bottom-nav";
import {
  TrailAtmosphere,
  TrailPanel,
  trailStyles,
} from "@/components/trail/trail-ui";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { useMission } from "@/lib/trail/mission-context";

export function MissionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: Trail.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function MissionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 24 }]}
      >
        <Text style={styles.brand}>STREM / RACE MISSION</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{subtitle}</Text>
        {children}
      </ScrollView>
      <BottomNav />
    </View>
  );
}
export function MissionGate({ children }: { children: ReactNode }) {
  const { mission, loading, error, reload } = useMission();
  const router = useRouter();
  if (loading)
    return (
      <TrailPanel style={styles.panel}>
        <ActivityIndicator color={Trail.lime} />
        <Text style={styles.body}>Loading your saved mission…</Text>
      </TrailPanel>
    );
  if (error)
    return (
      <TrailPanel style={styles.panel}>
        <Text accessibilityRole="alert" style={styles.body}>
          {error}
        </Text>
        <MissionButton label="Retry connection" onPress={() => void reload()} />
      </TrailPanel>
    );
  if (!mission)
    return (
      <TrailPanel style={styles.panel}>
        <Text style={styles.heading}>Start with your race.</Text>
        <Text style={styles.body}>
          Choose the event you are preparing for. You can leave elevation and
          cutoff unknown; STREM will not guess them.
        </Text>
        <MissionButton
          label="Create Race Mission"
          onPress={() => router.push("/(app)/mission-setup")}
        />
      </TrailPanel>
    );
  return <>{children}</>;
}
export const missionStyles = StyleSheet.create({
  panel: { gap: 16 },
  body: { ...ui(15, 500), color: Trail.textMuted, lineHeight: 23 },
  heading: { ...disp(28, 700), color: Trail.text },
  label: { ...mono(11, 600), color: Trail.lime, letterSpacing: 0.8 },
  error: { ...ui(14, 500), color: Trail.orange, lineHeight: 21 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
const styles = StyleSheet.create({
  ...missionStyles,
  page: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 18,
  },
  brand: { ...mono(12, 700), color: Trail.textMuted, letterSpacing: 2 },
  title: { ...disp(40, 700), lineHeight: 44, color: Trail.text },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Trail.lime,
    borderWidth: 1,
    borderColor: Trail.lime,
  },
  secondary: { backgroundColor: Trail.panel, borderColor: Trail.lineStrong },
  buttonText: { ...ui(15, 700), color: Trail.limeInk },
});
