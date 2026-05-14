import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { chatMessageSchema } from "@/lib/validation";
import type { Chat, ChatMessage } from "@/types/domain";

export function subscribeToUserChats(uid: string, onData: (items: Chat[]) => void, onError: (error: Error) => void) {
  const chatsQuery = query(collection(db, "chats"), where("participantUids", "array-contains", uid), orderBy("updatedAt", "desc"));
  return onSnapshot(
    chatsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Chat)),
    onError,
  );
}

export function subscribeToChatMessages(chatId: string, onData: (items: ChatMessage[]) => void, onError: (error: Error) => void) {
  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(
    messagesQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ChatMessage)),
    onError,
  );
}

export async function sendChatMessage(chatId: string, senderUid: string, body: string) {
  const values = chatMessageSchema.parse({ body });
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderUid,
    body: values.body,
    system: false,
    createdAt: serverTimestamp(),
  });
}
