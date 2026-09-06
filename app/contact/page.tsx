import type { Metadata } from "next";
import Link from "next/link";
import {
  TrackedMailtoLink,
  TrackedTelLink,
} from "@/components/analytics/TrackedContactLink";
import InquiryForm from "@/components/site/InquiryForm";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Contact — Altoona, PA",
  description:
    "Contact AutoDV8ions in Altoona, PA for window tint quotes, remote starter installation info, vehicle security, or select custom project reviews.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader activeHref="/contact" ctaLabel="Get Tint Quote" ctaHref="/tint-quote" />
      <main className="pt-[4.5rem]">
        <section className="atmosphere relative border-b border-white/[0.05] py-14 sm:py-20">
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <p className="label-mono mb-4 text-white/45">Contact</p>
            <h1 className="max-w-3xl text-[clamp(2.1rem,4.8vw,3.6rem)] font-light tracking-[-0.02em]">
              Contact the shop
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
              Tint quotes use the dedicated form. For everything else, start
              here.
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
            {[
              {
                title: "Window Tint",
                cta: "Get a Tint Quote",
                href: "/tint-quote",
              },
              {
                title: "Remote Starters",
                cta: "Request More Info",
                href: "/services/remote-starters#consultation",
              },
              {
                title: "Vehicle Security",
                cta: "Request More Info",
                href: "/services/vehicle-security#consultation",
              },
              {
                title: "Audio + Custom",
                cta: "Submit Project for Review",
                href: "/services/audio-custom#project-review",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="panel group block p-5 transition-transform duration-500 hover:-translate-y-1"
              >
                <h2 className="text-base font-light text-white/90">{item.title}</h2>
                <p className="mt-3 label-mono text-white/45 group-hover:text-white">
                  {item.cta} →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-14 sm:py-20">
          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
            <div className="lg:col-span-5">
              <p className="label-mono mb-4 text-white/40">General inquiry</p>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
                Request More Info
              </h2>
              <div className="mt-6 space-y-3 text-sm text-white/45">
                <p>
                  <TrackedTelLink
                    href="tel:8142012456"
                    linkLocation="contact"
                    className="link-underline"
                  >
                    814.201.2456
                  </TrackedTelLink>
                </p>
                <p>
                  <TrackedMailtoLink
                    href="mailto:sales@autodv8ions.com"
                    linkLocation="contact"
                    className="link-underline"
                  >
                    sales@autodv8ions.com
                  </TrackedMailtoLink>
                </p>
                <p className="label-mono text-white/30">Altoona, Pennsylvania</p>
              </div>
            </div>
            <div className="lg:col-span-7">
              <InquiryForm
                inquiryType="general_contact"
                pageSource="/contact"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
