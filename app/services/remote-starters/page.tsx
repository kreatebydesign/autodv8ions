import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import CompustarProductGrid from "@/components/site/CompustarProductGrid";
import RemoteStarterHashScroll from "@/components/site/RemoteStarterHashScroll";
import RemoteStarterInquirySection, {
  RemoteStarterInquiryForm,
} from "@/components/site/RemoteStarterInquirySection";
import ServicePageShell from "@/components/site/ServicePageShell";
import { getEnabledCompustarProducts } from "@/lib/constants/compustar-remote-starters";
import { REMOTE_STARTER_INSTALL_PACKAGES } from "@/lib/constants/remote-starter-packages";

export const metadata: Metadata = {
  title: "Remote Starter Installation in Altoona, PA",
  description:
    "Compustar remote starters sold and installed in Altoona, PA at AutoDV8ions. Tell us your year, make, and model — we quote the right system for your vehicle.",
  alternates: { canonical: "/services/remote-starters" },
};

const WINTER_BENEFITS = [
  {
    title: "Heat before you walk out",
    copy: "Fire it up from the house so the cabin is warming while you get ready.",
  },
  {
    title: "Help the glass clear",
    copy: "A running engine gives defrost a head start on the mornings that matter.",
  },
  {
    title: "Built for your vehicle",
    copy: "Bypass, harness, and remote choice all depend on year, make, and model.",
  },
  {
    title: "Local install, real answers",
    copy: "Altoona shop — we tell you what fits before we talk parts and labor.",
  },
] as const;

function installPackageInquiryHref(title: string) {
  return `/services/remote-starters?interest=${encodeURIComponent(title)}#consultation`;
}

const CONSULTATION_HREF = "/services/remote-starters#consultation";

const quoteCtaClass =
  "inline-flex shrink-0 items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]";

const quoteLinkClass =
  "inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors duration-500 hover:text-white";

export default function RemoteStartersPage() {
  const compustarProducts = getEnabledCompustarProducts();

  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Remote start · Altoona, PA"
      title={
        <>
          Cold mornings suck.
          <br />
          Your car doesn&apos;t have to.
        </>
      }
      lead="We sell and install Compustar remote starters at our Altoona shop. Share what you drive and we'll match the system to your vehicle — then quote the install."
      imageSrc="/images/editorial/night-street.jpg"
      imageAlt="Vehicle parked at night in winter conditions"
      ctaHref={CONSULTATION_HREF}
      ctaLabel="GET A QUOTE"
      heroImageClassName="object-cover object-center opacity-[0.58] sm:opacity-[0.62]"
      heroOverlayClassName="absolute inset-0 bg-gradient-to-t from-[#050505]/92 via-[#050505]/55 to-black/30"
      heroHeadingClassName="max-w-[20rem] text-[clamp(1.75rem,5.5vw,3rem)] font-light leading-[1.12] tracking-[-0.025em] text-balance sm:max-w-lg md:max-w-xl lg:max-w-2xl"
      heroLeadClassName="mt-5 max-w-xl text-sm leading-[1.7] text-white/58 sm:max-w-2xl sm:text-[0.95rem] md:text-base"
      heroContentClassName="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <RemoteStarterHashScroll />
      <section
        id="compustar"
        className="border-b border-white/[0.04] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Compustar systems</p>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-tight">
                Pick a starting point
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
                Four Compustar setups we quote most often around Altoona — from
                a full bundle to long-range PRO remotes. Stock and kit choice
                vary; we confirm what works on your vehicle before we price it.
              </p>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <Link href={CONSULTATION_HREF} className={quoteLinkClass}>
                Get a quote
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <CompustarProductGrid products={compustarProducts} />
          </div>

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-white/32">
            Range numbers are manufacturer maximums — buildings, hills, and
            interference cut into real-world distance. Compustar and DroneMobile
            are trademarks of their owners; AutoDV8ions is an independent
            installer.
          </p>
        </div>
      </section>

      <section className="border-b border-white/[0.04] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">How it works</p>
          <h2 className="max-w-2xl text-[clamp(1.35rem,2.8vw,2rem)] font-light tracking-tight">
            Remotes, phones, and what your car allows
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                1-way vs 2-way
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                <span className="text-white/55">1-way</span> sends start — you
                find out if it worked when you walk outside.{" "}
                <span className="text-white/55">2-way</span> pings the fob back
                with LED or screen confirmation. Handy when it&apos;s freezing
                and you don&apos;t want to guess.
              </p>
            </article>
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                DroneMobile on your phone
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                On compatible Compustar installs, DroneMobile adds app control
                over cellular — farther reach than the fob when coverage is good.
                Needs the right module, a service plan, and a vehicle that
                supports the features you want.
              </p>
            </article>
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                Fitment comes first
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                Push-to-start, manual trans, diesel, factory security — they
                all change the job. We look up your year, make, and model before
                we recommend parts. No &quot;fits everything&quot; talk.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.04] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Why bother</p>
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
              Ready to talk install? Send your vehicle details — we&apos;ll check
              compatibility and follow up with a quote.
            </p>
            <Link href={CONSULTATION_HREF} className={quoteCtaClass}>
              GET A QUOTE
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="atmosphere relative py-14 sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">Straight talk</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                Remote start done right
              </h2>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/45">
                <li>Comfort on the cold days — same button, less misery.</li>
                <li>Cool-down head start in summer when the truck allows it.</li>
                <li>Wired and programmed like a real install, not a dash hack.</li>
                <li>Advice based on your actual vehicle, not a generic kit.</li>
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-white/35">
                If the platform doesn&apos;t support what you want, we&apos;ll say
                so up front.
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
          <p className="label-mono mb-4 text-white/40">Shop packages</p>
          <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
            Install paths we quote every week
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
            Besides the Compustar cards above, these are the packages customers
            ask for by name. Hardware and labor still depend on your vehicle —
            the form below is how we price it.
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
                  Get a quote for this
                </Link>
              </article>
            ))}
          </div>

          <article className="panel mt-6 p-5 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <p className="label-mono mb-3 text-white/40">Add-on</p>
                <h3 className="text-lg font-light text-white/90">
                  DroneMobile smartphone control
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                  Start, lock, and check status from the DroneMobile app when
                  your Compustar hardware supports it. Requires their LTE module
                  and a paid plan — we quote module and install with your remote
                  start job.
                </p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link
                  href="/services/remote-starters?interest=dronemobile#consultation"
                  className={`${quoteCtaClass} w-full justify-center sm:w-auto lg:justify-end`}
                >
                  GET A QUOTE
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-white/[0.04] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Next steps</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Tell us the vehicle",
                copy: "Year, make, model, and anything unusual about how it's equipped.",
              },
              {
                title: "We check fitment",
                copy: "We verify what remote start can do on that platform.",
              },
              {
                title: "Quote if it works",
                copy: "You get numbers for parts and labor — only if the job is doable.",
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
            <Link href={CONSULTATION_HREF} className={quoteCtaClass}>
              GET A QUOTE
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section
        id="consultation"
        className="atmosphere atmosphere-dark relative scroll-mt-[4.5rem] border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <Suspense
              fallback={
                <>
                  <p className="label-mono mb-4 text-white/40">Get a quote</p>
                  <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                    Send us your vehicle info
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/45">
                    Loading the form…
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
