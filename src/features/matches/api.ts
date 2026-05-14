import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { MatchRecord } from "@/types/domain";

type SnapshotHandler<T> = (items: T[]) => void;

export function subscribeToUserMatches(uid: string, onData: SnapshotHandler<MatchRecord>, onError: (error: Error) => void) {
  const lostQuery = query(collection(db, "matches"), where("lostOwnerUid", "==", uid), orderBy("updatedAt", "desc"));
  const foundQuery = query(collection(db, "matches"), where("foundOwnerUid", "==", uid), orderBy("updatedAt", "desc"));
  const byId = new Map<string, MatchRecord>();

  const emit = () => onData(Array.from(byId.values()).sort((a, b) => b.finalScore - a.finalScore));

  const unsubLost = onSnapshot(
    lostQuery,
    (snapshot) => {
      snapshot.docs.forEach((item) => byId.set(item.id, { id: item.id, ...item.data() } as MatchRecord));
      emit();
    },
    onError,
  );
  const unsubFound = onSnapshot(
    foundQuery,
    (snapshot) => {
      snapshot.docs.forEach((item) => byId.set(item.id, { id: item.id, ...item.data() } as MatchRecord));
      emit();
    },
    onError,
  );

  return () => {
    unsubLost();
    unsubFound();
  };
}

export async function startChatForMatch(matchId: string): Promise<string> {
  const callable = httpsCallable<{ matchId: string }, { chatId: string }>(functions, "startChatForMatch");
  const result = await callable({ matchId });
  return result.data.chatId;
}

export async function dismissMatch(matchId: string) {
  const callable = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, "dismissMatch");
  await callable({ matchId });
}

export async function updateMatchStatusLocal(matchId: string, status: MatchRecord["status"]) {
  await updateDoc(doc(db, "matches", matchId), { status });
}
