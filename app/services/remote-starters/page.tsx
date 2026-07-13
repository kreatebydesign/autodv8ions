import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "@/components/site/InquiryForm";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Remote Starters",
  description:
    "Remote starter installs from AutoDV8ions in Altoona, PA — reviewed for your vehicle before we schedule.",
};

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
