import Image from "next/image";
import Link from "next/link";
import {
  TrackedMailtoLink,
  TrackedTelLink,
} from "@/components/analytics/TrackedContactLink";

const LOGO = "/images/logos/dv8-logo.png";

export default function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,0,0,0.03)_0%,transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              width={180}
              height={72}
              className="h-12 w-auto object-contain opacity-80 drop-shadow-[0_0_18px_rgba(220,0,0,0.18)]"
            />
            <p className="label-mono mt-4 text-white/25">
              Altoona, Pennsylvania
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/35">
              Window tint, remote starters, vehicle security, and select audio
              and custom work — Altoona, PA since 1998.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-3">
            <div>
              <p className="label-mono mb-4 text-white/30">Explore</p>
              <ul className="space-y-3">
                {[
                  { label: "Services", href: "/services" },
                  { label: "Recent Work", href: "/recent-work" },
                  { label: "About", href: "/about" },
                  { label: "Contact", href: "/contact" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="label-mono link-underline text-white/45 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label-mono mb-4 text-white/30">Services</p>
              <ul className="space-y-3">
                {[
                  { label: "Window Tint", href: "/services/window-tint" },
                  { label: "Remote Starters", href: "/services/remote-starters" },
                  { label: "Vehicle Security", href: "/services/vehicle-security" },
                  { label: "Audio + Custom", href: "/services/audio-custom" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="label-mono link-underline text-white/45 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label-mono mb-4 text-white/30">Connect</p>
              <ul className="space-y-3">
                <li>
                  <TrackedTelLink
                    href="tel:8142012456"
                    linkLocation="footer"
                    className="label-mono link-underline text-white/45 hover:text-white"
                  >
                    814.201.2456
                  </TrackedTelLink>
                </li>
                <li>
                  <TrackedMailtoLink
                    href="mailto:sales@autodv8ions.com"
                    linkLocation="footer"
                    className="label-mono link-underline text-white/45 hover:text-white"
                  >
                    sales@autodv8ions.com
                  </TrackedMailtoLink>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/autodv8ions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono link-underline text-white/45 hover:text-white"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/autodv8ions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono link-underline text-white/45 hover:text-white"
                  >
                    Facebook
                  </a>
                </li>
              </ul>
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
              href="https://kreatebydesign.com"
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
  );
}
