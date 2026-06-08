/** Simple bottom navigation across the main app screens. */

import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

const TABS: { label: string; path: string }[] = [
  { label: "Home", path: "/(app)/home" },
  { label: "Log", path: "/(app)/log" },
  { label: "Nutrition", path: "/(app)/nutrition" },
  { label: "Tribe", path: "/(app)/tribe" },
  { label: "Profile", path: "/(app)/profile" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active = pathname === tab.path.replace("/(app)", "");
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="button"
            onPress={() => router.replace(tab.path)}
            style={styles.tab}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    backgroundColor: Colors.surface,
    paddingBottom: 24,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: "center" },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  labelActive: { color: Colors.accentGreen },
});
