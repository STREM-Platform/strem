import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DatePicker, Input } from "@/components/ui/fields";
import { Icon, type IconName } from "@/components/ui/icon";
import { Body, Button, Card, ErrorBanner, IconButton, Notice, Overline, Page, Row, Segmented, StatTile, Title } from "@/components/ui/kit";
import { C, LAYER_COLOR, disp, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceAi, type ImportSource, type PlanImportDraft, type PlanSession } from "@/lib/api/race";
import { readBase64, readImage, readText } from "@/lib/files";
import { addDays, capitalize, dayLabel, daysBetween, hm, km, mondayOf, todayIn, weekdayShort } from "@/lib/race/format";
import { planEnd, removeSession, repeatBlock, shiftDraft, weekHours } from "@/lib/race/plan-import";
import { useRace } from "@/lib/race/race-context";
import { SESSION_ICON } from "@/lib/race/sports";

const MAX_SOURCES = 6;
const MAX_FILE_BYTES = 6 * 1024 * 1024;

type Picked = { id: string; label: string; icon: IconName; source: ImportSource };

function kindOf(asset: DocumentPicker.DocumentPickerAsset): ImportSource["kind"] | null {
  const name = asset.name.toLowerCase();
  const type = asset.mimeType ?? "";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/.test(name)) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.includes("csv") || /\.(csv|tsv)$/.test(name)) return "csv";
  if (type.startsWith("text/") || /\.(txt|md)$/.test(name)) return "text";
  return null;
}

const SOURCE_ICON: Record<ImportSource["kind"], IconName> = { image: "image", pdf: "layers", csv: "grid", text: "list" };

