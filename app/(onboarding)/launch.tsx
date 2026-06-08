import { useState } from "react";
import { Text } from "react-native";

import { TextField } from "@/components/form";
import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/lib/session/auth-context";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Screen 7 — confirm and begin. `display_name` is pre-filled from the account;
 * `timezone` is auto-detected and required. Submitting completes onboarding and
 * the route guard moves the user into the app.
 */
export default function LaunchScreen() {
  const { user } = useAuth();
  const { submit, submitting, error } = useOnboardingStep("launch");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const timezone = deviceTimezone();

  return (
    <OnboardingScaffold
      screen="launch"
      title="You're ready."
      subtitle="Confirm your name and we'll begin. Your first mission is waiting."
      primaryLabel="Start training"
      onPrimary={() =>
        void submit({
          display_name: displayName.trim() || undefined,
          timezone,
        })
      }
      submitting={submitting}
      errorText={error}
    >
      <TextField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Alex"
        autoCapitalize="words"
        maxLength={40}
      />
      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Timezone: {timezone}</Text>
    </OnboardingScaffold>
  );
}
