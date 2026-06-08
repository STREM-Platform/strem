/**
 * Hook for an onboarding step: persist this screen's answers (per-screen
 * persistence) and advance. The `launch` screen instead refreshes session
 * onboarding state so the route guard moves the user into the app.
 */

import { useRouter } from "expo-router";
import { useState } from "react";

import { api } from "@/lib/api/client";
import type { OnboardingScreen, OnboardingSubmission } from "@/lib/api/types";
import { ONBOARDING_ORDER, routeForScreen } from "@/lib/onboarding";
import { useAuth } from "@/lib/session/auth-context";

interface OnboardingStep {
  submit: (payload: OnboardingSubmission) => Promise<void>;
  submitting: boolean;
  error: string | undefined;
}

export function useOnboardingStep(screen: OnboardingScreen): OnboardingStep {
  const router = useRouter();
  const { refreshOnboardingStatus } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (payload: OnboardingSubmission): Promise<void> => {
    setSubmitting(true);
    setError(undefined);
    try {
      await api.submitOnboarding({ ...payload, screen });
      if (screen === "launch") {
        await refreshOnboardingStatus(); // guard redirects to (app)
        return;
      }
      const next = ONBOARDING_ORDER[ONBOARDING_ORDER.indexOf(screen) + 1];
      if (next) {
        router.push(routeForScreen(next));
      }
    } catch {
      setError("We couldn't save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error };
}
