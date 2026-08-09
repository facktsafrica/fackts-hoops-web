import type { Metadata } from "next";
import OneOnOnePage from "@/app/one-on-one/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "FACKTS Kings | Competition Hub",
  description:
    "FACKTS Kings fixtures, verified results, 2026 season standings, player records and match media.",
};

export default OneOnOnePage;
