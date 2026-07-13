export const PORTFOLIO_INTELLIGENCE_MODEL_VERSION = "kxd-portfolio-intelligence-v1";

export const PORTFOLIO_INTELLIGENCE_BATCH_LIMIT = 12;

export type PortfolioRecommendation =
  | "homepage_feature"
  | "publish"
  | "publish_if_needed"
  | "hold"
  | "skip";

export type VehicleCategory =
  | "exotic"
  | "luxury"
  | "performance"
  | "truck"
  | "suv"
  | "sedan"
  | "coupe"
  | "daily_driver"
  | "commercial"
  | "other";

export type IntelligenceMediaInput = {
  id: string;
  mediaType: "image" | "video";
  filename: string;
  width: number | null;
  height: number | null;
  bytes?: number | null;
  processingStatus: string;
  hasBlob: boolean;
  sortOrder: number;
  isFeatured: boolean;
};

export type IntelligenceItemInput = {
  id: string;
  vehicle: string;
  workDate: string | null;
  description: string | null;
  shadePercentage: string | null;
  published: boolean;
  pinned: boolean;
  createdAt: string | null;
  driveFolderName: string | null;
  media: IntelligenceMediaInput[];
};

export type LiveShowcaseItemInput = {
  id: string;
  vehicle: string;
  vehicleCategory: VehicleCategory;
  portfolioScore: number;
  publishedAt: string | null;
  pinned: boolean;
};

export type PortfolioIntelligenceAnalysis = {
  portfolioScore: number;
  recommendation: PortfolioRecommendation;
  vehicleCategory: VehicleCategory;
  qualitySummary: string;
  reasons: string[];
  weaknesses: string[];
  suggestedFeaturedMediaId: string | null;
  suggestedGalleryOrder: string[];
  suggestedPin: boolean;
  replacementCandidateId: string | null;
  replacementReason: string | null;
  confidence: number;
  modelVersion: string;
};

export type PortfolioIntelligenceRecord = PortfolioIntelligenceAnalysis & {
  galleryItemId: string;
  ignored: boolean;
  analyzedAt: string;
  staleAt: string | null;
};

export type PortfolioIntelligenceAdapter = {
  id: string;
  classifyVehicle: (input: {
    vehicle: string;
    driveFolderName: string | null;
    media: IntelligenceMediaInput[];
  }) => { category: VehicleCategory; confidence: number; label: string };
};

export type ScoringWeights = {
  imageQuality: number;
  imageCount: number;
  heroImage: number;
  processingComplete: number;
  editorialComplete: number;
  recency: number;
  variety: number;
  categoryInterest: number;
};

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  imageQuality: 0.28,
  imageCount: 0.12,
  heroImage: 0.14,
  processingComplete: 0.16,
  editorialComplete: 0.08,
  recency: 0.08,
  variety: 0.1,
  categoryInterest: 0.04,
};
