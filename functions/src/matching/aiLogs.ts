import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { AiLogRecord, AiLogStep } from "../shared/types";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function scrub(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 12000 ? `${value.slice(0, 12000)}... [truncated]` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 40).map(scrub);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
        if (key.toLowerCase().includes("embedding") && Array.isArray(nested)) {
          return [key, { dimensions: nested.length, preview: nested.slice(0, 8) }];
        }
        return [key, scrub(nested)];
      }),
    );
  }

  return value;
}

export async function writeAiLog(
  base: Pick<AiLogRecord, "reportId" | "ownerUid">,
  step: AiLogStep,
  details: Partial<Omit<AiLogRecord, "reportId" | "ownerUid" | "step" | "createdAt">> = {},
) {
  await db.collection("aiLogs").add({
    reportId: base.reportId,
    ownerUid: base.ownerUid,
    step,
    model: details.model ?? null,
    input: details.input === undefined ? null : scrub(details.input),
    output: details.output === undefined ? null : scrub(details.output),
    error: details.error ?? null,
    matchId: details.matchId ?? null,
    candidateReportId: details.candidateReportId ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
