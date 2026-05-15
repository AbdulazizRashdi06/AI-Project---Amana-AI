"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmbedding = createEmbedding;
exports.rankMatchWithOpenAI = rankMatchWithOpenAI;
const openai_1 = __importDefault(require("openai"));
const utils_1 = require("./utils");
function client() {
    const apiKey = process.env.OPENAI_API_KEY;
    return apiKey ? new openai_1.default({ apiKey }) : null;
}
async function createEmbedding(text) {
    const openai = client();
    if (!openai) {
        return {
            embedding: (0, utils_1.deterministicEmbedding)(text),
            model: "deterministic-local-dev",
            input: text,
            rawOutput: { provider: "local", reason: "OPENAI_API_KEY not set" },
        };
    }
    try {
        const response = await openai.embeddings.create({
            model: utils_1.embeddingModel,
            input: text,
        });
        return {
            embedding: response.data[0].embedding,
            model: utils_1.embeddingModel,
            input: text,
            rawOutput: {
                requestId: response._request_id ?? null,
                model: response.model,
                usage: response.usage,
                dimensions: response.data[0].embedding.length,
                preview: response.data[0].embedding.slice(0, 8),
            },
        };
    }
    catch (error) {
        return {
            embedding: (0, utils_1.deterministicEmbedding)(text),
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
function reportToText(label, report) {
    return [
        `${label} report`,
        `Title: ${report.title}`,
        `Category: ${report.category?.trim() || "Unknown"}`,
        `Description: ${report.description}`,
        `Location: ${report.locationText}`,
        `Campus zone: ${report.campusZone ?? "Unknown"}`,
        `Date: ${report.eventDate?.toDate?.().toISOString().slice(0, 10) ?? "Unknown"}`,
    ].join("\n");
}
function fallbackReason(lost, found, semanticScore) {
    const lostCategory = lost.category?.trim().toLowerCase();
    const foundCategory = found.category?.trim().toLowerCase();
    const matchedFields = [
        lostCategory && foundCategory && lostCategory === foundCategory ? "category" : null,
        lost.locationText.toLowerCase().split(/\s+/).some((token) => found.locationText.toLowerCase().includes(token)) ? "location" : null,
    ].filter(Boolean);
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
async function rankMatchWithOpenAI(lost, found, semanticScore) {
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
    const content = [
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
        model: utils_1.reasoningModel,
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
    let response;
    try {
        response = await openai.responses.create(requestPayload);
    }
    catch (error) {
        return {
            result: fallbackReason(lost, found, semanticScore),
            model: utils_1.reasoningModel,
            input: requestPayload,
            rawOutput: {
                provider: "local",
                reason: "OpenAI rerank request failed; deterministic backend fallback used.",
                error: error instanceof Error ? error.message : "Unknown OpenAI rerank error",
            },
            usedFallback: true,
        };
    }
    const outputText = response.output_text;
    if (!outputText) {
        return {
            result: fallbackReason(lost, found, semanticScore),
            model: utils_1.reasoningModel,
            input: requestPayload,
            rawOutput: response,
            usedFallback: true,
        };
    }
    try {
        const parsed = JSON.parse(outputText);
        return {
            result: {
                ...parsed,
                finalScore: Math.max(0, Math.min(1, parsed.finalScore)),
            },
            model: utils_1.reasoningModel,
            input: requestPayload,
            rawOutput: {
                id: response.id,
                model: response.model,
                usage: response.usage,
                output_text: outputText,
            },
            usedFallback: false,
        };
    }
    catch {
        return {
            result: fallbackReason(lost, found, semanticScore),
            model: utils_1.reasoningModel,
            input: requestPayload,
            rawOutput: {
                id: response.id,
                model: response.model,
                usage: response.usage,
                output_text: outputText,
                parseError: "Failed to parse JSON output",
            },
            usedFallback: true,
        };
    }
}
