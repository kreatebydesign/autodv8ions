"use client";

import type { ContactLinkLocation } from "@/lib/analytics/gtag";
import { trackEmailClick, trackPhoneClick } from "@/lib/analytics/gtag";

type Props = {
  href: string;
  linkLocation: ContactLinkLocation;
  className?: string;
  children: React.ReactNode;
};

export function TrackedTelLink({
  href,
  linkLocation,
  className,
  children,
}: Props) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackPhoneClick({ link_location: linkLocation })}
    >
      {children}
    </a>
  );
}

export function TrackedMailtoLink({
  href,
  linkLocation,
  className,
  children,
}: Props) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackEmailClick({ link_location: linkLocation })}
    >
      {children}
    </a>
  );
}
