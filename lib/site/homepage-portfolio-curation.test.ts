import assert from "node:assert/strict";
import { test } from "node:test";
import {
  curateHomepagePortfolio,
  HOMEPAGE_PREFERRED_SLUG_FRAGMENTS,
} from "@/lib/site/homepage-portfolio-curation";
import type { PublicPortfolioCard } from "@/lib/live-portfolio/public-portfolio";

function card(slug: string, vehicle: string): PublicPortfolioCard {
  return {
    id: slug,
    slug,
    vehicle,
    workDate: null,
    shadePercentage: null,
    description: null,
    seoTitle: null,
    seoDescription: null,
    coverMediaId: "media-1",
    imageCount: 1,
    videoCount: 0,
    pinned: false,
  };
}

test("curateHomepagePortfolio excludes Honda Pilot and prefers art-directed slugs", () => {
  const pool = [
    card("15-honda-pilot-window-tint-altoona-pa-1qoqio4i", "15 honda pilot"),
    card("26-lexus-gx550-window-tint-altoona-pa-1bui-9kj", "26 Lexus GX550"),
    card("20-escalade-window-tint-altoona-pa-1pg-rcwm", "20 Escalade"),
    card("25-bmw-x3-window-tint-altoona-pa-1nof4poa", "25 Bmw X3"),
    card("27-expedition-window-tint-altoona-pa-14dpfahp", "27 Expedition"),
    card("18-wrangler-window-tint-altoona-pa-1bb8modu", "18 wrangler"),
  ];

  const result = curateHomepagePortfolio(pool, 4);
  assert.equal(result.length, 4);
  assert.ok(!result.some((item) => item.slug.includes("15-honda-pilot")));
  assert.deepEqual(
    result.map((item) =>
      HOMEPAGE_PREFERRED_SLUG_FRAGMENTS.find((f) => item.slug.includes(f)),
    ),
    [...HOMEPAGE_PREFERRED_SLUG_FRAGMENTS],
  );
});
