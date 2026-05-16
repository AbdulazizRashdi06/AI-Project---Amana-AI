import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { ItemReport } from "../shared/types";
import { createEmbedding, rankMatchWithOpenAI } from "./openai";
import { writeAiLog } from "./aiLogs";
import {
  categoryBoost,
  clampScore,
  cosineSimilarity,
  dateBoost,
  embeddingModel,
  itemDetailBoost,
  locationBoost,
  matchIdFor,
  matchingVersion,
  normalizeReportText,
  reasoningModel,
  tokenPricingPer1M,
} from "./utils";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

type CostUsageTotals = {
  embeddingInputTokens: number;
  reasoningInputTokens: number;
  reasoningCachedInputTokens: number;
  reasoningOutputTokens: number;
  rerankCallCount: number;
  candidateEmbeddingBackfillCount: number;
};

function emptyCostUsageTotals(): CostUsageTotals {
  return {
    embeddingInputTokens: 0,
    reasoningInputTokens: 0,
    reasoningCachedInputTokens: 0,
    reasoningOutputTokens: 0,
    rerankCallCount: 0,
    candidateEmbeddingBackfillCount: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(8));
}

function collectEmbeddingUsage(costTotals: CostUsageTotals, rawOutput: unknown): void {
  const usage = asRecord(asRecord(rawOutput)?.usage);
  const promptTokens = asNumber(usage?.prompt_tokens) ?? asNumber(usage?.total_tokens) ?? 0;

  if (promptTokens > 0) {
    costTotals.embeddingInputTokens += promptTokens;
  }
}

function collectReasoningUsage(costTotals: CostUsageTotals, rawOutput: unknown): void {
  const usage = asRecord(asRecord(rawOutput)?.usage);
  if (!usage) {
    return;
  }

  const inputTokens = asNumber(usage.input_tokens) ?? 0;
  const inputTokenDetails = asRecord(usage.input_tokens_details);
  const cachedInputTokens = asNumber(inputTokenDetails?.cached_tokens) ?? 0;
  const outputTokens = asNumber(usage.output_tokens) ?? 0;

  costTotals.reasoningInputTokens += Math.max(0, inputTokens);
  costTotals.reasoningCachedInputTokens += Math.max(0, cachedInputTokens);
  costTotals.reasoningOutputTokens += Math.max(0, outputTokens);
}

function buildCostSummary(costTotals: CostUsageTotals) {
  const million = 1_000_000;
  const billableReasoningInputTokens = Math.max(0, costTotals.reasoningInputTokens - costTotals.reasoningCachedInputTokens);
  const embeddingCost = (costTotals.embeddingInputTokens / million) * tokenPricingPer1M.embeddingInput;
  const reasoningInputCost = (billableReasoningInputTokens / million) * tokenPricingPer1M.reasoningInput;
  const reasoningCachedInputCost = (costTotals.reasoningCachedInputTokens / million) * tokenPricingPer1M.reasoningCachedInput;
  const reasoningOutputCost = (costTotals.reasoningOutputTokens / million) * tokenPricingPer1M.reasoningOutput;
  const runCostUsd = roundUsd(embeddingCost + reasoningInputCost + reasoningCachedInputCost + reasoningOutputCost);

  return {
    run_cost_usd: runCostUsd,
    usage_tokens: {
      embedding_input_tokens: costTotals.embeddingInputTokens,
      reasoning_input_tokens: costTotals.reasoningInputTokens,
      reasoning_cached_input_tokens: costTotals.reasoningCachedInputTokens,
      reasoning_output_tokens: costTotals.reasoningOutputTokens,
      billable_reasoning_input_tokens: billableReasoningInputTokens,
    },
    price_per_1m_usd: {
      embedding_input: tokenPricingPer1M.embeddingInput,
      reasoning_input: tokenPricingPer1M.reasoningInput,
      reasoning_cached_input: tokenPricingPer1M.reasoningCachedInput,
      reasoning_output: tokenPricingPer1M.reasoningOutput,
    },
    cost_breakdown_usd: {
      embedding_input: roundUsd(embeddingCost),
      reasoning_input: roundUsd(reasoningInputCost),
      reasoning_cached_input: roundUsd(reasoningCachedInputCost),
      reasoning_output: roundUsd(reasoningOutputCost),
    },
  };
}

