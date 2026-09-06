import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "@/components/site/InquiryForm";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Audio & Select Custom Upgrades in Altoona, PA",
  description:
    "Select audio and custom automotive upgrade projects from AutoDV8ions in Altoona, PA — accepted based on scope, vehicle, and schedule.",
  alternates: { canonical: "/services/audio-custom" },
};

export default function AudioCustomPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Audio + Select Custom"
      title="Select projects only."
      lead="Some vehicles need more than an off-the-shelf answer. We take select audio and custom work when the scope, vehicle, and schedule line up."
      imageSrc="/images/editorial/audio-controls.jpg"
      imageAlt="Vehicle audio controls"
      ctaHref="#project-review"
      ctaLabel="Submit Project for Review"
    >
      <section className="atmosphere relative py-14 sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl">
            <p className="label-mono mb-4 text-white/40">What we may take on</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Categories we review
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/40">
              This is not open-ended custom fabrication. Requests are reviewed
              before anything is scheduled.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Audio upgrades",
                copy: "Better sound and careful component choices for the vehicle.",
              },
              {
                title: "Clean component installs",
                copy: "Hardware that looks like it belongs — not bolted on as an afterthought.",
              },
              {
                title: "Lighting and appearance",
                copy: "Tasteful accents when they suit the vehicle.",
              },
              {
                title: "Convenience upgrades",
                copy: "Practical improvements for daily driving.",
              },
              {
                title: "Scoped custom requests",
                copy: "One-off ideas reviewed against shop capacity and fit.",
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

      <section className="border-t border-white/[0.04] py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="relative aspect-[4/5] overflow-hidden lg:col-span-5">
            <Image
              src="/images/editorial/craft-detail.jpg"
              alt="Vehicle interior detail"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 40vw"
            />
          </div>
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="label-mono mb-4 text-white/40">Before we schedule</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Submitting does not mean we take the job.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
              Share the vehicle, the goal, the timeline, and a realistic budget
              range. We review first. If it is not a fit, we say so.
            </p>
          </div>
        </div>
      </section>

      <section
        id="project-review"
        className="atmosphere atmosphere-dark relative border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-5">
            <p className="label-mono mb-4 text-white/40">Project review</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Submit Project for Review
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Include as much detail as you can. Photos can come later if needed
              — this form keeps the first step simple.
            </p>
          </div>
          <div className="lg:col-span-7">
            <InquiryForm
              inquiryType="audio_custom"
              pageSource="/services/audio-custom"
            />
          </div>
        </div>
      </section>
    </ServicePageShell>
  );
}
