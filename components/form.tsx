/**
 * Small, reusable form primitives styled with the STREM color tokens.
 * Used by the auth and onboarding screens to keep inputs consistent.
 */

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { Colors } from "@/constants/Colors";

interface TextFieldProps extends TextInputProps {
  label: string;
  errorText?: string;
}

export function TextField({ label, errorText, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, errorText ? styles.inputError : null, style]}
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
}

export function PrimaryButton({ label, onPress, loading, disabled }: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled) || Boolean(loading);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.buttonDisabled : null,
        pressed && !isDisabled ? styles.buttonPressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.background} />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message: string }) {
  return <Text style={styles.formError}>{message}</Text>;
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 6 },
  label: { color: Colors.textMuted, fontSize: 13, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: Colors.accentRed },
  errorText: { color: Colors.accentRed, fontSize: 12 },
  button: {
    backgroundColor: Colors.text,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: Colors.background, fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  formError: { color: Colors.accentRed, fontSize: 14, textAlign: "center" },
});
