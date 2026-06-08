import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/brand-logo";
import { Surface } from "@/components/ui/surface";
import { Colors, Spacing, Typography } from "@/constants/theme";

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

          <Surface variant="raised" style={styles.panel}>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </Surface>

          <View style={styles.footer}>{footer}</View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    width: "86%",
    maxWidth: 300,
    alignSelf: "center",
    gap: Spacing.xl,
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
    gap: Spacing.lg,
  },
  copy: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.title,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  footer: {
    alignItems: "center",
  },
});
