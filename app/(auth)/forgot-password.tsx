import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/features/auth/AuthContext";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);
    setSuccess(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess("Password reset instructions were sent to your campus email.");
    } catch (error) {
      setMessage(friendlyError(error, "Could not send reset email. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.body}>Enter your email and we will send reset instructions.</Text>
      <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Button title="Send reset email" loading={loading} onPress={handleSubmit} />
      <Button title="Back to sign in" variant="ghost" onPress={() => router.replace("/(auth)/sign-in")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 32,
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderColor: "#f8b4ae",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  success: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
});
