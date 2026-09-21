/**
 * Trail-specific onboarding with segmented progress, an emblem, and one focused
 * decision per page. Submission behavior stays in `useOnboardingStep`; screen
 * metadata comes from `ONBOARDING_META`.
 */

import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, RadialGradient, Stop } from "react-native-svg";

import { FormError } from "@/components/form";
import { TrailAtmosphere } from "@/components/trail/trail-ui";
import { Icon, MountainMark, type IconName } from "@/components/ui/icon";
import { Btn } from "@/components/ui/primitives";
import { Trail, disp, mono, ui } from "@/constants/theme";
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
            <Stop offset="0%" stopColor={Trail.lime} />
            <Stop offset="100%" stopColor="#6FA93A" />
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
        <Icon name={icon} size={40} color={Trail.lime} />
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
      <TrailAtmosphere />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.shell}>
          <View style={styles.top}>
            <View style={styles.brandRow}>
              <View style={styles.brand}>
                <MountainMark size={20} />
                <View>
                  <Text style={styles.brandText}>STREM</Text>
                  <Text style={styles.brandSub}>MISSION CALIBRATION</Text>
                </View>
              </View>
              {onSkip && !last ? (
                <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skipButton}>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Trail.bg },
  container: { flex: 1 },
  shell: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center" },
  top: { paddingHorizontal: 22, paddingTop: 10, gap: 17 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { ...disp(14, 800), letterSpacing: 3.1, color: "#fff", lineHeight: 15 },
  brandSub: { ...mono(6, 700), letterSpacing: 1.2, color: Trail.lime, marginTop: 2 },
  skipButton: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: Trail.panelSoft },
  skip: { ...ui(12, 600), color: Trail.textDim },
  segRow: { flexDirection: "row", gap: 5 },
  seg: { flex: 1, height: 4, borderRadius: 4 },
  segOn: { backgroundColor: Trail.lime, boxShadow: "0px 0px 8px rgba(183,237,98,0.35)" },
  segOff: { backgroundColor: "rgba(255,255,255,0.1)" },

  body: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 32 },
  emblem: { width: 92, height: 102, alignItems: "center", justifyContent: "center" },
  emblemIcon: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  overline: { ...mono(10, 700), letterSpacing: 1.6, color: Trail.lime, marginTop: 22 },
  title: { ...disp(30, 800), color: "#fff", marginTop: 6, letterSpacing: 0.3, lineHeight: 32 },
  subtitle: { ...ui(15, 500), color: Trail.textMuted, marginTop: 10, lineHeight: 22 },
  fields: { marginTop: 22, gap: 14 },

  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 10, borderTopWidth: 1, borderTopColor: Trail.line },
  back: { width: 52 },
  primary: { flex: 1 },
});
