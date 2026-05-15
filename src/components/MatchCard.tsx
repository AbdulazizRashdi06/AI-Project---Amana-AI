import { Image, StyleSheet, Text, View } from "react-native";
import { Bolt, ShieldCheck } from "lucide-react-native";
import { formatDate } from "@/lib/dates";
import { scoreToLabel } from "@/lib/matching";
import { colors } from "@/theme/colors";
import type { MatchRecord } from "@/types/domain";

export function MatchCard({ match }: { match: MatchRecord }) {
  const label = scoreToLabel(match.finalScore);
  const lostPhoto = match.lostSummary?.photoUrls?.[0] ?? match.foundSummary?.photoUrls?.[0] ?? null;
  const foundPhoto = match.foundSummary?.photoUrls?.[0] ?? match.lostSummary?.photoUrls?.[0] ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.label, label === "Strong match" ? styles.strong : styles.possible]}>
          <Bolt color={label === "Strong match" ? colors.secondary : colors.primary} size={14} />
          <Text style={[styles.labelText, label === "Strong match" ? styles.strongText : styles.possibleText]}>{label}</Text>
        </View>
        <Text style={styles.status}>{match.status.replace("_", " ")}</Text>
      </View>
      <View style={styles.summaryGrid}>
        <Summary label="Lost" summary={match.lostSummary} fallbackId={match.lostReportId} photoUrl={lostPhoto} />
        <Summary label="Found" summary={match.foundSummary} fallbackId={match.foundReportId} photoUrl={foundPhoto} />
      </View>
      <Text style={styles.body}>{match.explanation || "AI is comparing item details and photos for this pair."}</Text>
      {match.matchedFields?.length ? <Text style={styles.fields}>Matched: {match.matchedFields.join(", ")}</Text> : null}
    </View>
  );
}

function Summary({
  label,
  summary,
  fallbackId,
  photoUrl,
}: {
  label: "Lost" | "Found";
  summary: MatchRecord["lostSummary"];
  fallbackId: string;
  photoUrl?: string | null;
}) {
  return (
    <View style={styles.summary}>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.image} /> : <View style={styles.imagePlaceholder} />}
      <View style={styles.summaryLabelRow}>
        {label === "Found" ? <ShieldCheck color={colors.primary} size={14} /> : null}
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.title}>{summary?.title ?? `Report #${fallbackId.slice(0, 6)}`}</Text>
      {summary ? (
        <Text style={styles.meta}>{summary.category} - {summary.locationText} - {formatDate(summary.eventDate)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderColor: colors.surfaceContainer,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  strong: {
    backgroundColor: colors.gold,
  },
  possible: {
    backgroundColor: colors.primarySoft,
  },
  labelText: {
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  strongText: {
    color: colors.secondary,
  },
  possibleText: {
    color: colors.primary,
  },
  status: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  title: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 17,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceContainer,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  summary: {
    flex: 1,
    minWidth: 180,
    gap: 6,
  },
  image: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
  },
  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: {
    color: colors.primary,
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 12,
  },
  meta: {
    color: colors.muted,
    lineHeight: 18,
  },
  body: {
    color: colors.ink,
    lineHeight: 20,
  },
  fields: {
    color: colors.muted,
    fontWeight: "600",
  },
});
