import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { useUserAiLogs } from "@/features/aiLogs/hooks";
import { formatDateTime } from "@/lib/dates";
import { colors } from "@/theme/colors";
import type { AiLogRecord } from "@/types/domain";

type StepNarrative = {
  title: string;
  message: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatUsd(value: number): string {
  if (value >= 1) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(6)}`;
}

function describeStep(log: AiLogRecord): StepNarrative {
  const input = asRecord(log.input);
  const output = asRecord(log.output);

  switch (log.step) {
    case "process_started": {
      const reportType = asString(input?.reportType);
      return {
        title: "Matching Started",
        message: reportType === "lost" || reportType === "found"
          ? `We started checking this ${reportType} report against possible matches.`
          : "We started checking this report against possible matches.",
      };
    }
    case "process_skipped":
      return {
        title: "Run Skipped",
        message: "No new AI run was needed right now because this report did not require reprocessing.",
      };
    case "normalize_input":
      return {
        title: "Details Prepared",
        message: "We cleaned and organized the report text so matching can be more accurate.",
      };
    case "embedding_request":
      return {
        title: "Understanding Item Details",
        message: "AI is converting the report into a meaning-based representation for comparison.",
      };
    case "embedding_response": {
      const localFallback = asRecord(output)?.provider === "local";
      return {
        title: "Item Understanding Ready",
        message: localFallback
          ? "The cloud AI service was unavailable, so a local fallback model was used for this step."
          : "The item representation is ready and can now be compared with other reports.",
      };
    }
    case "candidate_search": {
      const count = asNumber(asRecord(output)?.count);
      return {
        title: "Possible Matches Collected",
        message: count === null
          ? "We collected opposite-type reports that could be related."
          : `We found ${count} opposite-type reports to review as possible matches.`,
      };
    }
    case "candidate_embedding_backfill":
      return {
        title: "Older Report Prepared",
        message: "One candidate report needed background preparation before it could be compared fairly.",
      };
    case "candidate_score": {
      const scoredCount = Array.isArray(log.output) ? log.output.length : null;
      return {
        title: "Candidates Ranked",
        message: scoredCount === null
          ? "We ranked candidate reports by similarity."
          : `${scoredCount} candidate report${scoredCount === 1 ? "" : "s"} passed initial scoring and moved forward.`,
      };
    }
    case "rerank_request":
      return {
        title: "Deep Pair Review",
        message: "AI performed a deeper comparison on one possible lost/found pair.",
      };
    case "rerank_response": {
      const result = asRecord(asRecord(output)?.result);
      const likely = asBoolean(result?.isLikelyMatch);
      const finalScore = asNumber(result?.finalScore);
      if (likely === true && finalScore !== null) {
        return {
          title: "Deep Review Result",
          message: `This pair looked promising with a confidence score of ${percent(finalScore)}.`,
        };
      }
      if (likely === false && finalScore !== null) {
        return {
          title: "Deep Review Result",
          message: `This pair looked weak after deep review (${percent(finalScore)} confidence).`,
        };
      }
      return {
        title: "Deep Review Result",
        message: "AI returned its detailed decision for this candidate pair.",
      };
    }
    case "match_created": {
      const finalScore = asNumber(asRecord(output)?.finalScore);
      return {
        title: "Match Suggested",
        message: finalScore === null
          ? "A likely match was created and shown to users."
          : `A likely match was created and suggested to users (${percent(finalScore)} confidence).`,
      };
    }
    case "match_skipped": {
      const reason = asString(asRecord(output)?.reason);
      return {
        title: "Candidate Skipped",
        message: reason
          ? `This candidate was skipped: ${reason}`
          : "This candidate was skipped because it did not meet the match threshold.",
      };
    }
    case "process_complete": {
      const candidateCount = asNumber(asRecord(output)?.candidateCount);
      const scoredCount = asNumber(asRecord(output)?.scoredCount);
      const runCost = asNumber(asRecord(output)?.run_cost_usd);
      if (candidateCount !== null && scoredCount !== null) {
        return {
          title: "Run Complete",
          message: runCost === null
            ? `Matching finished: ${candidateCount} candidate(s) reviewed, ${scoredCount} moved to scoring.`
            : `Matching finished: ${candidateCount} candidate(s) reviewed, ${scoredCount} moved to scoring, estimated cost ${formatUsd(runCost)}.`,
        };
      }
      return {
        title: "Run Complete",
        message: runCost === null ? "Matching finished for this report." : `Matching finished for this report, estimated cost ${formatUsd(runCost)}.`,
      };
    }
    case "process_error":
      return {
        title: "Run Failed",
        message: log.error
          ? `Matching failed for this run: ${log.error}`
          : "Matching failed for this run due to an unexpected error.",
      };
    default:
      return {
        title: "AI Update",
        message: "A matching activity was recorded for this report.",
      };
  }
}

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
  const [cleared, setCleared] = useState(false);
  const visibleLogs = cleared ? [] : logs;
  const grouped = useMemo(() => {
    const byReport = new Map<string, AiLogRecord[]>();
    for (const log of visibleLogs) {
      byReport.set(log.reportId, [...(byReport.get(log.reportId) ?? []), log]);
    }
    return Array.from(byReport.entries());
  }, [visibleLogs]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>AI Activity Feed</Text>
        <Text style={styles.title}>Report Matching Logs</Text>
        <Text style={styles.body}>This page explains each AI matching action in plain language for every lost and found report.</Text>
        <View style={styles.actions}>
          <Button title="Clear logs" variant="ghost" onPress={() => setCleared(true)} />
          {cleared ? <Button title="Show logs" variant="secondary" onPress={() => setCleared(false)} /> : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && visibleLogs.length === 0 ? (
        <EmptyState title="No AI logs yet" body="Create or update a lost/found report after deploying the Functions update. The next matching run will appear here." />
      ) : null}
      {grouped.map(([reportId, reportLogs]) => (
        <View key={reportId} style={styles.reportGroup}>
          <Text style={styles.reportTitle}>Report #{reportId.slice(0, 8)}</Text>
          {reportLogs.map((log) => {
            const expanded = expandedId === log.id;
            const narrative = describeStep(log);
            const runCost = asNumber(asRecord(log.output)?.run_cost_usd);
            return (
              <Pressable key={log.id} onPress={() => setExpandedId(expanded ? null : log.id)} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.step}>{narrative.title}</Text>
                  <Text style={styles.time}>{formatDateTime(log.createdAt)}</Text>
                </View>
                <Text style={styles.storyText}>{narrative.message}</Text>
                <View style={styles.metaRow}>
                  {log.model ? <Text style={styles.meta}>Model: {log.model}</Text> : null}
                  {runCost !== null ? <Text style={styles.meta}>Run cost: {formatUsd(runCost)}</Text> : null}
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
                  <Text style={styles.expandHint}>Tap for technical details</Text>
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
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
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
  storyText: {
    color: colors.ink,
    lineHeight: 21,
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
