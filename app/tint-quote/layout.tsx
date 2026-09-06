import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Window Tint Quote | Altoona, PA",
  description:
    "Request a window tint quote from AutoDV8ions in Altoona, PA. Tell us about your vehicle and we'll follow up with a personalized quote.",
  alternates: { canonical: "/tint-quote" },
};

export default function TintQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
