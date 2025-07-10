import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dashing-cormorant-12.convex.cloud",
        port: "",
        pathname: "/api/storage/**",
      }
    ]
  }
};

export default nextConfig;
