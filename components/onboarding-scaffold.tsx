/**
 * Shared onboarding layout: progress, identity-first heading, body, and fixed
 * actions. Per-screen submission behavior stays in `useOnboardingStep`.
 */

import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/brand-logo";
import { FormError, PrimaryButton } from "@/components/form";
import { SegmentedProgress } from "@/components/ui/progress";
import { Surface } from "@/components/ui/surface";
import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import type { OnboardingScreen } from "@/lib/api/types";
import { ONBOARDING_ORDER } from "@/lib/onboarding";

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.top}>
          <View style={styles.brandRow}>
            <BrandLogo variant="symbol" style={styles.brandMark} />
            <Text style={styles.step}>
              {stepIndex + 1}/{ONBOARDING_ORDER.length}
            </Text>
          </View>
          <SegmentedProgress total={ONBOARDING_ORDER.length} currentIndex={stepIndex} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Surface variant="raised" style={styles.hero}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </Surface>
          {children ? <View style={styles.fields}>{children}</View> : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  top: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
  },
  step: {
    ...Typography.caption,
    color: Colors.textSubtle,
    marginLeft: "auto",
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  hero: {
    borderRadius: Radius.xxl,
    gap: Spacing.md,
    ...Shadows.card,
  },
  title: {
    ...Typography.screenTitle,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.subtitle,
    color: Colors.textMuted,
  },
  fields: {
    gap: Spacing.lg,
  },
  footer: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  skip: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
});
