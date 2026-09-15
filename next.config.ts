import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "https://greenkey-api-staging.onrender.com/v1";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    // Ensure Route Handlers / proxy see the same API base after restart
    NEXT_PUBLIC_API_URL: apiUrl,
    API_URL: process.env.API_URL || apiUrl,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
