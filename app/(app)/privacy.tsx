import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrailAtmosphere, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { agentApi } from "@/lib/api/agent";
import { useAsync } from "@/lib/use-async";

export default function DataControlsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, error, reload } = useAsync(() => agentApi.getConsent());
  const [saving, setSaving] = useState<string | null>(null);

  const setConsent = async (key: string, enabled: boolean) => {
    setSaving(key);
    try {
      await agentApi.setConsent(key, enabled);
      reload();
    } catch {
      Alert.alert("Consent not changed", "The live consent service could not be reached.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={trailStyles.root}>
      <TrailAtmosphere quiet />
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/profile"))}>
          <Icon name="chevronL" size={18} color={Trail.textMuted} />
          <Text style={styles.backText}>Athlete</Text>
        </Pressable>
        <View>
          <Text style={trailStyles.pageOverline}>CONSENT & PROVENANCE</Text>
          <Text style={trailStyles.pageTitle}>Data controls</Text>
          <Text style={trailStyles.pageSub}>Choose what the AI Race Team may read. Turning a source off must remove it from future reasoning.</Text>
        </View>

        <TrailPanel accent style={styles.principle}>
          <View style={styles.principleIcon}>
            <Icon name="lock" size={22} color={Trail.lime} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.principleOverline}>THE TRUST CONTRACT</Text>
            <Text style={styles.principleTitle}>Useful context, never silent surveillance.</Text>
            <Text style={styles.principleBody}>Recommendations should name the facts, assumptions and missing evidence that shaped them.</Text>
          </View>
        </TrailPanel>

        {error ? (
          <TrailPanel style={styles.errorPanel}>
            <Text style={styles.errorText}>Live consent settings could not be loaded. STREM will not display invented settings.</Text>
          </TrailPanel>
        ) : null}

        {(data?.groups ?? []).map((group) => (
          <View key={group.label} style={styles.group}>
            <TrailSectionHead title={group.label.toUpperCase()} label="INDIVIDUALLY REVOCABLE" />
            <View style={styles.consentList}>
              {group.items.map((item) => (
                <View key={item.k} style={styles.consentRow}>
                  <View style={styles.consentIcon}>
                    <Icon name={iconFor(item.k)} size={18} color={item.on ? Trail.lime : Trail.textDim} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.consentName}>{labelFor(item.k)}</Text>
                    <Text style={styles.consentDetail}>{detailFor(item.k)}</Text>
                  </View>
                  <Switch
                    value={item.on}
                    disabled={saving === item.k}
                    onValueChange={(enabled) => void setConsent(item.k, enabled)}
                    trackColor={{ false: Trail.panelSoft, true: Trail.limeLine }}
                    thumbColor={item.on ? Trail.lime : Trail.textDim}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {!data && !error ? <Text style={styles.loading}>Loading live consent settings…</Text> : null}

        <TrailSectionHead title="SOURCE & ACTION RECEIPTS" label="VERIFY THE AI" icon="bot" />
        <View style={styles.menuList}>
          <MenuRow icon="route" title="Connected sources" detail="Connect, sync or disconnect external providers" onPress={() => router.push("/(app)/integrations")} />
          <MenuRow icon="bolt" title="AI action history" detail="Reasoning, cited data, approvals and undo" onPress={() => router.push("/(app)/agent")} />
        </View>

        <TrailSectionHead title="LEGAL" label="CURRENT POLICIES" icon="shield" />
        <View style={styles.menuList}>
          <MenuRow icon="shield" title="Terms of service" detail="Account and acceptable-use terms" onPress={() => router.push("/(legal)/terms")} />
          <MenuRow icon="lock" title="Privacy policy" detail="Collection, use, retention and rights" onPress={() => router.push("/(legal)/privacy")} />
          <MenuRow icon="heart" title="Medical disclaimer" detail="Coaching boundaries and professional care" onPress={() => router.push("/(legal)/medical")} />
        </View>

        <TrailPanel style={styles.dataPanel}>
          <Text style={styles.dataTitle}>Your data must remain portable.</Text>
          <Text style={styles.dataBody}>Export and account deletion require verified backend workflows. The old UI-only alerts have been removed until those operations are genuinely connected.</Text>
        </TrailPanel>
      </ScrollView>
    </View>
  );
}

function iconFor(key: string): IconName {
  const value = key.toLowerCase();
  if (value.includes("sleep") || value.includes("recovery")) return "moon";
  if (value.includes("nutrition") || value.includes("fuel")) return "utensils";
  if (value.includes("calendar")) return "clock";
  if (value.includes("profile") || value.includes("injur")) return "shield";
  return "route";
}

function labelFor(key: string): string {
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailFor(key: string): string {
  const value = key.toLowerCase();
  if (value.includes("calendar")) return "Availability only; meeting contents are not needed.";
  if (value.includes("sleep") || value.includes("recovery")) return "Used to interpret fatigue, never to diagnose.";
  if (value.includes("nutrition") || value.includes("fuel")) return "Used for race-fueling preparation and rehearsals.";
  return "May be used only when it materially changes a Race Mission decision.";
}

function MenuRow({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIcon}><Icon name={icon} size={18} color={Trail.lime} /></View>
      <View style={styles.flex}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <Icon name="chevron" size={18} color={Trail.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  backText: { ...ui(12, 600), color: Trail.textMuted },
  principle: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  principleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  principleOverline: { ...mono(8, 700), letterSpacing: 0.8, color: Trail.lime },
  principleTitle: { ...disp(19, 800), color: Trail.text, marginTop: 4 },
  principleBody: { ...ui(10, 500), lineHeight: 15, color: Trail.textMuted, marginTop: 4 },
  errorPanel: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine },
  errorText: { ...ui(11, 600), lineHeight: 17, color: Trail.orange },
  group: { gap: 10 },
  consentList: { gap: 8 },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 12, borderRadius: 15, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  consentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Trail.panelSoft },
  consentName: { ...ui(12, 700), color: Trail.text },
  consentDetail: { ...ui(9, 500), lineHeight: 14, color: Trail.textMuted, marginTop: 2 },
  loading: { ...ui(11, 500), color: Trail.textMuted, textAlign: "center", paddingVertical: 14 },
  menuList: { gap: 8 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 15, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  menuIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  menuTitle: { ...ui(13, 700), color: Trail.text },
  menuDetail: { ...ui(9, 500), lineHeight: 14, color: Trail.textMuted, marginTop: 2 },
  dataPanel: { backgroundColor: Trail.skySoft, borderColor: "rgba(120,199,214,0.24)" },
  dataTitle: { ...disp(18, 800), color: Trail.text },
  dataBody: { ...ui(10, 500), lineHeight: 16, color: Trail.textMuted, marginTop: 5 },
});
