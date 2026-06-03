import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

/** Register screen stub. */
export default function RegisterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Registration flow — coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 8,
  },
  title: { color: Colors.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: Colors.textMuted, fontSize: 14 },
});
