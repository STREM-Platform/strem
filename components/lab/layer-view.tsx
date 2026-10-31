/**
 * Renders a mission layer document (fuel, gear, logistics, strategy): metrics,
 * then sections as checklists, timelines, tables or notes. Items move through
 * the layer's states (e.g. gear: have it -> tested -> packed) and save at once.
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Meter } from "@/components/ui/charts";
import { Icon, type IconName } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, OriginBadge, Overline, Row, StatusLabel, TextLink, Title, useLayout } from "@/components/ui/kit";
import { C, LAYER_COLOR, disp, mono, ui, type LayerKey } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { layersApi, type ItemStatus, type LayerItem, type LayerKind, type LayerSection, type MissionLayer } from "@/lib/api/race";
import { capitalize, dayLabel, relativeDay } from "@/lib/race/format";

const FLOW: Record<LayerKind, { value: ItemStatus; label: string }[]> = {
  gear: [
    { value: "todo", label: "To get" },
    { value: "done", label: "Have it" },
    { value: "tested", label: "Tested" },
    { value: "packed", label: "Packed" },
  ],
  fuel: [
    { value: "todo", label: "To do" },
    { value: "tested", label: "Rehearsed" },
    { value: "done", label: "Done" },
  ],
  logistics: [
    { value: "todo", label: "To do" },
    { value: "done", label: "Done" },
    { value: "na", label: "Not needed" },
  ],
  strategy: [
    { value: "todo", label: "To review" },
    { value: "done", label: "Got it" },
  ],
};

export const LAYER_META: Record<LayerKind, { label: string; icon: IconName; key: LayerKey; blurb: string }> = {
  fuel: { label: "Fuel & hydration", icon: "drop", key: "fuel", blurb: "Carbs, fluid and sodium per hour, race week and rehearsals" },
  gear: { label: "Gear", icon: "pack", key: "gear", blurb: "Own it, test it in training, pack it" },
  logistics: { label: "Logistics", icon: "map", key: "logistics", blurb: "Admin, travel, race week and race morning" },
  strategy: { label: "Race strategy", icon: "compass", key: "strategy", blurb: "Pacing by segment, cutoffs and contingencies" },
};

const DONE = new Set(["done", "tested", "packed", "na"]);

export function layerProgress(layer: MissionLayer | undefined): { done: number; total: number } {
  const items = (layer?.content.sections ?? []).flatMap((s) => s.items);
  return { done: items.filter((i) => DONE.has(i.status ?? "todo")).length, total: items.length };
}

export function LayerView({
  layer,
  today,
  onChange,
  onRebuild,
  rebuilding,
}: {
  layer: MissionLayer;
  today: string;
  onChange: (layer: MissionLayer) => void;
  onRebuild: () => void;
  rebuilding: boolean;
}) {
  const meta = LAYER_META[layer.kind];
  const color = LAYER_COLOR[meta.key];
  const [error, setError] = useState<string | null>(null);
  const [showBasis, setShowBasis] = useState(false);
  const { done, total } = layerProgress(layer);
  const c = layer.content;

  const update = async (item: LayerItem, body: { status?: ItemStatus; note?: string | null }) => {
    setError(null);
    try {
      onChange(await layersApi.patchItem(layer, item.id, body));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 412 ? "This layer changed on another device. Refresh and try again." : err instanceof ApiError ? err.message : "That didn't save. Retry.");
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Row gap={8}>
          <Icon name={meta.icon} size={18} color={color} />
          <Overline>{meta.label}</Overline>
        </Row>
        <Title size={32}>{c.headline}</Title>
        <Row gap={8} wrap>
          <OriginBadge origin={layer.origin} model={layer.model} />
          <Text style={[ui(12, 600), { color: C.textMuted }]}>
            {done} of {total} done
          </Text>
        </Row>
        <Meter value={total ? done / total : null} color={color} label={`${meta.label} progress`} />
      </View>
      {c.summary ? <Body muted>{c.summary}</Body> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {c.metrics.length ? (
        <View style={styles.metrics}>
          {c.metrics.map((m) => (
            <View key={m.label} style={styles.metric}>
              <Text style={[ui(12, 600), { color: C.textMuted }]}>{m.label}</Text>
              <Row gap={4} align="flex-end">
                <Text style={[disp(30, 800), { color: C.text, lineHeight: 32 }]}>{m.value}</Text>
                {m.unit ? <Text style={[ui(13, 600), { color: C.textMuted, marginBottom: 4 }]}>{m.unit}</Text> : null}
              </Row>
              {m.note ? (
                <Text style={[ui(11, 500), { color: C.textDim, lineHeight: 15 }]} numberOfLines={3}>
                  {m.note}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {c.warnings.length ? (
        <Card tone="outline" pad={14} style={{ gap: 8 }}>
          {c.warnings.map((w) => (
            <Row key={w} gap={8} align="flex-start">
              <StatusLabel status="attention" compact />
              <Text style={[ui(13, 500), { color: C.text, flex: 1, lineHeight: 19 }]}>{w}</Text>
            </Row>
          ))}
        </Card>
      ) : null}
      {c.sections.map((section) => (
        <SectionBlock key={section.id} section={section} kind={layer.kind} color={color} today={today} onUpdate={update} />
      ))}
      <View style={{ gap: 8 }}>
        <TextLink label={showBasis ? "Hide what this is based on" : "What this is based on"} icon={showBasis ? "chevronUp" : "chevronDown"} onPress={() => setShowBasis((v) => !v)} color={C.textMuted} />
        {showBasis ? (
          <Card pad={16} style={{ gap: 8 }}>
            {[...c.assumptions, ...c.sources].map((a) => (
              <Row key={a} gap={8} align="flex-start">
                <Icon name="info" size={14} color={C.textDim} />
                <Text style={[ui(12, 500), { color: C.textMuted, flex: 1, lineHeight: 18 }]}>{a}</Text>
              </Row>
            ))}
          </Card>
        ) : null}
      </View>
      <Button label={layer.origin === "ai" ? "Rebuild with the latest data" : "Rebuild — personalize with AI"} icon="sparkles" kind="secondary" loading={rebuilding} onPress={onRebuild} />
      <Text style={[ui(11, 500), { color: C.textDim, lineHeight: 16 }]}>Rebuilding keeps everything you’ve ticked off. Guidance only — not medical advice.</Text>
    </View>
  );
}

function SectionBlock({
  section,
  kind,
  color,
  today,
  onUpdate,
}: {
  section: LayerSection;
  kind: LayerKind;
  color: string;
  today: string;
  onUpdate: (item: LayerItem, body: { status?: ItemStatus; note?: string | null }) => Promise<void>;
}) {
  if (section.kind === "table") return <TableBlock section={section} color={color} />;
  const items = section.kind === "timeline" ? [...section.items].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")) : section.items;
  return (
    <View style={{ gap: 8 }}>
      <Text style={[disp(20, 800), { color: C.text }]}>{section.title}</Text>
      {section.description ? <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]}>{section.description}</Text> : null}
      <Card pad={4}>
        {items.map((item, i) => (
          <ItemRow key={item.id} item={item} kind={kind} color={color} today={today} first={i === 0} timeline={section.kind === "timeline"} onUpdate={onUpdate} />
        ))}
      </Card>
    </View>
  );
}

function ItemRow({
  item,
  kind,
  color,
  today,
  first,
  timeline,
  onUpdate,
}: {
  item: LayerItem;
  kind: LayerKind;
  color: string;
  today: string;
  first: boolean;
  timeline: boolean;
  onUpdate: (item: LayerItem, body: { status?: ItemStatus; note?: string | null }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const status = item.status ?? "todo";
  const done = DONE.has(status);
  const flow = FLOW[kind];
  const overdue = !done && item.due_date && item.due_date <= today;
  const set = async (value: ItemStatus) => {
    setSaving(true);
    await onUpdate(item, { status: value });
    setSaving(false);
  };
  const quick = () => {
    const index = flow.findIndex((f) => f.value === status);
    const nextValue = flow[(index + 1) % flow.length].value;
    void set(nextValue);
  };
  return (
    <View style={[styles.item, !first && styles.itemDivider]}>
      <Row gap={12} align="flex-start">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.title}: ${flow.find((f) => f.value === status)?.label ?? status}. Tap to advance.`}
          accessibilityState={{ checked: done, busy: saving }}
          onPress={quick}
          hitSlop={8}
          style={[styles.check, done && { backgroundColor: color, borderColor: color }]}
        >
          {done ? <Icon name="check" size={15} color={C.white} sw={3} /> : null}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ flex: 1, gap: 3 }}>
          <Row gap={6} align="flex-start">
            <Text style={[ui(15, 600), { color: done ? C.textMuted : C.text, flex: 1, textDecorationLine: status === "na" ? "line-through" : "none" }]}>{item.title}</Text>
            {item.priority === "critical" && !done ? <Text style={[ui(10, 800), { color: C.critical, letterSpacing: 0.5 }]}>CRITICAL</Text> : null}
          </Row>
          <Row gap={8} wrap>
            {status !== "todo" ? <Text style={[ui(12, 700), { color }]}>{flow.find((f) => f.value === status)?.label ?? status}</Text> : null}
            {item.when ? <Text style={[mono(11, 600), { color: C.textMuted }]}>{item.when}</Text> : null}
            {item.due_date ? (
              <Text style={[ui(12, 600), { color: overdue ? C.warning : C.textMuted }]}>{overdue ? "Due now" : timeline ? dayLabel(item.due_date) : `Due ${relativeDay(item.due_date, today).toLowerCase()}`}</Text>
            ) : null}
            {item.quantity ? <Text style={[ui(12, 600), { color: C.textMuted }]}>{item.quantity}</Text> : null}
          </Row>
          {item.detail && (open || !done) ? (
            <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]} numberOfLines={open ? undefined : 2}>
              {item.detail}
            </Text>
          ) : null}
          {item.note ? <Text style={[ui(12, 500), { color: C.text, fontStyle: "italic" }]}>“{item.note}”</Text> : null}
        </Pressable>
      </Row>
      {open ? (
        <View style={styles.flow}>
          {flow.map((f) => (
            <Pressable
              key={f.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: f.value === status }}
              onPress={() => void set(f.value)}
              style={[styles.flowChip, f.value === status && { backgroundColor: C.white, borderColor: C.white }]}
            >
              <Text style={[ui(12, 700), { color: f.value === status ? C.ink : C.text }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const COLUMNS: Record<string, { label: string; unit?: string; sign?: string }> = {
  carbs_g: { label: "Carbs", unit: "g" },
  fluid_ml: { label: "Fluid", unit: "ml" },
  sodium_mg: { label: "Sodium", unit: "mg" },
  distance_km: { label: "Distance", unit: "km" },
  gain_m: { label: "Climb", unit: "m", sign: "+" },
  loss_m: { label: "Descent", unit: "m", sign: "−" },
  split: { label: "Split" },
  arrive: { label: "Arrive" },
  clock: { label: "Clock" },
  carry: { label: "Carry" },
  cutoff_margin: { label: "Cutoff margin" },
};

/** Known columns get proper names; anything else (e.g. from the AI) is humanized. */
function column(key: string): { label: string; unit?: string; sign?: string } {
  const unit = key.match(/^(.+)_(g|ml|mg|km|m|min|h)$/);
  return COLUMNS[key] ?? (unit ? { label: capitalize(unit[1]), unit: unit[2] } : { label: capitalize(key) });
}

