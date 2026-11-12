import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function arguments include passwords; keep them out of dev logs.
  logging: { serverFunctions: false },
};

export default nextConfig;
