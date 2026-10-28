const STICKY_HEADER_PX = 72;

export function scrollToPageHash(hash: string) {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return false;
  const section = document.getElementById(id);
  if (!section) return false;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

  const heading = section.querySelector<HTMLElement>("h2");
  const firstField = section.querySelector<HTMLElement>(
    "input:not([type='hidden']), textarea, select",
  );

  if (heading && firstField) {
    const headingDoc =
      heading.getBoundingClientRect().top + window.scrollY;
    const fieldDoc =
      firstField.getBoundingClientRect().top + window.scrollY;
    const topTarget = headingDoc - STICKY_HEADER_PX - 8;
    const fieldTarget =
      fieldDoc - STICKY_HEADER_PX - Math.min(160, window.innerHeight * 0.22);
    window.scrollTo({
      top: Math.max(0, Math.min(topTarget, fieldTarget)),
      behavior,
    });
    return true;
  }

  section.scrollIntoView({ behavior, block: "start" });
  return true;
}
