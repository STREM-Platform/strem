import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/lib/session/auth-context";

/**
 * Onboarding entry. This is the route the guard sends a signed-in user to when
 * onboarding is incomplete. The full seven-screen identity flow is built on this
 * group in the onboarding work (strem-mobile#4); for now it confirms the session
 * landed here and offers a way back out.
 */
export default function OnboardingStart() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>STREM</Text>
      <Text style={styles.title}>Let&apos;s build your identity</Text>
      <Text style={styles.body}>
        Welcome{user?.display_name ? `, ${user.display_name}` : ""}. The next few screens capture
        who you&apos;re becoming — the identity your coach references for the rest of your journey.
      </Text>
      <PrimaryButton label="Sign Out" onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  brand: { color: Colors.text, fontSize: 24, fontWeight: "800", letterSpacing: 4 },
  title: { color: Colors.text, fontSize: 22, fontWeight: "700" },
  body: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 8 },
});
