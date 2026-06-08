import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { FormError, PrimaryButton, TextField } from "@/components/form";
import { Colors } from "@/constants/Colors";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";
import { validateEmail, validatePassword } from "@/lib/validation";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password, MIN_PASSWORD_LENGTH);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(undefined);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim() || undefined);
      // On success, the route guard sends the new user into onboarding.
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError("An account with this email already exists.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>STREM</Text>
        <Text style={styles.title}>Begin your transformation</Text>

        <TextField
          label="Name (optional)"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Alex"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          errorText={emailError}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@strem.app"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          errorText={passwordError}
          secureTextEntry
          textContentType="newPassword"
          placeholder="At least 8 characters"
        />

        {formError ? <FormError message={formError} /> : null}

        <PrimaryButton label="Create Account" onPress={onSubmit} loading={submitting} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Log in
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  brand: { color: Colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 4 },
  title: { color: Colors.textMuted, fontSize: 16, marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  footerText: { color: Colors.textMuted, fontSize: 14 },
  footerLink: { color: Colors.accentGreen, fontSize: 14, fontWeight: "600" },
});
