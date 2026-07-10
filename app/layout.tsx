import type { Metadata } from "next";
import "./globals.css";
import PublicHeader from "./components/PublicHeader";
import PublicMobileNav from "./components/PublicMobileNav";
import FacktsTicker from "./components/FacktsTicker";

export const metadata: Metadata = {
  title: "FACKTS Hoops",
  description: "Basketball. Culture. Data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PublicHeader />
        <FacktsTicker />
        {children}
        <PublicMobileNav />
      </body>
    </html>
  );
}