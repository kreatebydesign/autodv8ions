"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { scrollToPageHash } from "@/components/site/scroll-to-page-hash";

function parseHashHref(href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return { path: href, hash: null as string | null };
  }
  const path = href.slice(0, hashIndex);
  const hash = href.slice(hashIndex);
  return { path, hash };
}

function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

type SamePageHashLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
};

/**
 * Native in-page hash scrolling (App Router client navigations often skip hash scroll).
 */
export default function SamePageHashLink({
  href,
  className,
  children,
  onNavigate,
}: SamePageHashLinkProps) {
  const pathname = usePathname();
  const { path, hash } = parseHashHref(href);

  if (!hash) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const targetPath = normalizePath(path || pathname);
  const currentPath = normalizePath(pathname);
  const samePage = targetPath === currentPath;

  if (samePage) {
    return (
      <a
        href={hash}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          if (!scrollToPageHash(hash)) return;
          const nextUrl = `${currentPath}${window.location.search}${hash}`;
          window.history.pushState(null, "", nextUrl);
          onNavigate?.();
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
