/** App-area screen frame: scrollable content above a fixed bottom nav. */

import { type ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { BottomNav } from "@/components/bottom-nav";
import { Colors } from "@/constants/Colors";

interface AppScreenProps {
  children?: ReactNode;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function AppScreen({ children, loading, error, onRefresh }: AppScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(loading)} onRefresh={onRefresh} tintColor={Colors.text} />
          ) : undefined
        }
      >
        {loading && !error ? (
          <ActivityIndicator color={Colors.accentGreen} style={styles.spinner} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {children}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 24, gap: 18 },
  spinner: { marginTop: 40 },
  error: { color: Colors.accentRed, fontSize: 14 },
});
