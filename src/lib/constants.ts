import type { AppSettings } from "@/types/domain";

function envList(value?: string): string[] | null {
  if (!value) {
    return null;
  }

  const values = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return values.length ? values : null;
}

export const allowedEmailDomains = envList(process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS) ?? [];

export const defaultSettings: AppSettings = {
  allowedEmailDomains,
  categories: [
    "Wallet",
    "Phone",
    "Laptop",
    "Keys",
    "ID card",
    "Bag",
    "Bottle",
    "Book",
    "Charger",
    "Other",
  ],
  campusZones: [
    "Main Library",
    "Student Center",
    "Engineering Building",
    "Cafeteria",
    "Gym",
    "Dorms",
    "Parking",
    "Administration",
  ],
  minMatchScore: 0.72,
  maxCandidateMatches: 10,
};

export const maxPhotosPerReport = 5;
