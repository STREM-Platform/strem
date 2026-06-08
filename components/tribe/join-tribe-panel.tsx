import { useState } from "react";
import { StyleSheet } from "react-native";

import { FormError, PrimaryButton, TextField } from "@/components/form";
import { EmptyState, Surface } from "@/components/ui/surface";
import { ScreenHeader } from "@/components/ui/typography";
import { Spacing } from "@/constants/theme";
import { ApiError, api } from "@/lib/api/client";

interface JoinTribePanelProps {
  onPending: () => void;
  onJoined: () => void;
}

export function JoinTribePanel({ onPending, onJoined }: JoinTribePanelProps) {
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
    <>
      <ScreenHeader
        title="Find your tribe"
        subtitle="Small invite-only accountability groups. No public feed, no follower mechanics."
      />
      <Surface variant="raised" style={styles.form}>
        <TextField label="Invite code" value={code} onChangeText={setCode} placeholder="IRON-7Q2K" />
        {error ? <FormError message={error} /> : null}
        <PrimaryButton label="Join tribe" onPress={onJoin} loading={submitting} />
      </Surface>
      <EmptyState
        title="Tribes stay small"
        body="Ask someone you trust for a code. STREM tribes are built for accountability, not discovery."
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
  },
});
