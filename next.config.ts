import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp external so Vercel linux-x64 natives resolve at runtime
  // (avoids bundling a broken libvips into the route graph).
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
