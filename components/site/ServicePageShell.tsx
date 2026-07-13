import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export default function ServicePageShell({
  activeHref,
  eyebrow,
  title,
  lead,
  imageSrc,
  imageAlt,
  children,
  ctaHref,
  ctaLabel,
}: {
  activeHref: string;
  eyebrow: string;
  title: string;
  lead: string;
  imageSrc?: string;
  imageAlt?: string;
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <>
      <SiteHeader
        activeHref={activeHref}
        ctaHref={ctaHref || "/contact"}
        ctaLabel={ctaLabel || "Contact"}
      />
      <main className="pt-[4.5rem]">
        <section className="relative overflow-hidden border-b border-white/[0.05]">
          {imageSrc ? (
            <div className="absolute inset-0">
              <Image
                src={imageSrc}
                alt={imageAlt || ""}
                fill
                className="object-cover opacity-45"
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-black/55" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(201,0,0,0.08),transparent_50%)]" />
          )}
          <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
            <p className="label-mono mb-4 text-white/45">{eyebrow}</p>
            <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-light tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
              {lead}
            </p>
            {ctaHref && ctaLabel ? (
              <Link
                href={ctaHref}
                className="mt-8 inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
              >
                {ctaLabel}
                <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
