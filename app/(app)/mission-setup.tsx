import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BuildPanel } from "@/components/mission/build-panel";
import { Choices, DatePicker, Input } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, Chip, ErrorBanner, IconButton, Notice, Overline, Row, Title, useLayout } from "@/components/ui/kit";
import { HeroMedia } from "@/components/ui/photo";
import { C, R, disp, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { enrichApi, type PhotoCandidate, type PlaceResult } from "@/lib/api/race";
import { raceMissions, type Sport, type Terrain, type Weekday } from "@/lib/api/race-missions";
import { hm, km, longDate, parseFinishTime, requestKey, todayIn } from "@/lib/race/format";
import { missionForm, toInput, validate, type FormErrors, type MissionForm } from "@/lib/race/mission-form";
import { useRace } from "@/lib/race/race-context";
import { FORMATS, SPORTS, SUPPORTS, TERRAIN, sportMeta } from "@/lib/race/sports";
import { useBuilder } from "@/lib/race/use-builder";

const STEPS = ["sport", "race", "demands", "goal", "photo", "prep", "review"] as const;
type Step = (typeof STEPS)[number];
const STEP_TITLE: Record<Step, string> = {
  sport: "What kind of challenge?",
  race: "The race",
  demands: "What it demands",
  goal: "Your goal",
  photo: "Make it yours",
  prep: "Your starting point",
  review: "Ready to commit",
};
const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export default function MissionSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sport?: string }>();
  const race = useRace();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const editing = useMemo(() => race.missions.find((m) => m.id === params.id) ?? null, [race.missions, params.id]);
  const [form, setForm] = useState<MissionForm>(() => missionForm(editing, (params.sport as Sport) || undefined));
  const [step, setStep] = useState<Step>(editing ? "race" : params.sport ? "race" : "sport");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const key = useRef(requestKey());
  const scroll = useRef<ScrollView>(null);
  const finish = useCallback(async () => {
    await race.reloadMissions(createdId ?? editing?.id);
  }, [race, createdId, editing?.id]);
  const builder = useBuilder(finish);

  // Missions can finish loading after a deep link opens this screen: seed the
  // form once per mission, during render (no effect round-trip).
  const [seededFor, setSeededFor] = useState<string | null>(editing?.id ?? null);
  if (editing && editing.id !== seededFor) {
    setSeededFor(editing.id);
    setForm(missionForm(editing));
    setStep("race");
  }

  const set = <K extends keyof MissionForm>(k: K, v: MissionForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    const scope = step === "race" ? "race" : step === "demands" ? "demands" : step === "goal" ? "goal" : step === "prep" ? "prep" : undefined;
    const found = scope ? validate(form, scope) : {};
    setErrors(found);
    if (Object.keys(found).length) return;
    if (index < STEPS.length - 1) go(STEPS[index + 1]);
  };
  const back = () => (index > 0 && !(editing && step === "race") ? go(STEPS[index - 1]) : router.back());

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setSaveError("Some details need attention — go back and check the highlighted fields.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await raceMissions.update(editing, toInput(form), "Updated in mission setup");
        await race.reloadMissions(editing.id);
        router.dismissTo("/(app)/home");
        return;
      }
      const created = await raceMissions.create(toInput(form), key.current);
      setCreatedId(created.id);
      race.setFocus(created.id);
      scroll.current?.scrollTo({ y: 0, animated: true });
      void builder.build(created.id);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Saving was not confirmed. Check your connection and try again — retrying is safe.");
    } finally {
      setSaving(false);
    }
  };

  const doneBuilding = Boolean(createdId) && !builder.running && Object.keys(builder.states).length > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <IconButton icon={index === 0 || (editing && step === "race") ? "x" : "chevronL"} label={index === 0 ? "Close" : "Back"} onPress={back} tone="surface" />
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.progressSeg, i <= index && { backgroundColor: C.white }]} />
          ))}
        </View>
        <Text style={[ui(12, 700), { color: C.textMuted, width: 44, textAlign: "right" }]}>
          {index + 1}/{STEPS.length}
        </Text>
      </View>
      <View style={[styles.layout, wide && { flexDirection: "row" }]}>
        {wide ? (
          <View style={styles.previewCol}>
            <PreviewCard form={form} />
          </View>
        ) : null}
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[styles.formBody, { paddingBottom: 140 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Overline>{editing ? "Edit mission" : "New Race Mission"}</Overline>
          <Title size={wide ? 44 : 38}>{createdId ? (doneBuilding ? "Your race is ready" : "Building your race") : STEP_TITLE[step]}</Title>
          {step === "sport" ? <SportStep value={form.sport} onPick={(s) => { setForm((f) => ({ ...f, sport: s, legs: sportMeta(s).legs ?? [] })); go("race"); }} /> : null}
          {step === "race" ? <RaceStep form={form} set={set} errors={errors} /> : null}
          {step === "demands" ? <DemandsStep form={form} set={set} errors={errors} /> : null}
          {step === "goal" ? <GoalStep form={form} set={set} errors={errors} /> : null}
          {step === "photo" ? <PhotoStep form={form} set={set} /> : null}
          {step === "prep" ? <PrepStep form={form} set={set} errors={errors} /> : null}
          {step === "review" ? (
            <View style={{ gap: 16 }}>
              {/* Once committed, the build is the news: progress first, the race card below. */}
              <BuildPanel states={builder.states} />
              {doneBuilding ? (
                <Button label="Open my Race Mission" iconRight="chevron" size="lg" onPress={() => router.dismissTo("/(app)/home")} />
              ) : null}
              {!wide ? <PreviewCard form={form} /> : null}
              {!createdId ? <ReviewSummary form={form} /> : null}
              {saveError ? <ErrorBanner message={saveError} /> : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
      {step !== "sport" && !createdId ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          {step === "review" ? (
            <Button
              label={editing ? "Save changes" : saving ? "Creating…" : "Commit & build my race plan"}
              icon={editing ? "check" : "sparkles"}
              size="lg"
              loading={saving}
              onPress={() => void save()}
              style={{ flex: 1 }}
            />
          ) : (
            <>
              {step === "photo" && !form.cover ? <Button label="Skip" kind="ghost" onPress={next} /> : null}
              <Button label="Continue" iconRight="chevron" size="lg" onPress={next} style={{ flex: 1 }} />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function SportStep({ value, onPick }: { value: Sport; onPick: (sport: Sport) => void }) {
  return (
    <View style={styles.sportGrid}>
      {SPORTS.map((sport) => {
        const on = sport.id === value;
        return (
          <Pressable
            key={sport.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(sport.id)}
            style={({ pressed }) => [styles.sportTile, on && styles.sportOn, pressed && { opacity: 0.8 }]}
          >
            <Icon name={sport.icon} size={24} color={on ? C.ink : C.text} />
            <Text style={[ui(15, 700), { color: on ? C.ink : C.text }]}>{sport.label}</Text>
            <Text style={[ui(12, 500), { color: on ? "rgba(8,9,11,0.7)" : C.textMuted, lineHeight: 17 }]}>{sport.blurb}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type SetFn = <K extends keyof MissionForm>(k: K, v: MissionForm[K]) => void;

function RaceStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  const [query, setQuery] = useState(form.location);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const picked = useRef(Boolean(form.latitude));
  useEffect(() => {
    if (picked.current || query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      enrichApi
        .places(query)
        .then(setPlaces)
        .catch(() => setPlaces([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <View style={{ gap: 18 }}>
      <Input label="Race or challenge name" value={form.name} onChangeText={(v) => set("name", v)} placeholder={form.sport === "custom" ? "e.g. Everesting on Vitosha" : "e.g. Rila Ultra 50K"} error={errors.name} autoCapitalize="words" />
      <View style={{ gap: 6 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Race date{form.date ? ` · ${longDate(form.date)}` : ""}</Text>
        <DatePicker label="Race date" value={form.date} min={todayIn(form.timezone)} onChange={(v) => set("date", v)} />
        {errors.date ? <Text style={[ui(12, 600), { color: C.serious }]}>{errors.date}</Text> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Input
          label="Where it starts"
          value={query}
          onChangeText={(v) => {
            picked.current = false;
            setQuery(v);
            set("location", v);
            set("latitude", null);
            set("longitude", null);
          }}
          placeholder="Search a town or place"
          error={errors.location}
          hint={form.latitude != null ? "Location found ✓" : undefined}
        />
        {searching ? <ActivityIndicator color={C.textMuted} style={{ alignSelf: "flex-start" }} /> : null}
        {places.length ? (
          <Card pad={4}>
            {places.map((p) => (
              <Pressable
                key={`${p.latitude},${p.longitude}`}
                accessibilityRole="button"
                onPress={() => {
                  picked.current = true;
                  setQuery(p.label);
                  setPlaces([]);
                  set("location", p.label);
                  set("latitude", p.latitude);
                  set("longitude", p.longitude);
                  if (p.timezone) set("timezone", p.timezone);
                  set("countryCode", p.country_code ?? null);
                }}
                style={({ pressed }) => [styles.place, pressed && { opacity: 0.75 }]}
              >
                <Icon name="pin" size={16} color={C.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[ui(14, 700), { color: C.text }]}>{p.label}</Text>
                  <Text style={[ui(12, 500), { color: C.textMuted }]}>
                    {p.timezone ?? "timezone unknown"}
                    {p.elevation_m != null ? ` · ${Math.round(p.elevation_m)} m` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        ) : null}
        <Text style={[ui(12, 500), { color: C.textDim }]}>
          Timezone: {form.timezone}. Picking a place lets STREM pull race-day conditions and daylight.
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Start time (optional)</Text>
        <Choices
          options={["05:00", "06:00", "07:00", "08:00", "09:00", "10:00"].map((t) => ({ value: t, label: t }))}
          value={form.startTime || null}
          onChange={(v) => set("startTime", form.startTime === v ? "" : v)}
        />
        <Input label="Or exact time" value={form.startTime} onChangeText={(v) => set("startTime", v)} placeholder="HH:MM" error={errors.startTime} keyboardType="numbers-and-punctuation" />
      </View>
    </View>
  );
}

function DemandsStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  const meta = sportMeta(form.sport);
  return (
    <View style={{ gap: 18 }}>
      <Row gap={12} wrap align="flex-start">
        <Input label="Distance" value={form.distance} onChangeText={(v) => set("distance", v)} suffix="km" placeholder={meta.distanceHint} keyboardType="decimal-pad" error={errors.distance} />
        {meta.hasElevation ? (
          <Input label="Elevation gain" value={form.elevation} onChangeText={(v) => set("elevation", v)} suffix="m+" placeholder="unknown" keyboardType="number-pad" error={errors.elevation} hint="optional" />
        ) : null}
      </Row>
      {form.legs.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[ui(13, 700), { color: C.textMuted }]}>Legs</Text>
          <Row gap={10} wrap>
            {form.legs.map((leg, i) => (
              <Input
                key={leg.discipline + i}
                label={leg.discipline === "swim" ? "Swim" : leg.discipline === "bike" ? "Bike" : "Run"}
                value={String(leg.distance_km)}
                suffix="km"
                keyboardType="decimal-pad"
                onChangeText={(v) => {
                  const value = Number(v.replace(",", "."));
                  set("legs", form.legs.map((l, j) => (j === i ? { ...l, distance_km: Number.isFinite(value) && value > 0 ? value : l.distance_km } : l)));
                }}
              />
            ))}
          </Row>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Format</Text>
        <Choices options={FORMATS} value={form.format} onChange={(v) => set("format", v)} />
      </View>
      {form.format !== "single_day" ? (
        <Row gap={12} wrap align="flex-start">
          <Input label="Stages / days" value={form.stages} onChangeText={(v) => set("stages", v)} keyboardType="number-pad" error={errors.stages} />
          <Input label="Last day" value={form.endDate} onChangeText={(v) => set("endDate", v)} placeholder="YYYY-MM-DD" error={errors.endDate} />
        </Row>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Support</Text>
        <Choices options={SUPPORTS} value={form.support} onChange={(v) => set("support", form.support === v ? null : v)} />
      </View>
      <Input label="Cutoff" value={form.cutoff} onChangeText={(v) => set("cutoff", v)} placeholder="e.g. 12:00 (hours:minutes)" hint="optional" error={errors.cutoff} keyboardType="numbers-and-punctuation" />
      <Notice icon="info" title="Unknown is fine" body="Leave elevation or cutoff empty if you don't know them yet. STREM never guesses race facts — you can add them, or upload the GPX, later." />
    </View>
  );
}

function GoalStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
  return (
    <View style={{ gap: 18 }}>
      <Choices
        options={[
          { value: "finish", label: "Finish", hint: "Get to the line" },
          { value: "finish_confidently", label: "Finish strong", hint: "Healthy and in control" },
          { value: "target_time", label: "Target time", hint: "A specific time" },
          { value: "compete", label: "Compete", hint: "Race for a placing" },
        ]}
        value={form.outcome}
        onChange={(v) => set("outcome", v)}
      />
      {form.outcome === "target_time" || form.outcome === "compete" ? (
        <Input label={form.outcome === "compete" ? "Time that would win your goal (optional)" : "Target finish time"} value={form.target} onChangeText={(v) => set("target", v)} placeholder="hours:minutes, e.g. 6:30" error={errors.target} keyboardType="numbers-and-punctuation" />
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Priority</Text>
        <Choices
          options={[
            { value: "A", label: "A race", hint: "The season goal" },
            { value: "B", label: "B race", hint: "Important" },
            { value: "C", label: "C race", hint: "Training race" },
          ]}
          value={form.priority}
          onChange={(v) => set("priority", v)}
        />
      </View>
      <Input
        label="Why does this race matter to you?"
        value={form.motivation}
        onChangeText={(v) => set("motivation", v)}
        multiline
        placeholder="Your words. Your race team uses them when it gets hard."
        error={errors.motivation}
        hint={`${form.motivation.length}/600`}
      />
    </View>
  );
}

function PhotoStep({ form, set }: { form: MissionForm; set: SetFn }) {
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
  return (
    <View style={{ gap: 14 }}>
      <Body muted>Pick a photo that makes this race feel real. These are openly licensed photos of the event or its location, credited to their creators.</Body>
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
                  {photo.depicts === "event" ? "Event" : photo.depicts === "location" ? "Location" : "Atmosphere"} · {photo.license}
                </Text>
                <Text style={[ui(10, 500), { color: C.textMuted }]} numberOfLines={1}>
                  {photo.creator}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {form.cover ? (
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

function PrepStep({ form, set, errors }: { form: MissionForm; set: SetFn; errors: FormErrors }) {
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

function ReviewSummary({ form }: { form: MissionForm }) {
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

function PreviewCard({ form }: { form: MissionForm }) {
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
  root: { flex: 1, backgroundColor: C.ink },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  progress: { flex: 1, flexDirection: "row", gap: 4 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.surface3 },
  layout: { flex: 1, width: "100%", maxWidth: 1180, alignSelf: "center" },
  previewCol: { width: 420, padding: 20 },
  formBody: { paddingHorizontal: 18, paddingTop: 12, gap: 16, maxWidth: 720, width: "100%" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: "rgba(8,9,11,0.94)", borderTopWidth: 1, borderTopColor: C.line },
  sportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sportTile: { width: "48%", flexGrow: 1, gap: 8, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, minHeight: 124 },
  sportOn: { backgroundColor: C.white, borderColor: C.white },
  place: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 52 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: { width: "48%", flexGrow: 1, maxWidth: 260, aspectRatio: 1.25, borderRadius: R.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: C.surface },
  photoOn: { borderColor: C.white },
  photoImg: { width: "100%", height: "100%" },
  photoCheck: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  photoMeta: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: "rgba(8,9,11,0.72)" },
  reviewRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  preview: { borderRadius: R.xl, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
