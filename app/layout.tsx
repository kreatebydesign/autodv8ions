import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://autodv8ions.com";
const ogImageUrl = `${siteUrl}/images/autodv8ions-og.jpg`;

const defaultTitle =
  "AutoDV8ions | Window Tint, Remote Starters & Vehicle Upgrades in Altoona, PA";
const defaultDescription =
  "AutoDV8ions in Altoona, PA — window tint, remote starters, vehicle security, and select custom work. Same shop since 1998.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | AutoDV8ions",
  },
  description: defaultDescription,
  applicationName: "AutoDV8ions",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
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
