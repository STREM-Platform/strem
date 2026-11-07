/** Mission setup, last steps: photo, starting point, review and the live preview card (mobile#147). */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { SetFn } from "@/components/mission-setup/race-steps";
import { Choices, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, Chip, Notice, Overline, Row } from "@/components/ui/kit";
import { HeroMedia } from "@/components/ui/photo";
import { C, R, disp, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { enrichApi, raceAi, type PhotoCandidate } from "@/lib/api/race";
import { API_BASE_URL } from "@/lib/config";
import type { CoverMedia, Terrain, Weekday } from "@/lib/api/race-missions";
import { hm, km, longDate, parseFinishTime } from "@/lib/race/format";
import type { FormErrors, MissionForm } from "@/lib/race/mission-form";
import { FORMATS, TERRAIN, sportMeta } from "@/lib/race/sports";

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export function PhotoStep({ form, set }: { form: MissionForm; set: SetFn }) {
  const [query, setQuery] = useState(form.name);
  const [items, setItems] = useState<PhotoCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useCallback(
    async (event: string) => {
      setLoading(true);
      setError(null);
      try {
        setItems(await enrichApi.photos({ event, location: form.location, sport: form.sport }));
      } catch {
        setError("Photo search is unavailable right now. You can continue without a photo and add one later.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [form.location, form.sport],
  );
  useEffect(() => {
    // Search once on entry with the race name; the athlete can refine.
    const timer = setTimeout(() => void search(form.name), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // AI race covers (#35) show only for accounts the server enables.
  const [canPaint, setCanPaint] = useState(false);
  const [painting, setPainting] = useState(false);
  const [paintError, setPaintError] = useState<string | null>(null);
  useEffect(() => {
    raceAi.status().then((s) => setCanPaint(Boolean(s.cover_images))).catch(() => setCanPaint(false));
  }, []);
  const paint = async () => {
    setPainting(true);
    setPaintError(null);
    try {
      const made = await enrichApi.generateCover({
        name: form.name,
        sport: form.sport,
        location: form.location || null,
        race_date: form.date || null,
        distance_km: Number(form.distance) || null,
        elevation_gain_m: Math.round(Number(form.elevation)) || null,
      });
      const url = `${API_BASE_URL}${made.path}`;
      const cover: CoverMedia = { url, thumb_url: url, title: `${form.name} (AI-generated)`, creator: made.model, license: "AI-generated", source_url: url, provider: "generated", depicts: "atmosphere" };
      setItems((current) => [{ ...cover, id: made.id }, ...(current ?? [])]);
      set("cover", cover);
    } catch (err) {
      setPaintError(err instanceof ApiError ? err.message : "The image model didn't answer. Retry.");
    } finally {
      setPainting(false);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      <Body muted>Pick a photo that makes this race feel real. These are openly licensed photos of the event or its location, credited to their creators.</Body>
      {canPaint ? (
        <Card pad={16} style={{ gap: 10 }}>
          <Row gap={8}>
            <Icon name="sparkles" size={16} color={C.accent} />
            <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>Paint a cover with AI</Text>
          </Row>
          <Body muted>The image model draws {form.name || "your race"} from what it knows about the race and the place. It’s labelled as AI-generated, never as a photo of the event.</Body>
          {paintError ? <Notice icon="alert" tone="attention" title="No cover this time" body={paintError} /> : null}
          <Button label={painting ? "Painting your race… (up to a minute)" : "Generate cover"} icon="sparkles" loading={painting} disabled={!form.name.trim()} onPress={() => void paint()} style={{ alignSelf: "flex-start" }} />
        </Card>
      ) : null}
      <Row gap={8} align="flex-end">
        <Input label="Search photos" value={query} onChangeText={setQuery} placeholder="Race, mountain or place" returnKeyType="search" onSubmitEditing={() => void search(query)} />
        <Button label="Search" kind="secondary" onPress={() => void search(query)} style={{ marginBottom: 2 }} />
      </Row>
      {loading ? <ActivityIndicator color={C.textMuted} style={{ marginVertical: 24 }} /> : null}
      {error ? <Notice icon="alert" tone="attention" title="Photos unavailable" body={error} /> : null}
      {items && !items.length && !loading && !error ? <Notice icon="image" title="No photos found" body="Try the mountain range, the town, or a nearby landmark." /> : null}
      <View style={styles.photoGrid}>
        {(items ?? []).map((photo) => {
          const on = form.cover?.url === photo.url;
          return (
            <Pressable
              key={photo.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${photo.title ?? "Photo"} by ${photo.creator ?? "unknown"}, ${photo.license}`}
              onPress={() =>
                set(
                  "cover",
                  on
                    ? null
                    : {
                        url: photo.url,
                        thumb_url: photo.thumb_url,
                        title: photo.title,
                        creator: photo.creator,
                        creator_url: photo.creator_url,
                        license: photo.license,
                        license_url: photo.license_url,
                        source_url: photo.source_url,
                        provider: photo.provider,
                        depicts: photo.depicts ?? "atmosphere",
                      },
                )
              }
              style={({ pressed }) => [styles.photo, on && styles.photoOn, pressed && { opacity: 0.85 }]}
            >
              <Image source={{ uri: photo.thumb_url ?? photo.url }} style={styles.photoImg} resizeMode="cover" />
              {on ? (
                <View style={styles.photoCheck}>
                  <Icon name="check" size={16} color={C.ink} sw={3} />
                </View>
              ) : null}
              <View style={styles.photoMeta}>
                <Text style={[ui(10, 700), { color: C.text }]} numberOfLines={1}>
                  {photo.provider === "generated" ? "AI-generated" : `${photo.depicts === "event" ? "Event" : photo.depicts === "location" ? "Location" : "Atmosphere"} · ${photo.license}`}
                </Text>
                <Text style={[ui(10, 500), { color: C.textMuted }]} numberOfLines={1}>
                  {photo.creator}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {form.cover && form.cover.provider !== "generated" ? (
        <Choices
          options={[
            { value: "event", label: "Shows this race" },
            { value: "location", label: "Shows the location" },
            { value: "atmosphere", label: "Just atmosphere" },
          ]}
          value={form.cover.depicts ?? "atmosphere"}
          onChange={(v) => form.cover && set("cover", { ...form.cover, depicts: v as "event" | "location" | "atmosphere" })}
        />
      ) : null}
    </View>
  );
}

export function PrepStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  return (
    <View style={{ gap: 18 }}>
      <Body muted>This is what the plan is built around. Everything is optional — but the more you share, the more the plan fits your real life.</Body>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Experience at this kind of event</Text>
        <Choices
          options={[
            { value: "new", label: "First time" },
            { value: "some", label: "A few done" },
            { value: "experienced", label: "Experienced" },
            { value: "elite", label: "Competitive" },
          ]}
          value={form.experience ?? null}
          onChange={(v) => set("experience", v)}
        />
      </View>
      <Row gap={12} wrap align="flex-start">
        <Input label="Training days / week" value={form.days} onChangeText={(v) => set("days", v)} keyboardType="number-pad" placeholder="e.g. 5" error={errors.days} />
        <Input label="Hours available / week" value={form.hours} onChangeText={(v) => set("hours", v)} keyboardType="decimal-pad" placeholder="e.g. 8" error={errors.hours} />
      </Row>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Best day for the long session</Text>
        <Choices options={WEEKDAYS} value={form.longDay} onChange={(v) => set("longDay", v)} />
      </View>
      <Row gap={12} wrap align="flex-start">
        <Input label="Current weekly volume" value={form.weeklyHours} onChangeText={(v) => set("weeklyHours", v)} suffix="h" keyboardType="decimal-pad" placeholder="e.g. 5" error={errors.weeklyHours} />
        <Input label="…or distance" value={form.weeklyKm} onChangeText={(v) => set("weeklyKm", v)} suffix="km" keyboardType="decimal-pad" placeholder="e.g. 40" error={errors.weeklyKm} />
      </Row>
      <Row gap={12} wrap align="flex-start">
        <Input label="Longest recent session" value={form.longestHours} onChangeText={(v) => set("longestHours", v)} suffix="h" keyboardType="decimal-pad" placeholder="e.g. 2.5" error={errors.longestHours} />
        <Input label="…distance" value={form.longestKm} onChangeText={(v) => set("longestKm", v)} suffix="km" keyboardType="decimal-pad" placeholder="e.g. 24" error={errors.longestKm} />
      </Row>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Where you can train</Text>
        <Choices
          multiple
          options={TERRAIN}
          value={form.terrain}
          onChange={(v: Terrain) => set("terrain", form.terrain.includes(v) ? form.terrain.filter((t) => t !== v) : [...form.terrain, v])}
        />
      </View>
      <Input label="Strength sessions / week" value={form.strength} onChangeText={(v) => set("strength", v)} keyboardType="number-pad" placeholder="0–4" error={errors.strength} />
      <Input label="Life constraints" value={form.constraints} onChangeText={(v) => set("constraints", v)} multiline placeholder="Shift work, kids, travel weeks, an old injury…" />
      <Input label="Where you live (for travel logistics)" value={form.home} onChangeText={(v) => set("home", v)} placeholder="e.g. Sofia" />
    </View>
  );
}

export function ReviewSummary({ form }: { form: MissionForm }) {
  const meta = sportMeta(form.sport);
  const target = parseFinishTime(form.target);
  const rows: [string, string][] = [
    ["Discipline", meta.label],
    ["When", form.date ? `${longDate(form.date)}${form.startTime ? ` · ${form.startTime}` : ""}` : "–"],
    ["Where", form.location || "–"],
    ["Distance", form.distance ? `${km(Number(form.distance))} km${form.elevation ? ` · ${form.elevation} m+` : ""}` : "–"],
    ["Format", FORMATS.find((f) => f.value === form.format)?.label ?? form.format],
    ["Goal", form.outcome === "target_time" ? `Target ${hm(target)}` : form.outcome === "compete" ? "Compete" : form.outcome === "finish" ? "Finish" : "Finish strong"],
    ["Training", [form.days && `${form.days} days/week`, form.hours && `${form.hours} h available`].filter(Boolean).join(" · ") || "Defaults for your level"],
  ];
  return (
    <Card pad={16} style={{ gap: 2 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.reviewRow}>
          <Text style={[ui(13, 600), { color: C.textMuted, width: 96 }]}>{k}</Text>
          <Text style={[ui(14, 600), { color: C.text, flex: 1 }]}>{v}</Text>
        </View>
      ))}
      <Text style={[ui(12, 500), { color: C.textDim, marginTop: 10, lineHeight: 18 }]}>
        Next, STREM builds your training plan, fueling, gear, logistics and race strategy. Everything stays editable, and every layer shows whether the race engine or the AI race team made it.
      </Text>
    </Card>
  );
}

export function PreviewCard({ form }: { form: MissionForm }) {
  const meta = sportMeta(form.sport);
  return (
    <View style={styles.preview}>
      <HeroMedia cover={form.cover} height={360} seed={form.name.length + 3}>
        <View style={{ padding: 18, gap: 8 }}>
          <Overline color="rgba(244,245,246,0.82)">
            {meta.short}
            {form.location ? ` · ${form.location.split(",")[0]}` : ""}
          </Overline>
          <Text style={[disp(36, 800), { color: C.text, lineHeight: 38 }]} numberOfLines={3}>
            {form.name || "Your race"}
          </Text>
          <Row gap={8} wrap>
            {form.date ? <Chip icon="calendar" label={longDate(form.date)} color={C.text} bg="rgba(8,9,11,0.55)" /> : null}
            {form.distance ? <Chip icon="route" label={`${form.distance} km`} color={C.text} bg="rgba(8,9,11,0.55)" /> : null}
            {form.elevation ? <Chip icon="mountain" label={`${form.elevation} m+`} color={C.text} bg="rgba(8,9,11,0.55)" /> : null}
          </Row>
        </View>
      </HeroMedia>
      {form.motivation ? (
        <Text style={[ui(14, 500), { color: C.textMuted, padding: 16, fontStyle: "italic", lineHeight: 21 }]}>“{form.motivation}”</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: { width: "48%", flexGrow: 1, maxWidth: 260, aspectRatio: 1.25, borderRadius: R.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: C.surface },
  photoOn: { borderColor: C.white },
  photoImg: { width: "100%", height: "100%" },
  photoCheck: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  photoMeta: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: "rgba(8,9,11,0.72)" },
  reviewRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  preview: { borderRadius: R.xl, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
