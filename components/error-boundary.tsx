import { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { PrimaryButton } from "@/components/form";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { captureError } from "@/lib/monitoring";

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-wide error boundary: catches render errors, reports them (PII-scrubbed),
 * and shows a calm recovery screen instead of a blank crash.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    captureError(error, { context: "render", fatal: true });
  }

  private readonly reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.container}>
        <BrandLogo variant="symbol" style={styles.logo} />
        <Text style={styles.title}>Something went sideways</Text>
        <Text style={styles.body}>
          That is on us, not you. Try again — your progress is safe.
        </Text>
        <PrimaryButton label="Try again" onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  body: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.md,
    maxWidth: 320,
  },
});
