import type { Metadata } from "next";
import MediaLibrary from "./MediaLibrary";
import { loadMediaLibrary } from "@/lib/hoops/mediaLibrary";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Media | FACKTS Hoops",
  description: "Watch FACKTS full games, highlights, interviews, player stories and event coverage in one connected basketball media library.",
};

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const query = await searchParams;
  const initialQuery = Array.isArray(query.q) ? query.q[0] || "" : query.q || "";
  const items = await loadMediaLibrary();
  return <MediaLibrary items={items} initialQuery={initialQuery} />;
}
