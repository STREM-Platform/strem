import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RichText } from "@/components/team/rich-text";
import { Icon } from "@/components/ui/icon";
import { Body, Button, Card, Chip, EmptyState, ErrorBanner, IconButton, Notice, Overline, Row, Title, useLayout } from "@/components/ui/kit";
import { C, R, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { raceAi, type AIStatus, type ChatMessage, type Knowledge } from "@/lib/api/race";
import { useRace } from "@/lib/race/race-context";

const SUGGESTIONS = [
  "Am I on track for race day?",
  "What should I focus on this week?",
  "How should I pace the biggest climb?",
  "What should I eat the night before and on race morning?",
  "What am I most likely to get wrong on race day?",
  "What's missing from my preparation?",
];

export default function TeamScreen() {
  const race = useRace();
  const { mission } = race;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scroll = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!mission) return;
    setLoading(true);
    setError(null);
    try {
      const [history, know] = await Promise.all([raceAi.history(mission.id), raceAi.knowledge(mission.id).catch(() => null)]);
      setMessages(history.items);
      setStatus(history.ai);
      setKnowledge(know);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The race team is unreachable right now.");
    } finally {
      setLoading(false);
    }
  }, [mission]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const send = async (text: string) => {
    if (!mission || !text.trim() || sending) return;
    const question = text.trim();
    setSending(true);
    setError(null);
    const pending = pendingMessage(question);
    setMessages((m) => [...m, pending]);
    setInput("");
    try {
      const reply = await raceAi.chat(mission.id, question);
      if (!reply.available || !reply.message) {
        setMessages((m) => m.filter((x) => x.id !== pending.id));
        setInput(question);
        setStatus({ available: false, reason: reply.reason });
        return;
      }
      setMessages((m) => [...m.filter((x) => x.id !== pending.id), { ...pending, id: `${pending.id}-sent` }, reply.message as ChatMessage]);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setInput(question);
      setError(err instanceof ApiError ? err.message : "Your message wasn't sent. Retry.");
    } finally {
      setSending(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  if (!mission) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 18 }]}>
        <EmptyState icon="sparkles" title="Your race team needs a race" body="Start a Race Mission and your AI race team gets to work." action={<Button label="Start a Race Mission" onPress={() => router.push("/(app)/mission-setup")} />} />
      </View>
    );
  }

  const offline = status && !status.available;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + (wide ? 28 : 16), paddingHorizontal: wide ? 32 : 16, paddingBottom: 220 + insets.bottom }]} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <Row align="flex-start">
          <View style={{ flex: 1, gap: 6 }}>
            <Overline>Race team · {mission.event.name}</Overline>
            <Title size={38}>Ask your race team</Title>
          </View>
          {messages.length ? <IconButton icon="trash" label="Clear conversation" tone="surface" onPress={() => void raceAi.clearChat(mission.id).then(() => setMessages([]))} /> : null}
        </Row>
        <Row gap={8} wrap>
          {status ? (
            <Chip
              icon={status.available ? "sparkles" : "alert"}
              label={status.available ? `Online · ${status.model ?? "Claude"}` : "Offline"}
              color={status.available ? C.accent : C.warning}
              bg={status.available ? C.accentSoft : "rgba(250,178,25,0.1)"}
              border={status.available ? C.accentLine : "rgba(250,178,25,0.35)"}
            />
          ) : null}
          <Chip icon="lock" label="Sees only your STREM data" />
        </Row>
        {offline ? (
          <Notice icon="alert" tone="attention" title="The AI race team is offline" body={`${status?.reason ?? "The AI provider is unavailable."} Your plan and every Race Lab layer still work — built by the race engine from your data.`} />
        ) : null}
        {knowledge ? <KnowledgeCard knowledge={knowledge} missionId={mission.id} /> : null}
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
        {loading ? <ActivityIndicator color={C.textMuted} style={{ marginTop: 20 }} /> : null}
        {!loading && !messages.length ? (
          <Card pad={20} style={{ gap: 12 }}>
            <Body>Your race team reads your race, course, plan, every logged and imported session, check-ins, race history and every Race Lab layer — and answers with your numbers, not generic advice.</Body>
            <Text style={[ui(13, 700), { color: C.textMuted }]}>Try asking</Text>
            <View style={{ gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => void send(s)} disabled={Boolean(offline) || sending} style={({ pressed }) => [styles.suggestion, (pressed || offline) && { opacity: 0.6 }]}>
                  <Text style={[ui(14, 600), { color: C.text, flex: 1 }]}>{s}</Text>
                  <Icon name="send" size={16} color={C.textMuted} />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.user : styles.assistant]}>
            {m.role === "assistant" ? (
              <Row gap={6} style={{ marginBottom: 6 }}>
                <Icon name="sparkles" size={14} color={C.accent} />
                <Text style={[ui(12, 700), { color: C.textMuted }]}>Race team</Text>
              </Row>
            ) : null}
            {m.role === "assistant" ? <RichText text={m.content} /> : <Text style={[ui(15, 600), { color: C.ink, lineHeight: 22 }]}>{m.content}</Text>}
          </View>
        ))}
        {sending ? (
          <View style={[styles.bubble, styles.assistant]}>
            <Row gap={8}>
              <ActivityIndicator color={C.accent} />
              <Text style={[ui(14, 500), { color: C.textMuted }]}>Reading your race data…</Text>
            </Row>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.composer, { bottom: wide ? 16 : 96 + Math.max(insets.bottom, 10), left: wide ? 32 : 12, right: wide ? 32 : 12 }]}>
        <TextInput
          accessibilityLabel="Message your race team"
          value={input}
          onChangeText={setInput}
          placeholder={offline ? "AI race team offline" : "Ask about training, fueling, pacing, gear…"}
          placeholderTextColor={C.textDim}
          editable={!offline}
          multiline
          style={styles.input}
          onSubmitEditing={() => void send(input)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !input.trim() || Boolean(offline) || sending }}
          disabled={!input.trim() || Boolean(offline) || sending}
          onPress={() => void send(input)}
          style={({ pressed }) => [styles.send, (!input.trim() || offline) && { backgroundColor: C.surface3 }, pressed && { opacity: 0.8 }]}
        >
          <Icon name="send" size={20} color={input.trim() && !offline ? C.ink : C.textDim} sw={2.4} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function pendingMessage(content: string): ChatMessage {
  return { id: `pending-${Math.random().toString(36).slice(2)}`, role: "user", content, created_at: new Date().toISOString() };
}

