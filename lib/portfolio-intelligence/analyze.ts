import type {
  IntelligenceMediaInput,
  LiveShowcaseItemInput,
  PortfolioIntelligenceAnalysis,
  PortfolioIntelligenceAdapter,
  PortfolioRecommendation,
  ScoringWeights,
  IntelligenceItemInput,
} from "./types";
import {
  DEFAULT_SCORING_WEIGHTS,
  PORTFOLIO_INTELLIGENCE_MODEL_VERSION,
} from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function megapixels(media: IntelligenceMediaInput) {
  if (!media.width || !media.height) return 0;
  return (media.width * media.height) / 1_000_000;
}

function scoreImage(media: IntelligenceMediaInput) {
  if (media.mediaType !== "image" || !media.hasBlob) return 0;
  if (media.processingStatus !== "ready_for_review") return 20;

  const mp = megapixels(media);
  const minEdge = Math.min(media.width || 0, media.height || 0);
  let score = 40;

  if (mp >= 8) score += 30;
  else if (mp >= 4) score += 22;
  else if (mp >= 2) score += 14;
  else if (mp >= 1) score += 8;
  else score += 2;

  if (minEdge >= 1600) score += 18;
  else if (minEdge >= 1200) score += 12;
  else if (minEdge >= 900) score += 6;
  else score -= 8;

  const ratio =
    media.width && media.height ? media.width / media.height : 1;
  if (ratio >= 1.4 && ratio <= 2.2) score += 8;
  if (ratio >= 0.75 && ratio <= 1.35) score += 4;

  return clamp(score);
}

function pickHeroImage(images: IntelligenceMediaInput[]) {
  const ranked = [...images]
    .filter((m) => m.mediaType === "image" && m.hasBlob)
    .sort((a, b) => scoreImage(b) - scoreImage(a));
  return ranked[0] || null;
}

function scoreImageSet(media: IntelligenceMediaInput[]) {
  const images = media.filter((m) => m.mediaType === "image");
  const ready = images.filter(
    (m) => m.hasBlob && m.processingStatus === "ready_for_review",
  );
  if (ready.length === 0) {
    return {
      imageQuality: 0,
      imageCount: 0,
      heroImage: 0,
      suggestedFeaturedMediaId: null as string | null,
      suggestedGalleryOrder: [] as string[],
      weaknesses: ["No ready photography yet"],
      reasons: [] as string[],
    };
  }

  const scores = ready.map((m) => scoreImage(m));
  const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length;
  const hero = pickHeroImage(ready);
  const heroScore = hero ? scoreImage(hero) : avg;
  const countScore = clamp(ready.length * 12 + (ready.length >= 4 ? 18 : 0));
  const duplicatePenalty =
    new Set(ready.map((m) => `${m.width}x${m.height}`)).size < ready.length / 2
      ? 8
      : 0;

  const suggestedGalleryOrder = [...ready]
    .sort((a, b) => scoreImage(b) - scoreImage(a))
    .map((m) => m.id);

  const reasons: string[] = [];
  const weaknesses: string[] = [];

  if (heroScore >= 85) reasons.push("Excellent hero framing");
  else if (heroScore >= 70) reasons.push("Strong hero candidate");
  else weaknesses.push("Hero image could be stronger");

  if (avg >= 75) reasons.push("High-resolution photography");
  else if (avg < 55) weaknesses.push("Overall resolution is limited");

  if (ready.length >= 4) reasons.push("Healthy gallery depth");
  else weaknesses.push("Limited photo coverage");

  if (duplicatePenalty > 0) weaknesses.push("Several near-duplicate angles");

  return {
    imageQuality: clamp(avg - duplicatePenalty),
    imageCount: countScore,
    heroImage: heroScore,
    suggestedFeaturedMediaId: hero?.id ?? null,
    suggestedGalleryOrder,
    weaknesses,
    reasons,
  };
}

function scoreProcessing(media: IntelligenceMediaInput[]) {
  if (media.length === 0) return { score: 0, complete: false };
  const ready = media.filter((m) => m.processingStatus === "ready_for_review")
    .length;
  const failed = media.filter((m) => m.processingStatus === "failed").length;
  const pending = media.length - ready - failed;
  if (failed > 0) return { score: 25, complete: false };
  if (pending > 0) return { score: 55, complete: false };
  return { score: 100, complete: true };
}

function scoreEditorial(item: IntelligenceItemInput) {
  let score = 35;
  if (item.vehicle.trim().length >= 3) score += 20;
  if (item.workDate) score += 15;
  if (item.description?.trim()) score += 15;
  if (item.shadePercentage?.trim()) score += 15;
  return clamp(score);
}

function scoreRecency(item: IntelligenceItemInput, now = new Date()) {
  const basis = item.workDate || item.createdAt;
  if (!basis) return 45;
  const ageDays =
    (now.getTime() - Date.parse(basis)) / (1000 * 60 * 60 * 24);
  if (ageDays <= 14) return 100;
  if (ageDays <= 45) return 85;
  if (ageDays <= 120) return 65;
  return 40;
}

function scoreVariety(
  category: string,
  liveShowcase: LiveShowcaseItemInput[],
) {
  if (liveShowcase.length === 0) {
    return { score: 85, reason: "Adds the first live showcase variety" };
  }
  const same = liveShowcase.filter((item) => item.vehicleCategory === category)
    .length;
  const ratio = same / liveShowcase.length;
  if (ratio === 0) {
    return { score: 95, reason: `Adds ${category.replace("_", " ")} variety` };
  }
  if (ratio >= 0.45) {
    return {
      score: 35,
      reason: `Current showcase already has several ${category.replace("_", " ")} entries`,
    };
  }
  return { score: 72, reason: "Balanced category mix" };
}

