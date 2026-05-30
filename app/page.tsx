import Image from "next/image";
import Link from "next/link";
import ScrollIndicator from "./components/ScrollIndicator";

const LOGO =
  "https://static.wixstatic.com/media/24f460_b5d38d3540ae4048bacb5100c4adbac4f000.jpg/v1/fill/w_596,h_209,al_c,lg_1,q_80,usm_0.33_1.00_0.00,enc_avif,quality_auto/24f460_b5d38d3540ae4048bacb5100c4adbac4f000.jpg";

const HERO_IMAGE =
  "https://static.wixstatic.com/media/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg/v1/fill/w_1600,h_894,q_90,enc_avif,quality_auto/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg";

const GALLERY = [
  {
    title: "Tesla Model Y",
    category: "Full Tint · Audio",
    image:
      "https://static.wixstatic.com/media/24f460_356c10ff347148ab9335e8d86ada4040~mv2.jpg/v1/fit/w_960,h_1360,q_90,enc_avif,quality_auto/24f460_356c10ff347148ab9335e8d86ada4040~mv2.jpg",
    span: "lg:col-span-7 lg:row-span-2",
    aspect: "aspect-[4/5] lg:aspect-auto lg:min-h-[540px]",
    featured: true,
  },
  {
    title: "The Bay",
    category: "Studio · Craft",
    image:
      "https://static.wixstatic.com/media/24f460_7bd7d949a99043c2b7fbbf6e31250d33~mv2.jpg/v1/fit/w_721,h_1021,q_90,enc_avif,quality_auto/24f460_7bd7d949a99043c2b7fbbf6e31250d33~mv2.jpg",
    span: "lg:col-span-5 lg:col-start-8",
    aspect: "aspect-[3/4] lg:aspect-[16/11]",
  },
  {
    title: "Cadillac Escalade",
    category: "Security · Lighting",
    image:
      "https://static.wixstatic.com/media/24f460_52e1c282a6c94f66ab15dfd094c3acd3~mv2.jpg/v1/fit/w_960,h_1360,q_90,enc_avif,quality_auto/24f460_52e1c282a6c94f66ab15dfd094c3acd3~mv2.jpg",
    span: "lg:col-span-5 lg:col-start-8 lg:-mt-10",
    aspect: "aspect-[3/4] lg:aspect-[4/5]",
  },
  {
    title: "Dodge Charger",
    category: "Custom Audio",
    image:
      "https://static.wixstatic.com/media/24f460_c6417f6cbae149f6b406ef5202b3dd2e~mv2.jpg/v1/fit/w_1440,h_1019,q_90,enc_avif,quality_auto/24f460_c6417f6cbae149f6b406ef5202b3dd2e~mv2.jpg",
    span: "lg:col-span-7",
    aspect: "aspect-[16/10]",
  },
  {
    title: "Ford Bronco",
    category: "Remote Start · Tint",
    image:
      "https://static.wixstatic.com/media/24f460_309341773f9246c0bbf17f3c3cd5c9ca~mv2.jpg/v1/fit/w_1440,h_1019,q_90,enc_avif,quality_auto/24f460_309341773f9246c0bbf17f3c3cd5c9ca~mv2.jpg",
    span: "lg:col-span-5 lg:col-start-8 lg:-mt-6",
    aspect: "aspect-[16/10] lg:aspect-[16/11]",
  },
];

const SERVICES = [
  {
    num: "01",
    title: "Window Tint",
    desc: "Precision film application with premium materials and flawless finish.",
  },
  {
    num: "02",
    title: "Car Audio",
    desc: "Next-level sound systems engineered for clarity and impact.",
  },
  {
    num: "03",
    title: "Remote Start",
    desc: "Seamless integration for comfort before you even open the door.",
  },
  {
    num: "04",
    title: "Security",
    desc: "Advanced protection systems tailored to your vehicle.",
  },
];

