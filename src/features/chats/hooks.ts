import { useEffect, useState } from "react";
import { subscribeToChatMessages, subscribeToUserChats } from "@/features/chats/api";
import type { Chat, ChatMessage } from "@/types/domain";

export function useUserChats(uid?: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setChats([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUserChats(
      uid,
      (items) => {
        setChats(items);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );
  }, [uid]);

  return { chats, loading, error };
}

export function useChatMessages(chatId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(chatId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToChatMessages(
      chatId,
      (items) => {
        setMessages(items);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );
  }, [chatId]);

  return { messages, loading, error };
}
