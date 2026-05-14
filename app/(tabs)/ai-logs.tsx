import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { useUserAiLogs } from "@/features/aiLogs/hooks";
import { formatDateTime } from "@/lib/dates";
import { colors } from "@/theme/colors";
import type { AiLogRecord } from "@/types/domain";

function stringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, nested) => {
      if (nested && typeof nested === "object" && "seconds" in nested && "nanoseconds" in nested) {
        return nested;
      }
      return nested;
    },
    2,
  );
}

export default function AiLogsScreen() {
  const { user } = useAuth();
  const { logs, loading, error } = useUserAiLogs(user?.uid);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const byReport = new Map<string, AiLogRecord[]>();
    for (const log of logs) {
      byReport.set(log.reportId, [...(byReport.get(log.reportId) ?? []), log]);
    }
    return Array.from(byReport.entries());
  }, [logs]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>AI Debug Console</Text>
        <Text style={styles.title}>Matching logs</Text>
        <Text style={styles.body}>Every backend matching step is written here: normalized input, embedding request/response, candidates, rerank request/response, skipped matches, created matches, and errors.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && logs.length === 0 ? (
        <EmptyState title="No AI logs yet" body="Create or update a lost/found report after deploying the Functions update. The next matching run will appear here." />
      ) : null}
      {grouped.map(([reportId, reportLogs]) => (
        <View key={reportId} style={styles.reportGroup}>
          <Text style={styles.reportTitle}>Report #{reportId.slice(0, 8)}</Text>
          {reportLogs.map((log) => {
            const expanded = expandedId === log.id;
            return (
              <Pressable key={log.id} onPress={() => setExpandedId(expanded ? null : log.id)} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.step}>{log.step.replaceAll("_", " ")}</Text>
                  <Text style={styles.time}>{formatDateTime(log.createdAt)}</Text>
                </View>
                <View style={styles.metaRow}>
                  {log.model ? <Text style={styles.meta}>Model: {log.model}</Text> : null}
                  {log.matchId ? <Text style={styles.meta}>Match: {log.matchId.slice(0, 10)}</Text> : null}
                  {log.candidateReportId ? <Text style={styles.meta}>Candidate: {log.candidateReportId.slice(0, 10)}</Text> : null}
                </View>
                {log.error ? <Text style={styles.error}>{log.error}</Text> : null}
                {expanded ? (
                  <View style={styles.payloadGrid}>
                    <View style={styles.payload}>
                      <Text style={styles.payloadTitle}>Input</Text>
                      <Text selectable style={styles.code}>{stringify(log.input ?? null)}</Text>
                    </View>
                    <View style={styles.payload}>
                      <Text style={styles.payloadTitle}>Output</Text>
                      <Text selectable style={styles.code}>{stringify(log.output ?? null)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.expandHint}>Tap to view input and output</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  kicker: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
    maxWidth: 840,
  },
  reportGroup: {
    gap: 10,
  },
  reportTitle: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  step: {
    color: colors.ink,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  time: {
    color: colors.outline,
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meta: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
  },
  expandHint: {
    color: colors.muted,
    fontSize: 13,
  },
  payloadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  payload: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  payloadTitle: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  code: {
    color: colors.ink,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
});
