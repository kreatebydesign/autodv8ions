import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "@/components/site/InquiryForm";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Remote Starters",
  description:
    "Professional remote starter consultation and integration from AutoDV8ions in Altoona, PA.",
};

export default function RemoteStartersPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Remote Starters"
      title="Comfort before you open the door."
      lead="Start the vehicle from inside — warm in winter, cooler when the day runs hot. Professional integration based on the vehicle in front of us."
      imageSrc="/images/editorial/key-fob.jpg"
      imageAlt="Editorial close-up of a vehicle remote key fob — atmosphere imagery, not an AutoDV8ions product photo."
      ctaHref="#consultation"
      ctaLabel="Request a Consultation"
    >
      <section className="atmosphere relative py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">Why people ask</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                Everyday convenience done cleanly.
              </h2>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/45">
                <li>Cold-weather comfort before you walk out.</li>
                <li>Warm-weather pre-conditioning where the vehicle supports it.</li>
                <li>Professional system integration — not a rushed add-on.</li>
                <li>Recommendations based on vehicle compatibility.</li>
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-white/35">
                Compatibility is not automatic. We review the vehicle before we
                promise a path forward.
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden lg:col-span-7">
              <Image
                src="/images/editorial/night-street.jpg"
                alt="Editorial photograph of a vehicle parked at night — atmosphere imagery, not an AutoDV8ions customer project."
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 55vw"
              />
              <p className="absolute bottom-3 left-3 label-mono text-white/50">
                Atmosphere imagery · Unsplash
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">The request process</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Share the vehicle",
                copy: "Year, make, model, and how you use it day to day.",
              },
              {
                title: "Compatibility review",
                copy: "We confirm what is realistic for that platform.",
              },
              {
                title: "Schedule if it fits",
                copy: "Clear next steps when the vehicle and system line up.",
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
        className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-16 sm:py-24"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <p className="label-mono mb-4 text-white/40">Consultation</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Request a Remote Starter Consultation
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Send the basics. We will review the vehicle and follow up with a
              clear recommendation.
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
