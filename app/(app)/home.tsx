/**
 * Today — the AI-first home, ported from `prototype/screens/screen-home-ai.jsx`.
 *
 * Leads with the agent, not a dashboard: a compact brand header (greeting +
 * identity + streak) over the Forge stack — proactive nudge + 10s check-in,
 * Today's Climb readiness + one coached action, "What your coach sees", and the
 * Ask-Forge teaser. Rank / XP / the body of work live on Profile now.
 *
 * Header data is live (name + identity from the user profile, streak from XP);
 * the Forge surfaces read the one assembled context.
 */

import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoachChatTeaser, ProactiveCheckin, TodaysClimb } from "@/components/agent/today";
import { AthleteProfileCard } from "@/components/athlete/athlete-profile-card";
import { BottomNav } from "@/components/bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/ui/icon";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { UserProfile, XPSummary } from "@/lib/api/types";
import { FLAGS } from "@/lib/flags";
import { useAsync } from "@/lib/use-async";

interface HomeData {
  profile: UserProfile;
  xp: XPSummary;
}

async function loadHome(): Promise<HomeData> {
  const [profile, xp] = await Promise.all([api.getUserProfile(), api.getXpSummary()]);
  return { profile, xp };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useAsync(loadHome);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={Boolean(loading)} onRefresh={reload} tintColor={T.text} colors={[T.green]} />}
      >
        {loading && !data ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <ActivityIndicator color={T.green} />
            <Text style={styles.muted}>Loading your day…</Text>
          </View>
        ) : null}
        {error && !data ? (
          <View style={[styles.center, { paddingTop: insets.top + 120 }]}>
            <Text style={styles.errorTitle}>This didn’t load</Text>
            <Text style={styles.muted}>{error}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <CompactHeader data={data} topInset={insets.top} onProfile={() => router.push("/(app)/profile")} />
            <View style={styles.stack}>
              <AthleteProfileCard />
              {FLAGS.forgeAgentMock ? (
                <>
                  <ProactiveCheckin />
                  <TodaysClimb onStart={() => router.push("/(app)/log")} />
                  <CoachChatTeaser onPress={() => router.push("/(app)/coach")} />
                </>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function CompactHeader({ data, topInset, onProfile }: { data: HomeData; topInset: number; onProfile: () => void }) {
  const firstName = (data.profile.display_name || "Athlete").split(" ")[0];
  const identity = data.profile.identity_statement;
  const streak = data.xp.current_streak_days;
  return (
    <View style={[styles.header, { paddingTop: topInset + 16 }]}>
      <View style={styles.shrink}>
        <View style={styles.brand}>
          <BrandLogo variant="symbol" style={styles.brandMark} />
          <Text style={styles.brandText}>STREM</Text>
        </View>
        <Text style={styles.greeting}>
          {greeting()}, {firstName}.
        </Text>
        {identity ? (
          <Text style={styles.identity} numberOfLines={1}>
            ◇ {identity}
          </Text>
        ) : null}
      </View>
      {streak > 0 ? (
        <Pressable onPress={onProfile} style={styles.streakTile} accessibilityLabel={`${streak} day streak`}>
          <Icon name="flame" size={18} color={T.green} fill />
          <Text style={styles.streakText}>{streak}D</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 120 },
  center: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  muted: { ...ui(13, 500), color: T.mut, textAlign: "center" },
  errorTitle: { ...disp(20, 800), color: T.text },
  shrink: { flexShrink: 1 },
  stack: { gap: 16 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 18 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 26, height: 26 },
  brandText: { ...disp(14, 700), letterSpacing: 3.4, color: "#fff" },
  greeting: { ...ui(13, 600), color: T.mut, marginTop: 10 },
  identity: { ...mono(10, 600), color: T.green, letterSpacing: 0.6, marginTop: 4 },
  streakTile: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: T.surf,
    borderWidth: 1,
    borderColor: T.line2,
  },
  streakText: { ...mono(8, 700), letterSpacing: 0.6, color: T.mut },
});
