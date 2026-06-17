/**
 * Profile Proof / Story / League — ported from `prototype/screens/screen-proof.jsx`.
 *   ProofTimeline — XP & load mini-charts, PR history, medal rarity % (Phase 4).
 *   ChaptersView  — the narrative arc, base camp → now → locked (Phase 7).
 *   LeagueView    — season banner + tribe league by collective power + verdict (Phase 7).
 * All read the one graph through `forge`.
 */

import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Icon, MountainMark } from "@/components/ui/icon";
import { Bar, IconTile, Panel } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import type { Chapter, League, ProofData, Season } from "@/lib/agent/types";
import { PHOTOS } from "@/lib/photos";
import { useAsync } from "@/lib/use-async";

// tiny inline area/line chart (no deps)
function MiniChart({ data, color = T.green, h = 60 }: { data: number[]; color?: string; h?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => [(i / (n - 1)) * 100, 100 - ((v - min) / range) * 84 - 8]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  return (
    <Svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height={h}>
      <Path d={area} fill={color} opacity={0.12} />
      <Path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <Circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r={3} fill={color} vectorEffect="non-scaling-stroke" />
    </Svg>
  );
}

export function ProofTimeline() {
  const { data: p } = useAsync<ProofData>(forge.getProof);
  if (!p) return null;
  return (
    <View style={styles.col}>
      <View style={styles.statRow}>
        <Panel pad={13} style={styles.statCard}>
          <Text style={styles.statLabel}>XP / WEEK</Text>
          <Text style={styles.statNum}>
            940 <Text style={styles.statDeltaGreen}>▲ 15%</Text>
          </Text>
          <MiniChart data={p.xp} color={T.green} />
        </Panel>
        <Panel pad={13} style={styles.statCard}>
          <Text style={styles.statLabel}>TRAINING LOAD</Text>
          <Text style={styles.statNum}>
            66 <Text style={styles.statDeltaAmber}>OPTIMAL</Text>
          </Text>
          <MiniChart data={p.load} color={T.amber} />
        </Panel>
      </View>

      <Panel pad={0}>
        <View style={styles.prHead}>
          <Icon name="bolt" size={15} color={T.green} />
          <Text style={styles.prHeadText}>PR HISTORY</Text>
        </View>
        {p.prs.map((pr, i) => (
          <View key={i} style={styles.prRow}>
            <View style={styles.prIcon}>
              <Icon name="trophy" size={16} color={T.green} />
            </View>
            <View style={styles.shrink}>
              <Text style={styles.prLift}>{pr.lift}</Text>
              <Text style={styles.prWhen}>{pr.when}</Text>
            </View>
            <View style={styles.prRight}>
              <Text style={styles.prVal}>{pr.val}</Text>
              <Text style={styles.prDelta}>{pr.delta}</Text>
            </View>
          </View>
        ))}
      </Panel>

      <Panel pad={14}>
        <Text style={styles.rarityHead}>MEDAL RARITY · HOW FEW HOLD THESE</Text>
        {Object.entries(p.rarity).map(([name, pct], i, arr) => (
          <View key={name} style={{ marginBottom: i < arr.length - 1 ? 12 : 0 }}>
            <View style={styles.rarityRow}>
              <Text style={styles.rarityName}>{name}</Text>
              <Text style={styles.rarityPct}>{pct}% of athletes</Text>
            </View>
            <Bar pct={pct / 100} color={T.green} h={5} />
          </View>
        ))}
      </Panel>
    </View>
  );
}

export function ChaptersView() {
  const { data } = useAsync<Chapter[]>(forge.getChapters);
  if (!data) return null;
  return (
    <View style={styles.chapters}>
      <View style={styles.chapterSpine} />
      {data.map((ch, i) => {
        const cur = ch.state === "current";
        const locked = ch.state === "locked";
        return (
          <View key={i} style={styles.chapterRow}>
            <View style={styles.chapterNodeWrap}>
              <View style={[styles.chapterNode, { borderColor: cur ? T.green : locked ? T.line2 : T.greenLine, backgroundColor: cur ? "#15301f" : T.surf }]}>
                {locked ? <Icon name="lock" size={15} color={T.sub} /> : <Text style={[styles.chapterNum, { color: cur ? T.green : T.mut }]}>{ch.num}</Text>}
              </View>
            </View>
            <Panel pad={13} accent={cur ? T.greenLine : T.line} style={[styles.chapterCard, { opacity: locked ? 0.6 : 1 }]}>
              <View style={styles.chapterCardHead}>
                <Text style={[styles.chapterTitle, { color: locked ? T.sub : "#fff" }]}>{ch.title}</Text>
                <Text style={[styles.chapterSpan, { color: cur ? T.green : T.sub }]}>{ch.span.toUpperCase()}</Text>
              </View>
              <Text style={[styles.chapterBeat, { color: locked ? T.sub : "#cdd3d8" }]}>{ch.beat}</Text>
            </Panel>
          </View>
        );
      })}
    </View>
  );
}

export function LeagueView() {
  const { data } = useAsync(() => Promise.all([forge.getLeague(), forge.getSeason()]));
  if (!data) return null;
  const [L, s]: [League, Season] = data;
  return (
    <View style={styles.col}>
      {/* season banner */}
      <Panel raised accent={T.greenLine} pad={0}>
        <View style={styles.seasonImgWrap}>
          <Image source={PHOTOS.tribe} style={styles.seasonImg} resizeMode="cover" />
          <View style={styles.seasonScrim} />
          <View style={styles.seasonCaption}>
            <Text style={styles.seasonName}>{s.name}</Text>
            <Text style={styles.seasonMeta}>
              {s.daysLeft} DAYS LEFT · {s.rankInSeason.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.seasonBody}>
          <View style={styles.seasonProgRow}>
            <Text style={styles.seasonProgLabel}>Season progress</Text>
            <Text style={styles.seasonProgPct}>{Math.round(s.progress * 100)}%</Text>
          </View>
          <Bar pct={s.progress} color={T.green} h={7} />
          <View style={styles.seasonReward}>
            <Icon name="trophy" size={14} color={T.amber} />
            <Text style={styles.seasonRewardText}>
              Reward: <Text style={styles.seasonRewardBold}>{s.reward}</Text>
            </Text>
          </View>
        </View>
      </Panel>

      {/* league standings */}
      <Panel pad={0}>
        <View style={styles.leagueHead}>
          <View style={styles.leagueHeadRow}>
            <Icon name="shield" size={15} color={T.green} />
            <Text style={styles.leagueTier}>{L.tier.toUpperCase()}</Text>
          </View>
          <Text style={styles.leagueNote}>{L.note}</Text>
        </View>
        {L.standings.map((row, i) => {
          const promote = i < 4;
          return (
            <View key={i} style={[styles.standing, row.you && styles.standingYou]}>
              <Text style={[styles.standingRank, { color: promote ? T.green : T.sub }]}>{i + 1}</Text>
              <View style={styles.shrink}>
                <Text style={[styles.standingTribe, ui(14, row.you ? 800 : 600), { color: row.you ? T.green : T.text }]}>
                  {row.tribe}
                  {row.you ? " · YOU" : ""}
                </Text>
              </View>
              <Icon
                name={row.trend === "flat" ? "minus" : "arrowUR"}
                size={13}
                color={row.trend === "up" ? T.green : row.trend === "down" ? T.red : T.sub}
                style={row.trend === "down" ? styles.trendDown : undefined}
              />
              <Text style={styles.standingPower}>{(row.power / 1000).toFixed(1)}k</Text>
            </View>
          );
        })}
      </Panel>

      {/* weekly verdict */}
      <Panel accent={T.greenLine} pad={14} style={styles.verdict}>
        <View style={styles.verdictRow}>
          <IconTile name="bot" size={34} iconSize={18} />
          <View style={styles.shrink}>
            <Text style={styles.verdictLabel}>WEEKLY VERDICT</Text>
            <Text style={styles.verdictText}>{L.verdict}</Text>
          </View>
        </View>
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 14 },
  shrink: { flexShrink: 1, flex: 1 },

  // proof
  statRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1 },
  statLabel: { ...mono(9, 700), letterSpacing: 1, color: T.sub },
  statNum: { ...disp(22, 800), color: "#fff", marginTop: 3, marginBottom: 6 },
  statDeltaGreen: { ...mono(10, 700), color: T.green },
  statDeltaAmber: { ...mono(10, 700), color: T.amber },
  prHead: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, paddingBottom: 8 },
  prHeadText: { ...disp(16, 800), letterSpacing: 0.8, color: T.text },
  prRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: T.line },
  prIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine },
  prLift: { ...ui(14, 700), color: T.text },
  prWhen: { ...mono(9, 600), color: T.sub, marginTop: 1 },
  prRight: { alignItems: "flex-end" },
  prVal: { ...disp(18, 800), color: "#fff" },
  prDelta: { ...mono(9, 700), color: T.green },
  rarityHead: { ...mono(10, 700), letterSpacing: 1, color: T.sub, marginBottom: 12 },
  rarityRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  rarityName: { ...ui(13, 600), color: T.text },
  rarityPct: { ...mono(10, 700), color: T.green },

  // chapters
  chapters: { position: "relative", gap: 12 },
  chapterSpine: { position: "absolute", left: 19, top: 8, bottom: 8, width: 2, backgroundColor: "rgba(255,255,255,0.08)" },
  chapterRow: { flexDirection: "row", gap: 14 },
  chapterNodeWrap: { width: 40, alignItems: "center" },
  chapterNode: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  chapterNum: { ...disp(15, 800) },
  chapterCard: { flex: 1 },
  chapterCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chapterTitle: { ...disp(18, 800), letterSpacing: 0.4 },
  chapterSpan: { ...mono(9, 700), letterSpacing: 0.8 },
  chapterBeat: { ...ui(13, 500), lineHeight: 20, marginTop: 6 },

  // league
  seasonImgWrap: { height: 124, position: "relative", overflow: "hidden", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  seasonImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  seasonScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,16,21,0.45)" },
  seasonCaption: { position: "absolute", left: 14, right: 14, bottom: 10 },
  seasonName: { ...disp(20, 800), color: "#fff" },
  seasonMeta: { ...mono(9, 700), letterSpacing: 0.6, color: T.green, marginTop: 2 },
  seasonBody: { padding: 14 },
  seasonProgRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  seasonProgLabel: { ...ui(12.5, 600), color: T.mut },
  seasonProgPct: { ...mono(10, 700), color: T.green },
  seasonReward: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 11 },
  seasonRewardText: { ...ui(12.5, 500), color: T.mut },
  seasonRewardBold: { ...ui(12.5, 700), color: T.text },
  leagueHead: { padding: 14, paddingBottom: 10 },
  leagueHeadRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  leagueTier: { ...disp(16, 800), letterSpacing: 0.8, color: T.text },
  leagueNote: { ...ui(12, 500), color: T.sub, marginTop: 3 },
  standing: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: T.line },
  standingYou: { backgroundColor: "rgba(52,226,160,0.07)" },
  standingRank: { ...disp(15, 800), width: 18 },
  standingTribe: { ...ui(14, 600) },
  standingPower: { ...mono(11, 700), color: T.text, width: 56, textAlign: "right" },
  trendDown: { transform: [{ rotate: "90deg" }] },
  verdict: { backgroundColor: "#10181a" },
  verdictRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  verdictLabel: { ...mono(9, 700), letterSpacing: 1, color: T.green, marginBottom: 4 },
  verdictText: { ...ui(13.5, 500), color: "#dfe4e3", lineHeight: 20 },
});
