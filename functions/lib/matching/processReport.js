"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReport = processReport;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = require("./openai");
const aiLogs_1 = require("./aiLogs");
const utils_1 = require("./utils");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
function shouldProcess(before, after) {
    if (after.status !== "open" || after.visibility === "private_hidden") {
        return false;
    }
    if (!before) {
        return after.aiProcessingStatus === "pending";
    }
    const changedFields = [
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
async function loadCandidates(source) {
    const oppositeType = source.type === "lost" ? "found" : "lost";
    const snapshot = await db
        .collection("reports")
        .where("type", "==", oppositeType)
        .where("status", "in", ["open", "matched", "in_chat"])
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((candidate) => candidate.id !== source.id && candidate.visibility !== "private_hidden");
}
async function ensureCandidateEmbedding(candidate, sourceLogBase, expectedModel, expectedDimensions) {
    const hasCurrentEmbedding = Array.isArray(candidate.embedding) &&
        candidate.embedding.length === expectedDimensions &&
        candidate.embeddingModel === expectedModel;
    if (hasCurrentEmbedding) {
        return candidate;
    }
    const normalizedText = (0, utils_1.normalizeReportText)(candidate);
    await (0, aiLogs_1.writeAiLog)(sourceLogBase, "candidate_embedding_backfill", {
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
        model: utils_1.embeddingModel,
    });
    const { embedding, model, rawOutput } = await (0, openai_1.createEmbedding)(normalizedText);
    await db.collection("reports").doc(candidate.id).update({
        normalizedText,
        embedding,
        embeddingModel: model,
        aiProcessingStatus: "processed",
        aiProcessingError: null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await (0, aiLogs_1.writeAiLog)(sourceLogBase, "embedding_response", {
        candidateReportId: candidate.id,
        model,
        output: rawOutput,
    });
    return { ...candidate, normalizedText, embedding, embeddingModel: model };
}
async function processReport(before, after, options = {}) {
    const logBase = { reportId: after.id, ownerUid: after.ownerUid };
    if (!options.force && !shouldProcess(before, after)) {
        await (0, aiLogs_1.writeAiLog)(logBase, "process_skipped", {
            input: {
                status: after.status,
                visibility: after.visibility,
                aiProcessingStatus: after.aiProcessingStatus,
            },
            output: "Report did not meet processing conditions.",
        });
        return;
    }
    const normalizedText = (0, utils_1.normalizeReportText)(after);
    try {
        await (0, aiLogs_1.writeAiLog)(logBase, "process_started", {
            input: {
                forced: options.force === true,
                beforeStatus: before?.status ?? null,
                afterStatus: after.status,
                reportType: after.type,
            },
        });
        await (0, aiLogs_1.writeAiLog)(logBase, "normalize_input", {
            input: after,
            output: normalizedText,
        });
        await (0, aiLogs_1.writeAiLog)(logBase, "embedding_request", {
            model: utils_1.embeddingModel,
            input: normalizedText,
        });
        const { embedding, model, rawOutput } = await (0, openai_1.createEmbedding)(normalizedText);
        await (0, aiLogs_1.writeAiLog)(logBase, "embedding_response", {
            model,
            output: rawOutput,
        });
        await db.collection("reports").doc(after.id).update({
            normalizedText,
            embedding,
            embeddingModel: model,
            aiProcessingStatus: "processed",
            aiProcessingError: null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const source = { ...after, normalizedText, embedding, embeddingModel: model };
        const minMatchScore = Number(process.env.MIN_MATCH_SCORE ?? 0.72);
        const maxCandidates = Number(process.env.MAX_CANDIDATES ?? 10);
        const candidates = await loadCandidates(source);
        await (0, aiLogs_1.writeAiLog)(logBase, "candidate_search", {
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
        const candidatesWithEmbeddings = [];
        for (const candidate of candidates) {
            candidatesWithEmbeddings.push(await ensureCandidateEmbedding(candidate, logBase, model, embedding.length));
        }
        const scored = candidatesWithEmbeddings
            .map((candidate) => {
            const rawCosine = (0, utils_1.cosineSimilarity)(embedding, candidate.embedding ?? []);
            const category = (0, utils_1.categoryBoost)(source, candidate);
            const location = (0, utils_1.locationBoost)(source, candidate);
            const details = (0, utils_1.itemDetailBoost)(source, candidate);
            const date = (0, utils_1.dateBoost)(source, candidate);
            const semanticScore = (0, utils_1.clampScore)(rawCosine + category + location + details + date);
            return { candidate, semanticScore, rawCosine, category, location, details, date };
        })
            .filter((item) => item.semanticScore >= Math.max(0.55, minMatchScore - 0.16))
            .sort((a, b) => b.semanticScore - a.semanticScore)
            .slice(0, maxCandidates);
        await (0, aiLogs_1.writeAiLog)(logBase, "candidate_score", {
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
            const matchId = (0, utils_1.matchIdFor)(lost.id, found.id);
            const matchRef = db.collection("matches").doc(matchId);
            const existing = await matchRef.get();
            if (existing.exists && ["dismissed", "resolved", "rejected"].includes(existing.data()?.status)) {
                await (0, aiLogs_1.writeAiLog)(logBase, "match_skipped", {
                    matchId,
                    candidateReportId: candidate.id,
                    input: existing.data(),
                    output: "Existing match was dismissed, resolved, or rejected.",
                });
                continue;
            }
            const rankDebug = await (0, openai_1.rankMatchWithOpenAI)(lost, found, semanticScore);
            await (0, aiLogs_1.writeAiLog)(logBase, "rerank_request", {
                matchId,
                candidateReportId: candidate.id,
                model: rankDebug.model,
                input: rankDebug.input,
            });
            await (0, aiLogs_1.writeAiLog)(logBase, "rerank_response", {
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
                await (0, aiLogs_1.writeAiLog)(logBase, "match_skipped", {
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
            await matchRef.set({
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
                    embeddingModel: model || utils_1.embeddingModel,
                    reasoningModel: process.env.OPENAI_API_KEY ? utils_1.reasoningModel : "deterministic-local-dev",
                    version: utils_1.matchingVersion,
                },
                createdAt: existing.exists ? existing.data()?.createdAt ?? firestore_1.FieldValue.serverTimestamp() : firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            await db.collection("reports").doc(lost.id).update({ status: "matched", updatedAt: firestore_1.FieldValue.serverTimestamp() });
            await db.collection("reports").doc(found.id).update({ status: "matched", updatedAt: firestore_1.FieldValue.serverTimestamp() });
            await db.collection("notifications").add({
                uid: source.ownerUid,
                type: "match_suggested",
                matchId,
                reportId: source.id,
                body: "Possible match found for your item.",
                read: false,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            await (0, aiLogs_1.writeAiLog)(logBase, "match_created", {
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
        await (0, aiLogs_1.writeAiLog)(logBase, "process_complete", {
            output: {
                candidateCount: candidates.length,
                scoredCount: scored.length,
            },
        });
    }
    catch (error) {
        await (0, aiLogs_1.writeAiLog)(logBase, "process_error", {
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
}
