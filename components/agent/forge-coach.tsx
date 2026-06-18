/**
 * Forge coach surfaces — ported from `prototype/screens/screen-coach-ai.jsx`.
 * Three calls into the one agent over one context:
 *   ChatView     — B1/B6 omniscient, every answer cites the user's data.
 *   PlanView     — B4 adaptive missions + import-a-plan-from-image → adapt.
 *   InsightsView — B8 cross-domain correlations.
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CiteChips } from "@/components/agent/shared";
import { Icon } from "@/components/ui/icon";
import { Btn, Chip, IconTile, Panel } from "@/components/ui/primitives";
import { Ring } from "@/components/ui/ring";
import { T, disp, mono, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import type { AdaptivePlan, CoachConversation, CoachMessage, Insight, PlanImport } from "@/lib/agent/types";
import { useAsync } from "@/lib/use-async";

// ── Mode 1: Chat ─────────────────────────────────────────────────────────────
function CoachBubble({ m }: { m: CoachMessage }) {
  return (
    <View style={styles.coachRow}>
      <View style={styles.avatar}>
        <Icon name="bot" size={16} color={T.green} />
      </View>
      <View style={styles.coachBubble}>
        <Text style={styles.coachText}>{m.text}</Text>
        <CiteChips cites={m.cites} />
      </View>
    </View>
  );
}

function YouBubble({ m }: { m: CoachMessage }) {
  return (
    <View style={styles.youRow}>
      <View style={styles.youBubble}>
        <Text style={styles.youText}>{m.text}</Text>
      </View>
    </View>
  );
}

function Typing() {
  return (
    <View style={styles.coachRow}>
      <View style={styles.avatar}>
        <Icon name="bot" size={16} color={T.green} />
      </View>
      <View style={styles.typing}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.typingDot} />
        ))}
      </View>
    </View>
  );
}

export function ChatView() {
  const { data: C } = useAsync<CoachConversation>(forge.getCoachConversation);
  const [thread, setThread] = useState<CoachMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the opener once the async conversation loads.
    if (C && thread.length === 0) setThread([{ role: "coach", text: C.opener.text, cites: C.opener.cites }]);
  }, [C, thread.length]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [thread, typing]);

  if (!C) return null;
  const remaining = C.prompts.filter((p) => !asked.includes(p.q));

  const ask = (q: string, a: string, cites: CoachMessage["cites"]) => {
    if (typing) return;
    setAsked((s) => [...s, q]);
    setThread((t) => [...t, { role: "you", text: q }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setThread((t) => [...t, { role: "coach", text: a, cites }]);
    }, 1100);
  };

  return (
    <View style={styles.flex}>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.threadContent} showsVerticalScrollIndicator={false}>
        {thread.map((m, i) => (m.role === "coach" ? <CoachBubble key={i} m={m} /> : <YouBubble key={i} m={m} />))}
        {typing ? <Typing /> : null}
      </ScrollView>
      <View style={styles.composer}>
        {remaining.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>
            {remaining.map((p) => (
              <Pressable key={p.q} onPress={() => ask(p.q, p.a, p.cites)} style={styles.prompt}>
                <Text style={styles.promptText}>{p.q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.inputBar}>
          <Text style={styles.inputPlaceholder}>{remaining.length ? "Ask Forge anything…" : "Forge has the full picture."}</Text>
          <View style={styles.send}>
            <Icon name="send" size={18} color="#06130D" />
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Markdown renderer — clean styled plan from imported text ──────────────────
function MdInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={styles.mdBold}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

function MarkdownPlan({ md }: { md: string }) {
  return (
    <View style={{ gap: 2 }}>
      {md.split("\n").map((raw, i) => {
        const changed = raw.startsWith("~");
        const line = changed ? raw.slice(1).trim() : raw;
        if (line === "") return <View key={i} style={{ height: 6 }} />;
        if (line.startsWith("# "))
          return (
            <Text key={i} style={styles.mdH1}>
              {line.slice(2)}
            </Text>
          );
        if (line.startsWith("## "))
          return (
            <View key={i} style={styles.mdH2}>
              <Icon name="clock" size={12} color={T.green} />
              <Text style={styles.mdH2Text}>{line.slice(3).toUpperCase()}</Text>
            </View>
          );
        if (line.startsWith("- "))
          return (
            <View key={i} style={[styles.mdLi, changed && styles.mdLiChanged]}>
              <View style={[styles.mdBullet, { backgroundColor: changed ? T.green : T.sub }]} />
              <Text style={[styles.mdLiText, { color: changed ? "#dfe4e3" : "#c4cacd" }]}>
                <MdInline text={line.slice(2)} />
              </Text>
            </View>
          );
        return (
          <Text key={i} style={styles.mdPlain}>
            <MdInline text={line} />
          </Text>
        );
      })}
    </View>
  );
}

// ── Import a plan from an image → markdown → adapt ────────────────────────────
function PlanImportView({ onBack }: { onBack: () => void }) {
  const { data: P } = useAsync<PlanImport>(forge.getPlanImport);
  const [state, setState] = useState<"intro" | "scanning" | "imported" | "adapting" | "adapted">("intro");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (state !== "scanning" || !P) return;
    if (step < P.steps.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 850);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setState("imported"), 300);
    return () => clearTimeout(t);
  }, [state, step, P]);

  if (!P) return null;

  const adapt = () => {
    setState("adapting");
    setTimeout(() => setState("adapted"), 1500);
  };
  const use = () => {
    forge.importPlanFromImage("Imported & adapted a plan from a photo", P.adaptNote, P.changes.map((c) => ({ icon: c.icon, text: c.t.split(" — ")[0] })));
    onBack();
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.importScroll} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={styles.back}>
        <Icon name="chevronL" size={18} color={T.mut} />
        <Text style={styles.backText}>Plan</Text>
      </Pressable>

      {state === "intro" ? (
        <View style={styles.introCol}>
          <View style={styles.dropZone}>
            <IconTile name="grid" size={52} iconSize={26} />
            <Text style={styles.dropText}>Photo · screenshot · PDF</Text>
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>IMPORT ANY PLAN</Text>
            <Text style={styles.introBody}>
              Snap a coach’s plan, a screenshot, a scribbled notebook — Forge turns it into a clean plan, then tunes it to your week.
            </Text>
          </View>
          <Btn kind="primary" icon="grid" label="Import from photo" onPress={() => { setStep(0); setState("scanning"); }} />
        </View>
      ) : null}

      {state === "scanning" ? (
        <View style={styles.scanCol}>
          <View style={styles.scanBox}>
            <View style={styles.scanLines}>
              {[80, 55, 70, 45, 62, 50, 68].map((w, i) => (
                <View key={i} style={{ height: i === 0 ? 12 : 7, width: `${w}%`, borderRadius: 4, backgroundColor: i === 0 ? T.greenLine : T.line2 }} />
              ))}
            </View>
            <View style={styles.scanlineBar} />
          </View>
          {P.steps.map((s, i) => {
            const active = step === i;
            const complete = step > i;
            return (
              <View key={i} style={[styles.stepRow, { opacity: complete || active ? 1 : 0.35 }]}>
                <View style={[styles.stepDot, { backgroundColor: complete ? T.green : "transparent", borderColor: complete || active ? T.green : T.line2 }]}>
                  {complete ? <Icon name="check" size={12} color="#06130D" sw={3} /> : active ? <View style={styles.stepActive} /> : null}
                </View>
                <Text style={[styles.stepText, { color: complete ? T.mut : T.text }]}>{s}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {state === "imported" || state === "adapting" ? (
        <View>
          <View style={styles.parsedBadge}>
            <Icon name="check" size={15} color={T.green} sw={3} />
            <Text style={styles.parsedText}>PARSED FROM {P.fileName.toUpperCase()}</Text>
          </View>
          <Panel pad={16} style={styles.planPanel}>
            <MarkdownPlan md={P.imported} />
          </Panel>
          {state === "adapting" ? (
            <View style={styles.tuning}>
              <Ring size={20} stroke={2} pct={0.7} color={T.green} />
              <Text style={styles.tuningText}>Tuning it to your week…</Text>
            </View>
          ) : (
            <Btn kind="primary" full icon="sparkles" label="Adapt to my week" onPress={adapt} />
          )}
        </View>
      ) : null}

      {state === "adapted" ? (
        <View>
          <Panel accent={T.greenLine} pad={13} style={styles.adaptNote}>
            <View style={styles.adaptNoteRow}>
              <IconTile name="bot" size={34} iconSize={18} />
              <Text style={styles.adaptNoteText}>
                <Text style={styles.forgeName}>Forge: </Text>
                {P.adaptNote}
              </Text>
            </View>
          </Panel>
          <View style={styles.changes}>
            {P.changes.map((c, i) => (
              <View key={i} style={styles.change}>
                <Icon name={c.icon} size={14} color={T.green} />
                <Text style={styles.changeText}>{c.t}</Text>
              </View>
            ))}
          </View>
          <Panel pad={16} accent={T.greenLine} style={styles.planPanel}>
            <MarkdownPlan md={P.adapted} />
          </Panel>
          <View style={styles.adaptActions}>
            <Btn kind="ghost" icon="refresh" label="Original" onPress={() => setState("imported")} style={styles.flexOne} />
            <Btn kind="primary" icon="check" label="Use this plan" onPress={use} style={styles.flexTwo} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Mode 2: Plan — adaptive mission generation ───────────────────────────────
export function PlanView() {
  const [view, setView] = useState<"menu" | "import">("menu");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [plan, setPlan] = useState<AdaptivePlan | null>(null);
  const [accepted, setAccepted] = useState<number[]>([]);

  if (view === "import") return <PlanImportView onBack={() => setView("menu")} />;

  const gen = async () => {
    setState("loading");
    const p = await forge.generateAdaptivePlan();
    setPlan(p);
    setState("done");
  };

  const accept = (i: number, title: string, why: string) => {
    setAccepted((a) => [...a, i]);
    forge.generateMissions(`Added mission: ${title}`, why, [{ icon: "target", text: "Goal: Hybrid" }]);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.planScroll} showsVerticalScrollIndicator={false}>
      {state === "idle" ? (
        <View style={styles.menuCol}>
          <Panel raised accent={T.greenLine} pad={0} style={styles.menuCard}>
            <Pressable onPress={() => setView("import")} style={styles.menuInner}>
              <View style={styles.menuRow}>
                <IconTile name="grid" size={46} iconSize={23} />
                <View style={styles.shrink}>
                  <Text style={styles.menuEyebrow}>IMPORT FROM IMAGE</Text>
                  <Text style={styles.menuTitle}>BRING YOUR OWN PLAN</Text>
                </View>
                <Icon name="chevron" size={18} color={T.sub} />
              </View>
              <Text style={styles.menuBody}>Photo, screenshot or PDF → a clean plan in seconds. Then Forge tunes it to your readiness, goal and week.</Text>
            </Pressable>
          </Panel>

          <Panel pad={0} style={styles.menuCard}>
            <Pressable onPress={gen} style={styles.menuRow2}>
              <IconTile name="sparkles" size={46} iconSize={23} bg={T.surf2} border={T.line} color={T.sub} />
              <View style={styles.shrink}>
                <Text style={[styles.menuEyebrow, { color: T.sub }]}>GENERATE FRESH</Text>
                <Text style={[styles.menuTitle, { color: T.text }]}>BUILD ME A WEEK</Text>
                <Text style={styles.menuBody2}>No plan yet? Forge writes one from your last 4 weeks, your Hybrid goal and your calendar.</Text>
              </View>
            </Pressable>
          </Panel>
        </View>
      ) : null}

      {state === "loading" ? (
        <View style={styles.loading}>
          <Ring size={92} stroke={9} pct={0.7} color={T.green}>
            <Icon name="sparkles" size={30} color={T.green} />
          </Ring>
          {["Reading 4 weeks of training…", "Weighing readiness & goal…", "Writing your missions…"].map((s, i) => (
            <Text key={i} style={[styles.loadingText, { color: i === 2 ? T.text : T.sub }]}>
              {s}
            </Text>
          ))}
        </View>
      ) : null}

      {state === "done" && plan ? (
        <View style={styles.doneCol}>
          <Panel accent={T.greenLine} pad={12} style={styles.reason}>
            <Text style={styles.reasonText}>
              <Text style={styles.forgeName}>Forge: </Text>
              {plan.reason}
            </Text>
          </Panel>
          {plan.missions.map((m, i) => {
            const tone = m.tone === "red" ? T.red : m.tone === "amber" ? T.amber : T.green;
            const soft = m.tone === "amber" ? T.amberSoft : m.tone === "red" ? T.redSoft : T.greenSoft;
            const line = m.tone === "amber" ? T.amberLine : m.tone === "red" ? T.redLine : T.greenLine;
            const on = accepted.includes(i);
            return (
              <Panel key={i} pad={14} accent={on ? line : T.line} style={styles.mission}>
                <View style={styles.missionHead}>
                  <IconTile name={m.icon} size={42} iconSize={20} color={tone} bg={soft} border={line} />
                  <View style={styles.shrink}>
                    <Text style={styles.missionTitle}>{m.title}</Text>
                    <Text style={styles.missionMeta}>
                      {m.days} DAYS · +{m.xp} XP
                    </Text>
                  </View>
                </View>
                <Text style={styles.missionWhy}>
                  <Text style={[styles.missionWhyLabel, { color: tone }]}>WHY · </Text>
                  {m.why}
                </Text>
                {on ? (
                  <View style={styles.onBoard}>
                    <Icon name="check" size={15} color={T.green} sw={3} />
                    <Text style={styles.onBoardText}>On your board</Text>
                  </View>
                ) : (
                  <View style={styles.missionActions}>
                    <Btn kind="ghost" icon="refresh" label="Swap" style={styles.flexOne} />
                    <Btn kind="primary" icon="check" label="Accept" onPress={() => accept(i, m.title, m.why)} style={styles.flexTwo} />
                  </View>
                )}
              </Panel>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Mode 3: Insights ─────────────────────────────────────────────────────────
export function InsightsView() {
  const { data } = useAsync<Insight[]>(forge.getInsights);
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.insightsScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.insightsIntro}>
        Patterns Forge found by cross-referencing your training, sleep and fuel — things no single screen could show you.
      </Text>
      {(data ?? []).map((it, i) => {
        const tone = it.tone === "amber" ? T.amber : T.green;
        const soft = it.tone === "amber" ? T.amberSoft : T.greenSoft;
        const line = it.tone === "amber" ? T.amberLine : T.greenLine;
        return (
          <Panel key={i} raised pad={15} accent={line} style={styles.insight}>
            <View style={styles.insightHead}>
              <IconTile name={it.icon} size={38} iconSize={19} color={tone} bg={soft} border={line} />
              <Text style={styles.insightTitle}>{it.title}</Text>
            </View>
            <Text style={styles.insightBody}>{it.body}</Text>
            <View style={styles.insightChip}>
              <Chip label={`◇ ${it.chip}`} color={tone} bg={soft} border={line} iconFill={false} />
            </View>
          </Panel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1, flex: 1 },
  flexOne: { flex: 1 },
  flexTwo: { flex: 2 },
  forgeName: { ...ui(13.5, 700), color: T.green },

  // chat
  threadContent: { paddingVertical: 16, gap: 14 },
  coachRow: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginHorizontal: 16 },
  avatar: { width: 30, height: 30, borderRadius: 9, marginTop: 2, backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine, alignItems: "center", justifyContent: "center" },
  coachBubble: { flex: 1, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line, borderRadius: 14, borderTopLeftRadius: 4, padding: 11, paddingHorizontal: 13 },
  coachText: { ...ui(14, 500), color: "#dfe4e3", lineHeight: 21 },
  youRow: { flexDirection: "row", justifyContent: "flex-end", marginHorizontal: 16 },
  youBubble: { maxWidth: "78%", backgroundColor: T.green, borderRadius: 14, borderTopRightRadius: 4, paddingVertical: 10, paddingHorizontal: 13 },
  youText: { ...ui(14, 600), color: "#06130D", lineHeight: 20 },
  typing: { flexDirection: "row", gap: 4, padding: 12, paddingHorizontal: 14, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line, borderRadius: 14, borderTopLeftRadius: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.green },
  composer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: "rgba(13,16,21,0.9)" },
  promptRow: { gap: 7, paddingBottom: 10 },
  prompt: { backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line2, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 13 },
  promptText: { ...ui(12.5, 600), color: T.text },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 15, padding: 5, borderRadius: 15, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line2 },
  inputPlaceholder: { flex: 1, ...ui(13.5, 500), color: T.sub },
  send: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: T.green },

  // markdown
  mdBold: { ...ui(13.5, 700), color: T.text },
  mdH1: { ...disp(22, 800), color: "#fff", lineHeight: 24 },
  mdH2: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 7, marginTop: 12, marginBottom: 4, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 8, backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line2 },
  mdH2Text: { ...mono(11, 700), letterSpacing: 0.8, color: T.text },
  mdLi: { flexDirection: "row", gap: 9, alignItems: "flex-start", paddingVertical: 4, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "transparent" },
  mdLiChanged: { borderLeftColor: T.green, backgroundColor: "rgba(52,226,160,0.06)", borderRadius: 6 },
  mdBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  mdLiText: { ...ui(13.5, 500), lineHeight: 20, flex: 1 },
  mdPlain: { ...ui(12.5, 500), color: T.sub, lineHeight: 18 },

  // plan import
  importScroll: { padding: 16, paddingTop: 14, paddingBottom: 28 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backText: { ...ui(13, 600), color: T.mut },
  introCol: { alignItems: "center", gap: 18, paddingTop: 12 },
  dropZone: { width: "100%", height: 184, borderRadius: 16, borderWidth: 1, borderColor: T.line2, borderStyle: "dashed", backgroundColor: T.surf2, alignItems: "center", justifyContent: "center", gap: 10 },
  dropText: { ...ui(13, 600), color: T.sub },
  introCopy: { alignItems: "center" },
  introTitle: { ...disp(24, 800), color: "#fff" },
  introBody: { ...ui(13.5, 500), color: T.mut, marginTop: 6, lineHeight: 20, textAlign: "center", maxWidth: 310 },
  scanCol: { gap: 14, paddingTop: 6 },
  scanBox: { width: "100%", height: 200, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: T.line2, backgroundColor: "#0c0f13" },
  scanLines: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: 18, gap: 8, opacity: 0.5 },
  scanlineBar: { position: "absolute", left: 0, right: 0, top: 0, height: 2, backgroundColor: T.green, boxShadow: "0px 0px 12px #34E2A0" },
  parsedBadge: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  parsedText: { ...mono(10, 700), letterSpacing: 1, color: T.green },
  planPanel: { marginBottom: 14 },
  tuning: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, padding: 14 },
  tuningText: { ...ui(13.5, 700), color: T.text },
  adaptNote: { backgroundColor: "rgba(52,226,160,0.05)", marginBottom: 14 },
  adaptNoteRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  adaptNoteText: { ...ui(13.5, 500), color: "#dfe4e3", lineHeight: 20, flex: 1 },
  changes: { gap: 7, marginBottom: 14 },
  change: { flexDirection: "row", gap: 9, alignItems: "center", paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, backgroundColor: T.surf, borderWidth: 1, borderColor: T.line },
  changeText: { ...ui(12.5, 500), color: "#cdd3d8", lineHeight: 18, flex: 1 },
  adaptActions: { flexDirection: "row", gap: 10 },

  // step rows (shared by scan)
  stepRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 8 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  stepActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.green },
  stepText: { ...ui(13.5, 600) },

  // plan menu
  planScroll: { padding: 16, paddingBottom: 28 },
  menuCol: { gap: 12, paddingTop: 4 },
  menuCard: { overflow: "hidden" },
  menuInner: { padding: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuRow2: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  menuEyebrow: { ...mono(9, 700), letterSpacing: 1, color: T.green },
  menuTitle: { ...disp(20, 800), color: "#fff", marginTop: 3, lineHeight: 21 },
  menuBody: { ...ui(13, 500), color: T.mut, lineHeight: 18, marginTop: 11 },
  menuBody2: { ...ui(12.5, 500), color: T.mut, lineHeight: 17, marginTop: 5 },
  loading: { alignItems: "center", gap: 16, paddingTop: 50 },
  loadingText: { ...ui(13.5, 600) },
  doneCol: { gap: 12 },
  reason: { backgroundColor: "rgba(52,226,160,0.05)" },
  reasonText: { ...ui(13.5, 500), color: "#cdd3d8", lineHeight: 19 },
  mission: {},
  missionHead: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  missionTitle: { ...ui(15.5, 700), color: T.text },
  missionMeta: { ...mono(9, 700), letterSpacing: 0.6, color: T.sub, marginTop: 2 },
  missionWhy: { ...ui(13, 500), color: T.mut, lineHeight: 19, marginBottom: 12 },
  missionWhyLabel: { ...mono(9, 700), letterSpacing: 0.6 },
  onBoard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11, borderRadius: 11, backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.greenLine },
  onBoardText: { ...ui(13.5, 700), color: T.green },
  missionActions: { flexDirection: "row", gap: 9 },

  // insights
  insightsScroll: { padding: 16, paddingBottom: 28, gap: 12 },
  insightsIntro: { ...ui(13, 500), color: T.mut, lineHeight: 20, marginBottom: 2 },
  insight: {},
  insightHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  insightTitle: { ...disp(18, 800), color: "#fff", flex: 1 },
  insightBody: { ...ui(14, 500), color: "#cdd3d8", lineHeight: 21 },
  insightChip: { marginTop: 11 },
});
