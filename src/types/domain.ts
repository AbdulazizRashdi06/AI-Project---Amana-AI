import type { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  campusId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ReportType = "lost" | "found";
export type ReportStatus = "open" | "matched" | "in_chat" | "resolved" | "hidden";
export type AiProcessingStatus = "pending" | "processed" | "failed";

export type ItemReport = {
  id: string;
  type: ReportType;
  ownerUid: string;
  title: string;
  description: string;
  category: string;
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
  aiProcessingStatus: AiProcessingStatus;
  aiProcessingError?: string | null;
  visibility: "public_matchable" | "private_hidden";
  resolvedAt?: Timestamp | null;
};

export type MatchStatus =
  | "suggested"
  | "dismissed"
  | "chat_started"
  | "resolved"
  | "rejected";

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
  status: MatchStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  generatedBy: {
    provider: "openai";
    embeddingModel: string;
    reasoningModel: string;
    version: string;
  };
};

export type ReportSummary = {
  title: string;
  category: string;
  locationText: string;
  photoUrls: string[];
  eventDate: Timestamp | null;
};

export type Chat = {
  id: string;
  matchId: string;
  participantUids: string[];
  lostReportId: string;
  foundReportId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: "active" | "closed" | "reported";
};

export type ChatMessage = {
  id: string;
  senderUid: string;
  body: string;
  createdAt: Timestamp;
  system: boolean;
};

export type AppSettings = {
  allowedEmailDomains: string[];
  categories: string[];
  campusZones: string[];
  minMatchScore: number;
  maxCandidateMatches: number;
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
  id: string;
  reportId: string;
  ownerUid: string;
  step: AiLogStep;
  model?: string | null;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  matchId?: string | null;
  candidateReportId?: string | null;
  createdAt: Timestamp;
};

export type CreateReportInput = {
  type: ReportType;
  title: string;
  description: string;
  category: string;
  locationText: string;
  campusZone?: string | null;
  eventDate?: Date | null;
  photoUris: string[];
};