function KnowledgeCard({ knowledge, missionId }: { knowledge: Knowledge; missionId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const rows = [
    { label: "Training (8 weeks)", value: knowledge.recent_sessions ? `${knowledge.recent_sessions} sessions · ${knowledge.recent_hours} h` : "nothing recorded" },
    { label: "Race history", value: knowledge.races_in_history ? `${knowledge.races_in_history} races` : knowledge.race_activities_found ? `${knowledge.race_activities_found} Strava races to import` : "none yet" },
    { label: "Course", value: knowledge.has_course ? "GPX loaded" : "no GPX" },
    { label: "Plan", value: knowledge.plan ? `v${knowledge.plan.version} (${knowledge.plan.origin === "ai" ? "AI" : "engine"})` : "not built" },
    { label: "Race Lab", value: `${Object.keys(knowledge.layers).length} of 4 layers` },
    { label: "Check-ins (3 weeks)", value: String(knowledge.checkins_recent) },
    { label: "Connected", value: knowledge.sources.map((s) => s.label).join(", ") || "no sources" },
  ];
  return (
    <Card pad={16} style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="database" size={16} color={C.textMuted} />
        <Text style={[ui(14, 700), { color: C.text, flex: 1 }]}>What your race team knows</Text>
        {knowledge.missing.length ? <Text style={[ui(12, 700), { color: C.warning }]}>{knowledge.missing.length} gaps</Text> : null}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} color={C.textMuted} />
      </Pressable>
      {open ? (
        <>
          {rows.map((r) => (
            <Row key={r.label}>
              <Text style={[ui(13, 500), { color: C.textMuted, flex: 1 }]}>{r.label}</Text>
              <Text style={[ui(13, 700), { color: C.text }]}>{r.value}</Text>
            </Row>
          ))}
          {knowledge.missing.length ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={[ui(13, 700), { color: C.textMuted }]}>Would make answers sharper</Text>
              <Row gap={8} wrap>
                {knowledge.missing.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    icon="plus"
                    color={C.text}
                    onPress={() =>
                      router.push(
                        m.startsWith("Course")
                          ? "/(app)/race?tab=course"
                          : m.startsWith("Race history")
                            ? "/(app)/history"
                            : m.startsWith("Connected")
                              ? "/(app)/integrations"
                              : m.startsWith("Body")
                                ? "/(app)/athlete"
                                : `/(app)/mission-setup?id=${missionId}`,
                      )
                    }
                  />
                ))}
              </Row>
            </View>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  content: { width: "100%", maxWidth: 900, alignSelf: "center", gap: 14 },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line },
  bubble: { maxWidth: "92%", padding: 14, borderRadius: R.lg },
  user: { alignSelf: "flex-end", backgroundColor: C.white, borderBottomRightRadius: 6 },
  assistant: { alignSelf: "flex-start", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 6 },
  composer: { position: "absolute", flexDirection: "row", alignItems: "flex-end", gap: 6, padding: 6, paddingLeft: 16, borderRadius: 26, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong, maxWidth: 900, alignSelf: "center" },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 11, color: C.text, ...ui(15, 500) },
});
