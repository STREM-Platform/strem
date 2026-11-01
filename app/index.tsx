import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { C } from "@/constants/theme";

/** Loading / splash screen - shown while the session restores. */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <BrandLogo style={styles.logo} />
      <ActivityIndicator color={C.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.ink,
    gap: 10,
  },
  logo: {
    width: 260,
    height: 260,
  },
  spinner: {
    marginTop: 14,
  },
});
