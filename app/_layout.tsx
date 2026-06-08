import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";

import { AuthProvider, useAuth } from "@/lib/session/auth-context";

/**
 * Route guard: keeps the user on the screen group that matches their session.
 *
 * - signed out            → `(auth)`
 * - signed in, onboarding incomplete → `(onboarding)`
 * - signed in, onboarding complete   → `(app)`
 *
 * While loading (restoring the session, or fetching onboarding status) the
 * current route — the splash — is shown and no redirect happens.
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const { phase, onboardingCompleted } = useAuth();
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

    // signedIn — wait until onboarding status is known.
    if (onboardingCompleted === null) {
      return;
    }
    if (!onboardingCompleted) {
      if (group !== "(onboarding)") {
        router.replace("/(onboarding)");
      }
    } else if (group !== "(app)") {
      router.replace("/(app)/home");
    }
  }, [phase, onboardingCompleted, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </RouteGuard>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
