import type { Metadata } from "next";
import "./globals.css";
import PublicHeader from "./components/PublicHeader";
import PublicMobileNav from "./components/PublicMobileNav";
import FacktsTicker from "./components/FacktsTicker";
import PwaInstallButton from "./components/PwaInstallButton";
import PwaServiceWorkerClient from "./components/PwaServiceWorkerClient";

export const metadata: Metadata = {
  title: "FACKTS Hoops",
  description: "Basketball. Culture. Data.",
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FACKTS Hoops" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body>
        <PwaServiceWorkerClient />
        <PublicHeader />
        <PwaInstallButton />
        <FacktsTicker />
        {children}
        <PublicMobileNav />
      </body>
    </html>
  );
}