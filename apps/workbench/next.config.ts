import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@factory/graph", "@factory/adapters"],
};

export default nextConfig;
