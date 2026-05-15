import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Platform } from "react-native";
import { auth, db, functions } from "@/firebase/config";
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

async function startChatForMatchViaFirestore(matchId: string): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Sign in first.");
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error("Match not found.");
  }

  const match = { id: matchSnap.id, ...matchSnap.data() } as MatchRecord;
  const participant = match.lostOwnerUid === uid || match.foundOwnerUid === uid;
  if (!participant) {
    throw new Error("You are not part of this match.");
  }

  if (["dismissed", "resolved", "rejected"].includes(match.status)) {
    throw new Error("This match is no longer active.");
  }

  const chatRef = doc(db, "chats", matchId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      id: matchId,
      matchId,
      participantUids: [match.lostOwnerUid, match.foundOwnerUid],
      lostReportId: match.lostReportId,
      foundReportId: match.foundReportId,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(matchRef, { status: "chat_started", updatedAt: serverTimestamp() });
  return matchId;
}

export async function startChatForMatch(matchId: string): Promise<string> {
  if (Platform.OS === "web") {
    return startChatForMatchViaFirestore(matchId);
  }

  try {
    const callable = httpsCallable<{ matchId: string }, { chatId: string }>(functions, "startChatForMatch");
    const result = await callable({ matchId });
    return result.data.chatId;
  } catch {
    return startChatForMatchViaFirestore(matchId);
  }
}

export async function dismissMatch(matchId: string) {
  const callable = httpsCallable<{ matchId: string }, { ok: boolean }>(functions, "dismissMatch");
  await callable({ matchId });
}

export async function updateMatchStatusLocal(matchId: string, status: MatchRecord["status"]) {
  await updateDoc(doc(db, "matches", matchId), { status });
}
