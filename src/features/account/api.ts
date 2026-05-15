import { httpsCallable } from "firebase/functions";
import { assertFirebaseConfigured, functions } from "@/firebase/config";

type DeleteAllMyLogsResponse = {
  ok: boolean;
  deleted: number;
};

type DeleteMyDataExceptAccountResponse = {
  ok: boolean;
  deleted: {
    logs: number;
    reports: number;
    matches: number;
    chats: number;
    photos: number;
  };
};

export async function deleteAllMyLogs() {
  assertFirebaseConfigured();
  const callable = httpsCallable<Record<string, never>, DeleteAllMyLogsResponse>(functions, "deleteAllMyLogs");
  const response = await callable({});
  return response.data;
}

export async function deleteMyDataExceptAccount() {
  assertFirebaseConfigured();
  const callable = httpsCallable<Record<string, never>, DeleteMyDataExceptAccountResponse>(functions, "deleteMyDataExceptAccount");
  const response = await callable({});
  return response.data;
}
