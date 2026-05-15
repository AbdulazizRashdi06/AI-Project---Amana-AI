import type { Timestamp } from "firebase-admin/firestore";

export type ReportType = "lost" | "found";
export type ReportStatus = "open" | "matched" | "in_chat" | "resolved" | "hidden";

export type ItemReport = {
  id: string;
  type: ReportType;
  ownerUid: string;
  title: string;
  description: string;
  category?: string | null;
  locationText: string;
  campusZone?: string | null;
  eventDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  photoUrls: string[];
  photoStoragePaths: string[];
  status: ReportStatus;
  normalizedText?: string;
  embeddingModel?: string;
  embedding?: number[];
  aiProcessingStatus: "pending" | "processed" | "failed";
  aiProcessingError?: string | null;
  visibility: "public_matchable" | "private_hidden";
  resolvedAt?: Timestamp | null;
};

export type MatchAIResult = {
  isLikelyMatch: boolean;
  finalScore: number;
  explanation: string;
  matchedFields: string[];
  riskFlags: string[];
};

export type MatchRecord = {
  id: string;
  lostReportId: string;
  foundReportId: string;
  lostOwnerUid: string;
  foundOwnerUid: string;
  lostSummary?: ReportSummary;
  foundSummary?: ReportSummary;
  semanticScore: number;
  visualScore?: number | null;
  finalScore: number;
  explanation: string;
  matchedFields: string[];
  status: "suggested" | "dismissed" | "chat_started" | "resolved" | "rejected";
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  generatedBy: {
    provider: "openai";
    embeddingModel: string;
    reasoningModel: string;
    version: string;
  };
};

export type ReportSummary = {
  title: string;
  category?: string | null;
  locationText: string;
  photoUrls: string[];
  eventDate: Timestamp | null;
};

export type AiLogStep =
  | "process_started"
  | "process_skipped"
  | "normalize_input"
  | "embedding_request"
  | "embedding_response"
  | "candidate_search"
  | "candidate_embedding_backfill"
  | "candidate_score"
  | "rerank_request"
  | "rerank_response"
  | "match_created"
  | "match_skipped"
  | "process_complete"
  | "process_error";

export type AiLogRecord = {
  reportId: string;
  ownerUid: string;
  step: AiLogStep;
  model?: string | null;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  matchId?: string | null;
  candidateReportId?: string | null;
  createdAt: FirebaseFirestore.FieldValue;
};
