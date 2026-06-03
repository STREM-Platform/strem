import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

/** Loading / splash screen — the app's entry route. */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>STREM</Text>
      <Text style={styles.tagline}>Never Settle.</Text>
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
  brand: {
    color: Colors.text,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 4,
  },
  tagline: {
    color: Colors.accentGreen,
    marginTop: 8,
    fontSize: 14,
    letterSpacing: 2,
  },
});
