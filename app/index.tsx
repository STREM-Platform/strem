import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { Colors, Spacing } from "@/constants/theme";

/** Loading / splash screen - shown while the session restores. */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <BrandLogo style={styles.logo} />
      <ActivityIndicator color={Colors.accentGreenBright} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  logo: {
    width: 260,
    height: 260,
  },
  spinner: {
    marginTop: Spacing.md,
  },
});