export default function Home() {
  return (
    <>
      <ScrollIndicator />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06] bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="relative z-10">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              width={140}
              height={49}
              className="h-8 w-auto opacity-90 transition-opacity duration-500 hover:opacity-100 sm:h-9"
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
          </nav>
          <a
            href="#contact"
            className="label-mono border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_24px_var(--accent-glow)]"
          >
            Start Build
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
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
            <span className="label-mono mb-4 block text-white/40 animate-fade-up">
              // Altoona, PA · Est. 1998
            </span>
            <h1 className="max-w-3xl text-[clamp(2rem,6vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-white animate-fade-up [animation-delay:0.1s]">
              Elevate the ride.
              <br />
              <span className="text-white/60">Not just modify it.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50 sm:text-base animate-fade-up [animation-delay:0.2s]">
              27 years of custom automotive craftsmanship — tint, audio, security,
              and enhancements built to your vision.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6 animate-fade-up [animation-delay:0.3s]">
              <a
                href="#gallery"
                className="group inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs tracking-[0.15em] uppercase text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                View Builds
                <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </a>
              <span className="accent-line" />
              <span className="label-mono text-white/30">Central PA&apos;s Premier Shop</span>
            </div>
          </div>
        </section>

        {/* About */}
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
                    For 27 years, AutoDV8ions has been turning vehicles into bold,
                    custom statements. What started as a passion project quickly
                    evolved into a trusted name in automotive customization.
                  </p>
                  <p className="mt-5 text-sm leading-[1.8] text-white/45 sm:text-base">
                    Every build is a collaboration. We don&apos;t just work on
                    cars—we work with our clients to bring their vision to life,
                    down to the smallest detail. Premium tint, next-level audio,
                    remote starters, security upgrades, and head-turning
                    enhancements.
                  </p>
                  <p className="mt-5 text-sm leading-[1.8] text-white/45 sm:text-base">
                    Our commitment to quality, innovation, and craftsmanship has
                    kept us at the top of our game in Central PA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
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
                Precision work across every discipline of automotive customization.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {SERVICES.map((service) => (
                <article
                  key={service.num}
                  className="panel group p-6 sm:p-7 lg:hover:-translate-y-1"
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

        {/* Gallery */}
        <section
          id="gallery"
          className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-20 sm:py-28 lg:py-36"
        >
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-12 flex flex-col gap-4 sm:mb-20 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="label-mono mb-4 block">Featured Builds</span>
                <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-[-0.02em]">
                  Real builds.
                  <br className="hidden sm:block" />
                  <span className="text-white/40"> Real results.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-white/35">
                A selection of recent work from the bay — daily uploads of custom
                craftsmanship pushed to the limit.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12 lg:gap-7">
              {GALLERY.map((item) => (
                <article
                  key={item.title}
                  className={`group relative overflow-hidden ${item.span}`}
                >
                  <div
                    className={`image-zoom relative ${item.aspect} w-full bg-neutral-900 transition-all duration-700 group-hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7),0_0_0_1px_rgba(201,0,0,0.08)]`}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="zoom-target object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="image-overlay" />
                    <div className="image-overlay-subtle opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                    <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6 lg:p-8">
                      {item.featured && (
                        <span className="label-mono mb-3 block text-[var(--accent)] opacity-70">
                          Featured Build
                        </span>
                      )}
                      <h3 className="text-lg font-light tracking-tight text-white sm:text-xl lg:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs tracking-wide text-white/45 sm:text-sm">
                        {item.category}
                      </p>
                    </div>

                    <div className="absolute left-0 top-0 h-px w-0 bg-[var(--accent)] opacity-50 transition-all duration-700 group-hover:w-full" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
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
                Tell us about your vehicle and vision. Every project begins with a
                conversation.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:info@autodv8ions.com"
                  className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs tracking-[0.15em] uppercase text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
                >
                  Contact Us
                </a>
                <a
                  href="https://www.facebook.com/autodv8ions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono link-underline text-white/40"
                >
                  Follow on Facebook
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.06] bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,0,0,0.03)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            <div className="text-center sm:text-left">
              <Image
                src={LOGO}
                alt="AutoDV8ions"
                width={120}
                height={42}
                className="mx-auto h-7 w-auto opacity-60 sm:mx-0"
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
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 sm:flex-row">
            <p className="label-mono text-white/20">
              © {new Date().getFullYear()} AutoDV8ions. All rights reserved.
            </p>
            <p className="label-mono text-white/15">
              Design by{" "}
              <a
                href="https://kxd.studio"
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
