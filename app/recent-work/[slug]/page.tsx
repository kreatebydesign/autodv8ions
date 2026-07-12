import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import PortfolioLightboxGallery from "@/components/portfolio/PortfolioLightboxGallery";
import {
  getPublishedPortfolioBySlug,
  listRelatedPublished,
} from "@/lib/live-portfolio/public-portfolio";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ slug: string }>;
};

const LOGO = "/images/logos/dv8-logo.png";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedPortfolioBySlug(slug);
  if (!item) {
    return { title: "Recent Work" };
  }

  return {
    title:
      item.seoTitle || `${item.vehicle} Window Tint | AutoDV8ions`,
    description:
      item.seoDescription ||
      item.description ||
      `Recent window tint work on a ${item.vehicle} by AutoDV8ions in Altoona, PA.`,
  };
}

export default async function RecentWorkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublishedPortfolioBySlug(slug);
  if (!item) notFound();

  const related = await listRelatedPublished(item.id, 3);
  const images = item.media
    .filter((m) => m.mediaType === "image")
    .sort((a, b) => {
      if (a.id === item.coverMediaId) return -1;
      if (b.id === item.coverMediaId) return 1;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });

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
            href="/recent-work"
            className="label-mono text-white/50 transition-colors hover:text-white"
          >
            All Recent Work
          </Link>
        </div>
      </header>

      <article className="atmosphere atmosphere-dark relative py-16 sm:py-24 lg:py-28">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <Link
            href="/recent-work"
            className="label-mono text-white/40 transition-colors duration-500 hover:text-white"
          >
            ← Recent Tint Work
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <PortfolioLightboxGallery
                vehicle={item.vehicle}
                images={images}
              />
            </div>

            <aside className="lg:col-span-5 lg:pt-2">
              <p className="label-mono mb-5 text-white/40">Window Tint</p>
              <h1 className="text-[clamp(2.1rem,4vw,3.4rem)] font-light tracking-[-0.03em]">
                {item.vehicle}
              </h1>
              <p className="mt-5 text-sm leading-relaxed text-white/45 sm:text-base">
                {item.serviceType} · Altoona, PA
                {item.workDate ? ` · ${formatDate(item.workDate)}` : ""}
              </p>

              {item.shadePercentage && (
                <div className="mt-10 border-t border-white/[0.05] pt-7">
                  <p className="label-mono mb-3 text-white/35">Tint package</p>
                  <p className="text-xl font-light tracking-tight text-white/88">
                    {item.shadePercentage}
                  </p>
                </div>
              )}

              {(item.description || item.seoDescription) && (
                <div className="mt-10 border-t border-white/[0.05] pt-7">
                  <p className="label-mono mb-4 text-white/35">About this job</p>
                  <p className="text-sm leading-[1.8] text-white/55 sm:text-base">
                    {item.description || item.seoDescription}
                  </p>
                </div>
              )}

              <div className="mt-12 flex flex-wrap gap-5">
                <Link
                  href="/tint-quote"
                  className="inline-flex items-center gap-3 border border-white/12 bg-white/[0.04] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.07]"
                >
                  Get Tint Quote
                </Link>
                <Link
                  href="/recent-work"
                  className="label-mono self-center text-white/40 transition-colors duration-500 hover:text-white"
                >
                  More projects
                </Link>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-24 border-t border-white/[0.05] pt-16 sm:mt-32 sm:pt-20">
              <p className="label-mono mb-5 text-white/40">Related</p>
              <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-light tracking-[-0.02em]">
                More recent tint work
              </h2>
              <div className="portfolio-grid mt-12">
                {related.map((rel) => (
                  <PortfolioCard key={rel.id} item={rel} />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
