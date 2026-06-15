/**
 * Recap viewer + share/export — ported from `RecapViewer` in
 * `design-spec/story-recaps.jsx`. Shows a real-data story card, a template
 * selector, and Download / Share. Export uses react-native-view-shot
 * (captureRef → PNG); Share routes through expo-sharing and Download saves to the
 * media library. Web/unsupported platforms fall back to a clear notice.
 */

import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { StoryCard } from "@/components/recaps/story-card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Btn } from "@/components/ui/primitives";
import { T, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { buildRecaps, type Recap, type RecapType } from "@/lib/recaps";
import { useAsync } from "@/lib/use-async";

const RECAP_TABS: Record<RecapType, { label: string; icon: IconName }> = {
  weekly: { label: "Weekly", icon: "chart" },
  consistency: { label: "Consistency", icon: "flame" },
  medal: { label: "Medal", icon: "medal" },
  monthly: { label: "Monthly", icon: "compass" },
};

async function loadRecapData() {
  const xp = await api.getXpSummary();
  const [sessions, nutrition, medals] = await Promise.all([
    api.listTrainingSessions(60).then((p) => p.items).catch(() => []),
    api.listNutritionDays(40).then((p) => p.items).catch(() => []),
    api.getMedals().then((r) => r.items).catch(() => []),
  ]);
  return { recaps: buildRecaps({ xp, sessions, nutrition, medals }), rank: xp.rank };
}

export default function RecapsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading } = useAsync(loadRecapData);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const cardRef = useRef<View>(null);

  const recaps: Recap[] = data?.recaps ?? [];
  const recap = recaps[Math.min(idx, recaps.length - 1)];
  const rank = data?.rank ?? "STREM";

  const capture = async (): Promise<string | null> => {
    if (Platform.OS === "web") return null;
    return (await captureRef(cardRef, { format: "png", quality: 1 })) ?? null;
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const uri = await capture();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your recap" });
        setShared(true);
      } else {
        Alert.alert("Sharing unavailable", "Recap sharing runs on a device build. It isn’t available in this environment.");
      }
    } catch {
      Alert.alert("Couldn’t share", "Something went wrong creating the image.");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      const uri = await capture();
      if (!uri) {
        Alert.alert("Saving unavailable", "Recap export runs on a device build.");
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo access to save your recap.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Your recap is in your photo library.");
    } catch {
      Alert.alert("Couldn’t save", "Something went wrong saving the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View ref={cardRef} collapsable={false} style={styles.shot}>
        {recap ? (
          <StoryCard recap={recap} rank={rank} />
        ) : (
          <View style={styles.loading}>
            {loading ? <ActivityIndicator color={T.green} /> : <Text style={styles.empty}>No recaps yet — log some proof first.</Text>}
          </View>
        )}
      </View>

      {/* close */}
      <Pressable style={[styles.close, { top: insets.top + 10 }]} onPress={() => router.back()} accessibilityLabel="Close">
        <View style={styles.closeIcon}>
          <Icon name="plus" size={20} color="#fff" />
        </View>
      </Pressable>

      {/* controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 18 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {recaps.map((r, i) => {
            const tab = RECAP_TABS[r.type];
            const on = i === Math.min(idx, recaps.length - 1);
            return (
              <Pressable
                key={r.type}
                onPress={() => {
                  setIdx(i);
                  setShared(false);
                }}
                style={[styles.tab, on ? styles.tabOn : styles.tabOff]}
              >
                <Icon name={tab.icon} size={14} color={on ? T.green : "rgba(255,255,255,0.6)"} />
                <Text style={[styles.tabLabel, { color: on ? "#fff" : "rgba(255,255,255,0.65)" }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.actions}>
          <Btn kind="ghost" icon="download" label={busy ? "Working…" : "Download"} onPress={onDownload} style={styles.actionGhost} />
          <Btn kind={shared ? "soft" : "primary"} icon={shared ? "check" : "share"} label={shared ? "Shared" : "Share to story"} onPress={onShare} style={styles.actionShare} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  shot: { flex: 1, backgroundColor: "#08090b" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  empty: { ...ui(14, 600), color: T.mut, textAlign: "center" },
  close: { position: "absolute", right: 16, zIndex: 5 },
  closeIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "45deg" }],
  },
  controls: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  tabs: { gap: 7, paddingVertical: 12 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  tabOn: { backgroundColor: T.greenSoft, borderColor: T.greenLine },
  tabOff: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" },
  tabLabel: { ...ui(12, 700) },
  actions: { flexDirection: "row", gap: 10 },
  actionGhost: { flex: 1 },
  actionShare: { flex: 1.4 },
});
