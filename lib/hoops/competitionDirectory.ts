import { createClient } from "@supabase/supabase-js";

export type CompetitionDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  summary: string;
  format: string;
  organizer: string;
  seasonLabel: string;
  status: "upcoming" | "live" | "completed";
  startDate: string;
  endDate: string;
  venue: string;
  location: string;
  imageUrl: string;
  logoUrl: string;
  verificationStatus: string;
  href: string;
  recordType: "series" | "event";
  isFeatured: boolean;
};

type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  summary?: string | null;
  competition_format?: string | null;
  organizer_name?: string | null;
  current_season_label?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  verification_status?: string | null;
  is_featured?: boolean | null;
  is_public?: boolean | null;
};

type EventRow = {
  event_id: string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  event_type?: string | null;
  organizer_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  location?: string | null;
  poster_url?: string | null;
  hero_image_url?: string | null;
  status?: string | null;
  is_public?: boolean | null;
};

export const FACKTS_KINGS_FALLBACK: CompetitionDirectoryItem = {
  id: "fackts-kings",
  slug: "fackts-kings",
  name: "FACKTS Kings",
  shortName: "FACKTS Kings",
  summary:
    "The ongoing FACKTS one-on-one competition, documented matchup by matchup with verified results, season standings, player records and playable media.",
  format: "1v1",
  organizer: "FACKTS Africa",
  seasonLabel: "2026",
  status: "live",
  startDate: "2026-01-01",
  endDate: "",
  venue: "Multiple courts",
  location: "Kenya",
  imageUrl: "/images/one-on-one-bg.png",
  logoUrl: "/fackts-hoops-logo.png",
  verificationStatus: "verified",
  href: "/competitions/fackts-kings",
  recordType: "series",
  isFeatured: true,
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function lifecycle(
  status?: string | null,
  startDate?: string | null,
  endDate?: string | null
): CompetitionDirectoryItem["status"] {
  const normalized = String(status || "").toLowerCase();
  if (["live", "ongoing", "active"].includes(normalized)) return "live";
  if (["completed", "archived", "closed"].includes(normalized)) return "completed";
  if (["upcoming", "scheduled", "draft"].includes(normalized)) return "upcoming";

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date());
  if (startDate && today < startDate) return "upcoming";
  if (endDate && today > endDate) return "completed";
  return startDate ? "live" : "upcoming";
}

function fromCompetition(row: CompetitionRow): CompetitionDirectoryItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name || row.name,
    summary: row.summary || "Open the complete competition record.",
    format: row.competition_format || "Basketball",
    organizer: row.organizer_name || "Organizer pending",
    seasonLabel: row.current_season_label || "Current season",
    status: lifecycle(row.status, row.start_date, row.end_date),
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    venue: row.venue || "",
    location: row.location || "",
    imageUrl: row.cover_image_url || "/images/one-on-one-bg.png",
    logoUrl: row.logo_url || "/fackts-hoops-logo.png",
    verificationStatus: row.verification_status || "unverified",
    href: `/competitions/${row.slug}`,
    recordType: "series",
    isFeatured: row.is_featured === true,
  };
}

function fromEvent(row: EventRow): CompetitionDirectoryItem {
  const slug = row.slug || row.event_id;
  return {
    id: row.event_id,
    slug,
    name: row.title,
    shortName: row.title,
    summary: row.summary || "Open the complete Event Hub and competition record.",
    format: row.event_type || "Tournament",
    organizer: row.organizer_name || "Organizer pending",
    seasonLabel: row.start_date?.slice(0, 4) || "Event archive",
    status: lifecycle(row.status, row.start_date, row.end_date),
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    venue: row.venue || "",
    location: row.location || "",
    imageUrl: row.poster_url || row.hero_image_url || "/images/one-on-one-bg.png",
    logoUrl: "",
    verificationStatus: "published",
    href: `/events/${slug}`,
    recordType: "event",
    isFeatured: false,
  };
}

export async function loadCompetitionDirectory(): Promise<CompetitionDirectoryItem[]> {
  const db = getSupabase();
  if (!db) return [FACKTS_KINGS_FALLBACK];

  const [competitionResult, eventResult] = await Promise.all([
    db
      .from("competitions")
      .select("*")
      .eq("is_public", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from("event_case_studies")
      .select("*")
      .eq("is_public", true)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  const competitions = competitionResult.error
    ? []
    : ((competitionResult.data || []) as CompetitionRow[]).map(fromCompetition);
  const events = eventResult.error
    ? []
    : ((eventResult.data || []) as EventRow[]).map(fromEvent);

  const hasKings = competitions.some((item) => item.slug === "fackts-kings");
  const combined = [
    ...(hasKings ? competitions : [FACKTS_KINGS_FALLBACK, ...competitions]),
    ...events,
  ];

  return combined.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const statusRank = { live: 0, upcoming: 1, completed: 2 };
    const statusDifference = statusRank[a.status] - statusRank[b.status];
    if (statusDifference !== 0) return statusDifference;
    return String(b.startDate).localeCompare(String(a.startDate));
  });
}

export async function loadCompetitionBySlug(
  slug: string
): Promise<CompetitionDirectoryItem | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const db = getSupabase();
  if (!db) {
    return normalizedSlug === FACKTS_KINGS_FALLBACK.slug
      ? FACKTS_KINGS_FALLBACK
      : null;
  }

  const { data, error } = await db
    .from("competitions")
    .select("*")
    .eq("slug", normalizedSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (!error && data) return fromCompetition(data as CompetitionRow);
  return normalizedSlug === FACKTS_KINGS_FALLBACK.slug
    ? FACKTS_KINGS_FALLBACK
    : null;
}
