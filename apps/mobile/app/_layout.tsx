import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { FontAssets } from "@/constants/theme";
import { installGlobalErrorHandler } from "@/lib/monitoring";
import { AuthProvider, useAuth } from "@/lib/session/auth-context";

installGlobalErrorHandler();

/**
 * Route guard: keeps the user on the screen group that matches their session.
 *
 * - signed out                          → `(auth)`
 * - signed in, legal not accepted        → `(legal)` (accept gate, before all else)
 * - signed in, onboarding incomplete     → `(onboarding)`
 * - signed in, onboarding complete       → `(app)`
 *
 * While loading (restoring the session, or fetching onboarding/legal status) the
 * current route — the splash — is shown and no redirect happens. The `(legal)`
 * group is always allowed for signed-in users so the policy viewers can be
 * opened from anywhere without being bounced.
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const { phase, onboardingCompleted, legalAccepted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (phase === "loading") {
      return;
    }
    const group = segments[0];

    if (phase === "signedOut") {
      if (group !== "(auth)") {
        router.replace("/(auth)/login");
      }
      return;
    }

    // signedIn — wait until both statuses are known.
    if (onboardingCompleted === null || legalAccepted === null) {
      return;
    }

    // Legal acceptance gates everything else (and re-gates on a version bump).
    if (!legalAccepted) {
      if (group !== "(legal)") {
        router.replace("/(legal)/accept");
      }
      return;
    }

    // Policy pages stay readable after acceptance; the accept gate itself moves on.
    const readingPolicy = group === "(legal)" && (segments as string[])[1] !== "accept";
    if (!onboardingCompleted) {
      if (group !== "(onboarding)" && !readingPolicy) {
        router.replace("/(onboarding)");
      }
    } else if (group !== "(app)" && !readingPolicy) {
      router.replace("/(app)/home");
    }
  }, [phase, onboardingCompleted, legalAccepted, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  // Saira Condensed (display), Saira (UI), JetBrains Mono (labels). Hold the
  // splash until the type system is ready so the first paint is on-brand rather
  // than swapping fonts in after mount.
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouteGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </RouteGuard>
        <StatusBar style="light" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
