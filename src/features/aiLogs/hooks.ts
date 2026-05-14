import { useEffect, useState } from "react";
import { subscribeToUserAiLogs } from "@/features/aiLogs/api";
import type { AiLogRecord } from "@/types/domain";

export function useUserAiLogs(uid?: string) {
  const [logs, setLogs] = useState<AiLogRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLogs([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUserAiLogs(
      uid,
      (items) => {
        setLogs(items);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );
  }, [uid]);

  return { logs, loading, error };
}
