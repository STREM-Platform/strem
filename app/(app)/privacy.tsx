/**
 * Privacy — "What your coach knows" (A7 / Phase 8).
 *
 * The trust layer. If Forge can see everything, you must see and control
 * everything. Source toggles decide what feeds the context graph; the autonomy
 * controls decide how much Forge can do on its own (AUTO / ASK / OFF, per
 * ability); export & delete are one tap. A link jumps to the Agent Activity feed
 * — the receipts for everything Forge has done.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AutonomyControls } from "@/components/agent/activity";
import { Icon } from "@/components/ui/icon";
import { Btn, Chip, IconTile, Panel, SectionHead } from "@/components/ui/primitives";
import { LEGAL_POLICIES } from "@/constants/legal";
import { T, disp, mono, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import type { PrivacyData } from "@/lib/agent/types";
import { useAsync } from "@/lib/use-async";

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, { backgroundColor: on ? T.green : T.surf2, borderColor: on ? T.green : T.line2 }]}>
      <View style={[styles.knob, { left: on ? 20 : 2, backgroundColor: on ? "#06130D" : T.sub }]} />
    </Pressable>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: P } = useAsync<PrivacyData>(forge.getPrivacy);
  const [state, setState] = useState<Record<string, boolean>>({});

  if (!P) return <View style={styles.root} />;

  // Seed local toggle state once from the contract.
  const get = (gi: number, ii: number, fallback: boolean) => state[`${gi}-${ii}`] ?? fallback;
  const total = P.groups.reduce((n, g) => n + g.items.length, 0);
  const onCount = P.groups.reduce((n, g, gi) => n + g.items.filter((it, ii) => get(gi, ii, it.on)).length, 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/coach"))} style={styles.back}>
          <Icon name="chevronL" size={20} color={T.mut} />
          <Text style={styles.backText}>Coach</Text>
        </Pressable>

        <View style={styles.head}>
          <View style={styles.headRow}>
            <Icon name="lock" size={16} color={T.green} />
            <Text style={styles.headEyebrow}>YOUR DATA · YOUR CALL</Text>
          </View>
          <Text style={styles.headTitle}>WHAT YOUR COACH KNOWS</Text>
          <Text style={styles.headIntro}>{P.intro}</Text>
          <View style={styles.headChip}>
            <Chip label={`${onCount}/${total} sources feeding Forge`} />
          </View>
        </View>

        <View style={styles.groups}>
          {P.groups.map((g, gi) => (
            <Panel key={gi} pad={0}>
              <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
              {g.items.map((it, ii) => {
                const on = get(gi, ii, it.on);
                return (
                  <View key={ii} style={[styles.item, ii > 0 && styles.itemBorder]}>
                    <Text style={[styles.itemLabel, { color: on ? T.text : T.sub }]}>{it.k}</Text>
                    <Toggle on={on} onPress={() => setState((s) => ({ ...s, [`${gi}-${ii}`]: !on }))} />
                  </View>
                );
              })}
            </Panel>
          ))}
        </View>

        {/* connect external sources (A3) — Strava / Whoop / Health */}
        <Pressable style={[styles.sideMargin, styles.activityLink]} onPress={() => router.push("/(app)/integrations")}>
          <IconTile name="route" size={40} iconSize={19} />
          <View style={styles.shrink}>
            <Text style={styles.activityTitle}>Connected sources</Text>
            <Text style={styles.activitySub}>Link Strava, Whoop & more — what your coach can pull in.</Text>
          </View>
          <Icon name="chevron" size={18} color={T.sub} />
        </Pressable>

        {/* athlete baseline (#61) — the coaching inputs Forge knows about */}
        <Pressable style={[styles.sideMargin, styles.activityLink]} onPress={() => router.push("/(app)/athlete-profile")}>
          <IconTile name="compass" size={40} iconSize={19} />
          <View style={styles.shrink}>
            <Text style={styles.activityTitle}>Athlete profile</Text>
            <Text style={styles.activitySub}>Body, PRs, injuries & equipment — the baseline Forge coaches from.</Text>
          </View>
          <Icon name="chevron" size={18} color={T.sub} />
        </Pressable>

        {/* autonomy — how much Forge can do on its own (per capability) */}
        <SectionHead icon="bot" title="WHAT FORGE CAN DO" sub="Per-ability autonomy" />
        <View style={styles.sideMargin}>
          <AutonomyControls />
        </View>

        {/* receipts */}
        <Pressable style={[styles.sideMargin, styles.activityLink]} onPress={() => router.push("/(app)/agent")}>
          <IconTile name="bolt" size={40} iconSize={19} />
          <View style={styles.shrink}>
            <Text style={styles.activityTitle}>Agent activity</Text>
            <Text style={styles.activitySub}>Every action Forge took — reasoning, data, undo.</Text>
          </View>
          <Icon name="chevron" size={18} color={T.sub} />
        </Pressable>

        <View style={[styles.sideMargin, styles.dataActions]}>
          <Btn kind="ghost" icon="download" label="Export" onPress={() => Alert.alert("Export", "Your full data export will be emailed to you.")} style={styles.flexOne} />
          <Btn kind="danger" label="Delete my data" onPress={() => Alert.alert("Delete my data", "This permanently deletes everything. Are you sure?")} style={styles.flexOne} />
        </View>

        {/* legal & policies (#58) — the terms you accepted, viewable any time */}
        <SectionHead icon="shield" title="LEGAL & POLICIES" sub="Terms, privacy & medical disclaimer" />
        <View style={[styles.sideMargin, styles.legalList]}>
          {LEGAL_POLICIES.map((p) => (
            <Pressable
              key={p.type}
              style={styles.legalRow}
              onPress={() => router.push(`/(legal)/${p.type}`)}
              accessibilityRole="link"
              accessibilityLabel={`Read ${p.title}`}
            >
              <Text style={styles.legalTitle}>{p.title}</Text>
              <Icon name="chevron" size={16} color={T.sub} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>{P.footer}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 40 },
  sideMargin: { marginHorizontal: 16 },
  shrink: { flexShrink: 1, flex: 1 },
  flexOne: { flex: 1 },

  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 6 },
  backText: { ...ui(13, 600), color: T.mut },
  head: { paddingHorizontal: 16, paddingBottom: 16 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headEyebrow: { ...mono(10, 700), letterSpacing: 1.6, color: T.green },
  headTitle: { ...disp(28, 800), color: "#fff", marginTop: 5, lineHeight: 29 },
  headIntro: { ...ui(13.5, 500), color: T.mut, marginTop: 8, lineHeight: 20 },
  headChip: { marginTop: 12 },

  groups: { paddingHorizontal: 16, gap: 14, marginBottom: 4 },
  groupLabel: { ...mono(9, 700), letterSpacing: 1.4, color: T.sub, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  itemBorder: { borderTopWidth: 1, borderTopColor: T.line },
  itemLabel: { flex: 1, ...ui(14, 600) },
  toggle: { width: 44, height: 26, borderRadius: 13, borderWidth: 1, position: "relative" },
  knob: { position: "absolute", top: 2, width: 20, height: 20, borderRadius: 10 },

  activityLink: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  activityTitle: { ...ui(15, 700), color: T.text },
  activitySub: { ...ui(12, 500), color: T.sub, marginTop: 1 },

  dataActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  legalList: { gap: 8, marginTop: 4 },
  legalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  legalTitle: { ...ui(14, 600), color: T.text },
  footer: { ...ui(12, 500), color: T.sub, textAlign: "center", lineHeight: 18, marginTop: 12, marginHorizontal: 24 },
});
