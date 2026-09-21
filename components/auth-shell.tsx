import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/brand-logo";
import { Trail, disp, ui } from "@/constants/theme";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.brandBlock}>
            <BrandLogo style={styles.logo} />
          </View>

          <View style={styles.panel}>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>

          <View style={styles.footer}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Trail.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    width: "86%",
    maxWidth: 300,
    alignSelf: "center",
    gap: 24,
  },
  brandBlock: {
    alignItems: "flex-start",
  },
  logo: {
    width: 170,
    height: 170,
  },
  panel: {
    alignSelf: "stretch",
    gap: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: Trail.panelRaised,
    borderWidth: 1,
    borderColor: Trail.lineStrong,
    boxShadow: "0px 14px 24px rgba(0, 0, 0, 0.26)",
  },
  copy: {
    gap: 6,
  },
  title: {
    ...disp(24, 800),
    lineHeight: 29,
    color: Trail.text,
  },
  subtitle: {
    ...ui(15, 500),
    lineHeight: 22,
    color: Trail.textMuted,
  },
  footer: {
    alignItems: "center",
  },
});