function buildComparisonCostProjection(runCostUsd: number, comparedCount: number) {
  if (comparedCount <= 0 || runCostUsd <= 0) {
    return {
      compared_count_in_this_run: comparedCount,
      estimated_cost_usd_if_6_reports: null,
      estimated_cost_usd_if_10_reports: null,
      estimated_cost_usd_if_100_reports: null,
      estimated_cost_usd_if_1000_reports: null,
      estimated_cost_usd_if_10000_reports: null,
    };
  }

  const perComparisonCost = runCostUsd / comparedCount;
  return {
    compared_count_in_this_run: comparedCount,
    estimated_cost_usd_if_6_reports: roundUsd(perComparisonCost * 6),
    estimated_cost_usd_if_10_reports: roundUsd(perComparisonCost * 10),
    estimated_cost_usd_if_100_reports: roundUsd(perComparisonCost * 100),
    estimated_cost_usd_if_1000_reports: roundUsd(perComparisonCost * 1000),
    estimated_cost_usd_if_10000_reports: roundUsd(perComparisonCost * 10000),
  };
}

function shouldProcess(before: ItemReport | null, after: ItemReport): boolean {
  if (after.status !== "open" || after.visibility === "private_hidden") {
    return false;
  }

  if (!before) {
    return after.aiProcessingStatus === "pending";
  }

  const changedFields: Array<keyof ItemReport> = [
    "type",
    "title",
    "description",
    "category",
    "locationText",
    "campusZone",
    "eventDate",
    "photoUrls",
  ];

  return after.aiProcessingStatus === "pending" || changedFields.some((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
}

async function loadCandidates(source: ItemReport): Promise<ItemReport[]> {
  const oppositeType = source.type === "lost" ? "found" : "lost";
  const snapshot = await db
    .collection("reports")
    .where("type", "==", oppositeType)
    .where("status", "in", ["open", "matched", "in_chat"])
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as ItemReport)
    .filter((candidate) => candidate.id !== source.id && candidate.visibility !== "private_hidden");
}

async function ensureCandidateEmbedding(
  candidate: ItemReport,
  sourceLogBase: { reportId: string; ownerUid: string },
  expectedModel: string,
  expectedDimensions: number,
  costTotals: CostUsageTotals,
): Promise<ItemReport> {
  const hasCurrentEmbedding =
    Array.isArray(candidate.embedding) &&
    candidate.embedding.length === expectedDimensions &&
    candidate.embeddingModel === expectedModel;

  if (hasCurrentEmbedding) {
    return candidate;
  }

  const normalizedText = normalizeReportText(candidate);
  await writeAiLog(sourceLogBase, "candidate_embedding_backfill", {
    candidateReportId: candidate.id,
    input: {
      reason: "Candidate had no current embedding, so matching backfilled it during this run.",
      candidateReportId: candidate.id,
      previousEmbeddingModel: candidate.embeddingModel ?? null,
      previousDimensions: Array.isArray(candidate.embedding) ? candidate.embedding.length : 0,
      expectedModel,
      expectedDimensions,
      normalizedText,
    },
    model: embeddingModel,
  });

  const { embedding, model, rawOutput } = await createEmbedding(normalizedText);
  collectEmbeddingUsage(costTotals, rawOutput);
  costTotals.candidateEmbeddingBackfillCount += 1;
  await db.collection("reports").doc(candidate.id).update({
    normalizedText,
    embedding,
    embeddingModel: model,
    aiProcessingStatus: "processed",
    aiProcessingError: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAiLog(sourceLogBase, "embedding_response", {
    candidateReportId: candidate.id,
    model,
    output: rawOutput,
  });

  return { ...candidate, normalizedText, embedding, embeddingModel: model };
}

export async function processReport(before: ItemReport | null, after: ItemReport, options: { force?: boolean } = {}) {
  const logBase = { reportId: after.id, ownerUid: after.ownerUid };

  if (!options.force && !shouldProcess(before, after)) {
    await writeAiLog(logBase, "process_skipped", {
      input: {
        status: after.status,
        visibility: after.visibility,
        aiProcessingStatus: after.aiProcessingStatus,
      },
      output: "Report did not meet processing conditions.",
    });
    return;
  }

  const normalizedText = normalizeReportText(after);
  const costTotals = emptyCostUsageTotals();

  try {
    await writeAiLog(logBase, "process_started", {
      input: {
        forced: options.force === true,
        beforeStatus: before?.status ?? null,
        afterStatus: after.status,
        reportType: after.type,
      },
    });
    await writeAiLog(logBase, "normalize_input", {
      input: after,
      output: normalizedText,
    });

    await writeAiLog(logBase, "embedding_request", {
      model: embeddingModel,
      input: normalizedText,
    });
    const { embedding, model, rawOutput } = await createEmbedding(normalizedText);
    collectEmbeddingUsage(costTotals, rawOutput);
    await writeAiLog(logBase, "embedding_response", {
      model,
      output: rawOutput,
    });

    await db.collection("reports").doc(after.id).update({
      normalizedText,
      embedding,
      embeddingModel: model,
      aiProcessingStatus: "processed",
      aiProcessingError: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const source = { ...after, normalizedText, embedding, embeddingModel: model };
    const minMatchScore = Number(process.env.MIN_MATCH_SCORE ?? 0.72);
    const maxCandidates = Number(process.env.MAX_CANDIDATES ?? 10);

    const candidates = await loadCandidates(source);
    await writeAiLog(logBase, "candidate_search", {
      input: {
        sourceReportId: source.id,
        sourceType: source.type,
        oppositeType: source.type === "lost" ? "found" : "lost",
        maxLoaded: 200,
      },
      output: {
        count: candidates.length,
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          type: candidate.type,
          title: candidate.title,
          category: candidate.category,
          status: candidate.status,
          hasEmbedding: Array.isArray(candidate.embedding) && candidate.embedding.length > 0,
        })),
      },
    });

    const candidatesWithEmbeddings: ItemReport[] = [];
    for (const candidate of candidates) {
      candidatesWithEmbeddings.push(await ensureCandidateEmbedding(candidate, logBase, model, embedding.length, costTotals));
    }

    const scored = candidatesWithEmbeddings
      .map((candidate) => {
        const rawCosine = cosineSimilarity(embedding, candidate.embedding ?? []);
        const category = categoryBoost(source, candidate);
        const location = locationBoost(source, candidate);
        const details = itemDetailBoost(source, candidate);
        const date = dateBoost(source, candidate);
        const semanticScore = clampScore(rawCosine + category + location + details + date);
        return { candidate, semanticScore, rawCosine, category, location, details, date };
      })
      .filter((item) => item.semanticScore >= Math.max(0.55, minMatchScore - 0.16))
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, maxCandidates);

    await writeAiLog(logBase, "candidate_score", {
      input: {
        minMatchScore,
        thresholdBeforeRerank: Math.max(0.55, minMatchScore - 0.16),
        maxCandidates,
      },
      output: scored.map((item) => ({
        candidateReportId: item.candidate.id,
        semanticScore: item.semanticScore,
        rawCosine: item.rawCosine,
        categoryBoost: item.category,
        locationBoost: item.location,
        itemDetailBoost: item.details,
        dateBoost: item.date,
        title: item.candidate.title,
      })),
    });

    for (const { candidate, semanticScore } of scored) {
      const lost = source.type === "lost" ? source : candidate;
      const found = source.type === "found" ? source : candidate;
      const matchId = matchIdFor(lost.id, found.id);
      const matchRef = db.collection("matches").doc(matchId);
      const existing = await matchRef.get();

      if (existing.exists && ["dismissed", "resolved", "rejected"].includes(existing.data()?.status)) {
        await writeAiLog(logBase, "match_skipped", {
          matchId,
          candidateReportId: candidate.id,
          input: existing.data(),
          output: "Existing match was dismissed, resolved, or rejected.",
        });
        continue;
      }

      const rankDebug = await rankMatchWithOpenAI(lost, found, semanticScore);
      costTotals.rerankCallCount += 1;
      collectReasoningUsage(costTotals, rankDebug.rawOutput);
      await writeAiLog(logBase, "rerank_request", {
        matchId,
        candidateReportId: candidate.id,
        model: rankDebug.model,
        input: rankDebug.input,
      });
      await writeAiLog(logBase, "rerank_response", {
        matchId,
        candidateReportId: candidate.id,
        model: rankDebug.model,
        output: {
          result: rankDebug.result,
          rawOutput: rankDebug.rawOutput,
          usedFallback: rankDebug.usedFallback,
        },
      });

      const aiResult = rankDebug.result;
      if (!aiResult.isLikelyMatch || aiResult.finalScore < minMatchScore) {
        await writeAiLog(logBase, "match_skipped", {
          matchId,
          candidateReportId: candidate.id,
          input: { minMatchScore, semanticScore },
          output: {
            reason: "AI result did not pass visible match threshold.",
            aiResult,
          },
        });
        continue;
      }

      await matchRef.set(
        {
          id: matchId,
          lostReportId: lost.id,
          foundReportId: found.id,
          lostOwnerUid: lost.ownerUid,
          foundOwnerUid: found.ownerUid,
          lostSummary: {
            title: lost.title,
            category: lost.category,
            locationText: lost.locationText,
            photoUrls: lost.photoUrls ?? [],
            eventDate: lost.eventDate ?? null,
          },
          foundSummary: {
            title: found.title,
            category: found.category,
            locationText: found.locationText,
            photoUrls: found.photoUrls ?? [],
            eventDate: found.eventDate ?? null,
          },
          semanticScore,
          visualScore: null,
          finalScore: aiResult.finalScore,
          explanation: aiResult.explanation,
          matchedFields: aiResult.matchedFields,
          status: existing.exists ? existing.data()?.status ?? "suggested" : "suggested",
          generatedBy: {
            provider: "openai",
            embeddingModel: model || embeddingModel,
            reasoningModel: process.env.OPENAI_API_KEY ? reasoningModel : "deterministic-local-dev",
            version: matchingVersion,
          },
          createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await db.collection("reports").doc(lost.id).update({ status: "matched", updatedAt: FieldValue.serverTimestamp() });
      await db.collection("reports").doc(found.id).update({ status: "matched", updatedAt: FieldValue.serverTimestamp() });

      await db.collection("notifications").add({
        uid: source.ownerUid,
        type: "match_suggested",
        matchId,
        reportId: source.id,
        body: "Possible match found for your item.",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      await writeAiLog(logBase, "match_created", {
        matchId,
        candidateReportId: candidate.id,
        model: rankDebug.model,
        output: {
          finalScore: aiResult.finalScore,
          semanticScore,
          explanation: aiResult.explanation,
          matchedFields: aiResult.matchedFields,
        },
      });
    }

    const costSummary = buildCostSummary(costTotals);
    const comparisonCostProjection = buildComparisonCostProjection(costSummary.run_cost_usd, scored.length);

    await writeAiLog(logBase, "process_complete", {
      output: {
        candidateCount: candidates.length,
        scoredCount: scored.length,
        rerankCallCount: costTotals.rerankCallCount,
        candidateEmbeddingBackfillCount: costTotals.candidateEmbeddingBackfillCount,
        ...costSummary,
        comparison_cost_projection: comparisonCostProjection,
      },
    });
  } catch (error) {
    await writeAiLog(logBase, "process_error", {
      error: error instanceof Error ? error.message : "Unknown matching error",
      input: {
        reportId: after.id,
        title: after.title,
        type: after.type,
      },
    });
    await db.collection("reports").doc(after.id).update({
      aiProcessingStatus: "failed",
      aiProcessingError: error instanceof Error ? error.message : "Unknown matching error",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