function categoryInterest(category: string) {
  switch (category) {
    case "exotic":
      return 100;
    case "luxury":
      return 92;
    case "performance":
      return 88;
    case "truck":
      return 78;
    case "suv":
      return 74;
    case "coupe":
      return 76;
    case "sedan":
      return 62;
    case "commercial":
      return 55;
    default:
      return 58;
  }
}

function recommendationFromScore(
  score: number,
  liveShowcase: LiveShowcaseItemInput[],
): PortfolioRecommendation {
  const liveFull = liveShowcase.length >= 12;
  if (score >= 90) return "homepage_feature";
  if (score >= 75) return "publish";
  if (score >= 60) return liveFull ? "publish_if_needed" : "publish_if_needed";
  if (score >= 40) return "hold";
  return "skip";
}

export function findReplacementCandidate(input: {
  candidateScore: number;
  candidateCategory: string;
  liveShowcase: LiveShowcaseItemInput[];
}): { id: string | null; reason: string | null } {
  const replaceable = input.liveShowcase.filter((item) => !item.pinned);
  if (replaceable.length === 0) {
    return { id: null, reason: null };
  }

  const sameCategory = replaceable
    .filter((item) => item.vehicleCategory === input.candidateCategory)
    .sort((a, b) => a.portfolioScore - b.portfolioScore);

  if (sameCategory.length > 0 && input.candidateScore >= sameCategory[0].portfolioScore + 8) {
    return {
      id: sameCategory[0].id,
      reason: `Replaces older lower-scoring ${input.candidateCategory.replace("_", " ")} entry`,
    };
  }

  const weakest = [...replaceable].sort((a, b) => {
    if (a.portfolioScore !== b.portfolioScore) {
      return a.portfolioScore - b.portfolioScore;
    }
    const aTime = Date.parse(a.publishedAt || "") || 0;
    const bTime = Date.parse(b.publishedAt || "") || 0;
    return aTime - bTime;
  })[0];

  if (weakest && input.candidateScore >= weakest.portfolioScore + 12) {
    return {
      id: weakest.id,
      reason: "Replaces older low-scoring live project",
    };
  }

  return { id: null, reason: null };
}

export function analyzePortfolioItem(input: {
  item: IntelligenceItemInput;
  liveShowcase: LiveShowcaseItemInput[];
  adapter: PortfolioIntelligenceAdapter;
  weights?: ScoringWeights;
  now?: Date;
}): PortfolioIntelligenceAnalysis {
  const weights = input.weights || DEFAULT_SCORING_WEIGHTS;
  const classification = input.adapter.classifyVehicle({
    vehicle: input.item.vehicle,
    driveFolderName: input.item.driveFolderName,
    media: input.item.media,
  });

  const mediaScores = scoreImageSet(input.item.media);
  const processing = scoreProcessing(input.item.media);
  const editorial = scoreEditorial(input.item);
  const recency = scoreRecency(input.item, input.now);
  const variety = scoreVariety(classification.category, input.liveShowcase);
  const interest = categoryInterest(classification.category);

  const weighted =
    mediaScores.imageQuality * weights.imageQuality +
    mediaScores.imageCount * weights.imageCount +
    mediaScores.heroImage * weights.heroImage +
    processing.score * weights.processingComplete +
    editorial * weights.editorialComplete +
    recency * weights.recency +
    variety.score * weights.variety +
    interest * weights.categoryInterest;

  const portfolioScore = Math.round(clamp(weighted));
  const recommendation = recommendationFromScore(
    portfolioScore,
    input.liveShowcase,
  );
  const replacement = findReplacementCandidate({
    candidateScore: portfolioScore,
    candidateCategory: classification.category,
    liveShowcase: input.liveShowcase,
  });

  const reasons = [...mediaScores.reasons];
  if (variety.reason) reasons.push(variety.reason);
  if (processing.complete) reasons.push("Media processing fully complete");
  if (editorial >= 80) reasons.push("Editorial fields are complete");

  const weaknesses = [...mediaScores.weaknesses];
  if (!processing.complete) weaknesses.push("Media processing not fully complete");
  if (!input.item.workDate) weaknesses.push("Work date needs confirmation");
  if (variety.score < 50) weaknesses.push("Category already overrepresented live");

  const confidence = Math.min(
    0.99,
    classification.confidence * 0.35 +
      (mediaScores.imageQuality / 100) * 0.35 +
      (processing.complete ? 0.2 : 0.08) +
      (editorial / 100) * 0.1,
  );

  const qualitySummary =
    portfolioScore >= 90
      ? "Exceptional showcase candidate"
      : portfolioScore >= 75
        ? "Strong portfolio candidate"
        : portfolioScore >= 60
          ? "Usable, but not priority"
          : "Hold / skip";

  return {
    portfolioScore,
    recommendation,
    vehicleCategory: classification.category,
    qualitySummary,
    reasons,
    weaknesses,
    suggestedFeaturedMediaId: mediaScores.suggestedFeaturedMediaId,
    suggestedGalleryOrder: mediaScores.suggestedGalleryOrder,
    suggestedPin:
      portfolioScore >= 92 &&
      recommendation === "homepage_feature" &&
      !input.item.pinned,
    replacementCandidateId: replacement.id,
    replacementReason: replacement.reason,
    confidence: Number(confidence.toFixed(2)),
    modelVersion: PORTFOLIO_INTELLIGENCE_MODEL_VERSION,
  };
}
