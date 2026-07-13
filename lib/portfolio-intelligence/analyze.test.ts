import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzePortfolioItem, findReplacementCandidate } from "./analyze";
import { automotiveIntelligenceAdapter } from "./adapters/automotive";
import type { IntelligenceItemInput, LiveShowcaseItemInput } from "./types";

function sampleItem(
  overrides: Partial<IntelligenceItemInput> = {},
): IntelligenceItemInput {
  return {
    id: "item-1",
    vehicle: "26 Denali",
    workDate: null,
    description: null,
    shadePercentage: null,
    published: false,
    pinned: false,
    createdAt: "2026-07-01T00:00:00Z",
    driveFolderName: "26 Denali",
    media: [
      {
        id: "m1",
        mediaType: "image",
        filename: "hero.jpg",
        width: 4032,
        height: 3024,
        processingStatus: "ready_for_review",
        hasBlob: true,
        sortOrder: 0,
        isFeatured: false,
      },
      {
        id: "m2",
        mediaType: "image",
        filename: "side.jpg",
        width: 3200,
        height: 2400,
        processingStatus: "ready_for_review",
        hasBlob: true,
        sortOrder: 1,
        isFeatured: false,
      },
    ],
    ...overrides,
  };
}

describe("portfolio intelligence scoring", () => {
  it("scores luxury SUV candidates strongly", () => {
    const analysis = analyzePortfolioItem({
      item: sampleItem(),
      liveShowcase: [],
      adapter: automotiveIntelligenceAdapter,
    });
    assert.ok(analysis.portfolioScore >= 60);
    assert.equal(analysis.vehicleCategory, "luxury");
    assert.ok(analysis.reasons.length > 0);
    assert.ok(analysis.suggestedFeaturedMediaId);
  });

  it("recommends replacement for weaker live SUV", () => {
    const live: LiveShowcaseItemInput[] = [
      {
        id: "live-1",
        vehicle: "Older Tahoe",
        vehicleCategory: "suv",
        portfolioScore: 58,
        publishedAt: "2026-01-01T00:00:00Z",
        pinned: false,
      },
    ];

    const replacement = findReplacementCandidate({
      candidateScore: 88,
      candidateCategory: "suv",
      liveShowcase: live,
    });
    assert.equal(replacement.id, "live-1");
  });

  it("never suggests replacing pinned projects", () => {
    const live: LiveShowcaseItemInput[] = [
      {
        id: "live-pinned",
        vehicle: "Pinned Escalade",
        vehicleCategory: "luxury",
        portfolioScore: 40,
        publishedAt: "2025-01-01T00:00:00Z",
        pinned: true,
      },
    ];

    const replacement = findReplacementCandidate({
      candidateScore: 95,
      candidateCategory: "luxury",
      liveShowcase: live,
    });
    assert.equal(replacement.id, null);
  });
});
