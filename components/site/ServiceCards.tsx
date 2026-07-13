import Link from "next/link";

export type ServiceCardData = {
  num: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  emphasis?: "primary" | "standard" | "selective";
};

export const CORE_SERVICES: ServiceCardData[] = [
  {
    num: "01",
    title: "Window Tint",
    desc: "Precision tint with a clean finish — privacy, comfort, glare control, and a sharper vehicle profile.",
    href: "/services/window-tint",
    cta: "Get a Tint Quote",
    emphasis: "primary",
  },
  {
    num: "02",
    title: "Remote Starters",
    desc: "Professional integration for everyday comfort — start the vehicle before you walk out the door.",
    href: "/services/remote-starters",
    cta: "Request a Consultation",
    emphasis: "standard",
  },
  {
    num: "03",
    title: "Vehicle Security",
    desc: "Protection systems chosen for the vehicle and installed cleanly for deterrence and peace of mind.",
    href: "/services/vehicle-security",
    cta: "Request a Consultation",
    emphasis: "standard",
  },
  {
    num: "04",
    title: "Audio + Select Custom",
    desc: "Select audio and custom upgrade projects accepted based on scope, vehicle, and schedule.",
    href: "/services/audio-custom",
    cta: "Request a Project Review",
    emphasis: "selective",
  },
];

export default function ServiceCards({
  services = CORE_SERVICES,
}: {
  services?: ServiceCardData[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      {services.map((service) => (
        <article
          key={service.num}
          className={`panel group service-card p-6 transition-all duration-700 sm:p-7 lg:hover:-translate-y-1 ${
            service.emphasis === "primary" ? "service-card-primary" : ""
          }`}
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
          {service.emphasis === "selective" ? (
            <p className="mt-3 text-xs leading-relaxed text-white/30">
              Selective acceptance — not every request is a fit.
            </p>
          ) : null}
          <Link
            href={service.href}
            className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/55 transition-colors duration-500 group-hover:text-white"
          >
            {service.cta}
            <span aria-hidden>→</span>
          </Link>
          <div className="mt-5 h-px w-0 bg-[var(--accent)] opacity-40 transition-all duration-700 group-hover:w-8" />
        </article>
      ))}
    </div>
  );
}
