/** Live progress while the race team builds each layer. */

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { Card, Overline, Row, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, type LayerKey, ui } from "@/constants/theme";
import { BUILD_ORDER, type BuildKind, type BuildState } from "@/lib/race/use-builder";

const META: Record<BuildKind, { label: string; icon: IconName; color: string; doing: string }> = {
  plan: { label: "Training plan", icon: "calendar", color: LAYER_COLOR.training, doing: "Periodizing weeks to race day" },
  fuel: { label: "Fuel & hydration", icon: "drop", color: LAYER_COLOR.fuel, doing: "Setting carbs, fluid and sodium targets" },
  gear: { label: "Gear", icon: "pack", color: LAYER_COLOR.gear, doing: "Checking kit for conditions and format" },
  logistics: { label: "Logistics", icon: "map", color: LAYER_COLOR.logistics, doing: "Sequencing deadlines to race morning" },
  strategy: { label: "Race strategy", icon: "compass", color: LAYER_COLOR.strategy, doing: "Pacing the course segment by segment" },
};

export function BuildPanel({ states }: { states: Partial<Record<BuildKind, BuildState>> }) {
  const kinds = BUILD_ORDER.filter((k) => states[k]);
  if (!kinds.length) return null;
  const finished = kinds.every((k) => ["done", "error"].includes(states[k]?.status ?? ""));
  const reasons = Array.from(new Set(kinds.map((k) => states[k]?.reason).filter(Boolean)));
  return (
    <Card tone="raised" pad={20} style={{ gap: 14 }}>
      <Overline>{finished ? "Your race team is ready" : "Assembling your race team"}</Overline>
      <Title size={24}>{finished ? "Every layer is built" : "Building your race plan…"}</Title>
      <View style={{ gap: 4 }}>
        {kinds.map((kind) => {
          const meta = META[kind];
          const state = states[kind];
          return (
            <View key={kind} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: `${meta.color}22` }]}>
                <Icon name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui(15, 700), { color: C.text }]}>{meta.label}</Text>
                <Text style={[ui(12, 500), { color: state?.status === "error" ? C.serious : C.textMuted }]} numberOfLines={2}>
                  {state?.status === "building"
                    ? meta.doing
                    : state?.status === "done"
                      ? state.origin === "ai"
                        ? "Personalized by the AI race team"
                        : "Built by the race engine"
                      : state?.status === "error"
                        ? state.message ?? "Could not build — retry"
                        : "Waiting"}
                </Text>
              </View>
              {state?.status === "building" ? <ActivityIndicator color={meta.color} /> : null}
              {state?.status === "done" ? <Icon name="checkCircle" size={20} color={C.good} /> : null}
              {state?.status === "error" ? <Icon name="alert" size={20} color={C.serious} /> : null}
            </View>
          );
        })}
      </View>
      {finished && reasons.length ? (
        <Row gap={8} align="flex-start">
          <Icon name="info" size={16} color={C.textMuted} />
          <Text style={[ui(12, 500), { color: C.textMuted, flex: 1, lineHeight: 18 }]}>
            AI personalization was unavailable: {reasons[0]} The race engine built these layers from your answers; rebuild any layer later to personalize it.
          </Text>
        </Row>
      ) : null}
    </Card>
  );
}

export const LAYER_FOR_BUILD: Record<BuildKind, LayerKey> = {
  plan: "training",
  fuel: "fuel",
  gear: "gear",
  logistics: "logistics",
  strategy: "strategy",
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
