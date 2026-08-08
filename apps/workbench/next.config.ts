import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@factory/graph",
    "@factory/adapters",
    "@factory/capabilities",
  ],
};

export default nextConfig;
