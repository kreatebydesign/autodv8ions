import type { PublicPortfolioCard } from "@/lib/live-portfolio/public-portfolio";

/** Still published on /recent-work; excluded from homepage rotation only. */
export const HOMEPAGE_EXCLUDED_SLUG_FRAGMENTS = ["15-honda-pilot"] as const;

function isExcludedFromHomepage(slug: string) {
  return HOMEPAGE_EXCLUDED_SLUG_FRAGMENTS.some((fragment) =>
    slug.includes(fragment),
  );
}

/**
 * Art-directed homepage order (when published).
 * Matched by slug fragment so month-prefixed slugs still resolve.
 */
export const HOMEPAGE_PREFERRED_SLUG_FRAGMENTS = [
  "26-lexus-gx550",
  "20-escalade",
  "25-bmw-x3",
  "27-expedition",
] as const;

function findByFragment(
  eligible: PublicPortfolioCard[],
  fragment: string,
): PublicPortfolioCard | undefined {
  return eligible.find((item) => item.slug.includes(fragment));
}

export function curateHomepagePortfolio(
  candidates: PublicPortfolioCard[],
  limit: number,
): PublicPortfolioCard[] {
  const eligible = candidates.filter((item) => !isExcludedFromHomepage(item.slug));
  const picked: PublicPortfolioCard[] = [];

  for (const fragment of HOMEPAGE_PREFERRED_SLUG_FRAGMENTS) {
    const item = findByFragment(eligible, fragment);
    if (item && !picked.some((p) => p.id === item.id)) picked.push(item);
    if (picked.length >= limit) return picked.slice(0, limit);
  }

  for (const item of eligible) {
    if (picked.some((p) => p.id === item.id)) continue;
    picked.push(item);
    if (picked.length >= limit) break;
  }

  return picked.slice(0, limit);
}
