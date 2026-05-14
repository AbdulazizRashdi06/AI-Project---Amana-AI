import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { Chat, ItemReport, MatchRecord, ReportStatus } from "@/types/domain";

export function subscribeToAdminReports(onData: (items: ItemReport[]) => void, onError: (error: Error) => void) {
  const reportsQuery = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(200));
  return onSnapshot(
    reportsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ItemReport)),
    onError,
  );
}

export function subscribeToAdminMatches(onData: (items: MatchRecord[]) => void, onError: (error: Error) => void) {
  const matchesQuery = query(collection(db, "matches"), orderBy("updatedAt", "desc"), limit(200));
  return onSnapshot(
    matchesQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as MatchRecord)),
    onError,
  );
}

export function subscribeToAdminChats(onData: (items: Chat[]) => void, onError: (error: Error) => void) {
  const chatsQuery = query(collection(db, "chats"), orderBy("updatedAt", "desc"), limit(200));
  return onSnapshot(
    chatsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Chat)),
    onError,
  );
}

export async function adminUpdateReportStatus(reportId: string, status: ReportStatus) {
  const callable = httpsCallable<{ reportId: string; status: ReportStatus }, { ok: boolean }>(functions, "adminUpdateReportStatus");
  await callable({ reportId, status });
}
