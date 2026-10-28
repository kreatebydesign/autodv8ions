import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import RemoteStarterComingSoonSection from "@/components/site/RemoteStarterComingSoonSection";
import RemoteStarterContactHashOnLoad from "@/components/site/RemoteStarterContactHashOnLoad";
import RemoteStarterConsultation from "@/components/site/RemoteStarterConsultation";
import RemoteStarterProductCatalog from "@/components/site/RemoteStarterProductCatalog";
import ServicePageShell from "@/components/site/ServicePageShell";
import {
  REMOTE_STARTER_CONTACT_HREF,
  REMOTE_STARTER_PRODUCT_CATALOG_ENABLED,
} from "@/lib/constants/remote-starter-page";

export const metadata: Metadata = {
  title: "Remote Starter Installation in Altoona, PA",
  description: REMOTE_STARTER_PRODUCT_CATALOG_ENABLED
    ? "Compustar remote starters sold and installed in Altoona, PA at AutoDV8ions. Tell us your year, make, and model and we will quote the right system for your vehicle."
    : "Compustar remote starter installation in Altoona, PA at AutoDV8ions. Our lineup is updating. Send your vehicle details and we will help you plan the right remote start for your car or truck.",
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
    copy: "Altoona shop. We tell you what fits before we talk parts and labor.",
  },
] as const;

const primaryCtaLabel = REMOTE_STARTER_PRODUCT_CATALOG_ENABLED
  ? "GET A QUOTE"
  : "Ask About Remote Starters";

export default function RemoteStartersPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Remote start · Altoona, PA"
      title={
        REMOTE_STARTER_PRODUCT_CATALOG_ENABLED ? (
          <>
            Cold mornings suck.
            <br />
            Your car doesn&apos;t have to.
          </>
        ) : (
          <>
            Remote start,
            <br />
            installed in Altoona.
          </>
        )
      }
      lead={
        REMOTE_STARTER_PRODUCT_CATALOG_ENABLED
          ? "We sell and install Compustar remote starters at our Altoona shop. Share what you drive and we'll match the system to your vehicle, then quote the install."
          : "We install Compustar remote starters at our Altoona shop. Our model lineup is updating. Tell us what you drive and we will help you plan the right setup."
      }
      heroVideo={{
        src: "/videos/remote-starter-hero.mp4",
        posterSrc: "/images/editorial/night-street.jpg",
        posterAlt: "Vehicle parked at night in winter conditions",
      }}
      ctaHref={REMOTE_STARTER_CONTACT_HREF}
      ctaLabel={primaryCtaLabel}
      headerCtaHref={REMOTE_STARTER_CONTACT_HREF}
      headerCtaLabel={primaryCtaLabel}
      heroVideoForegroundClassName="opacity-[0.58] sm:opacity-[0.62]"
      heroOverlayClassName="absolute inset-0 bg-gradient-to-t from-[#050505]/88 via-[#050505]/45 to-black/25"
      heroSectionClassName="remote-starter-hero-section min-h-[clamp(20rem,62vw,34rem)]"
      heroHeadingClassName="max-w-[20rem] text-[clamp(1.75rem,5.5vw,3rem)] font-light leading-[1.12] tracking-[-0.025em] text-balance sm:max-w-lg md:max-w-xl lg:max-w-2xl"
      heroLeadClassName="mt-5 max-w-xl text-sm leading-[1.7] text-white/58 sm:max-w-2xl sm:text-[0.95rem] md:text-base"
      heroContentClassName="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"
    >
      <RemoteStarterContactHashOnLoad />
      {REMOTE_STARTER_PRODUCT_CATALOG_ENABLED ? (
        <RemoteStarterProductCatalog />
      ) : (
        <RemoteStarterComingSoonSection />
      )}

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
                <span className="text-white/55">1-way</span> sends start. You
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
                over cellular for farther reach than the fob when coverage is good.
                Needs the right module, a service plan, and a vehicle that
                supports the features you want.
              </p>
            </article>
            <article className="panel p-5 sm:p-6">
              <h3 className="text-base font-light text-white/90">
                Fitment comes first
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/42">
                Push-to-start, manual trans, diesel, factory security: they
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
          <p className="mt-8 max-w-lg text-sm text-white/40">
            {REMOTE_STARTER_PRODUCT_CATALOG_ENABLED
              ? "Ready to talk install? Send your vehicle details and we will check compatibility and follow up with a quote."
              : "Questions about timing, fitment, or what remote start can do on your vehicle? Use the form below and we will follow up."}
          </p>
        </div>
      </section>

      {!REMOTE_STARTER_PRODUCT_CATALOG_ENABLED ? null : (
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
      )}

      {REMOTE_STARTER_PRODUCT_CATALOG_ENABLED ? (
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
          </div>
        </section>
      ) : null}

      <section
        id="remote-starter-contact"
        aria-label="Remote starter inquiry form"
        className="atmosphere atmosphere-dark relative scroll-mt-[4.5rem] border-t border-white/[0.04] py-14 pb-24 sm:py-20 sm:pb-28"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <Suspense
            fallback={
              <>
                <div className="lg:col-span-5">
                  <p className="label-mono mb-4 text-white/40">
                    Remote starter inquiry
                  </p>
                  <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                    Send us a message
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/45">
                    Loading the form…
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <div className="panel p-6 sm:p-8 text-sm text-white/40">
                    Loading form…
                  </div>
                </div>
              </>
            }
          >
            <RemoteStarterConsultation />
          </Suspense>
        </div>
      </section>
    </ServicePageShell>
  );
}
