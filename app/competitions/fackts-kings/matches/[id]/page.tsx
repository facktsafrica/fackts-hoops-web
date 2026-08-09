import type { Metadata } from "next";
import OneOnOneMatchPage from "@/app/one-on-one/[id]/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "FACKTS Kings Match Record",
  description: "Score, players, verification details and playable match media.",
};

export default OneOnOneMatchPage;
