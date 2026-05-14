import OpenAI from "openai";
import type { ItemReport, MatchAIResult } from "../shared/types";
import { deterministicEmbedding, embeddingModel, reasoningModel } from "./utils";

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

export async function createEmbedding(text: string): Promise<{ embedding: number[]; model: string; input: string; rawOutput: unknown }> {
  const openai = client();

  if (!openai) {
    return {
      embedding: deterministicEmbedding(text),
      model: "deterministic-local-dev",
      input: text,
      rawOutput: { provider: "local", reason: "OPENAI_API_KEY not set" },
    };
  }

  try {
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      model: embeddingModel,
      input: text,
      rawOutput: {
        requestId: (response as any)._request_id ?? null,
        model: response.model,
        usage: response.usage,
        dimensions: response.data[0].embedding.length,
        preview: response.data[0].embedding.slice(0, 8),
      },
    };
  } catch (error) {
    return {
      embedding: deterministicEmbedding(text),
      model: "deterministic-local-dev",
      input: text,
      rawOutput: {
        provider: "local",
        reason: "OpenAI embedding request failed; deterministic backend fallback used.",
        error: error instanceof Error ? error.message : "Unknown OpenAI embedding error",
      },
    };
  }
}

function reportToText(label: string, report: ItemReport): string {
  return [
    `${label} report`,
    `Title: ${report.title}`,
    `Category: ${report.category}`,
    `Description: ${report.description}`,
    `Location: ${report.locationText}`,
    `Campus zone: ${report.campusZone ?? "Unknown"}`,
    `Date: ${report.eventDate?.toDate?.().toISOString().slice(0, 10) ?? "Unknown"}`,
  ].join("\n");
}

function fallbackReason(lost: ItemReport, found: ItemReport, semanticScore: number): MatchAIResult {
  const matchedFields = [
    lost.category === found.category ? "category" : null,
    lost.locationText.toLowerCase().split(/\s+/).some((token) => found.locationText.toLowerCase().includes(token)) ? "location" : null,
  ].filter(Boolean) as string[];

  return {
    isLikelyMatch: semanticScore >= 0.72,
    finalScore: semanticScore,
    explanation: matchedFields.length
      ? "The reports share item details that make this worth checking."
      : "The text is somewhat similar, but the match needs manual review.",
    matchedFields,
    riskFlags: semanticScore < 0.8 ? ["needs_confirmation"] : [],
  };
}

export type RankMatchDebug = {
  result: MatchAIResult;
  model: string;
  input: unknown;
  rawOutput: unknown;
  usedFallback: boolean;
};

export async function rankMatchWithOpenAI(lost: ItemReport, found: ItemReport, semanticScore: number): Promise<RankMatchDebug> {
  const openai = client();

  if (!openai) {
    return {
      result: fallbackReason(lost, found, semanticScore),
      model: "deterministic-local-dev",
      input: { lost: reportToText("Lost", lost), found: reportToText("Found", found), semanticScore },
      rawOutput: { provider: "local", reason: "OPENAI_API_KEY not set" },
      usedFallback: true,
    };
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: [
        "Compare a campus lost-item report with a campus found-item report.",
        "Return cautious JSON only. Do not claim certainty. Do not use or infer personal identity.",
        "Penalize mismatched item type, color, brand, location, or impossible dates.",
        reportToText("Lost", lost),
        reportToText("Found", found),
      ].join("\n\n"),
    },
  ];

  for (const url of [...lost.photoUrls.slice(0, 2), ...found.photoUrls.slice(0, 2)]) {
    content.push({ type: "input_image", image_url: url });
  }

  const requestPayload = {
    model: reasoningModel,
    input: [
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "match_result",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["isLikelyMatch", "finalScore", "explanation", "matchedFields", "riskFlags"],
          properties: {
            isLikelyMatch: { type: "boolean" },
            finalScore: { type: "number", minimum: 0, maximum: 1 },
            explanation: { type: "string" },
            matchedFields: { type: "array", items: { type: "string" } },
            riskFlags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  };

  let response: Awaited<ReturnType<typeof openai.responses.create>>;
  try {
    response = await openai.responses.create(requestPayload as any);
  } catch (error) {
    return {
      result: fallbackReason(lost, found, semanticScore),
      model: reasoningModel,
      input: requestPayload,
      rawOutput: {
        provider: "local",
        reason: "OpenAI rerank request failed; deterministic backend fallback used.",
        error: error instanceof Error ? error.message : "Unknown OpenAI rerank error",
      },
      usedFallback: true,
    };
  }

  const outputText = (response as any).output_text;
  if (!outputText) {
    return {
      result: fallbackReason(lost, found, semanticScore),
      model: reasoningModel,
      input: requestPayload,
      rawOutput: response,
      usedFallback: true,
    };
  }

  try {
    const parsed = JSON.parse(outputText) as MatchAIResult;
    return {
      result: {
        ...parsed,
        finalScore: Math.max(0, Math.min(1, parsed.finalScore)),
      },
      model: reasoningModel,
      input: requestPayload,
      rawOutput: {
        id: (response as any).id,
        model: (response as any).model,
        usage: (response as any).usage,
        output_text: outputText,
      },
      usedFallback: false,
    };
  } catch {
    return {
      result: fallbackReason(lost, found, semanticScore),
      model: reasoningModel,
      input: requestPayload,
      rawOutput: {
        id: (response as any).id,
        model: (response as any).model,
        usage: (response as any).usage,
        output_text: outputText,
        parseError: "Failed to parse JSON output",
      },
      usedFallback: true,
    };
  }
}
