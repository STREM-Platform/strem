import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StravaRoutesSheet } from "@/components/lab/strava-routes";
import { PhotoStep, PrepStep, PreviewCard, ReviewSummary } from "@/components/mission-setup/finish-steps";
import { DemandsStep, GoalStep, RaceStep, SportStep } from "@/components/mission-setup/race-steps";
import { BuildPanel } from "@/components/mission/build-panel";
import { Choices } from "@/components/ui/fields";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button, ErrorBanner, IconButton, Overline, Title, useLayout } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { api, ApiError } from "@/lib/api/client";
import { courses } from "@/lib/api/courses";
import type { StravaRoute } from "@/lib/api/race";
import { raceMissions, type Sport } from "@/lib/api/race-missions";
import { km, requestKey } from "@/lib/race/format";
import { missionForm, toInput, validate, withBaseline, type FormErrors, type MissionForm } from "@/lib/race/mission-form";
import { useRace } from "@/lib/race/race-context";
import { sportMeta } from "@/lib/race/sports";
import { BUILD_ORDER, useBuilder } from "@/lib/race/use-builder";

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
type PlanSource = "generate" | "import" | "later";
const PLAN_SOURCES: { value: PlanSource; label: string; hint: string; icon: IconName }[] = [
  { value: "generate", label: "Generate it for me", hint: "The AI race team builds every week", icon: "sparkles" },
  { value: "import", label: "I have my own plan", hint: "Screenshot, PDF, CSV or text", icon: "upload" },
  { value: "later", label: "Decide later", hint: "Build the race kit first", icon: "clock" },
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
  const [planSource, setPlanSource] = useState<PlanSource>("generate");
  // A Strava route picked at setup becomes the course right after the race is created (training#19).
  const [stravaRoute, setStravaRoute] = useState<StravaRoute | null>(null);
  const [stravaOpen, setStravaOpen] = useState(false);
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

  // A new race starts from the athlete's About-you answers instead of asking twice (#4).
  const creating = !params.id;
  useEffect(() => {
    if (!creating) return;
    let active = true;
    api
      .getUserProfile()
      .then((profile) => {
        if (active) setForm((f) => withBaseline(f, profile));
      })
      .catch(() => undefined); // optional: the fields simply stay empty
    return () => {
      active = false;
    };
  }, [creating]);

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
      if (stravaRoute) {
        try {
          await courses.fromStrava(created.id, 0, stravaRoute.id);
        } catch {
          // The race exists; the course can be attached later in Race Lab.
        }
      }
      scroll.current?.scrollTo({ y: 0, animated: true });
      // An imported (or postponed) plan skips the generated one; the rest of the race kit still builds.
      void builder.build(created.id, planSource === "generate" ? undefined : BUILD_ORDER.filter((k) => k !== "plan"));
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
          {step === "race" && !editing ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Start from a Strava route" onPress={() => setStravaOpen(true)} style={({ pressed }) => [styles.stravaPick, pressed && { opacity: 0.85 }]}>
              <Icon name="route" size={18} color={C.text} />
              <View style={{ flex: 1 }}>
                <Text style={[ui(14, 700), { color: C.text }]}>{stravaRoute ? stravaRoute.name : "Start from a Strava route"}</Text>
                <Text style={[ui(12, 500), { color: C.textMuted }]}>
                  {stravaRoute ? `${km(stravaRoute.distance_km)} km · +${stravaRoute.elevation_gain_m} m — becomes the course` : "Fills distance and climbing, and attaches the course"}
                </Text>
              </View>
              <Icon name={stravaRoute ? "checkCircle" : "chevron"} size={18} color={stravaRoute ? C.accent : C.textDim} />
            </Pressable>
          ) : null}
          <StravaRoutesSheet
            visible={stravaOpen}
            onClose={() => setStravaOpen(false)}
            onPick={(route) => {
              setStravaRoute(route);
              setForm((f) => ({
                ...f,
                name: f.name.trim() ? f.name : route.name,
                distance: route.distance_km ? String(route.distance_km) : f.distance,
                elevation: route.elevation_gain_m ? String(route.elevation_gain_m) : f.elevation,
              }));
              setStravaOpen(false);
            }}
          />
          {step === "race" ? <RaceStep form={form} set={set} errors={errors} /> : null}
          {step === "demands" ? <DemandsStep form={form} set={set} errors={errors} /> : null}
          {step === "goal" ? <GoalStep form={form} set={set} errors={errors} /> : null}
          {step === "photo" ? <PhotoStep form={form} set={set} /> : null}
          {step === "prep" ? <PrepStep form={form} set={set} errors={errors} /> : null}
          {step === "review" ? (
            <View style={{ gap: 16 }}>
              {/* Once committed, the build is the news: progress first, the race card below. */}
              <BuildPanel states={builder.states} />
              {doneBuilding && planSource === "import" ? (
                <Button label="Import my plan" icon="upload" size="lg" onPress={() => router.replace("/(app)/plan-import")} />
              ) : null}
              {doneBuilding ? (
                <Button label="Open my Race Mission" iconRight="chevron" size="lg" kind={planSource === "import" ? "secondary" : "primary"} onPress={() => router.dismissTo("/(app)/home")} />
              ) : null}
              {!createdId && !editing ? (
                <View style={{ gap: 8 }}>
                  <Text style={[ui(13, 700), { color: C.textMuted }]}>Your training plan</Text>
                  <Choices options={PLAN_SOURCES} value={planSource} onChange={setPlanSource} />
                </View>
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
              label={editing ? "Save changes" : saving ? "Creating…" : planSource === "generate" ? "Commit & build my race plan" : "Commit & build my race kit"}
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

const styles = StyleSheet.create({
  stravaPick: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong },
  root: { flex: 1, backgroundColor: C.ink },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  progress: { flex: 1, flexDirection: "row", gap: 4 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.surface3 },
  layout: { flex: 1, width: "100%", maxWidth: 1180, alignSelf: "center" },
  previewCol: { width: 420, padding: 20 },
  formBody: { paddingHorizontal: 18, paddingTop: 12, gap: 16, maxWidth: 720, width: "100%" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: "rgba(8,9,11,0.94)", borderTopWidth: 1, borderTopColor: C.line },
});
