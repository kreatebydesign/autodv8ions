/** Fixed header offset — matches `main` top padding in ServicePageShell. */
export const REMOTE_STARTER_HEADER_OFFSET_PX = 72;

export const REMOTE_STARTER_PAGE_PATH = "/services/remote-starters";

export function normalizeSitePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isRemoteStarterPagePath(pathname: string) {
  return normalizeSitePathname(pathname) === REMOTE_STARTER_PAGE_PATH;
}

export function getRemoteStarterScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function getRemoteStarterConsultationScrollTarget() {
  const section = document.getElementById("consultation");
  if (!section) return null;
  return (
    section.querySelector<HTMLElement>("[data-consultation-scroll-target]") ??
    section
  );
}

export function scrollToRemoteStarterConsultation(
  behavior: ScrollBehavior = getRemoteStarterScrollBehavior(),
) {
  const node = getRemoteStarterConsultationScrollTarget();
  if (!node) return false;

  // `scroll-mt-[4.5rem]` on targets accounts for the fixed header.
  node.scrollIntoView({ behavior, block: "start" });

  const focusRoot = document.getElementById("consultation");
  const focusTarget = focusRoot ?? node;
  if (focusTarget && !focusTarget.hasAttribute("tabindex")) {
    focusTarget.setAttribute("tabindex", "-1");
  }
  focusTarget?.focus({ preventScroll: true });

  return true;
}

/**
 * Retries until the consultation block is in the DOM and laid out (fonts, images,
 * Suspense boundaries on first paint).
 */
export function scheduleScrollToRemoteStarterConsultation(
  behavior: ScrollBehavior = getRemoteStarterScrollBehavior(),
) {
  let attempts = 0;
  const maxAttempts = 12;

  function tryScroll() {
    attempts += 1;
    const node = document.getElementById("consultation");
    if (!node) {
      if (attempts < maxAttempts) requestAnimationFrame(tryScroll);
      return;
    }

    scrollToRemoteStarterConsultation(behavior);

    // One follow-up pass after layout settles (common on mobile / soft nav).
    if (attempts < maxAttempts) {
      requestAnimationFrame(() => {
        scrollToRemoteStarterConsultation(behavior);
      });
    }
  }

  requestAnimationFrame(tryScroll);
}

export function isRemoteStarterConsultationHref(href: string | null) {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.origin);
    return (
      isRemoteStarterPagePath(url.pathname) && url.hash === "#consultation"
    );
  } catch {
    return href.includes("#consultation");
  }
}

export function parseRemoteStarterConsultationHref(href: string) {
  const url = new URL(href, window.location.origin);
  return {
    pathname: normalizeSitePathname(url.pathname),
    search: url.search,
    hash: url.hash,
  };
}
