import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/features/auth/AuthContext";
import { isFirebaseConfigured } from "@/firebase/config";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setMessage(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)/report");
    } catch (error) {
      setMessage(friendlyError(error, "Could not sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>AI Amana</Text>
        <Text style={styles.title}>Campus lost and found, matched with care.</Text>
        <Text style={styles.body}>Report items, review possible AI matches, and coordinate through masked chat.</Text>
      </View>
      {!isFirebaseConfigured ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Firebase env values are not set yet. Add EXPO_PUBLIC_FIREBASE_* values to use live auth and data.</Text>
        </View>
      ) : null}
      <TextField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Button title="Sign in" loading={loading} onPress={handleSubmit} />
      <View style={styles.links}>
        <Button title="Create account" variant="ghost" onPress={() => router.replace("/(auth)/sign-up")} style={styles.linkButton} />
        <Button title="Forgot password" variant="ghost" onPress={() => router.replace("/(auth)/forgot-password")} style={styles.linkButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
    paddingTop: 32,
    paddingBottom: 12,
  },
  kicker: {
    color: colors.primary,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  notice: {
    backgroundColor: colors.amberSoft,
    borderColor: "#f1d28a",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  noticeText: {
    color: colors.amber,
    lineHeight: 20,
  },
  links: {
    flexDirection: "row",
    gap: 10,
  },
  linkButton: {
    flex: 1,
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
