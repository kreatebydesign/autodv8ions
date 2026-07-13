import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HomeShowcaseSlider from "@/components/portfolio/HomeShowcaseSlider";
import ProcessSteps from "@/components/site/ProcessSteps";
import ServicePageShell from "@/components/site/ServicePageShell";
import { listHomepagePortfolio } from "@/lib/live-portfolio/public-portfolio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Window Tint",
  description:
    "Window tint in Altoona, PA — comfort, privacy, glare control, and a clean finish from AutoDV8ions.",
};

export default async function WindowTintPage() {
  const published = await listHomepagePortfolio();

  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Window Tint"
      title="Clean tint. Done right."
      lead="Comfort, privacy, and a sharper look — installed carefully around glass, trim, and how the vehicle leaves the bay."
      imageSrc="/images/editorial/interior-night.jpg"
      imageAlt="Vehicle cabin in low light"
      ctaHref="/tint-quote"
      ctaLabel="Get a Tint Quote"
    >
      <section className="atmosphere relative py-14 sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">What matters</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.15rem)] font-light tracking-[-0.02em]">
                How it looks. How it feels.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-white/45">
                We keep the conversation on the vehicle — not film charts or
                marketing percentages.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {[
                {
                  title: "Comfort",
                  copy: "A cooler cabin on bright days and long drives.",
                },
                {
                  title: "Privacy",
                  copy: "Less visibility in without changing the character of the vehicle.",
                },
                {
                  title: "Glare control",
                  copy: "Easier driving when the sun hits hard.",
                },
                {
                  title: "Fit and finish",
                  copy: "Edges and trim that hold up under close inspection.",
                },
              ].map((item) => (
                <article key={item.title} className="panel p-5 sm:p-6">
                  <h3 className="text-base font-light text-white/90">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">
                    {item.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] py-14 sm:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="relative aspect-[4/5] overflow-hidden lg:col-span-5">
            <Image
              src="/images/editorial/steering-detail.jpg"
              alt="Steering wheel and dashboard detail"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 40vw"
            />
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="label-mono mb-4 text-white/40">Getting started</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Tell us about the vehicle.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
              Share what you want from the tint. We&apos;ll recommend what makes
              sense for appearance, comfort, and how you use the vehicle — then
              schedule when you&apos;re ready.
            </p>
            <Link
              href="/tint-quote"
              className="mt-8 inline-flex w-fit items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
            >
              Get a Tint Quote
            </Link>
          </div>
        </div>
      </section>

      <ProcessSteps
        title="From quote to finished glass"
        intro="A simple path from the first conversation to a clean install."
      />

      <section className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-16 sm:py-22">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label-mono mb-3 text-white/40">Recent Tint Work</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.15rem)] font-light tracking-tight">
                Real installs from the bay
              </h2>
            </div>
            <Link
              href="/recent-work"
              className="label-mono text-white/50 hover:text-white"
            >
              View all projects →
            </Link>
          </div>
          {published.length === 0 ? (
            <div className="portfolio-empty">
              <p>New tint work will appear here soon.</p>
            </div>
          ) : (
            <HomeShowcaseSlider items={published} />
          )}
        </div>
      </section>
    </ServicePageShell>
  );
}
