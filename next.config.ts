import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the mobile preview clear. Runtime and build errors still surface in
  // the browser/terminal; this only hides Next's floating development badge.
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/one-on-one",
        destination: "/competitions/fackts-kings",
        permanent: true,
      },
      {
        source: "/one-on-one/:id",
        destination: "/competitions/fackts-kings/matches/:id",
        permanent: true,
      },
      {
        source: "/court-takeover",
        destination: "/competitions/fackts-kings",
        permanent: true,
      },
      {
        source: "/leaderboards",
        destination: "/competitions/fackts-kings#standings",
        permanent: true,
      },
      {
        source: "/guest-leaderboards",
        destination: "/competitions/fackts-kings#standings",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
