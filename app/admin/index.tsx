import { Redirect } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { adminUpdateReportStatus } from "@/features/admin/api";
import { useAdminData } from "@/features/admin/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { colors } from "@/theme/colors";
import type { ReportStatus } from "@/types/domain";

export default function AdminScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { reports, matches, chats, error } = useAdminData(isAdmin);

  if (!isAdmin) {
    return <Redirect href="/(tabs)/profile" />;
  }

  async function updateStatus(reportId: string, status: ReportStatus) {
    try {
      await adminUpdateReportStatus(reportId, status);
    } catch (nextError) {
      Alert.alert("Could not update status", nextError instanceof Error ? nextError.message : "Please try again.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Admin dashboard</Text>
        <Text style={styles.body}>Monitor reports, matches, and masked chats across the campus lost-and-found workflow.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.metrics}>
        <Metric label="Reports" value={reports.length} />
        <Metric label="Matches" value={matches.length} />
        <Metric label="Chats" value={chats.length} />
      </View>
      <Text style={styles.sectionTitle}>Recent reports</Text>
      {reports.map((report) => (
        <View key={report.id} style={styles.tableRow}>
          <View style={styles.rowText}>
            <Text style={styles.itemTitle}>{report.title}</Text>
            <Text style={styles.meta}>{report.type} - {report.category} - {report.status} - {report.aiProcessingStatus}</Text>
            <Text style={styles.meta}>{report.locationText}</Text>
          </View>
          <View style={styles.rowActions}>
            <Button title="Hide" variant="danger" onPress={() => updateStatus(report.id, "hidden")} />
            <Button title="Resolve" variant="secondary" onPress={() => updateStatus(report.id, "resolved")} />
          </View>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Recent matches</Text>
      {matches.map((match) => (
        <Pressable key={match.id} style={styles.tableRow}>
          <View style={styles.rowText}>
            <Text style={styles.itemTitle}>Lost {match.lostReportId.slice(0, 6)} / Found {match.foundReportId.slice(0, 6)}</Text>
            <Text style={styles.meta}>{match.status} - Score {Math.round(match.finalScore * 100)}%</Text>
            <Text style={styles.meta}>{match.explanation}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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
  error: {
    color: colors.danger,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metricValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.muted,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  tableRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  rowText: {
    gap: 5,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    lineHeight: 20,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
});
