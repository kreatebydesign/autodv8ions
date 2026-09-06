/** Production canonical host — Vercel redirects apex → www (307). */
export const SITE_ORIGIN = "https://www.autodv8ions.com";

export const SITE_PHONE_DISPLAY = "814.201.2456";
export const SITE_PHONE_E164 = "+18142012456";
export const SITE_EMAIL = "sales@autodv8ions.com";
export const SITE_NAME = "AutoDV8ions";
export const SITE_LOCALITY = "Altoona";
export const SITE_REGION = "PA";
export const SITE_COUNTRY = "US";

export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_ORIGIN;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
