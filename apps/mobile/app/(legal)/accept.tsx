/**
 * Legal accept gate (issue #58, redesigned in mobile#139). The first thing a
 * signed-in user sees until they have accepted the current Terms, Privacy
 * Policy, and Medical Disclaimer — and it reappears when a policy's version is
 * bumped (re-accept on material change).
 *
 * Two explicit consents: the policies, and — separately, as GDPR Art. 9 asks —
 * processing health and fitness data. Both are required to continue; the
 * acceptance recorded by the backend is the one for the pending policy versions.
 *
 * The route guard in the root layout forces an unaccepted user here and routes
 * them onward (onboarding / app) once `refreshLegalStatus()` clears the gate.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConsentCheck, policyDate } from "@/components/legal/legal-ui";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, Row, TextLink, Title, Wordmark } from "@/components/ui/kit";
import { LEGAL_POLICIES } from "@/constants/legal";
import { C, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { pendingAcceptances } from "@/lib/legal";
import { useAuth } from "@/lib/session/auth-context";

export default function LegalAcceptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshLegalStatus } = useAuth();
  const [policies, setPolicies] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function accept() {
    setBusy(true);
    setFailed(false);
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
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Wordmark size={14} color={C.textMuted} />
        <View style={{ gap: 10, marginTop: 28 }}>
          <Title size={32}>Before you start</Title>
          <Body muted>
            STREM uses your races, training, activity and recovery data to prepare you for race day. Here is what you are agreeing to, in plain words.
          </Body>
        </View>

        <Card tone="accent" pad={18} style={{ gap: 12, marginTop: 24 }}>
          <Row gap={10}>
            <View style={styles.badge}>
              <Icon name="heart" size={18} color={C.accent} />
            </View>
            <Text style={[ui(16, 700), { color: C.text, flex: 1 }]}>A race team, not a doctor</Text>
          </Row>
          <View style={{ gap: 8 }}>
            <Point text="Plans, readiness scores and fueling advice are estimates. They can be wrong." />
            <Point text="STREM does not diagnose or treat anything and is not a medical device." />
            <Point text="Pain, illness or unsure if you should train? Ask a doctor or physio first." />
            <Point text="In an emergency, call your local emergency number." strong />
          </View>
        </Card>

        <View style={{ gap: 10, marginTop: 16 }}>
          {LEGAL_POLICIES.map((p) => (
            <Card key={p.type} pad={16} style={{ gap: 10 }}>
              <Row gap={12} align="flex-start">
                <View style={styles.icon}>
                  <Icon name={p.icon} size={18} color={C.text} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[ui(15, 700), { color: C.text }]}>{p.title}</Text>
                  {p.points.map((line) => (
                    <Text key={line} style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]}>
                      {line}
                    </Text>
                  ))}
                </View>
              </Row>
              <Row style={styles.cardFoot}>
                <Text style={[ui(12, 500), { color: C.textDim, flex: 1 }]}>Updated {policyDate(p.version)}</Text>
                <TextLink label="Read in full" color={C.text} onPress={() => router.push(`/(legal)/${p.type}`)} />
              </Row>
            </Card>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 24 }}>
          <ConsentCheck
            checked={policies}
            onToggle={() => setPolicies((v) => !v)}
            label="I agree to the Terms of Service and Privacy Policy, and I understand the Medical Disclaimer."
          />
          <ConsentCheck
            checked={healthData}
            onToggle={() => setHealthData((v) => !v)}
            label="I consent to STREM processing my health and fitness data to prepare my races."
            detail="Training, heart rate, sleep and recovery from you and the sources you connect. You can disconnect sources or delete your data any time in Privacy."
          />
        </View>

        <View style={{ gap: 12, marginTop: 20 }}>
          {failed ? <ErrorBanner message="We couldn’t record your acceptance. Check your connection and try again." /> : null}
          <Button
            label="I agree & continue"
            size="lg"
            full
            loading={busy}
            disabled={!policies || !healthData}
            onPress={accept}
          />
          <Text style={[ui(12, 500), { color: C.textDim, textAlign: "center" }]}>
            {policies && healthData ? "You can review these any time in Privacy." : "Tick both to continue."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Point({ text, strong = false }: { text: string; strong?: boolean }) {
  return (
    <Row gap={10} align="flex-start">
      <View style={styles.dot} />
      <Text style={[ui(14, strong ? 700 : 500), { color: strong ? C.text : C.textMuted, flex: 1, lineHeight: 20 }]}>{text}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  scroll: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20 },
  badge: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.accentSoft },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  cardFoot: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginTop: 8 },
});
