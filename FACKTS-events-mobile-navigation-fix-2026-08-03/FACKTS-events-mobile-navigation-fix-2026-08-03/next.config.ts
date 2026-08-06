import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the mobile preview clear. Runtime and build errors still surface in
  // the browser/terminal; this only hides Next's floating development badge.
  devIndicators: false,
};

export default nextConfig;
