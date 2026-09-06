import type { LeadServiceType } from "@/lib/analytics/gtag";

export type InquiryTypeForAnalytics =
  | "remote_starter"
  | "vehicle_security"
  | "audio_custom"
  | "general_contact";

const INQUIRY_SERVICE_TYPES: Record<
  InquiryTypeForAnalytics,
  LeadServiceType
> = {
  remote_starter: "remote_starter",
  vehicle_security: "vehicle_security",
  audio_custom: "audio_custom",
  general_contact: "general_contact",
};

export function inquiryTypeToServiceType(
  inquiryType: InquiryTypeForAnalytics,
): LeadServiceType {
  return INQUIRY_SERVICE_TYPES[inquiryType];
}
