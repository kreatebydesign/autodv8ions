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
