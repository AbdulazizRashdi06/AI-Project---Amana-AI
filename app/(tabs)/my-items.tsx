import { CheckCircle2, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/features/auth/AuthContext";
import { markReportResolved, rerunMatchingForReport } from "@/features/reports/api";
import { useUserReports } from "@/features/reports/hooks";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";
import type { ReportStatus } from "@/types/domain";

type Filter = "all" | ReportStatus;

export default function MyItemsScreen() {
  const { user } = useAuth();
  const { reports, error } = useUserReports(user?.uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [matchingReportId, setMatchingReportId] = useState<string | null>(null);
  const filtered = filter === "all" ? reports : reports.filter((report) => report.status === filter);

  async function resolve(reportId: string) {
    try {
      await markReportResolved(reportId);
    } catch (nextError) {
      Alert.alert("Could not mark resolved", nextError instanceof Error ? nextError.message : "Please try again.");
    }
  }

  async function rerun(reportId: string) {
    try {
      setMatchingReportId(reportId);
      await rerunMatchingForReport(reportId);
      Alert.alert("Matching queued", "AI matching ran for this report. Check Matches and AI Logs.");
    } catch (nextError) {
      Alert.alert("Could not run matching", friendlyError(nextError, "Please try again."));
    } finally {
      setMatchingReportId(null);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My items</Text>
        <Text style={styles.body}>Track your reports, AI status, and resolution state.</Text>
      </View>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "open", label: "Open" },
          { value: "matched", label: "Matched" },
          { value: "resolved", label: "Resolved" },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {filtered.length === 0 ? <EmptyState title="No reports here" body="Submit a lost or found item and it will show up here." /> : null}
      {filtered.map((report) => (
        <View key={report.id} style={styles.reportWrap}>
          <ReportCard report={report} />
          {report.status !== "resolved" ? (
            <View style={styles.actions}>
              <Button
                title="Run AI matching"
                variant="gold"
                onPress={() => rerun(report.id)}
                loading={matchingReportId === report.id}
                icon={<Sparkles color={colors.secondary} size={18} />}
                style={styles.actionButton}
              />
              <Button
                title="Mark resolved"
                variant="secondary"
                onPress={() => resolve(report.id)}
                icon={<CheckCircle2 color={colors.primaryDark} size={18} />}
                style={styles.actionButton}
              />
            </View>
          ) : null}
        </View>
      ))}
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
  error: {
    color: colors.danger,
  },
  reportWrap: {
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minWidth: 180,
  },
});
