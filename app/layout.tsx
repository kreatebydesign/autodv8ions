import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://autodv8ions.com";
const ogImageUrl = `${siteUrl}/images/autodv8ions-og.jpg`;

const defaultTitle =
  "AutoDV8ions | Window Tint, Remote Starters & Vehicle Upgrades in Altoona, PA";
const defaultDescription =
  "AutoDV8ions is Altoona, PA's trusted shop for window tint, remote starters, car audio, security systems, and custom vehicle upgrades — over 27 years of expert craftsmanship.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | AutoDV8ions",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AutoDV8ions",
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "AutoDV8ions — Window Tint, Remote Starters & Vehicle Upgrades in Altoona, PA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