/** Bring the athlete's own plan in: screenshots, PDF, CSV or pasted text → review → save. */
export default function PlanImportScreen() {
  const router = useRouter();
  const race = useRace();
  const { mission, plan } = race;
  const [picked, setPicked] = useState<Picked[]>([]);
  const [pasted, setPasted] = useState("");
  const [fixedStart, setFixedStart] = useState(false);
  const [start, setStart] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanImportDraft | null>(null);
  const today = todayIn(mission?.event.timezone);
  // A plan can belong to a race, or to the athlete with no race (training#23).
  // A plan can belong to a race, a season (training#18) or the athlete with no race.
  const params = useLocalSearchParams<{ season?: string }>();
  const seasons = race.timeline?.seasons ?? [];
  const [chosen, setTarget] = useState<string | null>(params.season ?? null);
  const target = chosen ?? (mission ? "race" : "athlete");
  const forRace = target === "race" && mission != null;
  const season = seasons.find((s) => s.id === target) ?? null;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(app)/plan"));

  const pick = async (images: boolean) => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: images ? ["image/*"] : ["application/pdf", "text/csv", "text/comma-separated-values", "text/plain", "text/tab-separated-values"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const next: Picked[] = [];
      for (const asset of result.assets) {
        if (picked.length + next.length + (pasted.trim() ? 1 : 0) >= MAX_SOURCES) throw new Error(`Up to ${MAX_SOURCES} files per import.`);
        const kind = kindOf(asset);
        if (!kind) throw new Error(`${asset.name}: use a screenshot or photo, PDF, CSV or text file. Export spreadsheets as CSV.`);
        const size = asset.size ?? asset.file?.size ?? 0;
        if (kind !== "image" && size > MAX_FILE_BYTES) throw new Error(`${asset.name} is larger than 6 MB.`);
        let source: ImportSource;
        if (kind === "image") {
          const image = await readImage(asset);
          source = { kind, media_type: image.mediaType, data_base64: image.data, name: asset.name };
        } else if (kind === "pdf") source = { kind, media_type: "application/pdf", data_base64: await readBase64(asset), name: asset.name };
        else source = { kind, text: await readText(asset), name: asset.name };
        next.push({ id: `${asset.name}-${Date.now()}-${next.length}`, label: asset.name, icon: SOURCE_ICON[kind], source });
      }
      setPicked((p) => [...p, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be read.");
    }
  };

  const read = async () => {
    const sources = [...picked.map((p) => p.source), ...(pasted.trim() ? [{ kind: "text" as const, text: pasted.trim(), name: "Pasted plan" }] : [])];
    if (!sources.length) return;
    setReading(true);
    setError(null);
    try {
      const from = fixedStart && start ? start : null;
      const seasonStart = season && season.start_date > today ? season.start_date : null;
      setDraft(forRace ? await raceAi.importPlan(mission.id, sources, from) : await raceAi.importAthletePlan(sources, from ?? seasonStart));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The plan could not be read. Check your connection and try again.");
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      if (forRace) await raceAi.commitImport(mission.id, draft.content);
      else await raceAi.commitAthleteImport(draft.content, season?.id);
      await race.refresh(["plan", "progress", "brief"], { briefRefresh: true });
      router.dismissTo("/(app)/plan");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving was not confirmed. Check your connection and try again — retrying is safe.");
    } finally {
      setSaving(false);
    }
  };

  if (draft) {
    return (
      <Page>
        <Row>
          <IconButton icon="chevronL" label="Back to sources" onPress={() => setDraft(null)} tone="surface" />
          <Overline style={{ flex: 1 }}>Import · {forRace ? mission.event.name : season ? season.name : "Your own plan"}</Overline>
        </Row>
        <DraftReview draft={draft} today={today} hasPlan={forRace ? Boolean(plan) : season ? season.has_plan : Boolean(race.timeline?.base_version)} onChange={(content) => setDraft({ ...draft, content })} />
        {error ? <ErrorBanner message={error} /> : null}
        <Row gap={10} wrap>
          <Button label="Save as my plan" icon="check" size="lg" loading={saving} disabled={!draft.content.weeks.length} onPress={() => void save()} style={{ flexGrow: 1 }} />
          <Button label="Start over" kind="ghost" onPress={() => setDraft(null)} />
        </Row>
      </Page>
    );
  }

  const count = picked.length + (pasted.trim() ? 1 : 0);
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={close} tone="surface" />
        <Overline style={{ flex: 1 }}>Your plan</Overline>
      </Row>
      <Title size={38}>Bring your own plan</Title>
      {mission || seasons.length ? (
        <Segmented
          scroll={seasons.length > 0}
          options={[
            ...(mission ? [{ value: "race", label: mission.event.name, icon: "flag" as const }] : []),
            ...seasons.map((s) => ({ value: s.id, label: s.name, icon: "calendar" as const })),
            { value: "athlete", label: "My own training", icon: "user" as const },
          ]}
          value={target}
          onChange={setTarget}
        />
      ) : null}
      <Body muted>
        A coach&apos;s PDF, a screenshot from another app, a spreadsheet or plain text — your race team reads it with everything it knows about {forRace ? mission.event.name : "you and your races"}, keeps every session as written and tells you what it would watch.
      </Body>
      <View style={styles.tiles}>
        <SourceTile icon="image" title="Screenshots or photos" body="Calendar views, a photo of a printed plan — several pages are fine." onPress={() => void pick(true)} />
        <SourceTile icon="upload" title="PDF, CSV or text file" body="Coach plans, TrainingPeaks / Final Surge exports, spreadsheets saved as CSV." onPress={() => void pick(false)} />
      </View>
      {picked.length ? (
        <View style={{ gap: 8 }}>
          {picked.map((p) => (
            <View key={p.id} style={styles.file}>
              <Icon name={p.icon} size={18} color={LAYER_COLOR.training} />
              <Text style={[ui(14, 600), { color: C.text, flex: 1 }]} numberOfLines={1}>
                {p.label}
              </Text>
              <IconButton icon="x" label={`Remove ${p.label}`} size={36} tone="plain" onPress={() => setPicked((all) => all.filter((x) => x.id !== p.id))} />
            </View>
          ))}
        </View>
      ) : null}
      <Input label="…or paste your plan" value={pasted} onChangeText={setPasted} multiline numberOfLines={8} placeholder={"Week 1 – base\nMon: rest\nTue: easy 45 min\nSat: long trail 2h 18 km 600 m+"} style={{ minHeight: 170 }} />
      <Card pad={16} style={{ gap: 12 }}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: fixedStart }} onPress={() => setFixedStart((v) => !v)} style={styles.toggle}>
          <Icon name={fixedStart ? "checkCircle" : "circle"} size={20} color={fixedStart ? C.accent : C.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[ui(14, 700), { color: C.text }]}>Week 1 starts on a specific date</Text>
            <Text style={[ui(12, 500), { color: C.textMuted }]}>Otherwise dates in the plan are used, or it starts next Monday.</Text>
          </View>
        </Pressable>
        {fixedStart ? <DatePicker label="Week 1 starts" value={start || mondayOf(addDays(today, 7))} min={today} onChange={setStart} /> : null}
      </Card>
      {error ? <ErrorBanner message={error} /> : null}
      {reading ? (
        <Notice icon="sparkles" tone="accent" title="Your race team is reading your plan…" body="It transcribes every session, maps it onto your calendar and checks it against the race. Screenshots and PDFs can take a minute." />
      ) : null}
      <Button label={count ? `Read my plan (${count})` : "Read my plan"} icon="sparkles" size="lg" loading={reading} disabled={!count} onPress={() => void read()} />
      <Body muted size={13}>
        Nothing is saved until you review it. Prefer not to? The race team can also build a plan for you from your race, fitness and availability.
      </Body>
    </Page>
  );
}

