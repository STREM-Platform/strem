import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  MissionButton,
  MissionGate,
  MissionShell,
  missionStyles as s,
} from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { Trail, disp, ui } from "@/constants/theme";
import { raceMissions } from "@/lib/api/race-missions";
import { ApiError } from "@/lib/api/client";
import { useMission } from "@/lib/trail/mission-context";
import { raceDays, requestKey } from "@/lib/trail/mission-form";

export default function MissionScreen() {
  const { mission, reload } = useMission();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveKey, setArchiveKey] = useState(requestKey);
  const days = mission ? raceDays(mission) : 0;
  const archive = async () => {
    if (!mission || busy) return;
    setBusy(true);
    setError(null);
    try {
      await raceMissions.archive(mission, "Archived by athlete", archiveKey);
      setConfirming(false);
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Archive was not confirmed. Reload to check saved state before retrying.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <MissionShell
      title={mission?.event.name ?? "Your next start line."}
      subtitle={
        mission
          ? "Your race workspace · private to your account"
          : "Every mission starts with a race worth preparing for."
      }
    >
      <MissionGate>
        {mission && (
          <>
            <View style={[styles.workspace, width >= 1024 && styles.wide]}>
              <TrailPanel accent style={styles.identity}>
                <Text style={s.label}>THE OBJECTIVE / TRAIL RUNNING</Text>
                <Text style={styles.date}>{mission.event.race_date}</Text>
                <Text style={s.body}>
                  {mission.event.location_name} · {mission.event.timezone}
                </Text>
                <Text style={styles.distance}>
                  {mission.event.distance_km}{" "}
                  <Text style={styles.unit}>km</Text>
                </Text>
                <View style={s.row}>
                  <Fact
                    value={
                      mission.event.elevation_gain_m === null
                        ? "Unknown"
                        : `${mission.event.elevation_gain_m} m+`
                    }
                    label="Total ascent"
                  />
                  <Fact
                    value={
                      mission.event.cutoff_minutes === null
                        ? "Unknown"
                        : `${mission.event.cutoff_minutes} min`
                    }
                    label="Race cutoff"
                  />
                </View>
                <Text style={styles.countdown}>
                  {days > 0
                    ? `${days} calendar days to race day`
                    : days === 0
                      ? "Race day is today"
                      : "The entered race date has passed"}
                </Text>
                <MissionButton
                  label="Edit race details"
                  onPress={() => router.push("/(app)/mission-setup")}
                />
                <Text style={styles.caption}>
                  Entered by you · not organizer verified. Calendar days only;
                  start time is unknown.
                </Text>
              </TrailPanel>
              <View style={styles.actions}>
                <TrailPanel style={s.panel}>
                  <Text style={s.label}>YOUR GOAL</Text>
                  <Text style={s.heading}>
                    {mission.goal.outcome === "target_time"
                      ? `Finish in ${mission.goal.target_finish_minutes} minutes`
                      : mission.goal.outcome === "finish"
                        ? "Reach the finish"
                        : "Finish confidently"}
                  </Text>
                  <Text style={s.body}>
                    Saved to your account · version {mission.version}. This is
                    your stated goal, not an assessed finish prediction.
                  </Text>
                </TrailPanel>
                <TrailPanel style={s.panel}>
                  <Text style={s.label}>WHAT IS STILL UNKNOWN</Text>
                  <Text style={s.heading}>
                    Preparation is not assessed yet.
                  </Text>
                  <Text style={s.body}>
                    No race-specific course model, evidence assessment or
                    preparation plan is available. STREM will not substitute
                    example workouts or an estimated readiness score.
                  </Text>
                  <MissionButton
                    secondary
                    label="Manage connected sources"
                    onPress={() => router.push("/(app)/integrations")}
                  />
                </TrailPanel>
              </View>
            </View>
            {error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            {confirming ? (
              <TrailPanel style={s.panel}>
                <Text style={s.heading}>Archive this mission?</Text>
                <Text style={s.body}>
                  It will leave your active workspace. Its saved details and
                  revisions remain in your mission export. You can then create a
                  different mission.
                </Text>
                <MissionButton
                  label={busy ? "Archiving…" : "Confirm archive"}
                  disabled={busy}
                  onPress={() => void archive()}
                />
                <MissionButton
                  secondary
                  label="Keep active"
                  disabled={busy}
                  onPress={() => setConfirming(false)}
                />
              </TrailPanel>
            ) : (
              <MissionButton
                secondary
                label="Archive mission"
                onPress={() => {
                  setArchiveKey(requestKey());
                  setConfirming(true);
                }}
              />
            )}
          </>
        )}
      </MissionGate>
      <View style={s.row}>
        <MissionButton
          secondary
          label="Refresh saved state"
          onPress={() => void reload()}
        />
        <MissionButton
          secondary
          label="Mission data & history"
          onPress={() => router.push("/(app)/mission-data")}
        />
      </View>
    </MissionShell>
  );
}
function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={s.body}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  workspace: { gap: 22 },
  wide: { flexDirection: "row", alignItems: "flex-start" },
  identity: { flex: 1.2, gap: 14, padding: 20 },
  actions: { flex: 1, gap: 20 },
  date: { ...disp(32, 700), lineHeight: 38, color: Trail.text },
  distance: { ...disp(64, 700), lineHeight: 72, color: Trail.lime },
  unit: { ...ui(24, 500), color: Trail.textMuted },
  countdown: {
    ...ui(16, 600),
    lineHeight: 24,
    color: Trail.text,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Trail.lineStrong,
  },
  caption: { ...ui(12, 500), lineHeight: 18, color: Trail.textMuted },
  fact: { flex: 1, minWidth: 100, gap: 3 },
  factValue: { ...disp(26, 700), lineHeight: 32, color: Trail.text },
});
