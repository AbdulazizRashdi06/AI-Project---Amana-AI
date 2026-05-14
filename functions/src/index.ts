import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import type { ItemReport } from "./shared/types";
import { processReport } from "./matching/processReport";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function assertAuthed(uid?: string) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
}

async function isAdmin(uid: string, tokenAdmin?: boolean): Promise<boolean> {
  if (tokenAdmin) {
    return true;
  }

  const profile = await db.collection("users").doc(uid).get();
  return profile.data()?.role === "admin";
}

export const onReportCreatedOrUpdated = onDocumentWritten("reports/{reportId}", async (event) => {
  const before = event.data?.before.exists
    ? ({ id: event.params.reportId, ...event.data.before.data() } as ItemReport)
    : null;
  const after = event.data?.after.exists
    ? ({ id: event.params.reportId, ...event.data.after.data() } as ItemReport)
    : null;

  if (!after) {
    return;
  }

  await processReport(before, after);
});

export const startChatForMatch = onCall({ cors: true }, async (request) => {
  assertAuthed(request.auth?.uid);
  const uid = request.auth!.uid;
  const matchId = String(request.data?.matchId ?? "");

  if (!matchId) {
    throw new HttpsError("invalid-argument", "matchId is required.");
  }

  const matchRef = db.collection("matches").doc(matchId);
  const match = await matchRef.get();

  if (!match.exists) {
    throw new HttpsError("not-found", "Match not found.");
  }

  const data = match.data()!;
  const participant = data.lostOwnerUid === uid || data.foundOwnerUid === uid;
  if (!participant && !(await isAdmin(uid, request.auth?.token.admin === true))) {
    throw new HttpsError("permission-denied", "You are not part of this match.");
  }

  if (["dismissed", "resolved", "rejected"].includes(data.status)) {
    throw new HttpsError("failed-precondition", "This match is no longer active.");
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(chatRef.collection("messages").doc(), {
    senderUid: "system",
    body: "Keep pickup arrangements on campus and avoid sharing sensitive personal information.",
    system: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(matchRef, {
    status: "chat_started",
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(db.collection("reports").doc(data.lostReportId), {
    status: "in_chat",
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(db.collection("reports").doc(data.foundReportId), {
    status: "in_chat",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { chatId: chatRef.id };
});

export const dismissMatch = onCall({ cors: true }, async (request) => {
  assertAuthed(request.auth?.uid);
  const uid = request.auth!.uid;
  const matchId = String(request.data?.matchId ?? "");

  if (!matchId) {
    throw new HttpsError("invalid-argument", "matchId is required.");
  }

  const matchRef = db.collection("matches").doc(matchId);
  const match = await matchRef.get();

  if (!match.exists) {
    throw new HttpsError("not-found", "Match not found.");
  }

  const data = match.data()!;
  const participant = data.lostOwnerUid === uid || data.foundOwnerUid === uid;
  if (!participant && !(await isAdmin(uid, request.auth?.token.admin === true))) {
    throw new HttpsError("permission-denied", "You are not part of this match.");
  }

  await matchRef.update({
    status: "dismissed",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

export const rerunMatchingForReport = onCall({ cors: true }, async (request) => {
  assertAuthed(request.auth?.uid);
  const uid = request.auth!.uid;
  const reportId = String(request.data?.reportId ?? "");

  if (!reportId) {
    throw new HttpsError("invalid-argument", "reportId is required.");
  }

  const reportRef = db.collection("reports").doc(reportId);
  const report = await reportRef.get();

  if (!report.exists) {
    throw new HttpsError("not-found", "Report not found.");
  }

  const reportData = { id: report.id, ...report.data() } as ItemReport;
  if (reportData.ownerUid !== uid && !(await isAdmin(uid, request.auth?.token.admin === true))) {
    throw new HttpsError("permission-denied", "You cannot rerun matching for this report.");
  }

  if (["hidden", "resolved"].includes(reportData.status) || reportData.visibility === "private_hidden") {
    throw new HttpsError("failed-precondition", "Only active visible reports can be matched.");
  }

  await processReport(null, { ...reportData, aiProcessingStatus: "pending", aiProcessingError: null }, { force: true });

  return { ok: true };
});

export const markReportResolved = onCall({ cors: true }, async (request) => {
  assertAuthed(request.auth?.uid);
  const uid = request.auth!.uid;
  const reportId = String(request.data?.reportId ?? "");

  if (!reportId) {
    throw new HttpsError("invalid-argument", "reportId is required.");
  }

  const reportRef = db.collection("reports").doc(reportId);
  const report = await reportRef.get();

  if (!report.exists) {
    throw new HttpsError("not-found", "Report not found.");
  }

  if (report.data()?.ownerUid !== uid && !(await isAdmin(uid, request.auth?.token.admin === true))) {
    throw new HttpsError("permission-denied", "You cannot resolve this report.");
  }

  await reportRef.update({
    status: "resolved",
    resolvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const lostMatches = await db.collection("matches").where("lostReportId", "==", reportId).get();
  const foundMatches = await db.collection("matches").where("foundReportId", "==", reportId).get();
  const batch = db.batch();

  for (const match of [...lostMatches.docs, ...foundMatches.docs]) {
    batch.update(match.ref, {
      status: "resolved",
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      db.collection("chats").doc(match.id),
      {
        status: "closed",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
  return { ok: true };
});

export const adminUpdateReportStatus = onCall({ cors: true }, async (request) => {
  assertAuthed(request.auth?.uid);
  const uid = request.auth!.uid;

  if (!(await isAdmin(uid, request.auth?.token.admin === true))) {
    throw new HttpsError("permission-denied", "Admin role required.");
  }

  const reportId = String(request.data?.reportId ?? "");
  const status = String(request.data?.status ?? "");
  if (!reportId || !["open", "matched", "in_chat", "resolved", "hidden"].includes(status)) {
    throw new HttpsError("invalid-argument", "Valid reportId and status are required.");
  }

  await db.collection("reports").doc(reportId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
    resolvedAt: status === "resolved" ? FieldValue.serverTimestamp() : null,
  });

  return { ok: true };
});
