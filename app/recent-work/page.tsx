import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { listPublishedPortfolio } from "@/lib/live-portfolio/public-portfolio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Recent Tint Work",
  description:
    "Published window tint projects from AutoDV8ions in Altoona, PA — precision installs with a clean finish.",
};

const LOGO = "/images/logos/dv8-logo.png";

export default async function RecentWorkIndexPage() {
  const items = await listPublishedPortfolio(48);
  const [featured, ...rest] = items;

  return (
    <main className="portfolio-page min-h-screen">
      <header className="border-b border-white/[0.06] bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              width={180}
              height={72}
              className="h-12 w-auto object-contain opacity-95"
            />
          </Link>
          <Link
            href="/tint-quote"
            className="label-mono border border-white/10 px-4 py-2 text-white/70 transition-colors hover:text-white"
          >
            Get Quote
          </Link>
        </div>
      </header>

      <section className="atmosphere atmosphere-dark relative py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Portfolio</p>
          <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-light tracking-[-0.02em]">
            Recent Tint Work
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">
            Published window tint installs from the bay — vehicle, tint package,
            and photography as they appear after review.
          </p>

          {items.length === 0 ? (
            <div className="portfolio-empty mt-16">
              <p>No published tint projects yet.</p>
              <p className="mt-2 text-sm text-white/40">
                Approved work from Review Workspace will appear here
                automatically.
              </p>
              <Link href="/tint-quote" className="portfolio-inline-cta mt-8">
                Get a Tint Quote →
              </Link>
            </div>
          ) : (
            <div className="mt-14 space-y-8 sm:mt-20 sm:space-y-10">
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
  );
}
