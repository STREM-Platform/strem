/**
 * AI capture — ported from `CaptureFlow` in `prototype/screens/screen-train-ai.jsx`.
 *
 * One agent capability, three inputs (D3/D4/D6): photo→workout, photo→meal,
 * voice→log. Real scanning → parsed → confirm states; "Log it" records the
 * capture as an agent action (so it's in the Activity feed and undoable). No
 * fabricated saved data — the confirm step is explicit.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Btn, Chip, IconTile, Panel } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { forge } from "@/lib/agent";
import type { CaptureData } from "@/lib/agent/types";

type Kind = "workout" | "food" | "voice";

export function CaptureFlow({
  data,
  kind,
  onClose,
  onStartLive,
}: {
  data: CaptureData;
  kind: Kind;
  onClose: () => void;
  /** Scanned-workout only: take the parsed workout into a guided live session. */
  onStartLive?: () => void;
}) {
  const c = data[kind];
  const meta = data.methods.find((m) => m.id === kind)!;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (step >= c.steps.length) {
      const t = setTimeout(() => setDone(true), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 850);
    return () => clearTimeout(t);
  }, [step, done, c.steps.length]);

  const r = c.result;
  const food = kind === "food" ? data.food.result : null;
  const workout = kind === "workout" ? data.workout.result : null;
  const voice = kind === "voice" ? data.voice.result : null;

  const logIt = () => {
    forge.logCapture(`Logged: ${r.title}`, r.note, [{ icon: meta.icon, text: meta.label }]);
    onClose();
  };

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <IconTile name={meta.icon} size={34} iconSize={17} />
          <Text style={styles.headTitle}>{meta.label.toUpperCase()}</Text>
        </View>
        <Btn kind="ghost" icon="plus" label="" onPress={onClose} style={styles.closeBtn} />
      </View>

      {/* source preview */}
      <View style={styles.preview}>
        {kind === "voice" ? (
          <View style={styles.voice}>
            <View style={styles.wave}>
              {[14, 26, 18, 34, 22, 30, 16, 28, 20].map((h, i) => (
                <View key={i} style={[styles.waveBar, { height: h, opacity: done ? 0.4 : 1 }]} />
              ))}
            </View>
            <Text style={styles.transcript}>{data.voice.transcript}</Text>
          </View>
        ) : (
          <View style={styles.photoSlot}>
            <Icon name="grid" size={30} color={T.sub} />
            <Text style={styles.photoSlotText}>Drop a {kind} photo</Text>
          </View>
        )}
        {!done ? <View style={styles.scanline} /> : null}
      </View>

      {!done ? (
        <View style={styles.steps}>
          {c.steps.map((s, i) => (
            <View key={i} style={[styles.stepRow, { opacity: i <= step ? 1 : 0.3 }]}>
              <View style={[styles.stepDot, { backgroundColor: i < step ? T.green : "transparent", borderColor: i < step ? T.green : T.line2 }]}>
                {i < step ? (
                  <Icon name="check" size={12} color="#06130D" sw={3} />
                ) : i === step ? (
                  <View style={styles.stepActive} />
                ) : null}
              </View>
              <Text style={[styles.stepText, { color: i <= step ? T.text : T.sub }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.result}>
          <View style={styles.resultBadge}>
            <Icon name="check" size={15} color={T.green} sw={3} />
            <Text style={styles.resultBadgeText}>PARSED · CONFIRM BELOW</Text>
          </View>

          <Panel pad={0} style={styles.resultPanel}>
            <View style={styles.resultTop}>
              <Text style={styles.resultTitle}>{r.title}</Text>
              {food ? <Chip label={`${food.cal} kcal`} /> : null}
            </View>

            {workout
              ? workout.items.map((it, i) => (
                  <View key={i} style={[styles.item, i < workout.items.length - 1 && styles.itemBorder]}>
                    <View style={styles.shrink}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemDetail}>{it.detail}</Text>
                    </View>
                    <Text style={[styles.itemNote, { color: it.note === "new" ? T.amber : T.green }]}>{it.note}</Text>
                  </View>
                ))
              : null}

            {food ? (
              <View style={styles.macros}>
                {[
                  { l: "PROTEIN", v: `${food.p}g` },
                  { l: "CARBS", v: `${food.c}g` },
                  { l: "FAT", v: `${food.f}g` },
                ].map((mac) => (
                  <View key={mac.l} style={styles.macro}>
                    <Text style={styles.macroV}>{mac.v}</Text>
                    <Text style={styles.macroL}>{mac.l}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {voice ? <Text style={styles.voiceDetail}>{voice.detail}</Text> : null}
          </Panel>

          <View style={styles.note}>
            <Icon name="bot" size={15} color={T.green} style={styles.noteIcon} />
            <Text style={styles.noteText}>{r.note}</Text>
          </View>

          {kind === "workout" && onStartLive ? (
            <View style={styles.resultActions}>
              <Btn kind="ghost" icon="check" label="Just log it" onPress={logIt} style={styles.editBtn} />
              <Btn kind="primary" icon="play" label="Start live session" onPress={onStartLive} style={styles.logItBtn} />
            </View>
          ) : (
            <View style={styles.resultActions}>
              <Btn kind="ghost" icon="edit" label="Edit" onPress={onClose} style={styles.editBtn} />
              <Btn kind="primary" icon="check" label="Log it" onPress={logIt} style={styles.logItBtn} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: "rgba(6,7,9,0.97)", paddingTop: 58, paddingHorizontal: 18, paddingBottom: 24 },
  shrink: { flexShrink: 1, flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  headTitle: { ...disp(18, 800), color: "#fff", letterSpacing: 0.4 },
  closeBtn: { width: 40, paddingHorizontal: 0 },

  preview: { height: 144, borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: T.line2, backgroundColor: T.surf2 },
  voice: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 18 },
  wave: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 36 },
  waveBar: { width: 4, borderRadius: 3, backgroundColor: T.green },
  transcript: { ...ui(14, 600), color: "#cdd3d8", textAlign: "center", fontStyle: "italic" },
  photoSlot: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  photoSlotText: { ...ui(13, 600), color: T.sub },
  scanline: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: T.green, boxShadow: "0px 0px 14px #34E2A0" },

  steps: { flex: 1 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, paddingHorizontal: 4 },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  stepActive: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.green },
  stepText: { ...ui(14, 600) },

  result: { flex: 1 },
  resultBadge: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  resultBadgeText: { ...mono(10, 700), letterSpacing: 1.4, color: T.green },
  resultPanel: { overflow: "hidden" },
  resultTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.line },
  resultTitle: { ...ui(16, 700), color: T.text },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 15 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: T.line },
  itemName: { ...ui(14, 600), color: T.text },
  itemDetail: { ...mono(9, 600), color: T.sub, marginTop: 1 },
  itemNote: { ...mono(9, 700), letterSpacing: 0.4 },
  macros: { flexDirection: "row", padding: 15, paddingVertical: 12, gap: 8 },
  macro: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: T.surf2, borderWidth: 1, borderColor: T.line },
  macroV: { ...disp(18, 800), color: T.text },
  macroL: { ...mono(7, 600), letterSpacing: 0.6, color: T.sub, marginTop: 2 },
  voiceDetail: { ...ui(14, 600), color: T.green, padding: 15, paddingVertical: 11 },

  note: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginVertical: 13, marginHorizontal: 2 },
  noteIcon: { marginTop: 2 },
  noteText: { ...ui(13.5, 500), color: "#cdd3d8", lineHeight: 20, flex: 1 },
  resultActions: { flexDirection: "row", gap: 10, marginTop: "auto" },
  editBtn: { flex: 1 },
  logItBtn: { flex: 1.6 },
});
