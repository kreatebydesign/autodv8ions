"use client";

import Link from "next/link";
import type { PublicPortfolioCard } from "@/lib/live-portfolio/public-portfolio";
import { publicMediaUrl } from "@/lib/live-portfolio/public-media-url";
import { formatDate } from "@/lib/utils/format";

export function PortfolioCard({
  item,
  featured = false,
}: {
  item: PublicPortfolioCard;
  featured?: boolean;
}) {
  const cover = item.coverMediaId
    ? publicMediaUrl(item.coverMediaId, featured ? "large" : "medium")
    : null;

  return (
    <article className={`portfolio-card ${featured ? "is-featured" : ""}`}>
      <Link href={`/recent-work/${item.slug}`} className="portfolio-card-link">
        <div className="portfolio-card-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={item.vehicle}
              className="portfolio-card-image"
              loading={featured ? "eager" : "lazy"}
            />
          ) : (
            <div className="portfolio-card-placeholder">
              {item.vehicle.slice(0, 1)}
            </div>
          )}
          <div className="portfolio-card-veil" />
        </div>
        <div className="portfolio-card-body">
          <div>
            {featured && (
              <p className="label-mono mb-2 text-[var(--accent)] opacity-80">
                Featured
              </p>
            )}
            <h3 className="portfolio-card-title">{item.vehicle}</h3>
            <p className="portfolio-card-meta">
              {item.workDate ? formatDate(item.workDate) : "Recent work"}
              {item.shadePercentage
                ? ` · ${item.shadePercentage}`
                : " · Window Tint"}
            </p>
          </div>
          <span className="portfolio-card-cta">View Project →</span>
        </div>
      </Link>
    </article>
  );
}
