import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoDV8ions | Custom Car Upgrades, Tint, Audio & More in Altoona PA",
  description:
    "AutoDV8ions has been Altoona's go-to for custom car upgrades for over 27 years—offering expert window tinting, audio systems, remote starters, and security installs.",
  openGraph: {
    title: "AutoDV8ions | Premier Car Customization in Altoona, PA",
    description:
      "27 years of trusted craftsmanship — window tinting, car audio, remote starters, and security systems.",
    siteName: "AutoDV8ions",
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
