import Image from "next/image";
import Link from "next/link";

const ATMOSPHERE = [
  { src: "/images/editorial/tesla-dark.jpg", alt: "" },
  { src: "/images/editorial/corvette-red.jpg", alt: "" },
  { src: "/images/editorial/porsche-dark.jpg", alt: "" },
  { src: "/images/editorial/truck-suv-dark.jpg", alt: "" },
];

const LINKS = [
  {
    title: "Remote Starters",
    href: "/services/remote-starters",
    cta: "Request More Info",
  },
  {
    title: "Vehicle Security",
    href: "/services/vehicle-security",
    cta: "Request More Info",
  },
  {
    title: "Audio + Custom",
    href: "/services/audio-custom",
    cta: "Submit Project for Review",
  },
];

export default function BeyondTintStrip() {
  return (
    <section className="beyond-tint relative border-t border-white/[0.04]">
      <div className="beyond-tint-field" aria-hidden="true">
        <div className="beyond-tint-track">
          {[...ATMOSPHERE, ...ATMOSPHERE].map((image, index) => (
            <div key={`${image.src}-${index}`} className="beyond-tint-cell">
              <Image
                src={image.src}
                alt=""
                fill
                className="object-cover opacity-35"
                sizes="25vw"
              />
            </div>
          ))}
        </div>
        <div className="beyond-tint-fade" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-light tracking-[-0.03em]">
              Beyond tint
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/45">
              Remote starters, security, and select custom work — when the
              vehicle and the job make sense.
            </p>
          </div>
          <div className="divide-y divide-white/[0.08] lg:col-span-7 lg:col-start-6">
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-baseline justify-between gap-6 py-5 transition-colors duration-500 sm:py-6"
              >
                <span className="text-xl font-light tracking-tight text-white/90 transition-colors group-hover:text-white sm:text-2xl">
                  {item.title}
                </span>
                <span className="label-mono shrink-0 text-white/40 transition-colors group-hover:text-white/75">
                  {item.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
