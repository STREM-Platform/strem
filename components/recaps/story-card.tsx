/**
 * Shareable story card (9:16) — ported from `design-spec/story-recaps.jsx`.
 * Renders a recap as an IG-story-ready layout for capture/export. Driven by the
 * real-data `Recap` union from `lib/recaps.ts`.
 */

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { Medal } from "@/components/medals/medal";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { MountainMark } from "@/components/ui/icon";
import { Ring } from "@/components/ui/ring";
import { RARITY, T, disp, mono, ui } from "@/constants/theme";
import { PHOTOS } from "@/lib/photos";
import type { Recap } from "@/lib/recaps";

function StoryShell({ tone = "green", rank, footer, photo, children }: { tone?: "green" | "red" | "legendary"; rank: string; footer?: string; photo?: ImageSourcePropType; children: ReactNode }) {
  const accent = tone === "red" ? T.red : tone === "legendary" ? "#F4C45A" : T.green;
  return (
    <View style={styles.shell}>
      {photo ? (
        <>
          <Image source={photo} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoScrim} />
        </>
      ) : (
        <HeroBackdrop tone={tone === "red" ? "red" : "green"} />
      )}
      <MountainMark size={420} color="#9fb0a8" style={styles.watermark} />
      <LinearGradient
        colors={[`${accent}22`, "transparent"]}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <LinearGradient
        colors={["rgba(8,9,11,0.5)", "transparent", "rgba(8,9,11,0.55)", "#08090b"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <MountainMark size={20} />
            <Text style={styles.brandText}>STREM</Text>
          </View>
          <Text style={styles.rank}>{rank.toUpperCase()}</Text>
        </View>
        <View style={styles.body}>{children}</View>
        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </View>
    </View>
  );
}

function BigStat({ value, unit, label, color = "#fff", size = 72 }: { value: string; unit?: string; label: string; color?: string; size?: number }) {
  return (
    <View>
      <View style={styles.bigStatRow}>
        <Text style={[disp(size, 800), { color, lineHeight: size }]}>{value}</Text>
        {unit ? <Text style={[disp(Math.round(size * 0.32), 700), styles.bigStatUnit]}> {unit}</Text> : null}
      </View>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function MiniBars({ data, color = T.green }: { data: { d: string; v: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <View style={styles.miniBars}>
      {data.map((d, i) => (
        <View key={i} style={styles.miniCol}>
          <View
            style={[
              styles.miniBar,
              { height: Math.max(6, (d.v / max) * 54), backgroundColor: d.v ? color : "rgba(255,255,255,0.12)" },
              d.v ? { boxShadow: `0px 0px 8px ${color}66` } : null,
            ]}
          />
          <Text style={styles.miniLabel}>{d.d}</Text>
        </View>
      ))}
    </View>
  );
}

export function StoryCard({ recap, rank }: { recap: Recap; rank: string }) {
  if (recap.type === "weekly") {
    return (
      <StoryShell rank={rank} photo={PHOTOS.heroRun} footer={`Hold the line. — ${recap.weekLabel}`}>
        <Text style={styles.eyebrow}>WEEKLY RECAP</Text>
        <BigStat value={String(recap.sessions)} unit={recap.sessions === 1 ? "session" : "sessions"} label="LOGGED THIS WEEK" size={84} />
        <View style={styles.statRow}>
          <BigStat value={recap.distanceKm > 0 ? String(recap.distanceKm) : "0"} unit="km" label="DISTANCE" size={40} />
          <BigStat value={recap.totalXp.toLocaleString()} unit="XP" label="TOTAL" color={T.green} size={40} />
          <BigStat value={String(recap.streak)} unit={recap.streak === 1 ? "day" : "days"} label="STREAK" size={40} />
        </View>
        <View style={styles.barsWrap}>
          <MiniBars data={recap.bars} />
        </View>
      </StoryShell>
    );
  }

  if (recap.type === "monthly") {
    return (
      <StoryShell rank={rank} photo={PHOTOS.strength} footer="The base you built.">
        <Text style={styles.eyebrow}>MONTHLY RECAP</Text>
        <Text style={styles.monthName}>{recap.monthLabel}</Text>
        <View style={styles.monthGrid}>
          <BigStat value={String(recap.sessions)} unit="sessions" label="TRAINED" size={44} />
          <BigStat value={String(recap.distanceKm)} unit="km" label="RUN" size={44} />
          <BigStat value={String(recap.hours)} unit="h" label="MOVING" size={44} />
        </View>
        {recap.topMedal ? (
          <View style={styles.topMedalRow}>
            <Medal rarity={recap.topMedal.rarity} emblem={recap.topMedal.emblem} size={56} />
            <View>
              <Text style={styles.topMedalLabel}>TOP MEDAL</Text>
              <Text style={styles.topMedalName}>{recap.topMedal.title}</Text>
            </View>
          </View>
        ) : null}
      </StoryShell>
    );
  }

  if (recap.type === "medal") {
    const tone = recap.def.rarity === "legendary" ? "legendary" : recap.def.rarity === "common" ? "green" : "green";
    return (
      <StoryShell rank={rank} tone={tone} footer="Earned the hard way.">
        <View style={styles.medalCenter}>
          <Text style={[styles.eyebrow, { color: recap.def.rarity === "legendary" ? "#F4C45A" : T.green, textAlign: "center" }]}>
            {RARITY[recap.def.rarity].label.toUpperCase()} MEDAL EARNED
          </Text>
          <View style={styles.medalArt}>
            <Medal rarity={recap.def.rarity} emblem={recap.def.emblem} size={200} earned />
          </View>
          <Text style={styles.medalTitle}>{recap.def.title.toUpperCase()}</Text>
          <Text style={styles.medalCond}>{recap.def.condition}</Text>
        </View>
      </StoryShell>
    );
  }

  // consistency
  const total = recap.trainingDays + recap.nutritionDays;
  return (
    <StoryShell rank={rank} photo={PHOTOS.identity} footer="Consistency, not perfection.">
      <Text style={styles.eyebrow}>CONSISTENCY</Text>
      <View style={styles.consRow}>
        <Ring size={128} stroke={12} pct={Math.min(1, total / 14)}>
          <Text style={styles.consRingNum}>{recap.streak}</Text>
          <Text style={styles.consRingLabel}>DAY STREAK</Text>
        </Ring>
        <View style={styles.shrink}>
          <BigStat value={String(recap.trainingDays)} unit="days" label="TRAINED THIS WEEK" size={40} />
          <View style={{ height: 14 }} />
          <BigStat value={String(recap.nutritionDays)} unit="days" label="FUELED THIS WEEK" color="#37C6F2" size={40} />
        </View>
      </View>
    </StoryShell>
  );
}

const styles = StyleSheet.create({
  shell: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: "#08090b" },
  photo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  photoScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,9,11,0.5)" },
  watermark: { position: "absolute", top: 120, right: -130, opacity: 0.08 },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  content: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingTop: 64, paddingBottom: 70, flexDirection: "column" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 26 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { ...disp(13, 700), letterSpacing: 3.1, color: "#fff" },
  rank: { ...mono(11, 600), color: "rgba(255,255,255,0.7)", letterSpacing: 0.8 },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 26, gap: 0 },
  footer: { ...ui(13, 600), color: "rgba(255,255,255,0.6)", textAlign: "center", paddingHorizontal: 26 },
  shrink: { flex: 1 },

  eyebrow: { ...mono(12, 700), letterSpacing: 2.2, color: T.green },
  bigStatRow: { flexDirection: "row", alignItems: "flex-end" },
  bigStatUnit: { color: "rgba(255,255,255,0.6)" },
  bigStatLabel: { ...mono(10, 700), letterSpacing: 1.4, color: "rgba(255,255,255,0.55)", marginTop: 6 },
  statRow: { flexDirection: "row", gap: 22, marginTop: 22 },
  barsWrap: { marginTop: 26 },
  miniBars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 60 },
  miniCol: { flex: 1, alignItems: "center", gap: 6 },
  miniBar: { width: "100%", borderRadius: 4 },
  miniLabel: { ...mono(9, 600), color: "rgba(255,255,255,0.5)" },

  monthName: { ...disp(96, 800), color: "#fff", lineHeight: 82, marginTop: 4 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 26, marginTop: 26 },
  topMedalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 28 },
  topMedalLabel: { ...mono(10, 700), color: T.green, letterSpacing: 1 },
  topMedalName: { ...ui(17, 700), color: "#fff" },

  medalCenter: { alignItems: "center" },
  medalArt: { marginVertical: 14 },
  medalTitle: { ...disp(42, 800), color: "#fff", marginTop: 8, textAlign: "center" },
  medalCond: { ...ui(15, 500), color: "rgba(255,255,255,0.75)", marginTop: 8, maxWidth: 260, textAlign: "center", lineHeight: 21 },

  consRow: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 16 },
  consRingNum: { ...disp(34, 800), color: "#fff" },
  consRingLabel: { ...mono(9, 700), color: T.green, marginTop: 2, letterSpacing: 0.5 },
});
