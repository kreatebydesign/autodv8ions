import Image from "next/image";
import Link from "next/link";

export type ServiceCardData = {
  num: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  imageSrc: string;
  imageAlt: string;
  emphasis?: "primary" | "standard" | "selective";
};

export const CORE_SERVICES: ServiceCardData[] = [
  {
    num: "01",
    title: "Window Tint",
    desc: "Clean finish. Privacy, comfort, and glare control — installed with care for the glass and the trim.",
    href: "/services/window-tint",
    cta: "Get a Tint Quote",
    emphasis: "primary",
    imageSrc: "/images/editorial/tinted-suv.jpg",
    imageAlt: "Dark luxury vehicle exterior",
  },
  {
    num: "02",
    title: "Remote Starters",
    desc: "Start the vehicle before you walk out. Installed for the platform in front of us.",
    href: "/services/remote-starters",
    cta: "Request More Info",
    emphasis: "standard",
    imageSrc: "/images/editorial/key-fob.jpg",
    imageAlt: "Vehicle key fob close-up",
  },
  {
    num: "03",
    title: "Vehicle Security",
    desc: "Deterrence and alerts installed cleanly — recommended for how the vehicle is used.",
    href: "/services/vehicle-security",
    cta: "Request More Info",
    emphasis: "standard",
    imageSrc: "/images/editorial/night-vehicle.jpg",
    imageAlt: "Vehicle at night",
  },
  {
    num: "04",
    title: "Audio + Select Custom",
    desc: "Select projects only — based on scope, vehicle, and schedule.",
    href: "/services/audio-custom",
    cta: "Submit Project for Review",
    emphasis: "selective",
    imageSrc: "/images/editorial/audio-controls.jpg",
    imageAlt: "Vehicle audio controls",
  },
];

export default function ServiceCards({
  services = CORE_SERVICES,
}: {
  services?: ServiceCardData[];
}) {
  const primary = services.find((s) => s.emphasis === "primary") ?? services[0];
  const supporting = services.filter((s) => s.num !== primary.num);

  return (
    <div className="service-editorial">
      <Link
        href={primary.href}
        className="service-editorial-primary group"
      >
        <div className="service-editorial-media">
          <Image
            src={primary.imageSrc}
            alt={primary.imageAlt}
            fill
            className="service-editorial-image object-cover"
            sizes="(max-width:1024px) 100vw, 60vw"
          />
          <div className="service-editorial-veil" />
        </div>
        <div className="service-editorial-copy">
          <span className="label-mono text-[var(--accent)]/80">{primary.num}</span>
          <h3 className="mt-3 text-[clamp(1.6rem,3vw,2.35rem)] font-light tracking-[-0.02em] text-white">
            {primary.title}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">
            {primary.desc}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/70 transition-colors duration-500 group-hover:text-white">
            {primary.cta}
            <span aria-hidden>→</span>
          </span>
        </div>
      </Link>

      <div className="service-editorial-support">
        {supporting.map((service) => (
          <Link
            key={service.num}
            href={service.href}
            className="service-editorial-card group"
          >
            <div className="service-editorial-card-media">
              <Image
                src={service.imageSrc}
                alt={service.imageAlt}
                fill
                className="service-editorial-image object-cover"
                sizes="(max-width:1024px) 100vw, 30vw"
              />
              <div className="service-editorial-veil service-editorial-veil-card" />
            </div>
            <div className="service-editorial-card-copy">
              <span className="label-mono text-[var(--accent)]/70">
                {service.num}
              </span>
              <h3 className="mt-2 text-lg font-light tracking-tight text-white/95 sm:text-xl">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {service.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55 transition-colors duration-500 group-hover:text-white">
                {service.cta}
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