function SourceTile({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <View style={styles.tileIcon}>
        <Icon name={icon} size={22} color={LAYER_COLOR.training} />
      </View>
      <Text style={[ui(15, 700), { color: C.text }]}>{title}</Text>
      <Text style={[ui(12, 500), { color: C.textMuted, lineHeight: 17 }]}>{body}</Text>
    </Pressable>
  );
}

function DraftReview({ draft, today, hasPlan, onChange }: { draft: PlanImportDraft; today: string; hasPlan: boolean; onChange: (content: PlanImportDraft["content"]) => void }) {
  const { content } = draft;
  const [moving, setMoving] = useState(false);
  const [beforeRepeat, setBeforeRepeat] = useState<PlanImportDraft["content"] | null>(null);
  const [showAll, setShowAll] = useState(false);
  // A plan with no race (the athlete's own) has no race day: offer a fixed number of weeks instead.
  const raceDate: string | null = content.race_date || null;
  const gap = raceDate ? daysBetween(planEnd(content), raceDate) : 0;
  const short = !raceDate && content.weeks.length < 8;
  const repeat = (times: number | "race") => {
    setBeforeRepeat((b) => b ?? content);
    onChange(repeatBlock(content, times));
  };
  // Server checks were made on the draft as read; drop the "ends before race day" one once filled.
  const warnings = draft.warnings.filter((w) => !(gap <= 21 && /before race day/.test(w)));
  const notes = [...warnings, ...content.assumptions.filter((a) => !warnings.includes(a))];
  const visibleWeeks = showAll || content.weeks.length <= 4 ? content.weeks : content.weeks.slice(0, 2);
  const totals = useMemo(() => {
    const sessions = content.weeks.flatMap((w) => w.sessions).filter((s) => s.kind !== "rest");
    return {
      sessions: sessions.length,
      hours: Math.round(weekHours(sessions)),
      km: Math.round(sessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)),
      peak: Math.max(0, ...content.weeks.map((w) => weekHours(w.sessions))),
    };
  }, [content]);
  const first = content.weeks[0]?.start_date ?? content.start_date;
  return (
    <View style={{ gap: 14 }}>
      <Title size={34}>{content.headline}</Title>
      <Text style={[ui(13, 600), { color: C.textMuted }]}>
        {dayLabel(first)} → {dayLabel(addDays(content.weeks[content.weeks.length - 1]?.start_date ?? first, 6))}{raceDate ? ` · race ${dayLabel(raceDate)}` : " · your own plan"}
      </Text>
      <View style={styles.stats}>
        <StatTile label="Weeks" value={String(content.weeks.length)} style={styles.stat} />
        <StatTile label="Sessions" value={String(totals.sessions)} style={styles.stat} />
        <StatTile label="Total" value={String(totals.hours)} unit="h" style={styles.stat} />
        {totals.km ? <StatTile label="Distance" value={String(totals.km)} unit="km" style={styles.stat} /> : <StatTile label="Peak week" value={km(totals.peak)} unit="h" style={styles.stat} />}
      </View>
      <WeekStrip weeks={content.weeks} />
      {draft.review ? (
        <Card pad={16} tone="accent" style={{ gap: 10 }}>
          <Row gap={8}>
            <Icon name="sparkles" size={18} color={C.accent} />
            <Text style={[ui(14, 800), { color: C.text }]}>Race team review</Text>
          </Row>
          <Body size={14}>{draft.review.summary}</Body>
          {draft.review.notes.map((note) => (
            <Row key={note} gap={8} align="flex-start">
              <Icon name="chevron" size={14} color={C.accent} />
              <Text style={[ui(13, 500), { color: C.text, flex: 1, lineHeight: 19 }]}>{note}</Text>
            </Row>
          ))}
        </Card>
      ) : null}
      {draft.parser === "text" ? (
        <Notice icon="info" title="Read without the AI race team" body={`The text reader transcribed this plan; no AI review this time.${draft.ai_reason ? ` ${draft.ai_reason}` : ""}`} />
      ) : null}
      {gap > 21 || short ? (
        <Card pad={16} style={{ gap: 10 }}>
          <Row gap={8}>
            <Icon name="refresh" size={18} color={LAYER_COLOR.training} />
            <Text style={[ui(14, 800), { color: C.text, flex: 1 }]}>
              {content.weeks.length === 1 ? "A weekly template?" : `Repeat this ${content.weeks.length}-week block?`}
            </Text>
          </Row>
          <Body muted size={13}>
            {raceDate
              ? `It ends ${dayLabel(planEnd(content))}, ${gap} days before race day. Repeat it to fill the weeks up to race week — the race team can adapt the build and taper later.`
              : `It ends ${dayLabel(planEnd(content))}. Repeat it to keep training on it — you can change it or add a race any time.`}
          </Body>
          <Row gap={8} wrap>
            {raceDate ? (
              <Button label="Repeat until race week" icon="refresh" size="sm" onPress={() => repeat("race")} />
            ) : (
              <Button label="Repeat for 8 weeks" icon="refresh" size="sm" onPress={() => repeat(Math.max(1, Math.ceil(8 / content.weeks.length) - 1))} />
            )}
            <Button label="Repeat once" kind="secondary" size="sm" onPress={() => repeat(1)} />
          </Row>
        </Card>
      ) : null}
      {beforeRepeat ? (
        <Button
          label="Undo repeat"
          kind="ghost"
          size="sm"
          icon="chevronL"
          onPress={() => {
            onChange(beforeRepeat);
            setBeforeRepeat(null);
          }}
        />
      ) : null}
      {notes.length ? <Notice icon="alert" tone="attention" title="Check before saving" body={notes.join("\n")} /> : null}
      {draft.unparsed.length ? <Notice icon="info" title="Unclear in your plan — check these" body={draft.unparsed.map((u) => `“${u}”`).join("\n")} /> : null}
      <Card pad={14} style={{ gap: 10 }}>
        <Row>
          <Icon name="calendar" size={18} color={C.textMuted} />
          <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>Week 1 starts {dayLabel(first)}</Text>
          <Button label={moving ? "Done" : "Move"} kind="secondary" size="sm" onPress={() => setMoving((v) => !v)} />
        </Row>
        {moving ? <DatePicker label="Move week 1 to" value={first} min={addDays(today, -28)} onChange={(iso) => onChange(shiftDraft(content, iso))} /> : null}
      </Card>
      {hasPlan ? <Notice icon="refresh" title="Replaces your current plan" body="Saving makes this your plan for the race; logged sessions stay in your history." /> : null}
      {visibleWeeks.map((week) => (
        <Card key={week.index} pad={14} style={{ gap: 8 }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={[disp(18, 800), { color: C.text }]}>
                Week {week.index} · {capitalize(week.phase)}
              </Text>
              <Text style={[ui(12, 600), { color: C.textMuted }]} numberOfLines={1}>
                {dayLabel(week.start_date, false)} · {weekHours(week.sessions) ? `${km(weekHours(week.sessions))} h` : `${week.sessions.filter((s) => s.kind !== "rest").length} sessions`}{week.focus && week.focus !== `${capitalize(week.phase)} week` ? ` · ${week.focus}` : ""}
              </Text>
            </View>
          </Row>
          {week.sessions.map((s) => (
            <DraftSession key={s.id} session={s} onRemove={() => onChange(removeSession(content, s.id))} />
          ))}
        </Card>
      ))}
      {visibleWeeks.length < content.weeks.length ? (
        <Button label={`Show all ${content.weeks.length} weeks`} kind="secondary" icon="chevronDown" onPress={() => setShowAll(true)} />
      ) : null}
    </View>
  );
}

