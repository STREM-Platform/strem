import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { resumeScreen, routeForScreen } from "@/lib/onboarding";

/**
 * Onboarding entry: resumes at the next incomplete screen. A fresh user starts
 * at `welcome`; a user who abandoned mid-flow returns to where they left off.
 */
export default function OnboardingIndex() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      let last = null;
      try {
        const status = await api.getOnboardingStatus();
        last = status.last_completed_screen ?? null;
      } catch {
        // Fall back to the start of the flow on any error.
      }
      if (active) {
        router.replace(routeForScreen(resumeScreen(last)));
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.accentGreenBright} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
