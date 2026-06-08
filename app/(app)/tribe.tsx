/* eslint-disable react-hooks/set-state-in-effect -- the initial tribe fetch
   legitimately sets state when the request resolves (404 = no tribe). */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { OptionSelect, type Option } from "@/components/select";
import { Colors } from "@/constants/Colors";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { CheckIn, CompletedAction, Tribe } from "@/lib/api/types";

type Status = "loading" | "no_tribe" | "pending" | "in_tribe" | "error";

const ACTIONS: Option<CompletedAction>[] = [
  { value: "training", label: "Training" },
  { value: "running", label: "Running" },
  { value: "nutrition", label: "Nutrition" },
  { value: "recovery", label: "Recovery" },
  { value: "rest_day", label: "Rest day" },
  { value: "nothing", label: "Nothing today" },
];

/**
 * Tribe — a small accountability locker room. Shows the caller's tribe state
 * (none / pending / member / admin), supports join-by-invite, structured
 * check-ins, and a members-only activity list. No public feed or discovery.
 */
export default function TribeScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const current = await api.getMyTribe();
      const activity = await api.listCheckins(current.id);
      setTribe(current);
      setCheckins(activity.items);
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
        <ActivityIndicator color={Colors.accentGreen} style={{ marginTop: 40 }} />
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
        <Text style={styles.title}>Request sent</Text>
        <Text style={styles.body}>
          You&apos;ve asked to join. An admin will approve you — check back shortly.
        </Text>
        <PrimaryButton label="Refresh" onPress={() => void load()} />
      </AppScreen>
    );
  }
  if (status === "no_tribe") {
    return <JoinTribe onPending={() => setStatus("pending")} onJoined={() => void load()} />;
  }

  return <TribeHome tribe={tribe as Tribe} checkins={checkins} onCheckedIn={() => void load()} />;
}

function JoinTribe({ onPending, onJoined }: { onPending: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onJoin = async (): Promise<void> => {
    setError(undefined);
    if (code.trim().length === 0) {
      setError("Enter an invite code.");
      return;
    }
    setSubmitting(true);
    try {
      const membership = await api.joinTribe(code.trim());
      if (membership.status === "pending") {
        onPending();
      } else {
        onJoined();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("That invite code is invalid or expired.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't join. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <Text style={styles.title}>Find your tribe</Text>
      <Text style={styles.body}>
        Tribes are small, invite-only accountability groups — never a public feed. Ask a friend for
        an invite code to join theirs.
      </Text>
      <TextField label="Invite code" value={code} onChangeText={setCode} placeholder="IRON-7Q2K" />
      {error ? <FormError message={error} /> : null}
      <PrimaryButton label="Join tribe" onPress={onJoin} loading={submitting} />
    </AppScreen>
  );
}

function TribeHome({
  tribe,
  checkins,
  onCheckedIn,
}: {
  tribe: Tribe;
  checkins: CheckIn[];
  onCheckedIn: () => void;
}) {
  const [action, setAction] = useState<CompletedAction>("training");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onCheckin = async (): Promise<void> => {
    setError(undefined);
    setSubmitting(true);
    try {
      await api.createCheckin(tribe.id, {
        completed_action: action,
        status_note: note.trim() || undefined,
      });
      setNote("");
      onCheckedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.tribeName}>{tribe.name}</Text>
        <Text style={styles.roleBadge}>{tribe.my_role}</Text>
      </View>
      <Text style={styles.stats}>
        {tribe.member_count} / {tribe.max_members} members ·{" "}
        {tribe.tribe_power.toLocaleString()} Tribe Power
      </Text>
      {tribe.mission_statement ? (
        <Text style={styles.mission}>“{tribe.mission_statement}”</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Check in</Text>
      <OptionSelect options={ACTIONS} selected={action} onSelect={setAction} />
      <TextField
        label="One-sentence status (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Early run before work."
        maxLength={140}
      />
      {error ? <FormError message={error} /> : null}
      <PrimaryButton label="Post check-in" onPress={onCheckin} loading={submitting} />

      <Text style={styles.sectionTitle}>Tribe activity</Text>
      {checkins.length === 0 ? (
        <Text style={styles.body}>No check-ins yet. Be the one who starts.</Text>
      ) : (
        checkins.map((checkin) => (
          <View key={checkin.id} style={styles.checkinRow}>
            <Text style={styles.checkinAction}>{checkin.completed_action.replace("_", " ")}</Text>
            {checkin.status_note ? (
              <Text style={styles.checkinNote}>{checkin.status_note}</Text>
            ) : null}
          </View>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 24, fontWeight: "800" },
  body: { color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tribeName: { color: Colors.text, fontSize: 24, fontWeight: "800" },
  roleBadge: {
    color: Colors.background,
    backgroundColor: Colors.accentGreen,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  stats: { color: Colors.textMuted, fontSize: 14 },
  mission: { color: Colors.text, fontSize: 15, fontStyle: "italic" },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 12 },
  checkinRow: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  checkinAction: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  checkinNote: { color: Colors.textMuted, fontSize: 14 },
});
