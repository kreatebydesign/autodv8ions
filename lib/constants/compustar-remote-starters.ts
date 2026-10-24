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
        "All-in-one 2-way LED kit with the CM-DC3 module and bypass built in — good when you want fob confirmation without jumping to a PRO remote.",
      features: [
        "2-way LED tells you when the vehicle gets the start",
        "CM-DC3 control module with integrated bypass in the bundle",
        "Two water-resistant G15-style remotes included",
        "DroneMobile-ready; add LTE hardware and a service plan if you want phone control",
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
        "2-way LCD remote — you see status on the screen instead of guessing from an LED blink.",
      features: [
        "Full-color LCD for vehicle status and menus",
        "2-way feedback when the start command lands",
        "Phone control with DroneMobile when you add compatible LTE hardware",
        "Advertised range suited to driveways, lots, and short street parking",
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
        "PRO-series 2-way LED with longer advertised range and a tougher remote — IPX-7 rated for wet, sloppy weather.",
      features: [
        "2-way LED confirmation on the fob",
        "USB-rechargeable PRO remote body",
        "Proximity unlock on vehicles and platforms that support it",
        "DroneMobile app control when LTE module and plan are added",
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
        "Top-tier PRO 2-way LCD — the longest advertised range in this lineup, with a screen that shows what the truck actually did.",
      features: [
        "2-way LCD with detailed vehicle status readouts",
        "IPX-7-rated remote housing",
        "USB-rechargeable; proximity unlock where the vehicle allows it",
        "DroneMobile smartphone control with compatible LTE add-on",
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
