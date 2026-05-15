import type { ItemReport, MatchRecord } from "@/types/domain";

export type MatchLabel = "Strong match" | "Possible match" | "Weak match";

export function scoreToLabel(score: number): MatchLabel {
  if (score >= 0.85) {
    return "Strong match";
  }

  if (score >= 0.72) {
    return "Possible match";
  }

  return "Weak match";
}

export function normalizeReportText(
  report: Pick<ItemReport, "type" | "title" | "category" | "description" | "locationText" | "campusZone" | "eventDate">,
): string {
  const eventDate = report.eventDate?.toDate?.().toISOString().slice(0, 10) ?? "Unknown";
  return [
    `Type: ${report.type}`,
    `Title: ${report.title}`,
    `Category: ${report.category?.trim() || "Unknown"}`,
    `Description: ${report.description}`,
    `Location: ${report.locationText}`,
    `Campus zone: ${report.campusZone ?? "Unknown"}`,
    `Date: ${eventDate}`,
  ].join("\n");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function matchParticipantUids(match: MatchRecord): string[] {
  return [match.lostOwnerUid, match.foundOwnerUid];
}
