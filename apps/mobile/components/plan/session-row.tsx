/** One planned session as a tappable row, with its honest status. */

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Row, StatusLabel, type Status } from "@/components/ui/kit";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import type { PlanSession, SessionProgress } from "@/lib/api/race";
import { hm, km } from "@/lib/race/format";
import { SESSION_ICON } from "@/lib/race/sports";

export function sessionStatus(session: PlanSession, progress: SessionProgress | undefined, today: string): Status {
  if (session.kind === "rest") return "rest";
  const s = progress?.derived_status ?? (session.status !== "planned" && session.status !== "moved" ? session.status : undefined);
  if (s === "done" || s === "partial" || s === "missed" || s === "skipped") return s;
  return session.date === today ? "today" : "planned";
}

export function SessionRow({ session, status, onPress }: { session: PlanSession; status: Status; onPress: () => void }) {
  const rest = session.kind === "rest";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.title}, ${hm(session.duration_minutes)}, ${status}`}
      onPress={onPress}
      disabled={rest}
      style={({ pressed }) => [styles.session, session.key && styles.keySession, rest && styles.restSession, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.sessionIcon, { backgroundColor: rest ? C.surface2 : session.kind === "race" ? C.flameSoft : `${LAYER_COLOR.training}22` }]}>
        <Icon name={session.kind === "race" ? "flag" : SESSION_ICON[session.sport] ?? "run"} size={18} color={rest ? C.textDim : session.kind === "race" ? C.flame : LAYER_COLOR.training} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={6}>
          <Text style={[ui(15, 700), { color: rest ? C.textMuted : C.text, flexShrink: 1 }]} numberOfLines={1}>
            {session.title}
          </Text>
          {session.key && !rest ? <Text style={[ui(10, 800), { color: C.accent, letterSpacing: 0.6 }]}>KEY</Text> : null}
        </Row>
        {!rest ? (
          <Text style={[ui(12, 500), { color: C.textMuted }]} numberOfLines={1}>
            {[hm(session.duration_minutes), session.distance_km ? `${km(session.distance_km)} km` : null, session.elevation_m ? `+${session.elevation_m} m` : null, session.intensity.replace("_", " ")]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
      </View>
      {!rest ? <StatusLabel status={status} compact /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  session: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 60 },
  keySession: { borderColor: "rgba(57,135,229,0.4)" },
  restSession: { backgroundColor: "transparent", borderStyle: "dashed" },
  sessionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
