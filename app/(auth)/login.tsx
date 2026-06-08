import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { FormError, PrimaryButton, TextField } from "@/components/form";
import { Colors } from "@/constants/Colors";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";
import { validateEmail, validatePassword } from "@/lib/validation";

export default function LoginScreen() {
  const { signIn } = useAuth();
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
      // On success, the route guard redirects based on onboarding status.
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>STREM</Text>
        <Text style={styles.title}>Welcome back</Text>

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
          textContentType="password"
          placeholder="Your password"
        />

        {formError ? <FormError message={formError} /> : null}

        <PrimaryButton label="Log In" onPress={onSubmit} loading={submitting} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to STREM?</Text>
          <Link href="/(auth)/register" style={styles.footerLink}>
            Create an account
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
