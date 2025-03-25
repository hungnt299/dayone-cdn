import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: process.env.CDN_URL,
  output: "standalone",
};

export default nextConfig;
