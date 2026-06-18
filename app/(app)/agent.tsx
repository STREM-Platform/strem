/**
 * Agent Activity — the proof Forge is an agent, not a chatbot.
 *
 * Every autonomous (and proposed) action lands here with its reasoning, the exact
 * data it cited, and an Undo / Approve. Backed by the standing runtime
 * (`lib/agent/runtime`), so it updates live as Forge acts on graph events.
 */

import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityFeed } from "@/components/agent/activity";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";

export default function AgentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/coach"))} style={styles.back}>
          <Icon name="chevronL" size={20} color={T.mut} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.head}>
          <IconTile name="bot" size={44} iconSize={22} />
          <View style={styles.shrink}>
            <Text style={styles.eyebrow}>FORGE</Text>
            <Text style={styles.title}>AGENT ACTIVITY</Text>
          </View>
        </View>

        <View style={styles.body}>
          <ActivityFeed />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 40 },
  shrink: { flexShrink: 1, flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 6 },
  backText: { ...ui(13, 600), color: T.mut },
  head: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16, marginBottom: 18 },
  eyebrow: { ...mono(10, 700), letterSpacing: 1.4, color: T.green },
  title: { ...disp(28, 800), color: T.text, letterSpacing: 0.4 },
  body: { paddingHorizontal: 16 },
});
