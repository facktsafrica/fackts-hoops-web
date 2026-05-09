import type { Metadata } from "next";
import "./globals.css";
import "./fackts-motion.css";
import PublicHeader from "./components/PublicHeader";
import MobileNav from "./components/MobileNav";
import FacktsTicker from "./components/FacktsTicker";

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
        <PublicHeader />
        <MobileNav />
        <FacktsTicker />
        {children}
      </body>
    </html>
  );
}