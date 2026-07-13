import Image from "next/image";
import Link from "next/link";

/**
 * Single bold DV8 brand moment — official mark only, no variants.
 */
export default function BrandLogoMoment() {
  return (
    <section
      id="contact"
      className="brand-logo-moment relative overflow-hidden border-t border-white/[0.04]"
    >
      <div className="brand-logo-moment-mark" aria-hidden="true">
        <Image
          src="/images/logos/dv8-logo.png"
          alt=""
          width={900}
          height={360}
          className="brand-logo-moment-image"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <h2 className="mx-auto max-w-2xl text-[clamp(1.85rem,4vw,3rem)] font-light tracking-[-0.03em]">
          Ready when you are.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
          Tell us about the vehicle. We&apos;ll take it from there.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <Link
            href="/tint-quote"
            className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
          >
            Get Tint Quote
          </Link>
          <Link
            href="/contact"
            className="label-mono text-white/45 transition-colors duration-500 hover:text-white"
          >
            Contact the Shop
          </Link>
        </div>
      </div>
    </section>
  );
}
