/**
 * Shared layout for an onboarding screen: progress dots, title/subtitle, the
 * scrollable body, an optional skip action, and a primary continue button.
 */

import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FormError, PrimaryButton } from "@/components/form";
import { Colors } from "@/constants/Colors";
import { ONBOARDING_ORDER } from "@/lib/onboarding";
import type { OnboardingScreen } from "@/lib/api/types";

interface OnboardingScaffoldProps {
  screen: OnboardingScreen;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  submitting?: boolean;
  onSkip?: () => void;
  errorText?: string;
}

export function OnboardingScaffold({
  screen,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  submitting,
  onSkip,
  errorText,
}: OnboardingScaffoldProps) {
  const stepIndex = ONBOARDING_ORDER.indexOf(screen);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.progress}>
        {ONBOARDING_ORDER.map((name, index) => (
          <View
            key={name}
            style={[styles.dot, index <= stepIndex ? styles.dotActive : null]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
        {errorText ? <FormError message={errorText} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={submitting}
        />
        {onSkip ? (
          <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progress: { flexDirection: "row", gap: 6, paddingHorizontal: 24, paddingTop: 16 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.accentGreen },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 14 },
  title: { color: Colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: Colors.textMuted, fontSize: 15, lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingBottom: 28, gap: 10 },
  skip: { alignItems: "center", paddingVertical: 8 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
