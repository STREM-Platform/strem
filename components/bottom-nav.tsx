/** Floating navigation for the five Race Mission surfaces. */

import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, ui } from "@/constants/theme";

// The AI race team earns a permanent seat because evidence-led adaptation is the
// product's spine, reached from every part of a Race Mission.
const TABS: { label: string; icon: IconName; path: string; match: string }[] = [
  { label: "Mission", icon: "flag", path: "/(app)/home", match: "/home" },
  { label: "Plan", icon: "route", path: "/(app)/plan", match: "/plan" },
  { label: "Race lab", icon: "mountain", path: "/(app)/race", match: "/race" },
  { label: "AI", icon: "bot", path: "/(app)/coach", match: "/coach" },
  {
    label: "Athlete",
    icon: "shield",
    path: "/(app)/profile",
    match: "/profile",
  },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={28} tint="dark" style={styles.bar}>
        {TABS.map((tab) => {
          const active = pathname === tab.match;
          return (
            <Pressable
              key={tab.path}
              accessibilityRole="tab"
              accessibilityLabel={
                tab.label === "AI" ? "AI race decisions" : tab.label
              }
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(tab.path)}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name={tab.icon}
                size={21}
                color={active ? Trail.lime : Trail.textMuted}
                sw={active ? 2.4 : 2}
              />
              <Text
                style={[
                  styles.label,
                  { color: active ? Trail.text : Trail.textMuted },
                ]}
                numberOfLines={1}
              >
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
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  bar: {
    width: "94%",
    maxWidth: 670,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Trail.lineStrong,
    overflow: "hidden",
    // BlurView is translucent; a fallback tint keeps it legible where blur is weak.
    backgroundColor:
      Platform.OS === "android" ? "rgba(10,21,16,0.96)" : "rgba(10,21,16,0.78)",
    boxShadow: "0px 20px 48px rgba(0,0,0,0.62)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 54,
    paddingVertical: 6,
    borderRadius: 21,
  },
  tabActive: {
    backgroundColor: Trail.limeSoft,
    borderWidth: 1,
    borderColor: Trail.limeLine,
  },
  pressed: { opacity: 0.75 },
  label: {
    ...ui(11, 700),
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
