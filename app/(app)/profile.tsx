import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { agentApi, type IntegrationSource } from "@/lib/api/agent";
import { api } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api/types";
import { useAuth } from "@/lib/session/auth-context";
import { useAsync } from "@/lib/use-async";

interface AthleteData {
  profile: UserProfile;
  sources: IntegrationSource[];
}

async function loadAthlete(): Promise<AthleteData> {
  const [profile, sourcePage] = await Promise.all([api.getUserProfile(), agentApi.listSources()]);
  return { profile, sources: sourcePage.items };
}

const SOURCE_ICON: Record<string, IconName> = { strava: "route", whoop: "heart", health: "clock" };

export default function AthleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data, error } = useAsync(loadAthlete);
  const connected = data?.sources.filter((source) => source.on).length ?? 0;

  return (
    <View style={trailStyles.root}>
      <ScrollView contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={trailStyles.pageOverline}>ATHLETE CONTEXT</Text>
          <Text style={trailStyles.pageTitle}>{data?.profile.display_name || "Your athlete profile"}</Text>
          <Text style={trailStyles.pageSub}>You control the facts, sources and permissions the AI Race Team may use.</Text>
        </View>

        {error ? (
          <TrailPanel style={styles.errorPanel}>
            <Text style={styles.errorText}>Live athlete context could not be loaded. No sample personal data is being substituted.</Text>
          </TrailPanel>
        ) : null}

        <TrailPanel accent style={styles.coverageCard}>
          <View style={styles.coverageTop}>
            <View style={styles.coverageRing}>
              <Text style={styles.coverageValue}>{connected}</Text>
              <Text style={styles.coverageUnit}>LIVE</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.coverageOverline}>CONTEXT COVERAGE</Text>
              <Text style={styles.coverageTitle}>{connected > 0 ? "Sources available to STREM" : "Connect your first source"}</Text>
              <Text style={styles.coverageBody}>More data is not automatically better. STREM should request only signals that improve a race decision.</Text>
            </View>
          </View>
          <Pressable style={styles.connectButton} onPress={() => router.push("/(app)/integrations")}>
            <Icon name="plus" size={16} color={Trail.limeInk} />
            <Text style={styles.connectButtonText}>Manage connected sources</Text>
          </Pressable>
        </TrailPanel>

        <TrailSectionHead title="CONNECTED EVIDENCE" label={`${connected} ACTIVE`} icon="bolt" />
        <View style={styles.sourceList}>
          {(data?.sources ?? []).map((source) => (
            <Pressable key={source.id} style={styles.sourceRow} onPress={() => router.push("/(app)/integrations")}>
              <View style={[styles.sourceIcon, source.on && styles.sourceIconOn]}>
                <Icon name={SOURCE_ICON[source.id] ?? "route"} size={18} color={source.on ? Trail.lime : Trail.textDim} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.sourceName}>{source.label}</Text>
                <Text style={styles.sourceMetric}>{source.on ? source.metric : "Not connected"}</Text>
              </View>
              <View style={[styles.sourceStatus, source.on && styles.sourceStatusOn]}>
                <Text style={[styles.sourceStatusText, source.on && styles.sourceStatusTextOn]}>{source.on ? "ON" : "OFF"}</Text>
              </View>
            </Pressable>
          ))}
          {!data ? <Text style={styles.loadingText}>Loading live source status…</Text> : null}
        </View>

        <TrailSectionHead title="WHAT THE AI KNOWS" label="EDITABLE" icon="bot" />
        <View style={styles.menuList}>
          <MenuRow
            icon="shield"
            title="Trail athlete baseline"
            detail="Experience, limitations, terrain access and equipment"
            onPress={() => router.push("/(app)/athlete-profile")}
          />
          <MenuRow
            icon="lock"
            title="Consent & data controls"
            detail="Inspect, revoke and understand every data source"
            onPress={() => router.push("/(app)/privacy")}
          />
          <MenuRow
            icon="flag"
            title="Race Mission intake"
            detail="Event, course, goal, cutoffs and preparation constraints"
            disabled
          />
        </View>

        <TrailPanel style={styles.principlePanel}>
          <Text style={styles.principleOverline}>STREM DATA PRINCIPLE</Text>
          <Text style={styles.principleTitle}>Comprehensive context without surveillance.</Text>
          <Text style={styles.principleBody}>Calendar access should use free/busy windows, recommendations should cite their sources, and every connection must remain optional and revocable.</Text>
        </TrailPanel>

        <Pressable style={styles.signOut} onPress={() => void signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function MenuRow({ icon, title, detail, onPress, disabled = false }: { icon: IconName; title: string; detail: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.menuRow, disabled && styles.menuDisabled]}>
      <View style={styles.menuIcon}>
        <Icon name={icon} size={18} color={Trail.lime} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      {disabled ? <Text style={styles.soon}>CONTRACT NEXT</Text> : <Icon name="chevron" size={18} color={Trail.textDim} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errorPanel: { backgroundColor: Trail.orangeSoft, borderColor: Trail.orangeLine },
  errorText: { ...ui(11, 600), lineHeight: 17, color: Trail.orange },
  coverageCard: { gap: 15 },
  coverageTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  coverageRing: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Trail.lime, backgroundColor: Trail.limeSoft },
  coverageValue: { ...disp(24, 800), color: Trail.lime, lineHeight: 25 },
  coverageUnit: { ...mono(6, 700), letterSpacing: 0.8, color: Trail.textDim },
  coverageOverline: { ...mono(8, 700), letterSpacing: 0.9, color: Trail.lime },
  coverageTitle: { ...disp(20, 800), color: Trail.text, marginTop: 3 },
  coverageBody: { ...ui(10, 500), lineHeight: 15, color: Trail.textMuted, marginTop: 3 },
  connectButton: { minHeight: 45, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 13, backgroundColor: Trail.lime },
  connectButtonText: { ...ui(13, 700), color: Trail.limeInk },
  sourceList: { gap: 8 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 12, borderRadius: 15, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  sourceIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Trail.panelSoft },
  sourceIconOn: { backgroundColor: Trail.limeSoft },
  sourceName: { ...ui(13, 700), color: Trail.text },
  sourceMetric: { ...ui(9, 500), color: Trail.textMuted, marginTop: 2 },
  sourceStatus: { paddingVertical: 5, paddingHorizontal: 7, borderRadius: 8, backgroundColor: Trail.panelSoft },
  sourceStatusOn: { backgroundColor: Trail.limeSoft },
  sourceStatusText: { ...mono(7, 700), color: Trail.textDim, letterSpacing: 0.6 },
  sourceStatusTextOn: { color: Trail.lime },
  loadingText: { ...ui(11, 500), color: Trail.textMuted, paddingVertical: 12 },
  menuList: { gap: 8 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 15, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.line },
  menuDisabled: { opacity: 0.62 },
  menuIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft },
  menuTitle: { ...ui(13, 700), color: Trail.text },
  menuDetail: { ...ui(9, 500), color: Trail.textMuted, lineHeight: 14, marginTop: 2 },
  soon: { ...mono(6, 700), color: Trail.orange, letterSpacing: 0.5 },
  principlePanel: { backgroundColor: Trail.skySoft, borderColor: "rgba(120,199,214,0.24)" },
  principleOverline: { ...mono(8, 700), letterSpacing: 0.9, color: Trail.sky },
  principleTitle: { ...disp(19, 800), color: Trail.text, marginTop: 5 },
  principleBody: { ...ui(11, 500), lineHeight: 17, color: Trail.textMuted, marginTop: 5 },
  signOut: { alignItems: "center", paddingVertical: 13 },
  signOutText: { ...ui(12, 700), color: Trail.textDim },
});
