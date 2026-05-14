import { cosineSimilarity, normalizeReportText, scoreToLabel } from "@/lib/matching";
import type { ItemReport } from "@/types/domain";

function report(overrides: Partial<ItemReport>): ItemReport {
  return {
    id: "report-1",
    type: "lost",
    ownerUid: "user-1",
    title: "Black wallet",
    description: "Lost black leather wallet near the main library with ID cards inside.",
    category: "Wallet",
    locationText: "Main Library",
    campusZone: "Main Library",
    eventDate: null,
    createdAt: null as never,
    updatedAt: null as never,
    photoUrls: [],
    photoStoragePaths: [],
    status: "open",
    aiProcessingStatus: "pending",
    visibility: "public_matchable",
    ...overrides,
  };
}

describe("matching helpers", () => {
  it("maps match scores to student-facing labels", () => {
    expect(scoreToLabel(0.91)).toBe("Strong match");
    expect(scoreToLabel(0.73)).toBe("Possible match");
    expect(scoreToLabel(0.4)).toBe("Weak match");
  });

  it("calculates cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("normalizes item reports for embeddings", () => {
    const text = normalizeReportText(report({ title: "Silver laptop charger", category: "Charger" }));
    expect(text).toContain("Title: Silver laptop charger");
    expect(text).toContain("Category: Charger");
    expect(text).toContain("Type: lost");
  });
});
