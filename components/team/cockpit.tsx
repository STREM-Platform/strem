/** Race-team cockpit (mobile#119): specialist calls with confidence and evidence, and what changed. */

import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { Row, SourceTag } from "@/components/ui/kit";
import { C, LAYER_COLOR, R, ui } from "@/constants/theme";
import type { CockpitAction, CockpitEvidence, CockpitFeedItem, CockpitSpecialist, SpecialistRole } from "@/lib/api/race";

export const ROLE: Record<SpecialistRole, { label: string; icon: IconName; color: string }> = {
  coach: { label: "Coach", icon: "calendar", color: LAYER_COLOR.training },
  fuel: { label: "Fuel", icon: "drop", color: LAYER_COLOR.fuel },
  course: { label: "Course", icon: "mountain", color: LAYER_COLOR.course },
  gear: { label: "Gear", icon: "pack", color: LAYER_COLOR.gear },
  logistics: { label: "Logistics", icon: "map", color: LAYER_COLOR.logistics },
  strategy: { label: "Strategy", icon: "compass", color: LAYER_COLOR.strategy },
};

const STATUS = {
  on_track: { label: "On track", icon: "checkCircle" as IconName, color: C.good },
  attention: { label: "Needs you", icon: "alert" as IconName, color: C.warning },
  missing: { label: "Not started", icon: "circle" as IconName, color: C.textDim },
};

const CONFIDENCE = { high: 3, medium: 2, low: 1 } as const;

/** `plan`, `proposal` and `race?tab=…` are the cockpit's destinations. */
export function actionHref(action: CockpitAction): Href {
  if (action.target === "plan" || action.target === "proposal") return "/(app)/plan";
  return `/(app)/${action.target}` as Href;
}

function Confidence({ level }: { level: CockpitSpecialist["confidence"] }) {
  const filled = CONFIDENCE[level];
  return (
    <Row gap={3} style={{ alignItems: "flex-end" }}>
      {[1, 2, 3].map((bar) => (
        <View key={bar} style={{ width: 4, height: 4 + bar * 3, borderRadius: 2, backgroundColor: bar <= filled ? C.text : C.surface3 }} />
      ))}
      <Text style={[ui(11, 600), { color: C.textMuted, marginLeft: 4 }]}>{level} confidence</Text>
    </Row>
  );
}

function Evidence({ items }: { items: CockpitEvidence[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.evidence}>
      {items.map((e) => (
        <View key={e.label} style={styles.chip}>
          <Text style={[ui(11, 600), { color: C.textMuted }]}>{e.label}</Text>
          <Text style={[ui(12, 700), { color: C.text, flexShrink: 1 }]} numberOfLines={2}>
            {e.value}
          </Text>
          <SourceTag source={e.source} />
        </View>
      ))}
    </View>
  );
}

export function SpecialistCard({ s, onAsk, wide }: { s: CockpitSpecialist; onAsk: (question: string) => void; wide: boolean }) {
  const router = useRouter();
  const role = ROLE[s.role];
  const status = STATUS[s.status];
  return (
    <View style={[styles.card, { width: wide ? "49%" : "100%" }, s.status === "attention" && { borderColor: "rgba(250,178,25,0.35)" }]} accessibilityLabel={`${role.label}: ${status.label}`}>
      <Row gap={10}>
        <View style={[styles.avatar, { backgroundColor: `${role.color}24`, borderColor: `${role.color}66` }]}>
          <Icon name={role.icon} size={18} color={role.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ui(15, 700), { color: C.text }]}>{role.label}</Text>
          <Confidence level={s.confidence} />
        </View>
        <Row gap={5}>
          <Icon name={status.icon} size={14} color={status.color} />
          <Text style={[ui(12, 700), { color: status.color }]}>{status.label}</Text>
        </Row>
      </Row>
      <Text style={[ui(15, 600), { color: C.text, lineHeight: 22 }]}>{s.call}</Text>
      <Evidence items={s.evidence} />
      <Row gap={8} style={{ marginTop: 2 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push(actionHref(s.action))} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]}>
          <Text style={[ui(13, 700), { color: C.ink }]}>{s.action.label}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ask ${role.label}`} onPress={() => onAsk(s.ask)} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.8 }]}>
          <Icon name="message" size={14} color={C.text} />
          <Text style={[ui(13, 700), { color: C.text }]}>Ask</Text>
        </Pressable>
      </Row>
    </View>
  );
}

export function FeedItem({ item, onAsk }: { item: CockpitFeedItem; onAsk: (question: string) => void }) {
  const router = useRouter();
  const role = ROLE[item.role] ?? ROLE.coach;
  const tone = item.severity === "critical" ? C.critical : item.severity === "attention" || item.kind === "proposal" ? C.warning : role.color;
  return (
    <View style={styles.feed}>
      <View style={[styles.rail, { backgroundColor: tone }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <Row gap={8}>
          <Icon name={role.icon} size={13} color={role.color} />
          <Text style={[ui(11, 700), { color: C.textMuted }]}>{role.label.toUpperCase()}</Text>
          {item.when ? <Text style={[ui(11, 500), { color: C.textDim }]}>· {item.when}</Text> : null}
        </Row>
        <Text style={[ui(15, 700), { color: C.text }]}>{item.title}</Text>
        {item.detail ? <Text style={[ui(13.5, 500), { color: C.textMuted, lineHeight: 20 }]}>{item.detail}</Text> : null}
        <Evidence items={item.evidence} />
        <Row gap={14}>
          <Pressable accessibilityRole="button" onPress={() => router.push(actionHref(item.action))} hitSlop={8}>
            <Text style={[ui(13, 700), { color: C.text }]}>{item.action.label} ›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onAsk(`${item.title}. ${item.detail} What should I do?`)} hitSlop={8}>
            <Text style={[ui(13, 700), { color: C.textMuted }]}>Ask why</Text>
          </Pressable>
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  evidence: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  primary: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
  secondary: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.lineStrong },
  feed: { flexDirection: "row", gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  rail: { width: 3, borderRadius: 2 },
});
