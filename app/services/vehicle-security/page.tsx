import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "@/components/site/InquiryForm";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Vehicle Security",
  description:
    "Vehicle security consultation and professional installation from AutoDV8ions in Altoona, PA.",
};

export default function VehicleSecurityPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Vehicle Security"
      title="Protection with a calm hand."
      lead="Deterrence, alerts, and clean integration — recommended for the vehicle, not sold with fear."
      imageSrc="/images/editorial/night-vehicle.jpg"
      imageAlt="Editorial photograph of a dark vehicle at night — atmosphere imagery, not an AutoDV8ions customer project."
      ctaHref="#consultation"
      ctaLabel="Request a Consultation"
    >
      <section className="atmosphere relative py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="label-mono mb-4 text-white/40">What we focus on</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: "Added protection",
                    copy: "Systems that raise awareness and make casual theft less inviting.",
                  },
                  {
                    title: "Alerts and deterrence",
                    copy: "Clear feedback when something is wrong — without theatrical promises.",
                  },
                  {
                    title: "Professional installation",
                    copy: "Clean routing, clean connections, and respect for the vehicle’s electronics.",
                  },
                  {
                    title: "Vehicle-specific advice",
                    copy: "Recommendations based on how the vehicle is used and what it supports.",
                  },
                ].map((item) => (
                  <article key={item.title} className="panel p-5">
                    <h3 className="text-base font-light text-white/90">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/40">
                      {item.copy}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-6 text-sm leading-relaxed text-white/35">
                We do not promise theft prevention or guarantee outcomes. Security
                is about reducing risk and improving awareness — honestly.
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden lg:col-span-6">
              <Image
                src="/images/editorial/night-street.jpg"
                alt="Editorial photograph of a vehicle parked at night — atmosphere imagery, not an AutoDV8ions customer project."
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 45vw"
              />
              <p className="absolute bottom-3 left-3 label-mono text-white/50">
                Atmosphere imagery · Unsplash
              </p>
            </div>
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
              Request a Security Consultation
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Tell us about the vehicle and what you want from a security
              system. We will follow up with grounded options.
            </p>
          </div>
          <div className="lg:col-span-7">
            <InquiryForm
              inquiryType="vehicle_security"
              pageSource="/services/vehicle-security"
            />
          </div>
        </div>
      </section>
    </ServicePageShell>
  );
}
