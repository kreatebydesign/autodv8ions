import type { Customer, Job, Vehicle } from "@/lib/types/database";

export function formatCustomerName(customer?: Customer | null) {
  if (!customer) return "Unknown Customer";
  return `${customer.first_name} ${customer.last_name}`.trim() || "Unknown Customer";
}

export function formatVehicle(vehicle?: Vehicle | null) {
  if (!vehicle) return "—";
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean);
  const base = parts.join(" ") || "—";
  return vehicle.color ? `${base} · ${vehicle.color}` : base;
}

export function formatVehicleShort(vehicle?: Vehicle | null) {
  if (!vehicle) return "—";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—";
}

export function formatPhoneLink(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}

export function formatEmailLink(email?: string | null) {
  if (!email) return null;
  return `mailto:${email}`;
}

export function buildCalendarDetails(job: Job) {
  const customer = job.customers;
  const vehicle = job.vehicles;

  return [
    `Customer: ${formatCustomerName(customer)}`,
    `Phone: ${customer?.phone || "—"}`,
    `Email: ${customer?.email || "—"}`,
    `Vehicle: ${formatVehicle(vehicle)}`,
    `Service: ${job.service_type}`,
    `Tint: ${job.tint_percentage || "—"}`,
    `Notes: ${job.customer_notes || job.internal_notes || "—"}`,
  ].join("\n");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function generateGallerySlug(vehicle: string, service: string, date?: string) {
  const parts = [date?.slice(0, 4), vehicle, service, "altoona-pa"]
    .filter(Boolean)
    .map((p) => slugify(String(p)));
  return parts.join("-").replace(/-+/g, "-");
}

export function generateSocialCaption(
  vehicle: string,
  serviceType: string,
  platform: "reel" | "facebook",
) {
  if (platform === "reel") {
    return `${vehicle} · ${serviceType}\n\nFresh out of the bay at AutoDV8ions.\nAltoona, PA\n\n#AutoDV8ions #WindowTint #CarCustomization #AltoonaPA`;
  }
  return `Another clean build out of AutoDV8ions.\n\n${vehicle}\nService: ${serviceType}\n\nAltoona's go-to for custom automotive work for 27+ years.\n\n📍 Altoona, PA\n📞 Message us for a quote`;
}
