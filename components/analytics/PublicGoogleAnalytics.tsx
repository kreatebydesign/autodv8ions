"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { getGaMeasurementId } from "@/lib/analytics/gtag";

/**
 * Loads GA4 once for the public site only.
 * Mount this only when shouldLoadGoogleAnalytics() is true (server layout gate
 * using VERCEL_ENV=production). This client also skips /admin routes.
 *
 * Page views:
 * - Initial: automatic via gtag('config') inside GoogleAnalytics
 * - SPA: rely on GA4 Enhanced Measurement (browser history changes)
 * Do not send a manual page_view — that would double-count the initial hit.
 */
export default function PublicGoogleAnalytics() {
  const pathname = usePathname() || "";
  const gaId = getGaMeasurementId();

  if (!gaId) return null;
  if (pathname.startsWith("/admin")) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
