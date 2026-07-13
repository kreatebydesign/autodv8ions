import type {
  IntelligenceMediaInput,
  VehicleCategory,
} from "../types";

type Rule = {
  category: VehicleCategory;
  label: string;
  keywords: string[];
  weight?: number;
};

const RULES: Rule[] = [
  {
    category: "exotic",
    label: "Exotic",
    keywords: [
      "lamborghini",
      "ferrari",
      "mclaren",
      "porsche gt",
      "gt3",
      "gt4",
      "corvette z",
      "z06",
      "z07",
      "aventador",
      "huracan",
      "812",
      "488",
    ],
    weight: 1.2,
  },
  {
    category: "performance",
    label: "Performance",
    keywords: [
      "mustang",
      "camaro",
      "charger",
      "challenger",
      "m3",
      "m4",
      "m5",
      "rs",
      "amg",
      "type r",
      "sti",
      "wrx",
      "supra",
      "zr2",
      "raptor",
      "trx",
      "hellcat",
    ],
    weight: 1.05,
  },
  {
    category: "luxury",
    label: "Luxury",
    keywords: [
      "denali",
      "escalade",
      "range rover",
      "bmw",
      "mercedes",
      "benz",
      "audi",
      "lexus",
      "cadillac",
      "lincoln",
      "genesis",
      "porsche",
      "tahoe high country",
      "yukon",
      "navigator",
    ],
    weight: 1.08,
  },
  {
    category: "truck",
    label: "Truck",
    keywords: [
      "f150",
      "f-150",
      "f250",
      "f-250",
      "f350",
      "silverado",
      "sierra",
      "ram 1500",
      "ram 2500",
      "tundra",
      "titan",
      "2500",
      "3500",
      "pickup",
    ],
    weight: 1,
  },
  {
    category: "suv",
    label: "SUV",
    keywords: [
      "expedition",
      "tahoe",
      "suburban",
      "yukon",
      "explorer",
      "traverse",
      "highlander",
      "pilot",
      "4runner",
      "wrangler",
      "grand cherokee",
      "durango",
      "cx-",
      "rav4",
      "equinox",
    ],
    weight: 1,
  },
  {
    category: "coupe",
    label: "Coupe",
    keywords: ["coupe", "convertible", "roadster", "corvette", "mustang"],
    weight: 0.98,
  },
  {
    category: "sedan",
    label: "Sedan",
    keywords: [
      "accord",
      "camry",
      "civic",
      "corolla",
      "altima",
      "malibu",
      "jetta",
      "passat",
      "model 3",
      "model s",
      "sedan",
    ],
    weight: 0.92,
  },
  {
    category: "commercial",
    label: "Commercial",
    keywords: ["sprinter", "transit", "promaster", "box truck", "fleet", "van"],
    weight: 0.85,
  },
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

export function classifyAutomotiveVehicle(input: {
  vehicle: string;
  driveFolderName: string | null;
  media: IntelligenceMediaInput[];
}): { category: VehicleCategory; confidence: number; label: string } {
  const haystack = normalize(
    [input.vehicle, input.driveFolderName || ""].filter(Boolean).join(" "),
  );

  let best: { category: VehicleCategory; label: string; score: number } | null =
    null;

  for (const rule of RULES) {
    let hits = 0;
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword)) hits += 1;
    }
    if (hits === 0) continue;
    const score = hits * (rule.weight || 1);
    if (!best || score > best.score) {
      best = { category: rule.category, label: rule.label, score };
    }
  }

  if (best) {
    const confidence = Math.min(0.95, 0.45 + best.score * 0.18);
    return {
      category: best.category,
      confidence,
      label: best.label,
    };
  }

  const imageCount = input.media.filter((m) => m.mediaType === "image").length;
  if (imageCount >= 4) {
    return {
      category: "daily_driver",
      confidence: 0.42,
      label: "Daily Driver",
    };
  }

  return { category: "other", confidence: 0.35, label: "Other" };
}

export const automotiveIntelligenceAdapter = {
  id: "automotive",
  classifyVehicle: classifyAutomotiveVehicle,
};
