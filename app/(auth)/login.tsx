import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth-shell";
import { FormError, PrimaryButton, TextField } from "@/components/form";
import { Trail } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";
import { validateEmail, validatePassword } from "@/lib/validation";

export default function LoginScreen() {
  const { signIn, phase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (): Promise<void> => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(undefined);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Route guard redirects based on onboarding status.
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError("Email or password is incorrect.");
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
      title="Welcome back"
      subtitle="Return to your race mission, adaptive plan, and trail preparation."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to STREM?</Text>
          <Link href="/(auth)/register" style={styles.footerLink}>
            Create an account
          </Link>
        </View>
      }
    >
      <TextField
        label="Email"
        editable={phase !== "loading" && !submitting}
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
        editable={phase !== "loading" && !submitting}
        value={password}
        onChangeText={setPassword}
        errorText={passwordError}
        secureTextEntry
        textContentType="password"
        placeholder="Your password"
      />

      {formError ? <FormError message={formError} /> : null}

      <PrimaryButton label="Log in" onPress={onSubmit} loading={submitting} disabled={phase === "loading"} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    color: Trail.textMuted,
    fontSize: 14,
    lineHeight: 18,
  },
  footerLink: {
    color: Trail.lime,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
});
