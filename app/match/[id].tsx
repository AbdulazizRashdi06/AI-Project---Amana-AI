import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { startChatForMatch } from "@/features/matches/api";
import { useMatchDetail } from "@/features/matches/hooks";
import { markReportResolved } from "@/features/reports/api";
import { formatDate } from "@/lib/dates";
import { scoreToLabel } from "@/lib/matching";
import { colors } from "@/theme/colors";
import type { ItemReport, MatchRecord } from "@/types/domain";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { detail, loading, error } = useMatchDetail(id);
  const [chatLoading, setChatLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  const match = detail?.match ?? null;
  const isClosed = match ? ["dismissed", "resolved", "rejected"].includes(match.status) : false;

  async function handleChat() {
    if (!match) {
      return;
    }

    try {
      setChatLoading(true);
      const chatId = await startChatForMatch(match.id, user?.uid);
      router.push(`/chat/${chatId}`);
    } catch (nextError) {
      Alert.alert("Could not open chat", nextError instanceof Error ? nextError.message : "Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleResolve() {
    if (!match) {
      return;
    }

    try {
      setResolveLoading(true);
      await markReportResolved(match.lostReportId);
      Alert.alert("Match resolved", "This match and related chat state were marked resolved.");
    } catch (nextError) {
      Alert.alert("Could not resolve match", nextError instanceof Error ? nextError.message : "Please try again.");
    } finally {
      setResolveLoading(false);
    }
  }

  const chatTitle = match?.status === "chat_started" ? "Open Chat" : "Start Chat";
  const confidenceLabel = match ? scoreToLabel(match.finalScore) : "Possible match";

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Match Review</Text>
        <Text style={styles.title}>Match detail</Text>
        <Text style={styles.body}>Review both reports, confidence signals, and decide next action.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !detail ? <EmptyState title="Match not found" body={`No match data found for #${id ?? "unknown"}.`} /> : null}

      {detail ? (
        <>
          <View style={styles.panel}>
            <View style={styles.row}>
              <Text style={styles.matchId}>Match #{detail.match.id.slice(0, 8)}</Text>
              <Text style={styles.status}>{detail.match.status.replaceAll("_", " ")}</Text>
            </View>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{confidenceLabel}</Text>
              <Text style={styles.scoreText}>Final confidence {Math.round(detail.match.finalScore * 100)}%</Text>
              <Text style={styles.scoreText}>Semantic {Math.round(detail.match.semanticScore * 100)}%</Text>
            </View>
            <Text style={styles.explanation}>{detail.match.explanation}</Text>
            <View style={styles.chips}>
              {detail.match.matchedFields?.length ? detail.match.matchedFields.map((field) => (
                <Text key={field} style={styles.chip}>{field}</Text>
              )) : <Text style={styles.chip}>No specific matched fields reported</Text>}
            </View>
          </View>

          <View style={styles.compareGrid}>
            <ReportPanel label="Lost report" summary={detail.match.lostSummary} report={detail.lostReport} />
            <ReportPanel label="Found report" summary={detail.match.foundSummary} report={detail.foundReport} />
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Technical context</Text>
            <Text style={styles.metaLine}>Provider: {detail.match.generatedBy?.provider ?? "Unknown"}</Text>
            <Text style={styles.metaLine}>Embedding model: {detail.match.generatedBy?.embeddingModel ?? "Unknown"}</Text>
            <Text style={styles.metaLine}>Reasoning model: {detail.match.generatedBy?.reasoningModel ?? "Unknown"}</Text>
            <Text style={styles.metaLine}>Version: {detail.match.generatedBy?.version ?? "Unknown"}</Text>
          </View>

          <View style={styles.actions}>
            <Button
              title={chatTitle}
              onPress={handleChat}
              loading={chatLoading}
              disabled={isClosed}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title={isClosed ? "Already Closed" : "Resolve Match"}
              onPress={handleResolve}
              loading={resolveLoading}
              disabled={isClosed}
              variant="danger"
              style={styles.actionButton}
            />
          </View>
          {isClosed ? <Text style={styles.closedText}>This match is closed, so actions are disabled.</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

function pickPhoto(report: ItemReport | null, summary: MatchRecord["lostSummary"]): string | null {
  return report?.photoUrls?.[0] ?? summary?.photoUrls?.[0] ?? null;
}

function readText(primary?: string | null, fallback = "Not provided"): string {
  return primary && primary.trim() ? primary : fallback;
}

function ReportPanel({
  label,
  summary,
  report,
}: {
  label: string;
  summary?: MatchRecord["lostSummary"];
  report: ItemReport | null;
}) {
  const photo = pickPhoto(report, summary);
  const title = readText(report?.title ?? summary?.title, "Untitled item");
  const category = readText(report?.category ?? summary?.category, "No category");
  const location = readText(report?.locationText ?? summary?.locationText, "No location");
  const dateValue = report?.eventDate ?? summary?.eventDate ?? null;
  const description = readText(report?.description ?? null, "No detailed description available.");

  return (
    <View style={styles.reportCard}>
      {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={styles.photoPlaceholder} />}
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.metaLine}>Category: {category}</Text>
      <Text style={styles.metaLine}>Location: {location}</Text>
      <Text style={styles.metaLine}>Date: {formatDate(dateValue)}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  kicker: {
    color: colors.primary,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "900",
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
    backgroundColor: colors.dangerSoft,
    borderColor: "#f8b4ae",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  matchId: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 16,
  },
  status: {
    color: colors.muted,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: colors.gold,
    color: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
  },
  scoreText: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: "800",
    fontSize: 12,
  },
  explanation: {
    color: colors.ink,
    lineHeight: 22,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    color: colors.ink,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "700",
  },
  compareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reportCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  photo: {
    width: "100%",
    aspectRatio: 1.8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 1.8,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  reportLabel: {
    color: colors.primary,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "900",
  },
  reportTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  metaLine: {
    color: colors.muted,
    lineHeight: 20,
  },
  description: {
    color: colors.ink,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  closedText: {
    color: colors.muted,
    fontWeight: "700",
  },
});
