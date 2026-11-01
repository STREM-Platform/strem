/**
 * Policy viewer — renders the canonical text of one legal document (Terms,
 * Privacy Policy, or Medical Disclaimer) from the bundled `constants/legal-docs`
 * as a readable document: dates, the plain-language summary, a table of
 * contents and section headings (mobile#139). Reached from the accept gate and
 * from the Privacy screen.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PolicyBody, policyDate } from "@/components/legal/legal-ui";
import { Icon } from "@/components/ui/icon";
import { Button, Card, Overline, Row, Title } from "@/components/ui/kit";
import { policyFor } from "@/constants/legal";
import { C, R, ui } from "@/constants/theme";
import type { LegalDocumentType } from "@/lib/api/types";
import { parsePolicy } from "@/lib/legal-doc";

const VALID: LegalDocumentType[] = ["terms", "privacy", "medical"];

export default function LegalDocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const type = (VALID.includes(doc as LegalDocumentType) ? doc : "terms") as LegalDocumentType;
  const policy = policyFor(type);
  const parsed = useMemo(() => parsePolicy(policy.body), [policy.body]);
  const scroller = useRef<ScrollView>(null);
  const bodyTop = useRef(0);
  const offsets = useRef<Record<string, number>>({});

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(app)/privacy"));
  const open = (next: LegalDocumentType) => router.push(`/(legal)/${next}`);
  const updated = policyDate(parsed.meta["Last-updated"] ?? policy.version);
  const effective = policyDate(parsed.meta.Effective);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={back} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="chevronL" size={20} color={C.textMuted} />
          <Text style={[ui(14, 600), { color: C.textMuted }]}>Back</Text>
        </Pressable>

        <View style={{ gap: 8, marginTop: 16 }}>
          <Overline>Legal · STREM</Overline>
          <Title size={30}>{policy.title}</Title>
          <Text style={[ui(13, 500), { color: C.textDim }]}>
            Version {policy.version}
            {effective && effective !== updated ? ` · Effective ${effective}` : ""}
            {updated ? ` · Updated ${updated}` : ""}
          </Text>
        </View>

        {parsed.summary ? (
          <Card tone="accent" pad={16} style={{ gap: 8, marginTop: 20 }}>
            <Row gap={8}>
              <Icon name={policy.icon} size={16} color={C.accent} />
              <Text style={[ui(13, 700), { color: C.text }]}>In plain words</Text>
            </Row>
            <PolicyBody blocks={[{ kind: "paragraph", text: parsed.summary }]} onPolicy={open} />
          </Card>
        ) : null}

        {parsed.sections.length >= 4 ? (
          <View style={styles.toc}>
            <Text style={[ui(13, 700), { color: C.text, marginBottom: 4 }]}>Contents</Text>
            {parsed.sections.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="link"
                onPress={() => scroller.current?.scrollTo({ y: Math.max(0, bodyTop.current + (offsets.current[s.id] ?? 0) - 12), animated: true })}
                style={({ pressed }) => [styles.tocRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ui(14, 500), { color: C.textMuted, flex: 1 }]}>{s.text}</Text>
                <Icon name="chevronDown" size={14} color={C.textDim} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 8 }} onLayout={(e) => (bodyTop.current = e.nativeEvent.layout.y)}>
          <PolicyBody blocks={parsed.blocks} onPolicy={open} onSection={(id, y) => (offsets.current[id] = y)} />
        </View>

        <View style={{ marginTop: 32 }}>
          <Button label="Back" kind="secondary" icon="chevronL" full onPress={back} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  scroll: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44 },
  toc: { marginTop: 20, padding: 16, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, gap: 2 },
  tocRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
});
