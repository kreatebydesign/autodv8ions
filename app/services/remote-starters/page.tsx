import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import CompustarProductGrid from "@/components/site/CompustarProductGrid";
import RemoteStarterInquirySection, {
  RemoteStarterInquiryForm,
} from "@/components/site/RemoteStarterInquirySection";
import ServicePageShell from "@/components/site/ServicePageShell";
import { getEnabledCompustarProducts } from "@/lib/constants/compustar-remote-starters";
import { REMOTE_STARTER_INSTALL_PACKAGES } from "@/lib/constants/remote-starter-packages";

export const metadata: Metadata = {
  title: "Remote Starter Installation in Altoona, PA",
  description:
    "Compustar remote starter sales and professional installation in Altoona, PA from AutoDV8ions — find the right system for your vehicle and request your quote today.",
  alternates: { canonical: "/services/remote-starters" },
};

const WINTER_BENEFITS = [
  {
    title: "Warm cabin before you leave",
    copy: "Start the engine from inside so heat can build before you buckle in.",
  },
  {
    title: "Defrost head start",
    copy: "Give windows and mirrors a chance to clear when your vehicle supports it.",
  },
  {
    title: "Installed for your vehicle",
    copy: "Harnessing, bypass, and remote choice depend on year, make, and model.",
  },
  {
    title: "Local shop, straight answers",
    copy: "Serving Altoona, Blair County, and surrounding Central PA communities.",
  },
] as const;

function installPackageInquiryHref(title: string) {
  return `/services/remote-starters?interest=${encodeURIComponent(title)}#consultation`;
}

const CONSULTATION_HREF = "/services/remote-starters#consultation";

