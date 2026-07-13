import Link from "next/link";
import Image from "next/image";

const LOGO = "/images/logos/dv8-logo.png";

export type SiteNavItem = {
  label: string;
  href: string;
};

const DEFAULT_NAV: SiteNavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Recent Work", href: "/recent-work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader({
  activeHref,
  ctaLabel = "Get Tint Quote",
  ctaHref = "/tint-quote",
  nav = DEFAULT_NAV,
  transparent = false,
}: {
  activeHref?: string;
  ctaLabel?: string;
  ctaHref?: string;
  nav?: SiteNavItem[];
  transparent?: boolean;
}) {
  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] backdrop-blur-md ${
        transparent ? "bg-black/50" : "bg-black/70"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="relative z-10 flex items-center">
          <Image
            src={LOGO}
            alt="AutoDV8ions"
            width={220}
            height={90}
            className="h-12 w-auto object-contain opacity-95 drop-shadow-[0_0_18px_rgba(220,0,0,0.22)] transition-opacity duration-500 hover:opacity-100 sm:h-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {nav.map((item) => {
            const active =
              activeHref === item.href ||
              (item.href !== "/" && activeHref?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label-mono link-underline transition-colors duration-500 ${
                  active ? "text-white" : "text-white/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/tint-quote"
            className="label-mono link-underline text-white/50 hover:text-white"
          >
            Tint Quote
          </Link>
        </nav>

        <Link
          href={ctaHref}
          className="label-mono border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_24px_var(--accent-glow)]"
        >
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
