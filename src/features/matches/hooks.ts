import { useEffect, useState } from "react";
import { subscribeToUserMatches } from "@/features/matches/api";
import type { MatchRecord } from "@/types/domain";

export function useUserMatches(uid?: string) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setMatches([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUserMatches(
      uid,
      (items) => {
        setMatches(items);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );
  }, [uid]);

  return { matches, loading, error };
}
