"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingVersion = exports.reasoningModel = exports.embeddingModel = void 0;
exports.normalizeReportText = normalizeReportText;
exports.cosineSimilarity = cosineSimilarity;
exports.deterministicEmbedding = deterministicEmbedding;
exports.categoryBoost = categoryBoost;
exports.itemDetailBoost = itemDetailBoost;
exports.locationBoost = locationBoost;
exports.dateBoost = dateBoost;
exports.clampScore = clampScore;
exports.matchIdFor = matchIdFor;
exports.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
exports.reasoningModel = process.env.OPENAI_REASONING_MODEL || "gpt-5.4";
exports.matchingVersion = "ai-amana-matcher-v1";
function normalizeReportText(report) {
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
function cosineSimilarity(a, b) {
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
function deterministicEmbedding(text, size = 256) {
    const vector = Array.from({ length: size }, () => 0);
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const word of words) {
        let hash = 0;
        for (let index = 0; index < word.length; index += 1) {
            hash = (hash * 31 + word.charCodeAt(index)) >>> 0;
        }
        vector[hash % size] += 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
}
function tokensFor(value) {
    const stopWords = new Set([
        "a",
        "an",
        "and",
        "at",
        "for",
        "from",
        "in",
        "inside",
        "near",
        "of",
        "on",
        "the",
        "to",
        "with",
    ]);
    return new Set((value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => token.length > 2 && !stopWords.has(token)));
}
function overlapRatio(source, candidate) {
    if (!source.size || !candidate.size) {
        return 0;
    }
    let shared = 0;
    source.forEach((token) => {
        if (candidate.has(token)) {
            shared += 1;
        }
    });
    return shared / Math.min(source.size, candidate.size);
}
function categoryBoost(source, candidate) {
    const sourceCategory = source.category?.trim().toLowerCase();
    const candidateCategory = candidate.category?.trim().toLowerCase();
    if (!sourceCategory || !candidateCategory) {
        return 0;
    }
    return sourceCategory === candidateCategory ? 0.05 : -0.02;
}
function itemDetailBoost(source, candidate) {
    const sourceTitle = tokensFor(source.title);
    const candidateTitle = tokensFor(candidate.title);
    const sourceDetails = tokensFor(`${source.title} ${source.description} ${source.category ?? ""}`);
    const candidateDetails = tokensFor(`${candidate.title} ${candidate.description} ${candidate.category ?? ""}`);
    const titleOverlap = overlapRatio(sourceTitle, candidateTitle);
    const detailOverlap = overlapRatio(sourceDetails, candidateDetails);
    return clampScore(titleOverlap * 0.1 + detailOverlap * 0.14);
}
function locationBoost(source, candidate) {
    const sourceLocation = `${source.locationText} ${source.campusZone ?? ""}`.toLowerCase();
    const candidateLocation = `${candidate.locationText} ${candidate.campusZone ?? ""}`.toLowerCase();
    if (!sourceLocation || !candidateLocation) {
        return 0;
    }
    const sourceTokens = tokensFor(sourceLocation);
    const candidateTokens = tokensFor(candidateLocation);
    const overlap = overlapRatio(sourceTokens, candidateTokens);
    return overlap > 0 ? Math.min(0.08, 0.03 + overlap * 0.05) : 0;
}
function dateBoost(source, candidate) {
    const sourceDate = source.eventDate?.toDate?.();
    const candidateDate = candidate.eventDate?.toDate?.();
    if (!sourceDate || !candidateDate) {
        return 0;
    }
    const daysApart = Math.abs(sourceDate.getTime() - candidateDate.getTime()) / 86_400_000;
    if (daysApart <= 1) {
        return 0.04;
    }
    if (daysApart <= 7) {
        return 0.02;
    }
    return 0;
}
function clampScore(score) {
    return Math.max(0, Math.min(1, score));
}
function matchIdFor(lostReportId, foundReportId) {
    return `${lostReportId}_${foundReportId}`;
}
