import type { Metadata } from "next";
import "./globals.css";
import "./fackts-motion.css";
import PublicHeader from "./components/PublicHeader";
import MobileNav from "./components/MobileNav";
import FacktsTicker from "./components/FacktsTicker";
import PublicRosterCta from "./components/PublicRosterCta";
import PublicGameMatchPreview from "./components/PublicGameMatchPreview";
import PageSpecificMobileTuning from "./components/PageSpecificMobileTuning";
import HomeMediaRedirectFix from "./components/HomeMediaRedirectFix";

export const metadata: Metadata = {
  title: "FACKTS Hoops",
  description:
    "FACKTS Hoops is a basketball agency and digital platform helping Kenyan basketball talent become visible, documented, marketable, and commercially valued.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PageSpecificMobileTuning />
        <HomeMediaRedirectFix />
        <PublicHeader />
        <MobileNav />
        <FacktsTicker />
        <PublicRosterCta />
        <PublicGameMatchPreview />
        {children}
      </body>
    </html>
  );
}