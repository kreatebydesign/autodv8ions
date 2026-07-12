import Image from "next/image";
import Link from "next/link";
import ScrollIndicator from "./components/ScrollIndicator";
import HomeShowcaseSlider from "@/components/portfolio/HomeShowcaseSlider";
import { listHomepagePortfolio } from "@/lib/live-portfolio/public-portfolio";

const LOGO = "/images/logos/dv8-logo.png";

const HERO_IMAGE =
  "https://static.wixstatic.com/media/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg/v1/fill/w_1600,h_894,q_90,enc_avif,quality_auto/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg";

const SERVICES = [
  {
    num: "01",
    title: "Window Tint",
    desc: "Precision tint application with a clean finish, privacy, comfort, and a sharper vehicle profile.",
  },
  {
    num: "02",
    title: "Remote Starters",
    desc: "Seamless integration for comfort before you even open the door.",
  },
  {
    num: "03",
    title: "Vehicle Security",
    desc: "Advanced protection systems tailored cleanly to your vehicle.",
  },
  {
    num: "04",
    title: "Custom Styling",
    desc: "Lighting, details, and enhancements built to give your vehicle more presence.",
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const published = await listHomepagePortfolio();

  return (
    <>
      <ScrollIndicator />

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="relative z-10 flex items-center">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              width={220}
              height={90}
              className="h-14 w-auto object-contain opacity-95 drop-shadow-[0_0_18px_rgba(220,0,0,0.22)] transition-opacity duration-500 hover:opacity-100 sm:h-16"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {["About", "Services", "Gallery", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="label-mono link-underline text-white/50 hover:text-white"
              >
                {item}
              </a>
            ))}

            <Link
              href="/recent-work"
              className="label-mono link-underline text-white/50 hover:text-white"
            >
              Recent Work
            </Link>

            <Link
              href="/tint-quote"
              className="label-mono link-underline text-white/50 hover:text-white"
            >
              Tint Quote
            </Link>
          </nav>

          <Link
            href="/tint-quote"
            className="label-mono border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_24px_var(--accent-glow)]"
          >
            Get Quote
          </Link>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[100svh] items-end overflow-hidden">
          <div className="absolute inset-0 image-zoom">
            <Image
              src={HERO_IMAGE}
              alt="Custom vehicle build by AutoDV8ions"
              fill
              className="zoom-target object-cover object-center"
              priority
              sizes="100vw"
            />
          </div>

          <div className="image-overlay" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(201,0,0,0.08)_0%,transparent_50%)]" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-24 lg:px-12 lg:pb-32">
            <span className="label-mono mb-4 block animate-fade-up text-white/40">
              // Altoona, PA · Est. 1998
            </span>

            <h1 className="max-w-3xl animate-fade-up text-[clamp(2rem,6vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-white [animation-delay:0.1s]">
              Elevate the ride.
              <br />
              <span className="text-white/60">Not just modify it.</span>
            </h1>

            <p className="mt-6 max-w-md animate-fade-up text-sm leading-relaxed text-white/50 [animation-delay:0.2s] sm:text-base">
              27 years of automotive craftsmanship — premium tint, remote
              starters, vehicle security, and custom enhancements built around
              your vision.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6 animate-fade-up [animation-delay:0.3s]">
              <Link
                href="/tint-quote"
                className="group inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                Get Tint Quote
                <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <a
                href="#gallery"
                className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-white/45 transition-all duration-500 hover:text-white"
              >
                View Builds
              </a>

              <span className="accent-line" />

              <span className="label-mono text-white/30">
                Central PA&apos;s Premier Shop
              </span>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="atmosphere atmosphere-dark relative py-20 sm:py-28 lg:py-36"
        >
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <span className="label-mono mb-6 block">About</span>

                <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light leading-tight tracking-[-0.02em]">
                  Welcome to
                  <br />
                  AutoDV8ions
                </h2>

                <span className="accent-line mt-6" />
              </div>

              <div className="lg:col-span-7">
                <div className="panel p-6 sm:p-8 lg:p-10">
                  <p className="text-sm leading-[1.8] text-white/60 sm:text-base">
                    For 27 years, AutoDV8ions has been turning vehicles into
                    bold, custom statements. What started as a passion project
                    quickly evolved into a trusted name in automotive
                    customization.
                  </p>

                  <p className="mt-5 text-sm leading-[1.8] text-white/45 sm:text-base">
                    Every build is a collaboration. We don&apos;t just work on
                    cars. We work with our clients to bring their vision to
                    life, down to the smallest detail.
                  </p>

                  <p className="mt-5 text-sm leading-[1.8] text-white/45 sm:text-base">
                    Premium tint, remote starters, security upgrades, custom
                    lighting, and detail-focused enhancements built clean for
                    drivers across Central PA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="atmosphere relative border-t border-white/[0.04] py-20 sm:py-28 lg:py-36"
        >
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-12 flex flex-col gap-4 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="label-mono mb-4 block">Services</span>

                <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-[-0.02em]">
                  What we do
                </h2>
              </div>

              <p className="max-w-xs text-sm text-white/40">
                Precision work across tint, security, comfort, and automotive
                styling.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {SERVICES.map((service) => (
                <article
                  key={service.num}
                  className="panel group p-6 transition-all duration-700 sm:p-7 lg:hover:-translate-y-1"
                >
                  <span className="label-mono text-[var(--accent)] opacity-60 transition-opacity duration-500 group-hover:opacity-100">
                    {service.num}
                  </span>

                  <h3 className="mt-4 text-lg font-light tracking-tight text-white/90">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/40">
                    {service.desc}
                  </p>

                  <div className="mt-6 h-px w-0 bg-[var(--accent)] opacity-40 transition-all duration-700 group-hover:w-8" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="gallery"
          className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-24 sm:py-32 lg:py-40"
        >
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-14 flex flex-col gap-5 sm:mb-20 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="label-mono mb-4 block">Recent Tint Work</span>

                <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-[-0.02em]">
                  Craft on display.
                  <br className="hidden sm:block" />
                  <span className="text-white/40"> Tint. Finish. Presence.</span>
                </h2>
              </div>

              <div className="flex flex-col items-start gap-5 lg:items-end">
                <p className="max-w-sm text-sm leading-relaxed text-white/35">
                  The latest tint installs from the AutoDV8ions team.
                </p>
                <Link
                  href="/recent-work"
                  className="label-mono text-white/50 transition-colors duration-500 hover:text-white"
                >
                  View all projects →
                </Link>
              </div>
            </div>

            {published.length === 0 ? (
              <div className="portfolio-empty">
                <p>New tint work will appear here soon.</p>
                <Link href="/tint-quote" className="portfolio-inline-cta mt-6">
                  Get a Tint Quote →
                </Link>
              </div>
            ) : (
              <HomeShowcaseSlider items={published} />
            )}
          </div>
        </section>

        <section
          id="contact"
          className="atmosphere relative border-t border-white/[0.04] py-20 sm:py-28 lg:py-36"
        >
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="panel mx-auto max-w-3xl p-8 text-center sm:p-12 lg:p-16">
              <span className="label-mono mb-6 block">Get in Touch</span>

              <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-light tracking-[-0.02em]">
                Ready to start your build?
              </h2>

              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/45 sm:text-base">
                Tell us about your vehicle and vision. Every project begins
                with a clean quote and a clear plan.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/tint-quote"
                  className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
                >
                  Get Tint Quote
                </Link>

                <a
                  href="mailto:sales@autodv8ions.com"
                  className="label-mono link-underline text-white/40"
                >
                  Contact Shop
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/[0.06] bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,0,0,0.03)_0%,transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            <div className="text-center sm:text-left">
              <Image
                src={LOGO}
                alt="AutoDV8ions"
                width={180}
                height={72}
                className="mx-auto h-12 w-auto object-contain opacity-80 drop-shadow-[0_0_18px_rgba(220,0,0,0.18)] sm:mx-0"
              />

              <p className="label-mono mt-4 text-white/25">
                Altoona, Pennsylvania
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 sm:items-end">
              <div className="flex items-center gap-8">
                <a
                  href="https://www.instagram.com/autodv8ions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono link-underline text-white/40"
                >
                  Instagram
                </a>

                <a
                  href="https://www.facebook.com/autodv8ions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono link-underline text-white/40"
                >
                  Facebook
                </a>

                <Link
                  href="/recent-work"
                  className="label-mono link-underline text-white/40"
                >
                  Recent Work
                </Link>
              </div>

              <a
                href="tel:8142012456"
                className="label-mono link-underline text-white/30"
              >
                814.201.2456
              </a>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 sm:flex-row">
            <p className="label-mono text-white/20">
              © {new Date().getFullYear()} AutoDV8ions. All rights reserved.
            </p>

            <p className="label-mono text-white/15">
              Design by{" "}
              <a
                href="https://kreatebydesign.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 transition-colors duration-500 hover:text-white/50"
              >
                KXD
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
