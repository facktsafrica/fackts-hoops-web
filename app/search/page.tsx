import type { Metadata } from "next";
import SearchExplorer from "./SearchExplorer";

export const metadata: Metadata = {
  title: "Search | FACKTS Hoops",
  description:
    "Search FACKTS Hoops players, teams, games, competitions, events, media and partners.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = await searchParams;
  const rawQuery = Array.isArray(query.q) ? query.q[0] : query.q;

  return <SearchExplorer initialQuery={String(rawQuery || "").slice(0, 80)} />;
}
