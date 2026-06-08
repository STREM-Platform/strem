import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { Colors } from "@/constants/Colors";
import { api } from "@/lib/api/client";
import type { EarnedMedal, XPSummary } from "@/lib/api/types";
import { useAsync } from "@/lib/use-async";

interface ProfileData {
  xp: XPSummary;
  medals: EarnedMedal[];
}

async function loadProfile(): Promise<ProfileData> {
  const [xp, medals] = await Promise.all([api.getXpSummary(), api.getMedals()]);
  return { xp, medals: medals.items };
}

function progressFraction(xp: XPSummary): number {
  if (xp.next_rank === null) {
    return 1;
  }
  const span = xp.rank_xp_ceiling - xp.rank_xp_floor + 1;
  return span > 0 ? Math.min(1, Math.max(0, xp.xp_into_rank / span)) : 0;
}

/** Profile — rank, total XP, progress to the next rank, and earned medals. */
export default function ProfileScreen() {
  const { data, loading, error, reload } = useAsync(loadProfile);

  return (
    <AppScreen loading={loading} error={error} onRefresh={reload}>
      {data ? (
        <>
          <Text style={styles.rank}>{data.xp.rank}</Text>
          <Text style={styles.total}>{data.xp.total_xp.toLocaleString()} XP total</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressFraction(data.xp) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {data.xp.next_rank
              ? `${data.xp.xp_to_next_rank.toLocaleString()} XP to ${data.xp.next_rank}`
              : "Top MVP rank reached"}
          </Text>

          <Text style={styles.sectionTitle}>Medals</Text>
          {data.medals.length === 0 ? (
            <Text style={styles.empty}>No medals yet — your first is one action away.</Text>
          ) : (
            <View style={styles.medals}>
              {data.medals.map((medal) => (
                <View key={medal.medal_type} style={styles.medal}>
                  <Text style={styles.medalTitle}>{medal.title}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  rank: { color: Colors.text, fontSize: 32, fontWeight: "800" },
  total: { color: Colors.textMuted, fontSize: 16 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: { height: "100%", backgroundColor: Colors.accentGreen },
  progressLabel: { color: Colors.textMuted, fontSize: 13 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 12 },
  empty: { color: Colors.textMuted, fontSize: 14 },
  medals: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  medal: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accentGreen,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  medalTitle: { color: Colors.text, fontSize: 14, fontWeight: "600" },
});
