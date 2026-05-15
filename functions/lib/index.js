"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateReportStatus = exports.markReportResolved = exports.rerunMatchingForReport = exports.dismissMatch = exports.startChatForMatch = exports.onReportCreatedOrUpdated = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const processReport_1 = require("./matching/processReport");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
function assertAuthed(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in first.");
    }
}
async function isAdmin(uid, tokenAdmin) {
    if (tokenAdmin) {
        return true;
    }
    const profile = await db.collection("users").doc(uid).get();
    return profile.data()?.role === "admin";
}
exports.onReportCreatedOrUpdated = (0, firestore_2.onDocumentWritten)("reports/{reportId}", async (event) => {
    const before = event.data?.before.exists
        ? { id: event.params.reportId, ...event.data.before.data() }
        : null;
    const after = event.data?.after.exists
        ? { id: event.params.reportId, ...event.data.after.data() }
        : null;
    if (!after) {
        return;
    }
    await (0, processReport_1.processReport)(before, after);
});
exports.startChatForMatch = (0, https_1.onCall)({ cors: true, invoker: "public" }, async (request) => {
    assertAuthed(request.auth?.uid);
    const uid = request.auth.uid;
    const matchId = String(request.data?.matchId ?? "");
    if (!matchId) {
        throw new https_1.HttpsError("invalid-argument", "matchId is required.");
    }
    const matchRef = db.collection("matches").doc(matchId);
    const match = await matchRef.get();
    if (!match.exists) {
        throw new https_1.HttpsError("not-found", "Match not found.");
    }
    const data = match.data();
    const participant = data.lostOwnerUid === uid || data.foundOwnerUid === uid;
    if (!participant && !(await isAdmin(uid, request.auth?.token.admin === true))) {
        throw new https_1.HttpsError("permission-denied", "You are not part of this match.");
    }
    if (["dismissed", "resolved", "rejected"].includes(data.status)) {
        throw new https_1.HttpsError("failed-precondition", "This match is no longer active.");
    }
    const chatRef = db.collection("chats").doc(matchId);
    const existingChat = await chatRef.get();
    if (existingChat.exists) {
        return { chatId: chatRef.id };
    }
    const batch = db.batch();
    batch.set(chatRef, {
        id: chatRef.id,
        matchId,
        participantUids: [data.lostOwnerUid, data.foundOwnerUid],
        lostReportId: data.lostReportId,
        foundReportId: data.foundReportId,
        status: "active",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.set(chatRef.collection("messages").doc(), {
        senderUid: "system",
        body: "Keep pickup arrangements on campus and avoid sharing sensitive personal information.",
        system: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.update(matchRef, {
        status: "chat_started",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection("reports").doc(data.lostReportId), {
        status: "in_chat",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    batch.update(db.collection("reports").doc(data.foundReportId), {
        status: "in_chat",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { chatId: chatRef.id };
});
exports.dismissMatch = (0, https_1.onCall)({ cors: true, invoker: "public" }, async (request) => {
    assertAuthed(request.auth?.uid);
    const uid = request.auth.uid;
    const matchId = String(request.data?.matchId ?? "");
    if (!matchId) {
        throw new https_1.HttpsError("invalid-argument", "matchId is required.");
    }
    const matchRef = db.collection("matches").doc(matchId);
    const match = await matchRef.get();
    if (!match.exists) {
        throw new https_1.HttpsError("not-found", "Match not found.");
    }
    const data = match.data();
    const participant = data.lostOwnerUid === uid || data.foundOwnerUid === uid;
    if (!participant && !(await isAdmin(uid, request.auth?.token.admin === true))) {
        throw new https_1.HttpsError("permission-denied", "You are not part of this match.");
    }
    await matchRef.update({
        status: "dismissed",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.rerunMatchingForReport = (0, https_1.onCall)({ cors: true, invoker: "public" }, async (request) => {
    assertAuthed(request.auth?.uid);
    const uid = request.auth.uid;
    const reportId = String(request.data?.reportId ?? "");
    if (!reportId) {
        throw new https_1.HttpsError("invalid-argument", "reportId is required.");
    }
    const reportRef = db.collection("reports").doc(reportId);
    const report = await reportRef.get();
    if (!report.exists) {
        throw new https_1.HttpsError("not-found", "Report not found.");
    }
    const reportData = { id: report.id, ...report.data() };
    if (reportData.ownerUid !== uid && !(await isAdmin(uid, request.auth?.token.admin === true))) {
        throw new https_1.HttpsError("permission-denied", "You cannot rerun matching for this report.");
    }
    if (["hidden", "resolved"].includes(reportData.status) || reportData.visibility === "private_hidden") {
        throw new https_1.HttpsError("failed-precondition", "Only active visible reports can be matched.");
    }
    await (0, processReport_1.processReport)(null, { ...reportData, aiProcessingStatus: "pending", aiProcessingError: null }, { force: true });
    return { ok: true };
});
exports.markReportResolved = (0, https_1.onCall)({ cors: true, invoker: "public" }, async (request) => {
    assertAuthed(request.auth?.uid);
    const uid = request.auth.uid;
    const reportId = String(request.data?.reportId ?? "");
    if (!reportId) {
        throw new https_1.HttpsError("invalid-argument", "reportId is required.");
    }
    const reportRef = db.collection("reports").doc(reportId);
    const report = await reportRef.get();
    if (!report.exists) {
        throw new https_1.HttpsError("not-found", "Report not found.");
    }
    if (report.data()?.ownerUid !== uid && !(await isAdmin(uid, request.auth?.token.admin === true))) {
        throw new https_1.HttpsError("permission-denied", "You cannot resolve this report.");
    }
    await reportRef.update({
        status: "resolved",
        resolvedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const lostMatches = await db.collection("matches").where("lostReportId", "==", reportId).get();
    const foundMatches = await db.collection("matches").where("foundReportId", "==", reportId).get();
    const batch = db.batch();
    for (const match of [...lostMatches.docs, ...foundMatches.docs]) {
        batch.update(match.ref, {
            status: "resolved",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        batch.set(db.collection("chats").doc(match.id), {
            status: "closed",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    await batch.commit();
    return { ok: true };
});
exports.adminUpdateReportStatus = (0, https_1.onCall)({ cors: true, invoker: "public" }, async (request) => {
    assertAuthed(request.auth?.uid);
    const uid = request.auth.uid;
    if (!(await isAdmin(uid, request.auth?.token.admin === true))) {
        throw new https_1.HttpsError("permission-denied", "Admin role required.");
    }
    const reportId = String(request.data?.reportId ?? "");
    const status = String(request.data?.status ?? "");
    if (!reportId || !["open", "matched", "in_chat", "resolved", "hidden"].includes(status)) {
        throw new https_1.HttpsError("invalid-argument", "Valid reportId and status are required.");
    }
    await db.collection("reports").doc(reportId).update({
        status,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        resolvedAt: status === "resolved" ? firestore_1.FieldValue.serverTimestamp() : null,
    });
    return { ok: true };
});
