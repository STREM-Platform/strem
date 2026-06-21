/**
 * Policy viewer — renders the canonical text of one legal document (Terms,
 * Privacy Policy, or Medical Disclaimer) from the bundled `constants/legal-docs`.
 * Reached from the accept gate ("View") and from the Privacy screen.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { policyFor } from "@/constants/legal";
import { T, disp, mono, ui } from "@/constants/theme";
import type { LegalDocumentType } from "@/lib/api/types";

const VALID: LegalDocumentType[] = ["terms", "privacy", "medical"];

export default function LegalDocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const type = (VALID.includes(doc as LegalDocumentType) ? doc : "terms") as LegalDocumentType;
  const policy = policyFor(type);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/privacy"))}
          style={styles.back}
          accessibilityRole="button"
        >
          <Icon name="chevronL" size={20} color={T.mut} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>VERSION {policy.version}</Text>
        <Text style={styles.title}>{policy.title.toUpperCase()}</Text>
        <Text style={styles.body}>{policy.body}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 20 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { ...ui(13, 600), color: T.mut },
  eyebrow: { ...mono(10, 700), letterSpacing: 1.6, color: T.green },
  title: { ...disp(26, 800), color: "#fff", marginTop: 5, lineHeight: 28 },
  body: { ...ui(13.5, 500), color: T.mut, marginTop: 16, lineHeight: 21 },
});
