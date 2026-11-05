import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // HTML همیشه تازه سرو شود — جلوگیری از کش‌شدن یک‌ساله صفحه در CDN/لبه و مرورگر
  // (فایل‌های هش‌دار /_next/static و /api دست‌نخورده می‌مانند)
  async headers() {
    return [
      {
        source: "/((?!api/|_next/|img/|fonts/).*)",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
