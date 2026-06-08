/** App-area screen frame: scrollable content above fixed bottom navigation. */

import { type ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/ui/surface";
import { Colors, Layout, Spacing, Typography } from "@/constants/theme";

interface AppScreenProps {
  children?: ReactNode;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function AppScreen({ children, loading, error, onRefresh }: AppScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(loading)}
              onRefresh={onRefresh}
              tintColor={Colors.text}
              colors={[Colors.accentGreenBright]}
            />
          ) : undefined
        }
      >
        {loading && !error ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.accentGreenBright} />
            <Text style={styles.loadingText}>Loading your proof...</Text>
          </View>
        ) : null}
        {error ? (
          <EmptyState title="This did not load" body={error} />
        ) : null}
        {children}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Layout.appBottomInset,
    gap: Spacing.xl,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
});
