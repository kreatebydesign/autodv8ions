import {
  SITE_EMAIL,
  SITE_LOCALITY,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_PHONE_E164,
  SITE_REGION,
  SITE_COUNTRY,
  absoluteUrl,
} from "@/lib/site/canonical";

const OFFERED_SERVICES = [
  {
    name: "Window Tint",
    url: absoluteUrl("/services/window-tint"),
  },
  {
    name: "Remote Starter Installation",
    url: absoluteUrl("/services/remote-starters"),
  },
  {
    name: "Vehicle Security",
    url: absoluteUrl("/services/vehicle-security"),
  },
  {
    name: "Audio and Select Custom Upgrades",
    url: absoluteUrl("/services/audio-custom"),
  },
] as const;

/**
 * Facts included are limited to what is confirmed on the public site.
 * Street address, hours, geo, ratings, and priceRange are intentionally omitted.
 */
export default function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "AutomotiveBusiness",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    telephone: SITE_PHONE_E164,
    email: SITE_EMAIL,
    image: absoluteUrl("/images/autodv8ions-og.jpg"),
    logo: absoluteUrl("/images/logos/dv8-logo.png"),
    description:
      "AutoDV8ions in Altoona, PA — window tint, remote starters, vehicle security, and select custom work. Serving Altoona and Central Pennsylvania since 1998.",
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE_LOCALITY,
      addressRegion: SITE_REGION,
      addressCountry: SITE_COUNTRY,
    },
    areaServed: [
      {
        "@type": "City",
        name: "Altoona",
        containedInPlace: {
          "@type": "State",
          name: "Pennsylvania",
        },
      },
      {
        "@type": "AdministrativeArea",
        name: "Central Pennsylvania",
      },
    ],
    foundingDate: "1998",
    makesOffer: OFFERED_SERVICES.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        url: service.url,
        provider: {
          "@type": "AutomotiveBusiness",
          name: SITE_NAME,
        },
        areaServed: "Altoona, PA",
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
