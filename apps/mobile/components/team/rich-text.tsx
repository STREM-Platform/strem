/** Minimal markdown for race-team replies: paragraphs, bullets, numbered lists, **bold**. */

import { Text, View } from "react-native";

import { C, ui } from "@/constants/theme";

function inline(text: string, base: object) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <Text key={i} style={[base, { fontFamily: "Saira_700Bold", color: C.text }]}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={i} style={base}>
        {part.replace(/^#+\s*/, "")}
      </Text>
    ),
  );
}

export function RichText({ text, color = C.text }: { text: string; color?: string }) {
  const base = { ...ui(15, 500), color, lineHeight: 23 };
  const blocks = text.split(/\n{2,}/);
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <View key={b} style={{ gap: 6 }}>
              {lines.map((line, i) => {
                const marker = line.match(/^\s*(\d+\.)/)?.[1] ?? "•";
                return (
                  <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={[base, { color: C.textMuted, minWidth: 16 }]}>{marker}</Text>
                    <Text style={[base, { flex: 1 }]}>{inline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ""), base)}</Text>
                  </View>
                );
              })}
            </View>
          );
        }
        return (
          <Text key={b} style={base}>
            {inline(lines.join("\n"), base)}
          </Text>
        );
      })}
    </View>
  );
}
