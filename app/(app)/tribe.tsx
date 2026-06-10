/* eslint-disable react-hooks/set-state-in-effect -- initial tribe fetch sets state from the request result. */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/form";
import { ChallengesPanel } from "@/components/tribe/challenges-panel";
import { JoinTribePanel } from "@/components/tribe/join-tribe-panel";
import { TribeHomePanel } from "@/components/tribe/tribe-home-panel";
import { EmptyState, Surface } from "@/components/ui/surface";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { Challenge, CheckIn, Tribe } from "@/lib/api/types";

type Status = "loading" | "no_tribe" | "pending" | "in_tribe" | "error";

/**
 * Tribe - small accountability group state, invite join, and structured check-ins.
 */
export default function TribeScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const current = await api.getMyTribe();
      const [activity, challengePage] = await Promise.all([
        api.listCheckins(current.id),
        api.listChallenges(current.id),
      ]);
      setTribe(current);
      setCheckins(activity.items);
      setChallenges(challengePage.items);
      setStatus("in_tribe");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("no_tribe");
      } else if (!(err instanceof SessionExpiredError)) {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <AppScreen>
        <Surface variant="muted" style={styles.loading}>
          <ActivityIndicator color={Colors.accentGreenBright} />
          <Text style={styles.loadingText}>Loading tribe...</Text>
        </Surface>
      </AppScreen>
    );
  }

  if (status === "error") {
    return (
      <AppScreen error="Couldn't load your tribe. Pull to retry." onRefresh={() => void load()} />
    );
  }

  if (status === "pending") {
    return (
      <AppScreen>
        <EmptyState
          title="Request sent"
          body="An admin will approve your tribe request. Check back shortly."
        >
          <PrimaryButton label="Refresh" onPress={() => void load()} />
        </EmptyState>
      </AppScreen>
    );
  }

  if (status === "no_tribe") {
    return (
      <AppScreen>
        <JoinTribePanel onPending={() => setStatus("pending")} onJoined={() => void load()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen onRefresh={() => void load()}>
      <TribeHomePanel tribe={tribe as Tribe} checkins={checkins} onCheckedIn={() => void load()} />
      <ChallengesPanel
        tribeId={(tribe as Tribe).id}
        isAdmin={(tribe as Tribe).my_role === "admin"}
        challenges={challenges}
        onChanged={() => void load()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
});
