import { useEffect, useState } from "react";
import { subscribeToUserReports } from "@/features/reports/api";
import type { ItemReport } from "@/types/domain";

export function useUserReports(uid?: string) {
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setReports([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUserReports(
      uid,
      (items) => {
        setReports(items);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setLoading(false);
      },
    );
  }, [uid]);

  return { reports, loading, error };
}
