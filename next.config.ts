import type { NextConfig } from "next";
import { REMOTE_IMAGE_HOSTS } from "./src/features/locations/remote-image-hosts";

const nextConfig: NextConfig = {
  // Server Function arguments include passwords; keep them out of dev logs.
  logging: { serverFunctions: false },
  images: {
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
