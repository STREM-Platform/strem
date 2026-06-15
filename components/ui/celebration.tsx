/**
 * Earned-state celebration — ported from `Celebration` in
 * `design-spec/screen-profile.jsx`. A focused, dismissible moment for a rank-up
 * or a newly earned medal: hero artwork (rank hex with the mountain mark, or the
 * Medal engine), headline, coach line, reward chips, and share / continue
 * actions.
 *
 * The web `popIn` keyframe becomes an RN Animated spring (scale + fade) that
 * settles to a fully visible end state. Driven by `CelebrationData`;
 * `celebrationFromMoment` adapts a progression `ProgressionMoment`.
 */

import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Stop } from "react-native-svg";

import { Medal } from "@/components/medals/medal";
import { MountainMark, type IconName } from "@/components/ui/icon";
import { Btn, Chip } from "@/components/ui/primitives";
import { RARITY, T, disp, mono, ui, type Rarity } from "@/constants/theme";
import { MEDAL_META, medalDefinitionFor } from "@/lib/medals";
import { rankUpLine, type ProgressionMoment } from "@/lib/progression";

export interface CelebrationData {
  kind: "rank" | "medal";
  title: string;
  line: string;
  rarity?: Rarity;
  emblem?: IconName;
  xp?: number;
  /** Pre-formatted earned date, e.g. "Apr 2". */
  when?: string;
  onShare?: () => void;
}

// Pointy-top hexagon for a 150×166 box (web clip-path polygon).
const HEX_OUTER = "75,0 150,41.5 150,124.5 75,166 0,124.5 0,41.5";
const HEX_INNER = "75,8 142,45 142,121 75,158 8,121 8,45";

export function Celebration({ data, onClose }: { data: CelebrationData | null; onClose: () => void }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (data) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 70 }).start();
    }
  }, [data, anim]);

  if (!data) {
    return null;
  }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <MountainMark size={360} color="#9fb0a8" style={styles.watermark} />
        <Animated.View style={[styles.card, { opacity: anim, transform: [{ scale }] }]}>
          <Pressable onPress={() => {}}>
            <CelebrationContent data={data} onClose={onClose} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** The celebration card body — artwork, headline, reward chips, actions. */
export function CelebrationContent({ data, onClose }: { data: CelebrationData; onClose: () => void }) {
  const isRank = data.kind === "rank";
  const meta = data.rarity ? MEDAL_META[data.rarity] : null;
  const accent = isRank ? T.green : meta ? meta.rim[1] : T.green;
  const rlabel = data.rarity ? RARITY[data.rarity].label.toUpperCase() : "";

  return (
    <View style={styles.content}>
      {/* artwork */}
      {isRank ? (
        <View style={styles.hexWrap}>
          <Svg width={150} height={166}>
            <Defs>
              <LinearGradient id="cel-hex" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={T.green} />
                <Stop offset="100%" stopColor={T.greenD} />
              </LinearGradient>
              <RadialGradient id="cel-core" cx="50%" cy="10%" r="120%">
                <Stop offset="0%" stopColor="#16201d" />
                <Stop offset="100%" stopColor="#0a0e0c" />
              </RadialGradient>
            </Defs>
            <Polygon points={HEX_OUTER} fill="url(#cel-hex)" />
            <Polygon points={HEX_INNER} fill="url(#cel-core)" />
          </Svg>
          <View style={styles.hexMark}>
            <MountainMark size={82} />
          </View>
        </View>
      ) : (
        <View style={styles.medalWrap}>
          <Medal rarity={data.rarity} emblem={data.emblem} size={176} earned />
        </View>
      )}

      <Text style={[styles.eyebrow, { color: accent }]}>
        {isRank ? "RANK UNLOCKED" : `${rlabel} MEDAL EARNED`}
      </Text>
      <Text style={styles.title}>{data.title.toUpperCase()}</Text>
      <Text style={styles.line}>{data.line}</Text>

      <View style={styles.chips}>
        {isRank ? (
          <Chip label="+500 XP MILESTONE" icon="bolt" />
        ) : (
          <>
            {data.xp ? <Chip label={`+${data.xp} XP`} icon="bolt" /> : null}
            {data.when ? (
              <Chip
                label={`EARNED ${data.when.toUpperCase()}`}
                color={T.mut}
                bg="rgba(255,255,255,0.05)"
                border={T.line2}
              />
            ) : null}
          </>
        )}
      </View>

      <View style={styles.actions}>
        {data.onShare ? <Btn kind="ghost" label="Share" icon="arrowUR" onPress={data.onShare} /> : null}
        <Btn kind="primary" label="Keep climbing" icon="check" onPress={onClose} />
      </View>
    </View>
  );
}

/**
 * Adapt a settled progression moment into celebration data. Rank-up takes
 * priority; otherwise the first newly earned medal is shown (its display
 * metadata hydrated from the catalogue).
 */
export function celebrationFromMoment(
  moment: ProgressionMoment,
  opts?: { onShare?: () => void; when?: string },
): CelebrationData | null {
  if (moment.rankUp) {
    return { kind: "rank", title: moment.rankUp, line: rankUpLine(moment.rankUp) };
  }
  const first = moment.newMedals[0];
  if (!first) {
    return null;
  }
  const def = medalDefinitionFor(first.medal_type);
  return {
    kind: "medal",
    title: first.title || def?.title || "Medal",
    line: def?.condition ?? "A new milestone, earned.",
    rarity: def?.rarity ?? "epic",
    emblem: def?.emblem ?? "medal",
    when: opts?.when,
    onShare: opts?.onShare,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "rgba(6,7,9,0.9)",
  },
  watermark: { position: "absolute", top: 40, right: -110, opacity: 0.07 },
  card: { alignItems: "center" },
  content: { alignItems: "center" },
  hexWrap: { width: 150, height: 166, alignItems: "center", justifyContent: "center" },
  hexMark: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  medalWrap: { alignItems: "center" },
  eyebrow: { ...mono(11, 700), letterSpacing: 2, marginTop: 20, textAlign: "center" },
  title: { ...disp(40, 800), color: "#fff", marginTop: 6, letterSpacing: 0.6, textAlign: "center" },
  line: { ...ui(14, 500), color: "#cdd3d8", marginTop: 12, lineHeight: 21, maxWidth: 280, textAlign: "center" },
  chips: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 14 },
  actions: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 22 },
});
