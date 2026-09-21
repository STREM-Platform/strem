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

import { Trail, mono, ui } from "@/constants/theme";

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
        accessibilityLabel={label}
        placeholderTextColor={Trail.textDim}
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
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
}: PrimaryButtonProps) {
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
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Trail.limeInk} />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
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
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    ...ui(13, 700),
    lineHeight: 18,
    color: Trail.textMuted,
  },
  helper: {
    ...mono(10, 600),
    lineHeight: 16,
    color: Trail.textDim,
  },
  input: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 54,
    backgroundColor: Trail.bgRaised,
    borderColor: Trail.line,
    borderWidth: 1,
    borderRadius: 14,
    color: Trail.text,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...ui(16, 500),
    lineHeight: 22,
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: "top",
  },
  inputFocused: {
    borderColor: Trail.lime,
    backgroundColor: Trail.panel,
  },
  inputError: {
    borderColor: Trail.orange,
    backgroundColor: Trail.orangeSoft,
  },
  errorText: {
    color: Trail.orange,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    alignSelf: "stretch",
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderWidth: 1,
    backgroundColor: Trail.lime,
    borderColor: Trail.lime,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: Trail.limeInk,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  formErrorBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Trail.orange,
    backgroundColor: Trail.orangeSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  formError: {
    color: Trail.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
