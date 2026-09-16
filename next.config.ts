import type { NextConfig } from "next";

/**
 * Sharp 0.35 on Next.js 16.2 / Turbopack / Vercel:
 * file tracing includes the platform .node addon but often omits the sibling
 * @img/sharp-libvips-linux-x64 shared library (dlopen'd at runtime), causing:
 *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3
 *
 * Keep sharp external (native require) and force-include the linux-x64 packages
 * that production Vercel functions actually need. Paths are npm layout
 * (package-lock.json). Globs that miss on macOS still apply on Linux builds.
 */
const SHARP_LINUX_X64_TRACE = [
  "./node_modules/@img/sharp-libvips-linux-x64/**/*",
  "./node_modules/@img/sharp-linux-x64/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    // Media processing POST (dynamic-imports Asset Engine → sharp)
    "/api/content/media-process": SHARP_LINUX_X64_TRACE,
    // Lifecycle restore+reprocess (dynamic-imports media-process only when needed)
    "/api/portfolio/lifecycle": SHARP_LINUX_X64_TRACE,
  },
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
