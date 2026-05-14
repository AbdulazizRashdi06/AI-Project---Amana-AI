"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAiLog = writeAiLog;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
function scrub(value) {
    if (typeof value === "string") {
        return value.length > 12000 ? `${value.slice(0, 12000)}... [truncated]` : value;
    }
    if (Array.isArray(value)) {
        return value.slice(0, 40).map(scrub);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => {
            if (key.toLowerCase().includes("embedding") && Array.isArray(nested)) {
                return [key, { dimensions: nested.length, preview: nested.slice(0, 8) }];
            }
            return [key, scrub(nested)];
        }));
    }
    return value;
}
async function writeAiLog(base, step, details = {}) {
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
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