function cellText(key: string, value: unknown): string {
  if (value == null) return "–";
  const { unit, sign } = column(key);
  return typeof value === "number" ? `${sign && value > 0 ? sign : ""}${value}${unit ? ` ${unit}` : ""}` : String(value);
}

function TableBlock({ section, color }: { section: LayerSection; color: string }) {
  const { medium } = useLayout();
  const columns = section.columns ?? Array.from(new Set(section.items.flatMap((i) => Object.keys(i.values ?? {}))));
  const header = (
    <>
      <Text style={[disp(20, 800), { color: C.text }]}>{section.title}</Text>
      {section.description ? <Text style={[ui(13, 500), { color: C.textMuted, lineHeight: 19 }]}>{section.description}</Text> : null}
    </>
  );
  if (!medium) {
    // Phones: one card per row, values as labelled pairs — no sideways scrolling.
    return (
      <View style={{ gap: 8 }}>
        {header}
        <View style={styles.table}>
          {section.items.map((item, i) => (
            <View key={item.id} style={[styles.rowCard, i > 0 && styles.itemDivider]}>
              <Row gap={6}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>{item.title}</Text>
              </Row>
              {item.detail ? <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>{item.detail}</Text> : null}
              <View style={styles.pairs}>
                {columns.map((col) =>
                  item.values?.[col] == null ? null : (
                    <View key={col} style={styles.pair}>
                      <Text style={[ui(10, 700), { color: C.textDim }]}>{column(col).label}</Text>
                      <Text style={[mono(13, 600), { color: C.text }]}>{cellText(col, item.values[col])}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={[styles.tr, styles.th]}>
            <Text style={[styles.cellTitle, ui(11, 700), { color: C.textMuted }]}>{section.id === "pacing" ? "Segment" : "When"}</Text>
            {columns.map((col) => (
              <Text key={col} style={[styles.cell, ui(11, 700), { color: C.textMuted }]}>
                {column(col).label}
                {column(col).unit ? ` (${column(col).unit})` : ""}
              </Text>
            ))}
          </View>
          {section.items.map((item, i) => (
            <View key={item.id} style={[styles.tr, i % 2 === 1 && { backgroundColor: "rgba(255,255,255,0.02)" }]}>
              <View style={styles.cellTitle}>
                <Row gap={6}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[ui(13, 700), { color: C.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Row>
                {item.detail ? (
                  <Text style={[ui(11, 500), { color: C.textMuted, lineHeight: 15 }]} numberOfLines={3}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>
              {columns.map((col) => (
                <Text key={col} style={[styles.cell, mono(13, 600), { color: C.text }]}>
                  {item.values?.[col] == null ? "–" : `${column(col).sign && Number(item.values[col]) > 0 ? column(col).sign : ""}${String(item.values[col])}`}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flexGrow: 1, flexBasis: 150, maxWidth: 320, gap: 4, padding: 14, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  rowCard: { padding: 12, gap: 6 },
  pairs: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 6, paddingLeft: 14 },
  pair: { gap: 1 },
  item: { padding: 12, gap: 10 },
  itemDivider: { borderTopWidth: 1, borderTopColor: C.line },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.lineStrong, alignItems: "center", justifyContent: "center", marginTop: 1 },
  flow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 38 },
  flowChip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong, alignItems: "center", justifyContent: "center" },
  table: { borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: "hidden", minWidth: "100%" },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.line },
  th: { backgroundColor: C.surface },
  cellTitle: { width: 210, padding: 10, gap: 3 },
  cell: { width: 92, padding: 10, textAlign: "right" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
