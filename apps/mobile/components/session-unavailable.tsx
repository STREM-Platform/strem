/**
 * Shown when a stored session could not be checked because STREM was unreachable
 * (network, timeout or a server error), not because it was refused (#2). The
 * tokens are kept and no app screen is reachable until a retry succeeds.
 */

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Title } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icon";
import { C } from "@/constants/theme";
import { useAuth } from "@/lib/session/auth-context";

export function SessionUnavailable() {
  const { retrySession, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await retrySession();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} accessibilityRole="alert">
      <View style={styles.card}>
        <Icon name="cloud" size={28} color={C.textMuted} />
        <Title size={26}>Can’t reach STREM</Title>
        <Body muted>
          You’re still signed in. Check your connection and try again — nothing is lost.
        </Body>
        <Button label="Try again" icon="refresh" loading={busy} onPress={retry} full />
        <Button label="Sign out" kind="secondary" icon="logout" disabled={busy} onPress={signOut} full />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: { width: "100%", maxWidth: 420, gap: 14 },
});
