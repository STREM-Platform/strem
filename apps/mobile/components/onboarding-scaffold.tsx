/** Onboarding frame: atmosphere, segmented progress, one focused step. */

import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, ErrorBanner, IconButton, Overline, Wordmark, useLayout } from "@/components/ui/kit";
import { TopoArt } from "@/components/ui/photo";
import { C, disp, ui } from "@/constants/theme";
import type { OnboardingScreen } from "@/lib/api/types";
import { ONBOARDING_ORDER } from "@/lib/onboarding";

export function OnboardingScaffold({
  screen,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  submitting,
  errorText,
}: {
  screen: OnboardingScreen;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  submitting?: boolean;
  errorText?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const step = Math.max(0, ONBOARDING_ORDER.indexOf(screen));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <TopoArt seed={step + 4} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28, paddingHorizontal: wide ? 40 : 20 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          {step > 0 ? <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="glass" /> : <Wordmark size={14} />}
          <View style={styles.progress}>
            {ONBOARDING_ORDER.map((s, i) => (
              <View key={s} style={[styles.seg, i <= step && { backgroundColor: C.white }]} />
            ))}
          </View>
        </View>
        <View style={{ flex: 1, minHeight: 40 }} />
        <View style={{ gap: 12, maxWidth: 640 }}>
          <Overline>{step === 0 ? "Welcome" : "About you"}</Overline>
          <Text accessibilityRole="header" style={[disp(wide ? 64 : 46, 800), { color: C.text, lineHeight: wide ? 66 : 48 }]}>
            {title}
          </Text>
          {subtitle ? <Text style={[ui(16, 500), { color: C.textMuted, lineHeight: 24 }]}>{subtitle}</Text> : null}
        </View>
        {children ? <View style={{ gap: 16, marginTop: 24, maxWidth: 640 }}>{children}</View> : null}
        {errorText ? (
          <View style={{ marginTop: 16, maxWidth: 640 }}>
            <ErrorBanner message={errorText} />
          </View>
        ) : null}
        <Button label={primaryLabel} iconRight="chevron" size="lg" onPress={onPrimary} disabled={primaryDisabled} loading={submitting} style={{ marginTop: 28, maxWidth: 640, alignSelf: wide ? "flex-start" : "stretch", minWidth: 280 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  content: { flexGrow: 1, width: "100%", maxWidth: 1180, alignSelf: "center" },
  top: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 44 },
  progress: { flex: 1, flexDirection: "row", gap: 4, maxWidth: 220, marginLeft: "auto" },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.surface3 },
});
