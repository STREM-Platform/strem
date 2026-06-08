/**
 * Shared form primitives for auth, onboarding, and app entry flows.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  errorText?: string;
  helperText?: string;
}

export function TextField({
  label,
  errorText,
  helperText,
  style,
  onBlur,
  onFocus,
  multiline,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={Colors.textSubtle}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          focused ? styles.inputFocused : null,
          errorText ? styles.inputError : null,
          style,
        ]}
        {...inputProps}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled) || Boolean(loading);
  const textVariant = variant === "primary" ? styles.buttonLabelPrimary : styles.buttonLabelSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? Colors.background : Colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, textVariant, variant === "danger" ? styles.buttonLabelDanger : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <View style={styles.formErrorBox}>
      <Text style={styles.formError}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  helper: {
    ...Typography.caption,
    color: Colors.textSubtle,
    fontWeight: "600",
  },
  input: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 54,
    backgroundColor: Colors.backgroundElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    lineHeight: 22,
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: "top",
  },
  inputFocused: {
    borderColor: Colors.accentGreenBright,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.accentRed,
    backgroundColor: Colors.accentRedSoft,
  },
  errorText: {
    color: Colors.accentRed,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    alignSelf: "stretch",
    width: "100%",
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: Colors.surfaceInverse,
    borderColor: Colors.surfaceInverse,
  },
  secondary: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.borderStrong,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.accentRedSoft,
    borderColor: Colors.accentRed,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  buttonLabelPrimary: {
    color: Colors.background,
  },
  buttonLabelSecondary: {
    color: Colors.text,
  },
  buttonLabelDanger: {
    color: Colors.accentRed,
  },
  formErrorBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.accentRed,
    backgroundColor: Colors.accentRedSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  formError: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
