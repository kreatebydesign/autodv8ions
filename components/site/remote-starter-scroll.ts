/** Fixed header offset — matches `main` top padding in ServicePageShell. */
export const REMOTE_STARTER_HEADER_OFFSET_PX = 72;

export function scrollToRemoteStarterConsultation(
  behavior: ScrollBehavior = "smooth",
) {
  const node = document.getElementById("consultation");
  if (!node) return false;
  const top =
    node.getBoundingClientRect().top +
    window.scrollY -
    REMOTE_STARTER_HEADER_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function isRemoteStarterConsultationHref(href: string | null) {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.origin);
    return (
      url.pathname === "/services/remote-starters" &&
      url.hash === "#consultation"
    );
  } catch {
    return href.includes("#consultation");
  }
}