/** Weekly hours as a compact bar strip: the shape of the imported block at a glance. */
function WeekStrip({ weeks }: { weeks: PlanImportDraft["content"]["weeks"] }) {
  const hours = weeks.map((w) => weekHours(w.sessions));
  const max = Math.max(1, ...hours);
  if (weeks.length < 2) return null;
  return (
    <View accessibilityLabel={`Weekly hours: ${hours.map((h) => km(h)).join(", ")}`} style={styles.strip}>
      {hours.map((h, i) => (
        <View key={weeks[i].index} style={styles.stripCol}>
          <View style={[styles.stripBar, { height: Math.max(4, (h / max) * 64), backgroundColor: weeks[i].phase === "taper" || weeks[i].phase === "recovery" ? C.surface2 : LAYER_COLOR.training }]} />
          {weeks.length <= 16 ? <Text style={[ui(10, 600), { color: C.textDim }]}>{weeks[i].index}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function DraftSession({ session, onRemove }: { session: PlanSession; onRemove: () => void }) {
  const rest = session.kind === "rest";
  return (
    <View style={[styles.session, rest && styles.restSession]}>
      <Text style={[ui(11, 700), { color: C.textMuted, width: 30 }]}>{weekdayShort(session.date)}</Text>
      <View style={[styles.sessionIcon, { backgroundColor: rest ? C.surface2 : `${LAYER_COLOR.training}22` }]}>
        <Icon name={SESSION_ICON[session.sport] ?? "run"} size={16} color={rest ? C.textDim : LAYER_COLOR.training} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[ui(14, 700), { color: rest ? C.textMuted : C.text }]} numberOfLines={1}>
          {session.title}
        </Text>
        {!rest ? (
          <Text style={[ui(12, 500), { color: C.textMuted }]} numberOfLines={2}>
            {[hm(session.duration_minutes), session.distance_km ? `${km(session.distance_km)} km` : null, session.elevation_m ? `+${session.elevation_m} m` : null, session.intensity.replace("_", " "), session.purpose || null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
      </View>
      <IconButton icon="x" label={`Remove ${session.title} on ${dayLabel(session.date)}`} size={36} tone="plain" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexGrow: 1, flexBasis: 220, gap: 6, padding: 16, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${LAYER_COLOR.training}1f`, marginBottom: 4 },
  file: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 14, paddingRight: 4, minHeight: 48, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexGrow: 1, flexBasis: 120 },
  strip: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 84, paddingHorizontal: 2 },
  stripCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  stripBar: { width: "100%", maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  session: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: C.surface2, minHeight: 52 },
  restSession: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.line, borderStyle: "dashed" },
  sessionIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
