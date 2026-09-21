/**
 * Legal accept gate (issue #58). The first thing a signed-in user sees until
 * they have accepted the current Terms, Privacy Policy, and Medical Disclaimer
 * — and it reappears when a policy's version is bumped (re-accept on material
 * change). The medical disclaimer is shown verbatim here because this is the
 * point where the user agrees to STREM surfacing health-related guidance.
 *
 * The route guard in the root layout forces an unaccepted user here and routes
 * them onward (onboarding / app) once `refreshLegalStatus()` clears the gate.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrailAtmosphere } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Btn, Panel } from "@/components/ui/primitives";
import { LEGAL_POLICIES, policyFor } from "@/constants/legal";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { pendingAcceptances } from "@/lib/legal";
import { useAuth } from "@/lib/session/auth-context";

export default function LegalAcceptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshLegalStatus } = useAuth();
  const [busy, setBusy] = useState(false);
  const disclaimer = policyFor("medical");

  async function accept() {
    setBusy(true);
    try {
      // The backend is the source of truth for required versions; accept exactly
      // what is pending so a version skew with the bundled copy is handled.
      const status = await api.getLegalStatus();
      const pending = pendingAcceptances(status);
      if (pending.length > 0) {
        await api.acceptLegal(pending);
      }
      await refreshLegalStatus();
      // RouteGuard reacts to the cleared gate and routes to onboarding / app.
    } catch {
      Alert.alert(
        "Couldn’t save",
        "We couldn’t record your acceptance. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <TrailAtmosphere quiet />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <Icon name="shield" size={16} color={Trail.lime} />
          <Text style={styles.eyebrow}>BEFORE YOU BEGIN</Text>
        </View>
        <Text style={styles.title}>YOUR AGREEMENT WITH STREM</Text>
        <Text style={styles.intro}>
          STREM uses your race goal, training, activity, and recovery data to support trail
          preparation. Please review and accept these policies before you continue.
        </Text>

        {/* Medical disclaimer surfaced verbatim — this is a health-guidance product. */}
        <Panel style={styles.disclaimer} pad={16}>
          <View style={styles.headRow}>
            <Icon name="heart" size={14} color={Trail.lime} />
            <Text style={styles.disclaimerEyebrow}>MEDICAL DISCLAIMER</Text>
          </View>
          <Text style={styles.disclaimerBody}>{disclaimerSummary(disclaimer.body)}</Text>
          <Pressable onPress={() => router.push("/(legal)/medical")} accessibilityRole="link">
            <Text style={styles.link}>Read the full Medical Disclaimer ›</Text>
          </Pressable>
        </Panel>

        {/* All policies, each openable in full. */}
        <View style={styles.list}>
          {LEGAL_POLICIES.map((p) => (
            <Pressable
              key={p.type}
              style={styles.item}
              onPress={() => router.push(`/(legal)/${p.type}`)}
              accessibilityRole="link"
              accessibilityLabel={`Read ${p.title}`}
            >
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{p.title}</Text>
                <Text style={styles.itemBlurb}>{p.blurb}</Text>
                <Text style={styles.itemVersion}>Version {p.version}</Text>
              </View>
              <Icon name="chevron" size={18} color={Trail.textDim} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.consent}>
          By tapping “I agree & continue” you confirm you have read and accept the Terms of
          Service, Privacy Policy, and Medical Disclaimer above.
        </Text>
        <Btn label="I agree & continue" kind="primary" full loading={busy} onPress={accept} />
      </ScrollView>
    </View>
  );
}

/** First paragraph(s) of the disclaimer for the inline highlight (full text one tap away). */
function disclaimerSummary(body: string): string {
  const withoutHeader = body.replace(/^#.*$/m, "").replace(/```[\s\S]*?```/, "");
  const cleaned = withoutHeader
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .filter(Boolean)
    .join(" ");
  return cleaned.slice(0, 320).trim() + (cleaned.length > 320 ? "…" : "");
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Trail.bg, overflow: "hidden" },
  scroll: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 20 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { ...mono(10, 700), letterSpacing: 1.6, color: Trail.lime },
  title: { ...disp(28, 800), color: Trail.text, marginTop: 6, lineHeight: 30 },
  intro: { ...ui(13.5, 500), color: Trail.textMuted, marginTop: 10, lineHeight: 20 },

  disclaimer: { marginTop: 18, borderColor: Trail.lime, borderWidth: 1 },
  disclaimerEyebrow: { ...mono(9, 700), letterSpacing: 1.4, color: Trail.lime },
  disclaimerBody: { ...ui(13, 500), color: Trail.text, marginTop: 8, lineHeight: 20 },
  link: { ...ui(12.5, 700), color: Trail.lime, marginTop: 10 },

  list: { marginTop: 16, gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Trail.panel,
    borderWidth: 1,
    borderColor: Trail.line,
  },
  itemText: { flex: 1, flexShrink: 1 },
  itemTitle: { ...ui(15, 700), color: Trail.text },
  itemBlurb: { ...ui(12, 500), color: Trail.textDim, marginTop: 2, lineHeight: 17 },
  itemVersion: { ...mono(9, 600), color: Trail.textDim, marginTop: 6, letterSpacing: 0.6 },

  consent: { ...ui(12, 500), color: Trail.textDim, lineHeight: 18, marginTop: 20, marginBottom: 14 },
});
