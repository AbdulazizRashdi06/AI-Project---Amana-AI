import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { seedDemoReports } from "@/features/reports/api";
import { defaultSettings } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";

export default function ProfileScreen() {
  const { user, profile, signOutUser } = useAuth();
  const [seeding, setSeeding] = useState(false);

  async function addDemoData() {
    if (!user) {
      return;
    }

    try {
      setSeeding(true);
      await seedDemoReports(user.uid);
      Alert.alert("Demo reports added", "20 mock lost reports were saved to your account.");
    } catch (error) {
      Alert.alert("Could not seed reports", friendlyError(error, "Please try again."));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{profile?.role === "admin" ? "Admin profile" : "Profile"}</Text>
        <Text style={styles.body}>Signed in as {user?.email}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Account access</Text>
        <Text style={styles.meta}>Allowed emails: any valid email address</Text>
        <Text style={styles.meta}>Role: {profile?.role ?? "user"}</Text>
      </View>
      {profile?.role === "admin" ? <Button title="Open admin dashboard" variant="secondary" onPress={() => router.push("/admin")} /> : null}
      <Button title="Seed 20 lost reports" variant="ghost" onPress={addDemoData} loading={seeding} />
      <Button title="Sign out" variant="danger" onPress={signOutUser} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  panelTitle: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 17,
  },
  meta: {
    color: colors.muted,
  },
});
