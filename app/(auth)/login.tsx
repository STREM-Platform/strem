import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/Colors";

/** Login screen stub. */
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>
      <Text style={styles.subtitle}>Sign-in flow — coming soon.</Text>
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
