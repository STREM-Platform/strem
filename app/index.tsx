import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { Trail } from "@/constants/theme";

/** Loading / splash screen - shown while the session restores. */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <BrandLogo style={styles.logo} />
      <ActivityIndicator color={Trail.lime} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Trail.bg,
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