export default function RemoteStartersPage() {
  const compustarProducts = getEnabledCompustarProducts();

  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Winter remote start · Compustar"
      title={
        <>
          Winter Doesn&apos;t Wait.
          <br />
          Neither Should You.
        </>
      }
      lead="Start your vehicle before stepping into the cold. AutoDV8ions sells and professionally installs Compustar remote starters in Altoona, PA. Find the right system for your car or truck and request your quote today."
      imageSrc="/images/editorial/night-street.jpg"
      imageAlt="Vehicle parked at night in winter conditions"
      ctaHref={CONSULTATION_HREF}
      ctaLabel="GET A REMOTE START QUOTE"
      heroImageClassName="object-cover object-center opacity-[0.58] sm:opacity-[0.62]"
      heroOverlayClassName="absolute inset-0 bg-gradient-to-t from-[#050505]/92 via-[#050505]/55 to-black/30"
      heroHeadingClassName="max-w-[18rem] text-[clamp(1.75rem,5.8vw,3.125rem)] font-light leading-[1.14] tracking-[-0.025em] text-balance sm:max-w-md md:max-w-xl lg:max-w-2xl"
      heroLeadClassName="mt-5 max-w-xl text-sm leading-[1.7] text-white/58 sm:max-w-2xl sm:text-[0.95rem] md:text-base"
      heroContentClassName="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <section
        id="compustar"
        className="border-b border-white/[0.04] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Compustar lineup</p>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-tight">
                Four paths. One clean install.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
                These Compustar systems represent the range we most often discuss
                for winter driving around Altoona — from all-in-one bundles to
                PRO remotes with longer advertised range. Every model is{" "}
                <span className="text-white/55">availability upon request</span>;
                we confirm fitment before we quote your vehicle.
              </p>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <Link
                href={CONSULTATION_HREF}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors duration-500 hover:text-white"
              >
                Request a quote
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <CompustarProductGrid products={compustarProducts} />
          </div>

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-white/32">
            Range figures are manufacturer advertised maximums. Buildings,
            terrain, and RF interference reduce real-world distance. Compustar
            and DroneMobile are trademarks of their respective owners;
            AutoDV8ions is an independent installer.
          </p>
        </div>
      </section>

      <section className="border-b border-white/[0.04] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Understand the options</p>
          <h2 className="max-w-2xl text-[clamp(1.35rem,2.8vw,2rem)] font-light tracking-tight">
            1-way, 2-way, smartphone control, and your vehicle
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                1-way vs 2-way
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                A{" "}
                <span className="text-white/55">1-way</span> remote sends a
                start command — you assume it worked unless you walk outside and
                check. A{" "}
                <span className="text-white/55">2-way</span> remote confirms back
                to the fob with LED or LCD feedback when the vehicle receives the
                signal, which matters on cold mornings when you do not want
                surprises.
              </p>
            </article>
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                DroneMobile smartphone control
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                DroneMobile pairs select Compustar systems with a smartphone app
                and cellular module so you can start from farther away than the
                key fob alone — subject to cell coverage, hardware, and a paid
                DroneMobile service plan. GPS and security features depend on
                module, plan, and vehicle compatibility.
              </p>
            </article>
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                Vehicle compatibility
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                Not every feature applies to every platform. Push-to-start,
                manual transmission, diesel, and factory security all change the
                install path. We review your year, make, and model before
                recommending hardware — no blanket &quot;works on all
                vehicles&quot; promises.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.04] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Winter benefits</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WINTER_BENEFITS.map((item) => (
              <article
                key={item.title}
                className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-4 py-4 sm:px-5 sm:py-5"
              >
                <h3 className="text-sm font-light text-white/88">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/40">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-sm text-white/40">
              Ready for a winter install quote? Send your vehicle details — we
              respond after a compatibility review with clear next steps.
            </p>
            <Link
              href={CONSULTATION_HREF}
              className="inline-flex shrink-0 items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
            >
              Request a quote
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="atmosphere relative py-14 sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">Why people ask</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                Everyday convenience, done clean.
              </h2>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/45">
                <li>Cold-weather comfort before you leave the house.</li>
                <li>Warm-weather pre-conditioning where the vehicle supports it.</li>
                <li>Installed as a proper system — not a quick bolt-on.</li>
                <li>Advice based on what your vehicle can actually take.</li>
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-white/35">
                Compatibility isn&apos;t automatic. We check the vehicle before we
                promise a path forward.
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden lg:col-span-7">
              <Image
                src="/images/editorial/key-fob.jpg"
                alt="Vehicle remote key fob"
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 55vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="options"
        className="border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">In-shop install paths</p>
          <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
            Proven starting points — quoted per vehicle.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
            Alongside the Compustar systems above, these are familiar install
            paths we still quote in the shop. Final hardware and labor depend on
            your vehicle — request a quote and we&apos;ll outline what fits.
          </p>

          <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-2">
            {REMOTE_STARTER_INSTALL_PACKAGES.map((item) => (
              <article
                key={item.title}
                className="panel flex h-full flex-col overflow-hidden p-5 sm:p-6"
              >
                <div className="relative mb-4 flex h-[13.25rem] items-center justify-center overflow-hidden sm:mb-5 sm:h-[15rem]">
                  <div
                    className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_38%,transparent_72%)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-[22%] bottom-[6%] h-8 rounded-[100%] bg-black/35 blur-lg"
                    aria-hidden
                  />
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    width={379}
                    height={616}
                    className="relative z-[1] h-[118%] w-auto max-w-[12rem] object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:max-w-[13.5rem]"
                    sizes="(max-width:640px) 192px, 216px"
                  />
                </div>

                <h3 className="text-lg font-light leading-snug text-white/90">
                  {item.title}
                </h3>

                <ul className="mt-5 flex-1 space-y-3 text-sm leading-relaxed text-white/45">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)] opacity-80"
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={installPackageInquiryHref(item.title)}
                  className="mt-6 inline-flex w-full items-center justify-center border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.16em] text-white/75 transition-colors duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.07] hover:text-white sm:w-auto"
                >
                  Ask about this system
                </Link>
              </article>
            ))}
          </div>

          <article className="panel mt-6 p-5 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <p className="label-mono mb-3 text-white/40">Premium add-on</p>
                <h3 className="text-lg font-light text-white/90">
                  DroneMobile smartphone control
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                  Add smartphone start, lock, and status from the DroneMobile app
                  when your Compustar system supports it. Requires a compatible
                  DroneMobile module and an active paid subscription — we quote
                  hardware and install together with your remote start package.
                </p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link
                  href="/services/remote-starters?interest=dronemobile#consultation"
                  className="inline-flex w-full items-center justify-center gap-2 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] sm:w-auto lg:justify-end"
                >
                  Request a quote
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-white/[0.04] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">The process</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Share the vehicle",
                copy: "Year, make, model, and how you use it.",
              },
              {
                title: "Compatibility check",
                copy: "We confirm what is realistic for that platform.",
              },
              {
                title: "Quote if it fits",
                copy: "Personalized pricing when the vehicle and system line up.",
              },
            ].map((item) => (
              <article key={item.title} className="panel p-5 sm:p-6">
                <h3 className="text-base font-light text-white/90">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/40">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={CONSULTATION_HREF}
              className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
            >
              Get started
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section
        id="consultation"
        className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <Suspense
              fallback={
                <>
                  <p className="label-mono mb-4 text-white/40">Request a quote</p>
                  <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                    Tell us about your vehicle
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/45">
                    Loading the quote form…
                  </p>
                </>
              }
            >
              <RemoteStarterInquirySection />
            </Suspense>
          </div>
          <div className="lg:col-span-7">
            <Suspense
              fallback={
                <div className="panel p-6 sm:p-8 text-sm text-white/40">
                  Loading form…
                </div>
              }
            >
              <RemoteStarterInquiryForm />
            </Suspense>
          </div>
        </div>
      </section>
    </ServicePageShell>
  );
}
