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

      <article className="atmosphere atmosphere-dark relative py-14 sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <Link
            href="/recent-work"
            className="label-mono text-white/40 transition-colors hover:text-white"
          >
            ← Recent Tint Work
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-7">
              <PortfolioLightboxGallery
                vehicle={item.vehicle}
                images={images}
              />
            </div>

            <aside className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">Window Tint</p>
              <h1 className="text-[clamp(2rem,4vw,3.25rem)] font-light tracking-[-0.02em]">
                {item.vehicle}
              </h1>
              <p className="mt-4 text-sm text-white/45 sm:text-base">
                {item.serviceType} · Altoona, PA
                {item.workDate ? ` · ${formatDate(item.workDate)}` : ""}
              </p>

              {item.shadePercentage && (
                <div className="mt-8 border-t border-white/[0.08] pt-6">
                  <p className="label-mono mb-2 text-white/35">Tint package</p>
                  <p className="text-lg font-light text-white/85">
                    {item.shadePercentage}
                  </p>
                </div>
              )}

              {(item.description || item.seoDescription) && (
                <div className="mt-8 border-t border-white/[0.08] pt-6">
                  <p className="label-mono mb-3 text-white/35">About this job</p>
                  <p className="text-sm leading-relaxed text-white/55 sm:text-base">
                    {item.description || item.seoDescription}
                  </p>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/tint-quote"
                  className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
                >
                  Get Tint Quote
                </Link>
                <Link
                  href="/recent-work"
                  className="label-mono self-center text-white/40 hover:text-white"
                >
                  More projects
                </Link>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-20 border-t border-white/[0.06] pt-14 sm:mt-28">
              <p className="label-mono mb-4 text-white/40">Related</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-tight">
                More recent tint work
              </h2>
              <div className="portfolio-grid mt-10">
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
