export type LeadServiceType =
  | "tint_quote"
  | "remote_starter"
  | "vehicle_security"
  | "audio_custom"
  | "general_contact";

export type ContactLinkLocation = "footer" | "contact";

export type GenerateLeadParams = {
  service_type: LeadServiceType;
  form_id?: string;
  page_path?: string;
};

export type ContactClickParams = {
  link_location: ContactLinkLocation;
};

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

/**
 * Load GA only on the canonical Vercel Production deployment.
 * Preview builds are also NODE_ENV=production, so VERCEL_ENV is required.
 * Localhost/dev have no VERCEL_ENV and never load GA.
 */
export function shouldLoadGoogleAnalytics(): boolean {
  if (!getGaMeasurementId()) return false;
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return vercelEnv === "production";
}

function canSendEvents(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(getGaMeasurementId()) &&
    typeof window.gtag === "function"
  );
}

function sendEvent(
  eventName: string,
  params: Record<string, string>,
): void {
  if (!canSendEvents()) return;
  window.gtag!("event", eventName, params);
}

/** Build a PII-safe generate_lead payload (categorical params only). */
export function buildGenerateLeadPayload(
  params: GenerateLeadParams,
): Record<string, string> {
  const payload: Record<string, string> = {
    service_type: params.service_type,
  };
  if (params.form_id) payload.form_id = params.form_id;
  if (params.page_path) payload.page_path = params.page_path;
  return payload;
}

export function trackGenerateLead(params: GenerateLeadParams): void {
  sendEvent("generate_lead", buildGenerateLeadPayload(params));
}

export function trackPhoneClick(params: ContactClickParams): void {
  sendEvent("phone_click", { link_location: params.link_location });
}

export function trackEmailClick(params: ContactClickParams): void {
  sendEvent("email_click", { link_location: params.link_location });
}
