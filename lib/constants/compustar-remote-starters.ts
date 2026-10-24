export type CompustarProductTier =
  | "all-in-one"
  | "lcd-remote"
  | "pro-led"
  | "pro-lcd";

export type CompustarAvailabilityStatus = "availability_upon_request";

export type CompustarRemoteStarterProduct = {
  id: string;
  name: string;
  tier: CompustarProductTier;
  image: {
    src: string;
    alt: string;
  };
  shortDescription: string;
  features: readonly string[];
  /** Manufacturer advertised maximum range; real-world range varies. */
  maxAdvertisedRange: string;
  availabilityStatus: CompustarAvailabilityStatus;
  price?: string;
  enabled: boolean;
  sortOrder: number;
  /** Official Compustar product page — reference only, not an endorsement link on-site. */
  manufacturerUrl: string;
};

export const COMPUSTAR_PRODUCT_TIER_LABEL: Record<CompustarProductTier, string> = {
  "all-in-one": "All-in-one bundle",
  "lcd-remote": "2-way LCD",
  "pro-led": "PRO · 2-way LED",
  "pro-lcd": "PRO · 2-way LCD",
};

export const COMPUSTAR_AVAILABILITY_LABEL: Record<
  CompustarAvailabilityStatus,
  string
> = {
  availability_upon_request: "Availability upon request",
};

/**
 * Product photography gate — set to true only after documented Firstech/Compustar
 * dealer or media authorization. Until then the site uses a neutral placeholder.
 */
export const COMPUSTAR_USE_AUTHORIZED_PRODUCT_IMAGERY = false;

export const COMPUSTAR_PRODUCT_IMAGE_PLACEHOLDER = {
  src: "/images/remote-starters/compustar/product-showcase-placeholder.svg",
  alt: "Remote start system option — product photography pending authorized assets",
} as const;

function resolveProductImage(
  product: CompustarRemoteStarterProduct,
): CompustarRemoteStarterProduct["image"] {
  if (COMPUSTAR_USE_AUTHORIZED_PRODUCT_IMAGERY) {
    return product.image;
  }
  return {
    src: COMPUSTAR_PRODUCT_IMAGE_PLACEHOLDER.src,
    alt: `Remote start option: ${product.name}`,
  };
}

/**
 * Winter showcase lineup — specs paraphrased from Compustar product listings.
 * Availability and pricing on this page are controlled by AutoDV8ions, not the manufacturer.
 */
export const COMPUSTAR_REMOTE_STARTER_PRODUCTS: readonly CompustarRemoteStarterProduct[] =
  [
    {
      id: "cs4905-s-kit",
      name: "CS4905-S-KIT",
      tier: "all-in-one",
      image: {
        src: "/images/remote-starters/compustar/cs4905-s-kit.jpg",
        alt: "Compustar CS4905-S-KIT remote start bundle",
      },
      shortDescription:
        "Complete 2-way LED remote start bundle with built-in bypass — a strong fit when you want confirmation at the fob without stepping up to a full PRO remote.",
      features: [
        "2-way LED confirmation on the primary remote",
        "CM-DC3 module with integrated bypass",
        "Two water-resistant G15-style remotes in the kit",
        "DroneMobile-ready with optional LTE module and plan",
      ],
      maxAdvertisedRange: "Up to 3,000 ft (advertised max)",
      availabilityStatus: "availability_upon_request",
      enabled: true,
      sortOrder: 10,
      manufacturerUrl: "https://www.compustar.com/bundles/cs4905-s-kit/",
    },
    {
      id: "q9",
      name: "Q9",
      tier: "lcd-remote",
      image: {
        src: "/images/remote-starters/compustar/q9.jpg",
        alt: "Compustar Q9 2-way LCD remote",
      },
      shortDescription:
        "2-way LCD remote with clear on-screen feedback — useful when you want more detail than LED confirmation alone.",
      features: [
        "Full-color LCD for status and menus",
        "2-way confirmation when the vehicle receives the command",
        "Smartphone control when equipped with DroneMobile LTE",
        "Winter-friendly range for typical Altoona driveways and lots",
      ],
      maxAdvertisedRange: "Up to 3,000 ft (advertised max)",
      availabilityStatus: "availability_upon_request",
      enabled: true,
      sortOrder: 20,
      manufacturerUrl: "https://www.compustar.com/remotes/q9-with-lte/",
    },
    {
      id: "pro-r5",
      name: "PRO R5",
      tier: "pro-led",
      image: {
        src: "/images/remote-starters/compustar/pro-r5.jpg",
        alt: "Compustar PRO R5 2-way LED remote",
      },
      shortDescription:
        "Compustar PRO-series 2-way LED remote built for longer advertised range and everyday durability — including IPX-7-rated protection on the remote.",
      features: [
        "2-way LED confirmation",
        "USB-rechargeable PRO remote",
        "Proximity unlock where supported on your vehicle",
        "DroneMobile smartphone control with compatible LTE hardware",
      ],
      maxAdvertisedRange: "Up to 2 miles (advertised max)",
      availabilityStatus: "availability_upon_request",
      enabled: true,
      sortOrder: 30,
      manufacturerUrl: "https://www.compustar.com/remotes/pro-r5-w-lte/",
    },
    {
      id: "pro-t13",
      name: "PRO T13",
      tier: "pro-lcd",
      image: {
        src: "/images/remote-starters/compustar/pro-t13.jpg",
        alt: "Compustar PRO T13 2-way LCD remote",
      },
      shortDescription:
        "Flagship PRO 2-way LCD remote with the longest advertised range in the lineup — for drivers who want maximum feedback and reach when conditions allow.",
      features: [
        "2-way LCD with detailed vehicle status",
        "IPX-7 waterproof remote housing",
        "USB-rechargeable; proximity unlock on supported platforms",
        "Smartphone control via DroneMobile when LTE is added",
      ],
      maxAdvertisedRange: "Up to 3 miles (advertised max)",
      availabilityStatus: "availability_upon_request",
      enabled: true,
      sortOrder: 40,
      manufacturerUrl: "https://www.compustar.com/remotes/pro-t13-w-lte/",
    },
  ];

export function getEnabledCompustarProducts(): CompustarRemoteStarterProduct[] {
  return COMPUSTAR_REMOTE_STARTER_PRODUCTS
    .filter((product) => product.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((product) => ({
      ...product,
      image: resolveProductImage(product),
    }));
}
