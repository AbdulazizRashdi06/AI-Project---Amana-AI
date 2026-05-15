import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { deleteAllMyLogs, deleteMyDataExceptAccount } from "@/features/account/api";
import { useAuth } from "@/features/auth/AuthContext";
import { seedDemoReports } from "@/features/reports/api";
import { defaultSettings } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";

export default function ProfileScreen() {
  const { user, profile, signOutUser } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [deletingLogs, setDeletingLogs] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  function askWarning(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Continue", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
  }

  async function confirmThreeWarnings(warnings: Array<{ title: string; message: string }>) {
    for (const warning of warnings) {
      const ok = await askWarning(warning.title, warning.message);
      if (!ok) {
        return false;
      }
    }
    return true;
  }

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

  async function handleDeleteAllLogs() {
    if (!user) {
      return;
    }

    const confirmed = await confirmThreeWarnings([
      {
        title: "Warning 1 of 3",
        message: "This will permanently delete AI logs for all users.",
      },
      {
        title: "Warning 2 of 3",
        message: "Deleted logs cannot be recovered.",
      },
      {
        title: "Warning 3 of 3",
        message: "Are you absolutely sure you want to permanently delete all users' AI logs?",
      },
    ]);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingLogs(true);
      const result = await deleteAllMyLogs();
      Alert.alert("Logs deleted", `Done. Removed ${result.deleted} log record(s).`);
    } catch (error) {
      Alert.alert("Could not delete logs", friendlyError(error, "Please try again."));
    } finally {
      setDeletingLogs(false);
    }
  }

  async function handleDeleteDataExceptAccount() {
    if (!user) {
      return;
    }

    const confirmed = await confirmThreeWarnings([
      {
        title: "Warning 1 of 3",
        message: "This will permanently delete app data for all users, but keep accounts.",
      },
      {
        title: "Warning 2 of 3",
        message: "This removes all reports, matches, chats, photos, and AI logs.",
      },
      {
        title: "Warning 3 of 3",
        message: "Final check: continue deleting all app data except user accounts?",
      },
    ]);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingData(true);
      const result = await deleteMyDataExceptAccount();
      const details = result.deleted;
      Alert.alert(
        "Data deleted",
        `Done.\nReports: ${details.reports}\nMatches: ${details.matches}\nChats: ${details.chats}\nAI logs: ${details.logs}\nPhotos: ${details.photos}`,
      );
    } catch (error) {
      Alert.alert("Could not delete data", friendlyError(error, "Please try again."));
    } finally {
      setDeletingData(false);
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
      {profile?.role === "admin" ? (
        <View style={styles.dangerPanel}>
          <Text style={styles.dangerTitle}>Admin danger zone</Text>
          <Text style={styles.dangerBody}>These actions are global and permanent. They affect all users.</Text>
          <Button title="Delete ALL logs permanently" variant="danger" onPress={handleDeleteAllLogs} loading={deletingLogs} disabled={deletingData} />
          <Button title="Delete ALL data (except accounts)" variant="danger" onPress={handleDeleteDataExceptAccount} loading={deletingData} disabled={deletingLogs} />
        </View>
      ) : null}
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
  dangerPanel: {
    backgroundColor: "#fff4f4",
    borderColor: "#f2b5b5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  dangerTitle: {
    color: colors.danger,
    fontWeight: "900",
    fontSize: 16,
  },
  dangerBody: {
    color: colors.ink,
    lineHeight: 20,
  },
});
