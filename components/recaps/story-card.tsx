/**
 * Shareable story card (9:16) — ported from `design-spec/story-recaps.jsx`.
 * Renders a recap as an IG-story-ready layout for capture/export. Driven by the
 * real-data `Recap` union from `lib/recaps.ts`.
 */

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { Medal } from "@/components/medals/medal";
import { HeroBackdrop } from "@/components/ui/hero-backdrop";
import { Icon } from "@/components/ui/icon";
import { Ring } from "@/components/ui/ring";
import { RARITY, T, disp, mono, ui } from "@/constants/theme";
import { PHOTOS } from "@/lib/photos";
import type { Recap, SessionBreakdown } from "@/lib/recaps";

/** "74" → "1h14m"; "48" → "48m"; "120" → "2h". */
function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

/** Per-discipline list: count · time · distance · elevation (each shown only if present). */
function Breakdown({ items }: { items: SessionBreakdown[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.breakdown}>
      {items.slice(0, 5).map((b, i) => (
        <View key={b.type} style={[styles.bdRow, i > 0 && styles.bdDivider]}>
          <Icon name={b.icon} size={16} color="#fff" />
          <Text style={styles.bdLabel}>{b.label}</Text>
          <Text style={styles.bdMeta} numberOfLines={1}>
            {b.sessions}× · {fmtDur(b.minutes)}
            {b.km > 0 ? ` · ${b.km}km` : ""}
            {b.elevationM > 0 ? ` · ↑${Math.round(b.elevationM)}m` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Brand({ rank }: { rank: string }) {
  return (
    <View style={styles.topRow}>
      <View style={styles.brand}>
        <BrandLogo variant="symbol" style={styles.brandMark} />
        <Text style={styles.brandText}>STREM</Text>
      </View>
      <Text style={styles.rank}>{rank.toUpperCase()}</Text>
    </View>
  );
}

function StoryShell({ tone = "green", rank, footer, photo, transparent = false, children }: { tone?: "green" | "red" | "legendary"; rank: string; footer?: string; photo?: ImageSourcePropType; transparent?: boolean; children: ReactNode }) {
  const accent = tone === "red" ? T.red : tone === "legendary" ? "#F4C45A" : T.green;

  // Transparent export: just the brand + stats on alpha — no photo, backdrop, or
  // dark fill — so it drops cleanly onto a Story background (#69 / founder ask).
  if (transparent) {
    return (
      <View style={[styles.shell, styles.shellTransparent]}>
        <View style={styles.content}>
          <Brand rank={rank} />
          <View style={styles.body}>{children}</View>
          {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </View>
      </View>
    );
  }

  // Photo recaps: the image sits as a natural 16:9 top banner (not stretched
  // full-bleed → no zoom), with the stats on a clean dark panel below.
  if (photo) {
    return (
      <View style={styles.shell}>
        <View style={styles.banner}>
          <Image source={photo} style={styles.bannerImg} resizeMode="cover" />
          <LinearGradient colors={["rgba(8,9,11,0.55)", "transparent"]} style={styles.bannerTopShade} />
          <LinearGradient colors={["transparent", "transparent", "#08090b"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.photoBody}>{children}</View>
        {footer ? <Text style={styles.footerAbs}>{footer}</Text> : null}
      </View>
    );
  }

  // No-photo recaps (medal): full-bleed brand backdrop, content centered.
  return (
    <View style={styles.shell}>
      <HeroBackdrop tone={tone === "red" ? "red" : "green"} />
      <LinearGradient colors={[`${accent}22`, "transparent"]} style={styles.topGlow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} />
      <LinearGradient colors={["rgba(8,9,11,0.5)", "transparent", "rgba(8,9,11,0.55)", "#08090b"]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Brand rank={rank} />
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

export function StoryCard({ recap, rank, transparent = false }: { recap: Recap; rank: string; transparent?: boolean }) {
  if (recap.type === "weekly") {
    return (
      <StoryShell transparent={transparent} rank={rank} photo={PHOTOS.tribe} footer={`Hold the line. — ${recap.weekLabel}`}>
        <Text style={styles.eyebrow}>WEEKLY RECAP</Text>
        <View style={styles.weekHead}>
          <BigStat value={String(recap.sessions)} unit={recap.sessions === 1 ? "session" : "sessions"} label="LOGGED THIS WEEK" size={72} />
          {recap.minutes > 0 ? <BigStat value={fmtDur(recap.minutes)} label="TOTAL TIME" color={T.green} size={36} /> : null}
        </View>
        <Breakdown items={recap.byType} />
        <View style={styles.statRow}>
          <BigStat value={recap.distanceKm > 0 ? String(recap.distanceKm) : "0"} unit="km" label="DISTANCE" size={36} />
          <BigStat value={recap.totalXp.toLocaleString()} unit="XP" label="TOTAL" color={T.green} size={36} />
          <BigStat value={String(recap.streak)} unit={recap.streak === 1 ? "day" : "days"} label="STREAK" size={36} />
        </View>
      </StoryShell>
    );
  }

  if (recap.type === "monthly") {
    return (
      <StoryShell transparent={transparent} rank={rank} photo={PHOTOS.strength} footer="The base you built.">
        <Text style={styles.eyebrow}>MONTHLY RECAP</Text>
        <Text style={styles.monthName}>{recap.monthLabel}</Text>
        <View style={styles.monthTotals}>
          <BigStat value={String(recap.sessions)} unit="sessions" label="TRAINED" size={40} />
          <BigStat value={String(recap.hours)} unit="h" label="MOVING" color={T.green} size={40} />
        </View>
        <Breakdown items={recap.byType} />
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
      <StoryShell transparent={transparent} rank={rank} tone={tone} footer="Earned the hard way.">
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
    <StoryShell transparent={transparent} rank={rank} photo={PHOTOS.hyrox} footer="Consistency, not perfection.">
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
  shellTransparent: { backgroundColor: "transparent" },
  topGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  content: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingTop: 64, paddingBottom: 70, flexDirection: "column" },

  // photo-banner layout (un-zoomed)
  banner: { width: "100%", aspectRatio: 16 / 9, position: "relative" },
  bannerImg: { width: "100%", height: "100%" },
  bannerTopShade: { position: "absolute", top: 0, left: 0, right: 0, height: "42%" },
  photoBody: { flex: 1, paddingHorizontal: 26, paddingTop: 28, justifyContent: "flex-start" },
  footerAbs: { position: "absolute", left: 0, right: 0, bottom: 64, paddingHorizontal: 26, ...ui(13, 600), color: "rgba(255,255,255,0.6)", textAlign: "center" },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 26 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 24, height: 24 },
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
  weekHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 },

  // per-discipline breakdown
  breakdown: { marginTop: 22, gap: 0 },
  bdRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  bdDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  bdLabel: { ...ui(15, 700), color: "#fff", width: 96 },
  bdMeta: { flex: 1, ...mono(11, 600), color: "rgba(255,255,255,0.72)", letterSpacing: 0.2, textAlign: "right" },

  monthName: { ...disp(80, 800), color: "#fff", lineHeight: 70, marginTop: 4 },
  monthTotals: { flexDirection: "row", gap: 26, marginTop: 18 },
  topMedalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 },
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
