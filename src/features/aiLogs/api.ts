import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AiLogRecord } from "@/types/domain";

export function subscribeToUserAiLogs(uid: string, onData: (items: AiLogRecord[]) => void, onError: (error: Error) => void) {
  const logsQuery = query(collection(db, "aiLogs"), where("ownerUid", "==", uid), orderBy("createdAt", "desc"), limit(80));
  return onSnapshot(
    logsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AiLogRecord)),
    onError,
  );
}
