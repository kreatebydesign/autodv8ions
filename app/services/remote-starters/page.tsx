import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "@/components/site/InquiryForm";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Remote Starters",
  description:
    "Remote starter installs from AutoDV8ions in Altoona, PA — Basic and 2-Way LED packages plus optional smartphone control, reviewed for your vehicle before we schedule.",
};

const PACKAGES = [
  {
    title: "Basic Remote Start",
    amount: "$400",
    imageSrc: "/images/remote-starters/display/basic-remote-start.png",
    imageAlt: "1-way remote start key fob",
    features: [
      "1-way remote starter",
      "Up to 1,500 ft range",
      "Simple remote start operation",
    ],
  },
  {
    title: "2-Way LED Remote Start",
    amount: "$500",
    imageSrc: "/images/remote-starters/display/two-way-led-remote-start.png",
    imageAlt: "2-way LED remote start key fob",
    features: [
      "2-way LED remote starter",
      "Up to 1/2-mile range",
      "Remote confirmation when the command is received",
    ],
  },
] as const;

export default function RemoteStartersPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Remote Starters"
      title="Start it before you walk out."
      lead="Warm in winter. Cooler when the day runs hot. Installed for the vehicle in front of us — not as a rushed add-on."
      imageSrc="/images/editorial/key-fob.jpg"
      imageAlt="Vehicle remote key fob"
      ctaHref="#consultation"
      ctaLabel="Request More Info"
    >
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
                src="/images/editorial/night-street.jpg"
                alt="Vehicle parked at night"
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
          <p className="label-mono mb-4 text-white/40">Options</p>
          <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
            Choose your remote start.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
            We review the vehicle and match the right hardware for the
            application. Pricing below is a starting point — final cost depends
            on the vehicle and install path.
          </p>

          <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-2">
            {PACKAGES.map((item) => (
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
                    priority={false}
                  />
                </div>

                <div className="flex min-h-[3.75rem] items-start justify-between gap-4">
                  <h3 className="max-w-[12.5rem] text-lg font-light leading-snug text-white/90 sm:max-w-none">
                    {item.title}
                  </h3>
                  <div className="shrink-0 text-right">
                    <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/35">
                      Starting at
                    </p>
                    <p className="mt-1 text-[1.65rem] font-light leading-none tracking-tight text-white/92 sm:text-[1.85rem]">
                      {item.amount}
                      <span className="ml-1.5 align-baseline text-sm font-light tracking-normal text-white/40">
                        + tax
                      </span>
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/45">
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
              </article>
            ))}
          </div>

          <article className="panel mt-4 p-5 sm:p-6 lg:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <p className="label-mono mb-3 text-white/40">Add-on</p>
                <h3 className="text-lg font-light text-white/90">
                  DroneMobile Smartphone Add-On
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                  Control your remote start from your phone with the DroneMobile
                  smartphone module.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/40">
                  Special pricing valid only at the time of remote start
                  installation.
                </p>
              </div>
              <div className="lg:col-span-5 lg:text-right">
                <p className="text-sm text-white/45">
                  Regularly{" "}
                  <span className="text-white/60 line-through decoration-white/45">
                    $200
                  </span>
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 lg:justify-end">
                  <span className="text-[1.85rem] font-light leading-none tracking-tight text-white/92">
                    $150
                  </span>
                  <span className="text-sm text-white/50">
                    with Remote Start Installation
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-white/35">
                  Install special — not a standalone offer. Available only when
                  purchased with a remote starter install.
                </p>
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
                title: "Schedule if it fits",
                copy: "Next steps when the vehicle and system line up.",
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

      <section
        id="consultation"
        className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <p className="label-mono mb-4 text-white/40">Request More Info</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Tell us about your vehicle
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Send the basics. We&apos;ll review the vehicle and follow up.
            </p>
          </div>
          <div className="lg:col-span-7">
            <InquiryForm
              inquiryType="remote_starter"
              pageSource="/services/remote-starters"
            />
          </div>
        </div>
      </section>
    </ServicePageShell>
  );
}
