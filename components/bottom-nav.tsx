/** Bottom navigation across the main app screens. */

import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";

const TABS: { label: string; path: string; match: string }[] = [
  { label: "Home", path: "/(app)/home", match: "/home" },
  { label: "Log", path: "/(app)/log", match: "/log" },
  { label: "Nutrition", path: "/(app)/nutrition", match: "/nutrition" },
  { label: "Tribe", path: "/(app)/tribe", match: "/tribe" },
  { label: "Profile", path: "/(app)/profile", match: "/profile" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = pathname === tab.match;
          return (
            <Pressable
              key={tab.path}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(tab.path)}
              style={({ pressed }) => [
                styles.tab,
                active ? styles.tabActive : null,
                pressed ? styles.tabPressed : null,
              ]}
            >
              <View style={[styles.marker, active ? styles.markerActive : null]} />
              <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderColor: Colors.borderStrong,
    borderWidth: 1,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surfaceRaised,
    padding: Spacing.xs,
    ...Shadows.nav,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xl,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.backgroundElevated,
  },
  tabPressed: {
    opacity: 0.82,
  },
  marker: {
    width: 18,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: "transparent",
  },
  markerActive: {
    backgroundColor: Colors.accentGreenBright,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSubtle,
    fontSize: 11,
    letterSpacing: 0,
  },
  labelActive: {
    color: Colors.text,
  },
});
