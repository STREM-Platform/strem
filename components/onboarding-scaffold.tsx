/**
 * Shared onboarding layout, re-skinned to the premium system (ported frame from
 * `design-spec/screen-onboarding.jsx`): brand + skip, segmented progress, a hex
 * emblem, mono overline + display title + body, and a back/continue footer.
 * Per-screen submission behavior stays in `useOnboardingStep`; the emblem and
 * overline come from `ONBOARDING_META`, so step screens need no changes.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, RadialGradient, Stop } from "react-native-svg";

import { FormError } from "@/components/form";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Btn } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import type { OnboardingScreen } from "@/lib/api/types";
import { ONBOARDING_META, ONBOARDING_ORDER } from "@/lib/onboarding";

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

function SegProgress({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.segRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, i <= step ? styles.segOn : styles.segOff]} />
      ))}
    </View>
  );
}

// Hex emblem (92×102) with the step icon, ported from `Emblem`.
const HEX_OUTER = "46,0 92,25.5 92,76.5 46,102 0,76.5 0,25.5";
const HEX_INNER = "46,5 87,28 87,74 46,97 5,74 5,28";

function Emblem({ icon }: { icon: IconName }) {
  return (
    <View style={styles.emblem}>
      <Svg width={92} height={102}>
        <Defs>
          <SvgLinearGradient id="ob-hex" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={T.green} />
            <Stop offset="100%" stopColor={T.greenD} />
          </SvgLinearGradient>
          <RadialGradient id="ob-core" cx="50%" cy="10%" r="120%">
            <Stop offset="0%" stopColor="#16201d" />
            <Stop offset="100%" stopColor="#0a0e0c" />
          </RadialGradient>
        </Defs>
        <Polygon points={HEX_OUTER} fill="url(#ob-hex)" />
        <Polygon points={HEX_INNER} fill="url(#ob-core)" />
      </Svg>
      <View style={styles.emblemIcon}>
        <Icon name={icon} size={40} color={T.green} />
      </View>
    </View>
  );
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
  const router = useRouter();
  const stepIndex = ONBOARDING_ORDER.indexOf(screen);
  const meta = ONBOARDING_META[screen];
  const last = stepIndex === ONBOARDING_ORDER.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#0f1a17", "#08090b"]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
      <MountainMark size={300} color="#9fb0a8" style={styles.watermark} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.top}>
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <MountainMark size={20} />
              <Text style={styles.brandText}>STREM</Text>
            </View>
            {onSkip && !last ? (
              <Pressable accessibilityRole="button" onPress={onSkip}>
                <Text style={styles.skip}>Skip</Text>
              </Pressable>
            ) : null}
          </View>
          <SegProgress step={stepIndex} total={ONBOARDING_ORDER.length} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Emblem icon={meta.emblem} />
          <Text style={styles.overline}>{meta.overline.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children ? <View style={styles.fields}>{children}</View> : null}
          {errorText ? <FormError message={errorText} /> : null}
        </ScrollView>

        <View style={styles.footer}>
          {stepIndex > 0 ? <Btn kind="ghost" icon="chevronL" label="" onPress={() => router.back()} style={styles.back} /> : null}
          <Btn kind="primary" full={stepIndex === 0} icon={last ? "star" : "chevron"} label={primaryLabel} onPress={onPrimary} style={stepIndex > 0 ? styles.primary : undefined} disabled={primaryDisabled} loading={submitting} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  watermark: { position: "absolute", top: 90, right: -90, opacity: 0.05 },
  container: { flex: 1 },
  top: { paddingHorizontal: 18, paddingTop: 6, gap: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { ...disp(12, 700), letterSpacing: 2.9, color: "#fff" },
  skip: { ...ui(12, 600), color: T.sub },
  segRow: { flexDirection: "row", gap: 5 },
  seg: { flex: 1, height: 4, borderRadius: 4 },
  segOn: { backgroundColor: T.green, boxShadow: "0px 0px 8px rgba(52,226,160,0.4)" },
  segOff: { backgroundColor: "rgba(255,255,255,0.1)" },

  body: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 32 },
  emblem: { width: 92, height: 102, alignItems: "center", justifyContent: "center" },
  emblemIcon: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  overline: { ...mono(10, 700), letterSpacing: 1.6, color: T.green, marginTop: 22 },
  title: { ...disp(30, 800), color: "#fff", marginTop: 6, letterSpacing: 0.3, lineHeight: 32 },
  subtitle: { ...ui(15, 500), color: T.mut, marginTop: 10, lineHeight: 22 },
  fields: { marginTop: 22, gap: 14 },

  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  back: { width: 52 },
  primary: { flex: 1 },
});
