/** Building blocks of the agreement gate and policy pages (mobile#139). */

import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { Icon } from "@/components/ui/icon";
import { C, R, disp, ui } from "@/constants/theme";
import type { LegalDocumentType } from "@/lib/api/types";
import { inlineRuns, policyLink, type DocBlock } from "@/lib/legal-doc";
import { dayLabel } from "@/lib/race/format";

/** `2026-06-20` → `20 Jun 2026`; anything else is shown as written. */
export function policyDate(iso: string | undefined): string | null {
  if (!iso) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${dayLabel(iso, false)} ${iso.slice(0, 4)}` : iso;
}

/** A required consent: a large tap target with a real checkbox role. */
export function ConsentCheck({ checked, onToggle, label, detail }: { checked: boolean; onToggle: () => void; label: string; detail?: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={({ pressed }) => [styles.consent, checked && styles.consentOn, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Icon name="check" size={15} color={C.accentInk} sw={3} /> : null}</View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[ui(14, 600), { color: C.text, lineHeight: 20 }]}>{label}</Text>
        {detail ? <Text style={[ui(12.5, 500), { color: C.textMuted, lineHeight: 18 }]}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

function Runs({ text, base, onPolicy }: { text: string; base: object; onPolicy: (type: LegalDocumentType) => void }) {
  return (
    <>
      {inlineRuns(text).map((run, i) => {
        if (run.href) {
          const href = run.href;
          const policy = policyLink(href);
          return (
            <Text
              key={i}
              accessibilityRole="link"
              style={[base, styles.link]}
              onPress={() => (policy ? onPolicy(policy) : /^(https?:|mailto:)/.test(href) ? void Linking.openURL(href) : undefined)}
            >
              {run.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={[base, run.bold && { fontFamily: "Saira_700Bold", color: C.text }, run.italic && { fontStyle: "italic", color: C.textDim }]}>
            {run.text}
          </Text>
        );
      })}
    </>
  );
}

/** The policy body as a document: section headings, paragraphs, lists and callouts. */
export function PolicyBody({ blocks, onPolicy, onSection }: { blocks: DocBlock[]; onPolicy: (type: LegalDocumentType) => void; onSection?: (id: string, y: number) => void }) {
  const base = { ...ui(15, 500), color: C.textMuted, lineHeight: 24 };
  return (
    <View style={{ gap: 14 }}>
      {blocks.map((block, b) => {
        if (block.kind === "heading") {
          return (
            <Text
              key={b}
              accessibilityRole="header"
              onLayout={(e: LayoutChangeEvent) => onSection?.(block.id, e.nativeEvent.layout.y)}
              style={block.level === 2 ? styles.h2 : styles.h3}
            >
              {block.text}
            </Text>
          );
        }
        if (block.kind === "callout") {
          return (
            <View key={b} style={styles.callout}>
              <Text style={base}>
                <Runs text={block.text} base={base} onPolicy={onPolicy} />
              </Text>
            </View>
          );
        }
        if (block.kind === "list") {
          return (
            <View key={b} style={{ gap: 8 }}>
              {block.items.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10, paddingLeft: item.depth * 18 }}>
                  <Text style={[base, { color: C.textDim, minWidth: 14 }]}>{item.marker}</Text>
                  <Text style={[base, { flex: 1 }]}>
                    <Runs text={item.text} base={base} onPolicy={onPolicy} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={b} style={base}>
            <Runs text={block.text} base={base} onPolicy={onPolicy} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  consent: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  consentOn: { borderColor: C.accentLine, backgroundColor: "rgba(74,222,128,0.05)" },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: C.lineStrong, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  link: { color: C.text, textDecorationLine: "underline" },
  h2: { ...disp(21, 800), color: C.text, marginTop: 18, lineHeight: 25 },
  h3: { ...ui(16, 700), color: C.text, marginTop: 6 },
  callout: { padding: 14, borderRadius: R.md, backgroundColor: C.surface, borderLeftWidth: 3, borderLeftColor: C.accentLine },
});
