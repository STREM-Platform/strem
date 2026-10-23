/**
 * App frame: five destinations. Bottom bar on phones, a side rail on wide
 * screens so context stays visible instead of stretching a phone column.
 */

import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui/icon";
import { Wordmark, useLayout } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";

export const TABS: { label: string; icon: IconName; path: string; match: string[] }[] = [
  { label: "Mission", icon: "flag", path: "/(app)/home", match: ["/home", "/missions"] },
  { label: "Plan", icon: "calendar", path: "/(app)/plan", match: ["/plan", "/session"] },
  { label: "Race Lab", icon: "mountain", path: "/(app)/race", match: ["/race"] },
  { label: "Team", icon: "sparkles", path: "/(app)/team", match: ["/team"] },
  { label: "You", icon: "user", path: "/(app)/athlete", match: ["/athlete", "/history", "/integrations", "/mission-data", "/checkin"] },
];

function useActive() {
  const pathname = usePathname();
  return (tab: (typeof TABS)[number]) => tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function AppShell({ children }: { children: ReactNode }) {
  const { wide } = useLayout();
  if (wide) {
    return (
      <View style={styles.wideRoot}>
        <SideRail />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }
  return (
    <View style={styles.root}>
      {children}
      <TabBar />
    </View>
  );
}

function TabBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useActive();
  return (
    <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <BlurView intensity={30} tint="dark" style={styles.bar}>
        {TABS.map((tab) => {
          const on = active(tab);
          return (
            <Pressable
              key={tab.path}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              onPress={() => router.replace(tab.path)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.tabIcon, on && styles.tabIconOn]}>
                <Icon name={tab.icon} size={20} color={on ? C.ink : C.textMuted} sw={on ? 2.4 : 2} />
              </View>
              <Text style={[ui(10, 700), { color: on ? C.text : C.textDim, letterSpacing: 0.3 }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

function SideRail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useActive();
  return (
    <View style={[styles.rail, { paddingTop: insets.top + 26 }]}>
      <View style={{ paddingHorizontal: 18, paddingBottom: 26 }}>
        <Wordmark size={17} />
        <Text style={[ui(11, 600), { color: C.textDim, marginTop: 6, letterSpacing: 0.4 }]}>Never settle.</Text>
      </View>
      {TABS.map((tab) => {
        const on = active(tab);
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => router.replace(tab.path)}
            style={({ pressed }) => [styles.railItem, on && styles.railItemOn, pressed && { opacity: 0.75 }]}
          >
            <Icon name={tab.icon} size={20} color={on ? C.ink : C.textMuted} sw={on ? 2.4 : 2} />
            <Text style={[ui(14, 700), { color: on ? C.ink : C.textMuted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  wideRoot: { flex: 1, flexDirection: "row", backgroundColor: C.ink },
  barWrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: 12 },
  bar: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.lineStrong,
    overflow: "hidden",
    backgroundColor: Platform.OS === "android" ? "rgba(13,15,18,0.97)" : "rgba(13,15,18,0.8)",
    boxShadow: "0px 18px 44px rgba(0,0,0,0.6)",
  },
  tab: { flex: 1, alignItems: "center", gap: 3, minHeight: 50, justifyContent: "center" },
  tabIcon: { width: 44, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tabIconOn: { backgroundColor: C.white },
  rail: { width: 232, backgroundColor: C.night, borderRightWidth: 1, borderRightColor: C.line, paddingHorizontal: 12, gap: 6 },
  railItem: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 14 },
  railItemOn: { backgroundColor: C.white },
});
