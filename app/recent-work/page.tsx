import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { listPublishedPortfolio } from "@/lib/live-portfolio/public-portfolio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Recent Tint Work",
  description:
    "Published window tint projects from AutoDV8ions in Altoona, PA — precision installs with a clean finish.",
};

export default async function RecentWorkIndexPage() {
  const items = await listPublishedPortfolio(48);
  const [featured, ...rest] = items;

  return (
    <>
      <SiteHeader activeHref="/recent-work" />
      <main className="portfolio-page min-h-screen pt-[4.5rem]">
        <section className="atmosphere atmosphere-dark relative py-16 sm:py-24">
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="label-mono mb-4 text-white/40">Portfolio</p>
            <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-light tracking-[-0.02em]">
              Recent Tint Work
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45 sm:mt-6 sm:text-base">
              Published AutoDV8ions tint installs — real customer work, kept
              separate from editorial atmosphere imagery used elsewhere on the
              site.
            </p>

            {items.length === 0 ? (
              <div className="portfolio-empty mt-20">
                <p>New tint projects will appear here soon.</p>
                <p className="mt-2 text-sm text-white/40">
                  Check back for the latest installs from the shop.
                </p>
                <Link href="/tint-quote" className="portfolio-inline-cta mt-8">
                  Get a Tint Quote →
                </Link>
              </div>
            ) : (
              <div className="mt-16 space-y-10 sm:mt-24 sm:space-y-12">
                {featured && <PortfolioCard item={featured} featured />}
                {rest.length > 0 && (
                  <div className="portfolio-grid">
                    {rest.map((item) => (
                      <PortfolioCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
