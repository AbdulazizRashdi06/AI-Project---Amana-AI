import { useEffect, useState } from "react";
import { subscribeToAdminChats, subscribeToAdminMatches, subscribeToAdminReports } from "@/features/admin/api";
import type { Chat, ItemReport, MatchRecord } from "@/types/domain";

export function useAdminData(enabled: boolean) {
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const onError = (nextError: Error) => setError(nextError.message);
    const unsubReports = subscribeToAdminReports(setReports, onError);
    const unsubMatches = subscribeToAdminMatches(setMatches, onError);
    const unsubChats = subscribeToAdminChats(setChats, onError);

    return () => {
      unsubReports();
      unsubMatches();
      unsubChats();
    };
  }, [enabled]);

  return { reports, matches, chats, error };
}
