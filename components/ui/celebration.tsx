import { Modal, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/form";
import { StatusPill } from "@/components/ui/status-pill";
import { Colors, Radius, Shadows, Spacing, Typography } from "@/constants/theme";
import { rankUpLine, type ProgressionMoment } from "@/lib/progression";

/**
 * A focused, tasteful earned-state moment for a rank-up and/or new medals.
 * Shown once when progression advances; dismissible, never blocking.
 */
export function CelebrationOverlay({
  moment,
  onDismiss,
}: {
  moment: ProgressionMoment;
  onDismiss: () => void;
}) {
  const hasMedals = moment.newMedals.length > 0;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert">
          <StatusPill label="Earned" tone="green" />

          {moment.rankUp ? (
            <>
              <Text style={styles.title}>New rank · {moment.rankUp}</Text>
              <Text style={styles.coach}>{rankUpLine(moment.rankUp)}</Text>
            </>
          ) : (
            <Text style={styles.title}>{moment.newMedals.length === 1 ? "Medal earned" : "Medals earned"}</Text>
          )}

          {hasMedals ? (
            <View style={styles.medals}>
              {moment.newMedals.map((medal) => (
                <Text key={medal.medal_type} style={styles.medal}>
                  {medal.title}
                </Text>
              ))}
            </View>
          ) : null}

          <PrimaryButton label="Keep building" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
    backgroundColor: Colors.surfaceRaised,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.card,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  coach: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  medals: {
    gap: Spacing.xs,
  },
  medal: {
    color: Colors.accentGreenBright,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
});
