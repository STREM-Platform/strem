import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth-shell";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { Colors, Spacing } from "@/constants/theme";
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
      // Route guard sends the new user into onboarding.
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
    <AuthShell
      title="Begin your transformation"
      subtitle="Create the account, then define the identity your coach will build around."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Log in
          </Link>
        </View>
      }
    >
      <TextField
        label="Name"
        helperText="Optional"
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

      <PrimaryButton label="Create account" onPress={onSubmit} loading={submitting} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
  },
  footerLink: {
    color: Colors.accentGreenBright,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
});
