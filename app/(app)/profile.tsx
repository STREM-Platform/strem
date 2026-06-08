import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { BrandLogo } from "@/components/brand-logo";
import { EmptyState, MetricCard, Surface } from "@/components/ui/surface";
import { ProgressBar } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader, ScreenHeader } from "@/components/ui/typography";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { api } from "@/lib/api/client";
import type { EarnedMedal, XPSummary } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
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

/** Profile - rank, total XP, progress to next rank, and earned medals. */
export default function ProfileScreen() {
  const { data, loading, error, reload } = useAsync(loadProfile);

  return (
    <AppScreen loading={loading} error={error} onRefresh={reload}>
      {data ? (
        <>
          <ScreenHeader
            title="Progression"
            subtitle="Permanent proof of the identity you are building."
          />

          <Surface variant="raised" style={styles.rankCard}>
            <View style={styles.rankTop}>
              <StatusPill label={data.xp.rank} tone="inverse" />
              <Text style={styles.total}>{data.xp.total_xp.toLocaleString()} XP</Text>
            </View>
            <ProgressBar
              value={progressFraction(data.xp)}
              label={data.xp.next_rank ? `Path to ${data.xp.next_rank}` : "MVP rank complete"}
              helper={
                data.xp.next_rank
                  ? `${data.xp.xp_to_next_rank.toLocaleString()} XP remaining`
                  : "Top MVP rank reached"
              }
            />
          </Surface>

          <View style={styles.metrics}>
            <MetricCard label="In rank" value={data.xp.xp_into_rank.toLocaleString()} detail="XP earned" />
            <MetricCard
              label="Medals"
              value={String(data.medals.length)}
              detail="Earned"
              tone={data.medals.length > 0 ? "green" : "neutral"}
            />
          </View>

          <SectionHeader title="Medals" subtitle="Milestones that should feel earned." />
          {data.medals.length === 0 ? (
            <EmptyState title="No medals yet" body="Your first earned marker is one action away." />
          ) : (
            <View style={styles.medals}>
              {data.medals.map((medal) => (
                <Surface key={medal.medal_type} variant="muted" style={styles.medal}>
                  <View style={styles.medalMark}>
                    <BrandLogo variant="symbol" style={styles.medalLogo} />
                  </View>
                  <View style={styles.medalCopy}>
                    <Text style={styles.medalTitle}>{medal.title}</Text>
                    <Text style={styles.medalDate}>Earned {formatShortDate(medal.earned_at.slice(0, 10))}</Text>
                  </View>
                </Surface>
              ))}
            </View>
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    gap: Spacing.xl,
  },
  rankTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  total: {
    color: Colors.accentGreenBright,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  medals: {
    gap: Spacing.sm,
  },
  medal: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  medalMark: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
    backgroundColor: Colors.accentGreenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  medalLogo: {
    width: 32,
    height: 32,
  },
  medalCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  medalTitle: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  medalDate: {
    ...Typography.caption,
    color: Colors.textSubtle,
    fontWeight: "600",
  },
});
