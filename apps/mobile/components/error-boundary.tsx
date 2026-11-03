import { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/kit";
import { C, disp, ui } from "@/constants/theme";
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
        <Button label="Try again" size="lg" onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.ink,
    padding: 24,
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  title: {
    ...disp(24, 800),
    color: C.text,
    lineHeight: 28,
    textAlign: "center",
  },
  body: {
    ...ui(15, 500),
    lineHeight: 22,
    color: C.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: 14,
    maxWidth: 320,
  },
});
