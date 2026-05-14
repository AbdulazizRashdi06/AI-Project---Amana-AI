import type { Timestamp } from "firebase/firestore";

export function formatDate(value?: Timestamp | Date | null): string {
  if (!value) {
    return "No date";
  }

  const date = "toDate" in value ? value.toDate() : value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: Timestamp | Date | null): string {
  if (!value) {
    return "";
  }

  const date = "toDate" in value ? value.toDate() : value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
