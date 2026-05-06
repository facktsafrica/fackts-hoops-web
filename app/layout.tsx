import type { Metadata } from "next";
import "./globals.css";
import PublicMobileNav from "./components/PublicMobileNav";

export const metadata: Metadata = {
  title: "FACKTS Hoops",
  description:
    "FACKTS Hoops basketball platform for players, games, rosters, stats, and performance stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 pb-24 text-white md:pb-0">
        {children}
        <PublicMobileNav />
      </body>
    </html>
  );
}