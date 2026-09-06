import type { MetadataRoute } from "next";
import { listPublishedPortfolio } from "@/lib/live-portfolio/public-portfolio";
import { absoluteUrl } from "@/lib/site/canonical";

/** Refresh periodically so published project URLs appear even if a build-time fetch fails. */
export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/services",
  "/services/window-tint",
  "/services/remote-starters",
  "/services/vehicle-security",
  "/services/audio-custom",
  "/recent-work",
  "/about",
  "/contact",
  "/tint-quote",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/services") ? 0.85 : 0.7,
  }));

  let projectEntries: MetadataRoute.Sitemap = [];
  try {
    const projects = await listPublishedPortfolio(200);
    projectEntries = projects.map((item) => ({
      url: absoluteUrl(`/recent-work/${item.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    }));
  } catch (error) {
    console.error("[sitemap] Failed to list published portfolio:", error);
  }

  return [...staticEntries, ...projectEntries];
}
