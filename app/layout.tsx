import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./fackts-motion.css";
import PublicHeader from "./components/PublicHeader";
import PwaInstallButton from "./components/PwaInstallButton";
import PwaServiceWorkerClient from "./components/PwaServiceWorkerClient";
import PlayerPortalReturn from "./components/PlayerPortalReturn";
import PublicPageShell from "./components/PublicPageShell";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://fackts-hoops-web.vercel.app"
  ),
  title: "FACKTS Hoops",
  description:
    "Tournament statistics, player profiles, game media and organizer reporting — all in one basketball platform.",
  applicationName: "FACKTS Hoops",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260722", sizes: "any" },
      { url: "/icons/icon-192x192.png?v=20260722", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico?v=20260722",
    apple: "/apple-touch-icon.png?v=20260722",
  },
  openGraph: {
    title: "FACKTS Hoops",
    description:
      "Tournament statistics, player profiles, game media and organizer reporting — all in one basketball platform.",
    type: "website",
    url: "/",
    siteName: "FACKTS Hoops",
    images: [
      {
        url: "/fackts-hoops-logo.png?v=20260722",
        width: 1024,
        height: 1536,
        alt: "FACKTS Hoops logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FACKTS Hoops",
    description:
      "Tournament statistics, player profiles, game media and organizer reporting — all in one basketball platform.",
    images: ["/fackts-hoops-logo.png?v=20260722"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F3A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest?v=20260722" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260722" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FACKTS Hoops" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <PwaServiceWorkerClient />
        <PublicHeader />
        <PwaInstallButton />
        <PublicPageShell>{children}</PublicPageShell>
        <PlayerPortalReturn />
      </body>
    </html>
  );
}
