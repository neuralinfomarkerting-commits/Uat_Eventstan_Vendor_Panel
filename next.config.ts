import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://api.eventstan.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/proxy/:path*",
        headers: [{ key: "X-Requested-With", value: "XMLHttpRequest" }],
      },
    ];
  },
};

export default nextConfig;
