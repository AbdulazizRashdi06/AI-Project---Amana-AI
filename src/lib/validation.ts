import { z } from "zod";
import { defaultSettings, maxPhotosPerReport } from "@/lib/constants";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");

export const passwordSchema = z.string().min(8, "Use at least 8 characters.");

export const reportSchema = z.object({
  type: z.enum(["lost", "found"]),
  title: z.string().trim().min(3, "Add a specific title.").max(80),
  description: z
    .string()
    .trim()
    .min(1, "Add a short description.")
    .max(1000),
  category: z
    .string()
    .min(1, "Choose a category.")
    .refine((category) => defaultSettings.categories.includes(category), "Choose a valid category."),
  locationText: z.string().trim().min(2, "Add a campus location.").max(120),
  campusZone: z.string().nullable().optional(),
  eventDate: z.date().nullable().optional(),
  photoUris: z.array(z.string()).max(maxPhotosPerReport, "Add up to 5 photos."),
});

export const chatMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty.").max(1000),
});

export type ReportFormValues = z.infer<typeof reportSchema>;
