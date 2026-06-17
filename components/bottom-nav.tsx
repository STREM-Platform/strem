/** Floating bottom navigation, ported from `AppNav` in design-spec/app-shell.jsx. */

import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/icon";
import { T, ui } from "@/constants/theme";

const TABS: { label: string; icon: IconName; path: string; match: string }[] = [
  { label: "Home", icon: "home", path: "/(app)/home", match: "/home" },
  { label: "Train", icon: "dumbbell", path: "/(app)/log", match: "/log" },
  { label: "Fuel", icon: "leaf", path: "/(app)/nutrition", match: "/nutrition" },
  { label: "Tribe", icon: "users", path: "/(app)/tribe", match: "/tribe" },
  { label: "You", icon: "shield", path: "/(app)/profile", match: "/profile" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <BlurView intensity={28} tint="dark" style={styles.bar}>
        {TABS.map((tab) => {
          const active = pathname === tab.match;
          return (
            <Pressable
              key={tab.path}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(tab.path)}
              style={styles.tab}
            >
              {active ? <View style={styles.marker} /> : null}
              <Icon name={tab.icon} size={22} color={active ? T.green : T.sub} sw={active ? 2.4 : 2} />
              <Text style={[styles.label, { color: active ? T.text : T.sub }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.line2,
    overflow: "hidden",
    // BlurView is translucent; a fallback tint keeps it legible where blur is weak.
    backgroundColor: Platform.OS === "android" ? "rgba(13,16,21,0.94)" : "rgba(13,16,21,0.7)",
    boxShadow: "0px 14px 34px rgba(0,0,0,0.55)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },
  marker: {
    position: "absolute",
    top: -9,
    width: 22,
    height: 3,
    borderRadius: 3,
    backgroundColor: T.green,
    boxShadow: "0px 0px 10px #34E2A0",
  },
  label: {
    ...ui(9, 700),
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
