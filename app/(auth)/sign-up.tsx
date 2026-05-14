import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/features/auth/AuthContext";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      router.replace("/(tabs)/report");
    } catch (error) {
      setMessage(friendlyError(error, "Could not create account. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.body}>Use any valid email to report items, review AI matches, and use masked chat.</Text>
      <TextField label="Display name" value={displayName} onChangeText={setDisplayName} />
      <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Button title="Create account" loading={loading} onPress={handleSubmit} />
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
});
