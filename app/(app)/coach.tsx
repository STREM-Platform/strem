import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { PrototypeLabel, TrailPanel, TrailSectionHead, trailStyles } from "@/components/trail/trail-ui";
import { Icon } from "@/components/ui/icon";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { agentApi, type CoachReply } from "@/lib/api/agent";
import { TRAIL_MISSION_PREVIEW } from "@/lib/trail/mission-preview";

interface ChatMessage {
  role: "athlete" | "ai";
  text: string;
  cites?: CoachReply["cites"];
}

const PROMPTS = [
  "Why is downhill work the priority?",
  "What must I prove on Saturday?",
  "How should this change if I sleep badly?",
];

export default function RaceTeamScreen() {
  const insets = useSafeAreaInsets();
  const mission = TRAIL_MISSION_PREVIEW;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || sending) return;
    setMessages((current) => [...current, { role: "athlete", text }]);
    setInput("");
    setSending(true);
    try {
      const reply = await agentApi.chat(text);
      setMessages((current) => [...current, { role: "ai", text: reply.text, cites: reply.cites }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: "I could not reach the live AI service. The Race Mission prototype remains available, but I will not invent an answer without athlete context.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={trailStyles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[trailStyles.scroll, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PrototypeLabel />
        <View style={styles.titleRow}>
          <View style={styles.aiMark}>
            <Icon name="bot" size={23} color={Trail.lime} />
          </View>
          <View style={styles.flex}>
            <Text style={trailStyles.pageOverline}>ONE CONTEXT · ONE ACCOUNTABLE SYSTEM</Text>
            <Text style={trailStyles.pageTitle}>AI Race Team</Text>
          </View>
        </View>
        <Text style={trailStyles.pageSub}>It interprets your evidence for this race. Every decision must separate facts, assumptions and missing data.</Text>

        <TrailPanel accent>
          <View style={styles.decisionTop}>
            <View>
              <Text style={styles.decisionOverline}>TODAY’S RECOMMENDATION</Text>
              <Text style={styles.decisionTitle}>Protect Saturday. Build descending durability today.</Text>
            </View>
            <View style={styles.confidence}>
              <Text style={styles.confidenceValue}>68</Text>
              <Text style={styles.confidenceLabel}>CONFIDENCE</Text>
            </View>
          </View>
          <Text style={styles.decisionBody}>{mission.today.reason}</Text>
          <View style={styles.rule} />
          <Text style={styles.evidenceOverline}>EVIDENCE USED IN THIS PROTOTYPE</Text>
          {mission.decisionEvidence.map((evidence) => (
            <View key={evidence} style={styles.evidenceRow}>
              <View style={styles.evidenceDot} />
              <Text style={styles.evidenceText}>{evidence}</Text>
            </View>
          ))}
          <View style={styles.assumptionBox}>
            <Icon name="flag" size={14} color={Trail.orange} />
            <Text style={styles.assumptionText}>Assumption: the displayed course and athlete history are sample data until Race Mission contracts land.</Text>
          </View>
        </TrailPanel>

        <TrailSectionHead title="ASK THE RACE TEAM" label="LIVE ENDPOINT" icon="send" />
        <View style={styles.promptRow}>
          {PROMPTS.map((prompt) => (
            <Pressable key={prompt} onPress={() => void send(prompt)} style={styles.prompt}>
              <Text style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        {messages.length > 0 ? (
          <View style={styles.thread}>
            {messages.map((message, index) => (
              <View key={`${message.role}-${index}`} style={[styles.message, message.role === "athlete" ? styles.athleteMessage : styles.aiMessage]}>
                <Text style={styles.messageRole}>{message.role === "athlete" ? "YOU" : "STREM AI"}</Text>
                <Text style={styles.messageText}>{message.text}</Text>
                {message.cites?.length ? (
                  <View style={styles.cites}>
                    {message.cites.map((cite) => (
                      <View key={cite.text} style={styles.cite}>
                        <Icon name="bolt" size={11} color={Trail.lime} />
                        <Text style={styles.citeText}>{cite.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {sending ? (
              <View style={[styles.message, styles.aiMessage, styles.thinking]}>
                <ActivityIndicator size="small" color={Trail.lime} />
                <Text style={styles.thinkingText}>Grounding the answer in your available data…</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about the plan, race or evidence…"
            placeholderTextColor={Trail.textDim}
            style={styles.input}
            multiline
            editable={!sending}
          />
          <Pressable disabled={!input.trim() || sending} onPress={() => void send(input)} style={[styles.send, (!input.trim() || sending) && styles.sendDisabled]}>
            <Icon name="send" size={18} color={Trail.limeInk} />
          </Pressable>
        </View>

        <TrailPanel style={styles.boundaryPanel}>
          <Icon name="shield" size={18} color={Trail.sky} />
          <Text style={styles.boundaryText}>STREM supports preparation decisions. It does not diagnose injury, illness or nutritional conditions, and it must name uncertainty instead of pretending confidence.</Text>
        </TrailPanel>
      </ScrollView>
      <BottomNav />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiMark: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  decisionTop: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  decisionOverline: { ...mono(8, 700), color: Trail.lime, letterSpacing: 0.9 },
  decisionTitle: { ...disp(22, 800), color: Trail.text, lineHeight: 25, marginTop: 5, maxWidth: 245 },
  confidence: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 9, borderRadius: 12, backgroundColor: Trail.limeSoft },
  confidenceValue: { ...disp(22, 800), color: Trail.lime },
  confidenceLabel: { ...mono(6, 700), color: Trail.textDim, letterSpacing: 0.5 },
  decisionBody: { ...ui(12, 500), lineHeight: 18, color: Trail.textMuted, marginTop: 12 },
  rule: { height: 1, backgroundColor: Trail.line, marginVertical: 14 },
  evidenceOverline: { ...mono(8, 700), color: Trail.textDim, letterSpacing: 0.8, marginBottom: 6 },
  evidenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 7 },
  evidenceDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Trail.lime, marginTop: 6 },
  evidenceText: { flex: 1, ...ui(11, 500), lineHeight: 17, color: Trail.textMuted },
  assumptionBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 11, backgroundColor: Trail.orangeSoft, marginTop: 13 },
  assumptionText: { flex: 1, ...ui(9, 600), lineHeight: 14, color: Trail.orange },
  promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  prompt: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 11, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.lineStrong },
  promptText: { ...ui(10, 600), color: Trail.textMuted },
  thread: { gap: 10 },
  message: { padding: 13, borderRadius: 16, maxWidth: "92%", borderWidth: 1 },
  athleteMessage: { alignSelf: "flex-end", backgroundColor: Trail.limeSoft, borderColor: Trail.limeLine },
  aiMessage: { alignSelf: "flex-start", backgroundColor: Trail.panel, borderColor: Trail.line },
  messageRole: { ...mono(7, 700), color: Trail.lime, letterSpacing: 0.7, marginBottom: 5 },
  messageText: { ...ui(12, 500), lineHeight: 18, color: Trail.text },
  cites: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  cite: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 7, backgroundColor: Trail.limeSoft },
  citeText: { ...mono(7, 700), color: Trail.textMuted },
  thinking: { flexDirection: "row", alignItems: "center", gap: 9 },
  thinkingText: { ...ui(10, 600), color: Trail.textMuted },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, padding: 8, borderRadius: 17, backgroundColor: Trail.panel, borderWidth: 1, borderColor: Trail.lineStrong },
  input: { flex: 1, minHeight: 42, maxHeight: 110, ...ui(12, 500), color: Trail.text, paddingHorizontal: 8, paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: Trail.lime },
  sendDisabled: { opacity: 0.35 },
  boundaryPanel: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Trail.skySoft, borderColor: "rgba(120,199,214,0.25)" },
  boundaryText: { flex: 1, ...ui(10, 500), lineHeight: 16, color: Trail.textMuted },
});
