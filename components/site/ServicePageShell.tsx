import Image from "next/image";
import RemoteStarterHeroVideo from "@/components/site/RemoteStarterHeroVideo";
import SamePageHashLink from "@/components/site/SamePageHashLink";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import {
  TINT_QUOTE_HEADER_CTA_LABEL,
  TINT_QUOTE_HREF,
} from "@/lib/site/tint-quote-cta";

export type ServiceHeroVideo = {
  src: string;
  posterSrc: string;
  posterAlt: string;
};

export default function ServicePageShell({
  activeHref,
  eyebrow,
  title,
  lead,
  imageSrc,
  imageAlt,
  heroVideo,
  children,
  ctaHref,
  ctaLabel,
  heroImageClassName,
  heroOverlayClassName,
  heroHeadingClassName,
  heroLeadClassName,
  heroContentClassName,
  heroSectionClassName,
  heroVideoForegroundClassName,
  headerCtaHref,
  headerCtaLabel,
}: {
  activeHref: string;
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  imageSrc?: string;
  imageAlt?: string;
  /** Cinematic loop — poster image doubles as reduced-motion fallback. */
  heroVideo?: ServiceHeroVideo;
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  /** Optional hero overrides — defaults match existing service pages. */
  heroImageClassName?: string;
  heroOverlayClassName?: string;
  heroHeadingClassName?: string;
  heroLeadClassName?: string;
  heroContentClassName?: string;
  heroSectionClassName?: string;
  heroVideoForegroundClassName?: string;
  /** Header CTA defaults to tint quote when omitted. */
  headerCtaHref?: string;
  headerCtaLabel?: string;
}) {
  const imageClassName =
    heroImageClassName ?? "object-cover opacity-45";
  const overlayClassName =
    heroOverlayClassName ??
    "absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-black/55";
  const headingClassName =
    heroHeadingClassName ??
    "max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-light tracking-[-0.02em]";
  const leadClassName =
    heroLeadClassName ??
    "mt-5 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base";
  const contentClassName =
    heroContentClassName ??
    "relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12";
  return (
    <>
      <SiteHeader
        activeHref={activeHref}
        ctaHref={headerCtaHref ?? TINT_QUOTE_HREF}
        ctaLabel={headerCtaLabel ?? TINT_QUOTE_HEADER_CTA_LABEL}
      />
      <main className="pt-[4.5rem]">
        <section
          className={`relative overflow-hidden border-b border-white/[0.05] ${heroSectionClassName ?? ""}`}
        >
          {heroVideo ? (
            <div className="absolute inset-0 bg-[#050505]">
              <RemoteStarterHeroVideo
                videoSrc={heroVideo.src}
                posterSrc={heroVideo.posterSrc}
                posterAlt={heroVideo.posterAlt}
                overlayClassName={overlayClassName}
                foregroundOpacityClassName={heroVideoForegroundClassName}
              />
            </div>
          ) : imageSrc ? (
            <div className="absolute inset-0">
              <Image
                src={imageSrc}
                alt={imageAlt || ""}
                fill
                className={imageClassName}
                priority
                sizes="100vw"
              />
              <div className={overlayClassName} />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(201,0,0,0.08),transparent_50%)]" />
          )}
          <div className={contentClassName}>
            <p className="label-mono mb-4 text-white/45">{eyebrow}</p>
            <h1 className={headingClassName}>{title}</h1>
            <p className={leadClassName}>{lead}</p>
            {ctaHref && ctaLabel ? (
              <SamePageHashLink
                href={ctaHref}
                className="mt-8 inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
              >
                {ctaLabel}
                <span aria-hidden>→</span>
              </SamePageHashLink>
            ) : null}
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
