"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();
  }, [open]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function onChange(event: MediaQueryListEvent | MediaQueryList) {
      if (event.matches) setOpen(false);
    }
    onChange(media);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const mobileLinks: SiteNavItem[] = [
    ...nav,
    { label: "Tint Quote", href: "/tint-quote" },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 border-b border-white/[0.06] backdrop-blur-md ${
        transparent && !open ? "bg-black/50" : "bg-black/70"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="relative z-10 flex shrink-0 items-center"
          onClick={closeMenu}
        >
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center border border-white/10 bg-white/[0.03] px-3 text-white/70 transition-colors duration-300 hover:border-white/20 hover:text-white lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden className="flex w-4 flex-col gap-1.5">
              <span
                className={`block h-px w-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-px w-full bg-current transition-opacity duration-300 motion-reduce:transition-none ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-px w-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          <Link
            href={ctaHref}
            className="label-mono border border-white/10 bg-white/[0.03] px-3 py-2.5 text-white/70 transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_24px_var(--accent-glow)] sm:px-4"
            onClick={closeMenu}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      <div
        id={menuId}
        ref={panelRef}
        hidden={!open}
        className={`border-t border-white/[0.06] bg-black/95 lg:hidden ${
          open ? "block" : ""
        }`}
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-7xl flex-col px-5 py-3 sm:px-8"
        >
          {mobileLinks.map((item) => {
            const active =
              activeHref === item.href ||
              (item.href !== "/" && activeHref?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label-mono flex min-h-12 items-center border-b border-white/[0.05] py-3 transition-colors duration-300 last:border-b-0 ${
                  active ? "text-white" : "text-white/55 hover:text-white"
                }`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}

          {ctaHref !== "/tint-quote" ? (
            <Link
              href={ctaHref}
              className="label-mono mt-2 flex min-h-12 items-center border border-white/12 bg-white/[0.04] px-4 py-3 text-white/80"
              onClick={closeMenu}
            >
              {ctaLabel}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
