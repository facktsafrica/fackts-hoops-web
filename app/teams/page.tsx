import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventRow = {
  event_id: string;
  slug: string;
  title: string;
  start_date?: string | null;
  venue?: string | null;
  location?: string | null;
};

type EventRecordRow = {
  id: string;
  event_id: string;
  record_type: string;
  title: string;
  subtitle?: string | null;
  details?: string | null;
  division?: string | null;
  team_name?: string | null;
  opponent_name?: string | null;
  score_for?: number | null;
  score_against?: number | null;
  image_url?: string | null;
  created_at?: string | null;
};

type TeamAppearance = {
  event: EventRow;
  record: EventRecordRow;
};

type TeamDirectoryEntry = {
  key: string;
  name: string;
  imageUrl: string;
  divisions: string[];
  appearances: TeamAppearance[];
  latestResult: EventRecordRow | null;
};

function canonicalName(value?: string | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function teamKey(value?: string | null) {
  return canonicalName(value).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "Date not recorded";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function latestTimestamp(record: EventRecordRow) {
  const value = record.created_at ? new Date(record.created_at).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
}

async function loadTeamDirectory() {
  const [eventsResult, recordsResult] = await Promise.all([
    supabase
      .from("event_case_studies")
      .select("event_id,slug,title,start_date,venue,location")
      .eq("is_public", true)
      .eq("status", "published")
      .order("start_date", { ascending: false }),
    supabase
      .from("event_records")
      .select("*")
      .eq("is_public", true)
      .in("status", ["verified", "published"])
      .in("record_type", ["team", "result"])
      .order("created_at", { ascending: false }),
  ]);

  const events = (eventsResult.data || []) as EventRow[];
  const records = (recordsResult.data || []) as EventRecordRow[];
  const eventMap = new Map(events.map((event) => [event.event_id, event]));
  const teamRecords = records.filter((record) => record.record_type === "team");
  const results = records.filter((record) => record.record_type === "result");
  const directory = new Map<string, TeamDirectoryEntry>();

  for (const record of teamRecords) {
    const name = canonicalName(record.title || record.team_name);
    const event = eventMap.get(record.event_id);
    const key = teamKey(name);

    if (!name || !event || !key) continue;

    const existing = directory.get(key);

    if (existing) {
      existing.appearances.push({ event, record });
      if (!existing.imageUrl && record.image_url) existing.imageUrl = record.image_url;
      if (record.division && !existing.divisions.includes(record.division)) {
        existing.divisions.push(record.division);
      }
      continue;
    }

    directory.set(key, {
      key,
      name,
      imageUrl: record.image_url || "",
      divisions: record.division ? [record.division] : [],
      appearances: [{ event, record }],
      latestResult: null,
    });
  }

  for (const entry of directory.values()) {
    entry.appearances.sort((left, right) =>
      String(right.event.start_date || "").localeCompare(
        String(left.event.start_date || "")
      )
    );

    entry.latestResult =
      results
        .filter(
          (record) =>
            teamKey(record.team_name) === entry.key ||
            teamKey(record.opponent_name) === entry.key
        )
        .sort((left, right) => latestTimestamp(right) - latestTimestamp(left))[0] ||
      null;
  }

  return [...directory.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function resultForTeam(entry: TeamDirectoryEntry) {
  const result = entry.latestResult;
  if (!result) return null;

  const isFirstTeam = teamKey(result.team_name) === entry.key;
  const teamScore = isFirstTeam ? result.score_for : result.score_against;
  const opponentScore = isFirstTeam ? result.score_against : result.score_for;
  const opponent = isFirstTeam ? result.opponent_name : result.team_name;

  let outcome = "Draw";
  if (teamScore != null && opponentScore != null) {
    if (teamScore > opponentScore) outcome = "Win";
    if (teamScore < opponentScore) outcome = "Loss";
  }

  return {
    outcome,
    teamScore,
    opponentScore,
    opponent: canonicalName(opponent) || "Opponent",
  };
}

export default async function TeamsPage() {
  const teams = await loadTeamDirectory();
  const appearances = teams.reduce(
    (total, team) => total + team.appearances.length,
    0
  );

  return (
    <main className="min-h-screen bg-[#F3F6F9] text-[#182230]">
      <section className="bg-[#0B1F3A] text-white">
        <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
            Published competition records
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Teams documented by FACKTS
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            A single directory built from real published event records. Open a
            team to see the competition where its roster, results and media were
            documented.
          </p>

          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            <DirectoryMetric value={String(teams.length)} label="Teams listed" />
            <DirectoryMetric
              value={String(appearances)}
              label="Event appearances"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F58220]">
              Team directory
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.025em] text-[#0B1F3A] sm:text-4xl">
              Event-linked teams
            </h2>
          </div>
          <Link
            href="/events"
            className="text-sm font-black text-[#0B1F3A] hover:text-[#F58220]"
          >
            Browse competitions →
          </Link>
        </div>

        {teams.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const latestAppearance = team.appearances[0];
              const result = resultForTeam(team);

              return (
                <article
                  key={team.key}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#102A4C]">
                    {team.imageUrl ? (
                      <img
                        src={team.imageUrl}
                        alt={`${team.name} team`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/70">
                        <span className="text-3xl font-black text-orange-300">
                          {team.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="mt-3 text-[10px] font-black uppercase tracking-[0.18em]">
                          Team photo pending
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/75 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-md bg-[#1F8A5B] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                      Published record
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F58220]">
                      {team.divisions.join(" · ") || "Basketball team"}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight text-[#0B1F3A]">
                      {team.name}
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#F3F6F9] p-3">
                      <SmallMetric
                        value={String(team.appearances.length)}
                        label="Competitions"
                      />
                      <SmallMetric
                        value={result?.outcome || "—"}
                        label="Latest result"
                      />
                    </div>

                    {result ? (
                      <div className="mt-4 rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Latest recorded game
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#182230]">
                              vs {result.opponent}
                            </p>
                          </div>
                          <p className="shrink-0 text-xl font-black text-[#0B1F3A]">
                            {result.teamScore ?? "–"} – {result.opponentScore ?? "–"}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Latest participation
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-bold text-[#182230]">
                        {latestAppearance.event.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(latestAppearance.event.start_date)} ·{" "}
                        {[latestAppearance.event.venue, latestAppearance.event.location]
                          .filter(Boolean)
                          .join(" · ") || "Venue not recorded"}
                      </p>
                    </div>

                    <Link
                      href={`/events/${latestAppearance.event.slug}?q=${encodeURIComponent(
                        team.name
                      )}`}
                      className="mt-5 flex w-full items-center justify-center rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#F58220]"
                    >
                      View Team in Event
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-black text-[#0B1F3A]">
              Published team records will appear here.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Teams are added through a published event so their competition
              context remains clear.
            </p>
            <Link
              href="/events"
              className="mt-5 inline-flex rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-black text-white"
            >
              Open Events
            </Link>
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-12">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F58220]">
              Need your teams documented?
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase text-[#0B1F3A] sm:text-4xl">
              Bring your competition into one professional event hub.
            </h2>
          </div>
          <Link
            href="/book-coverage"
            className="flex min-h-12 items-center justify-center rounded-lg bg-[#F58220] px-6 py-3 text-sm font-black text-white hover:bg-[#dc6d10]"
          >
            Book Tournament Coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function DirectoryMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function SmallMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-[#0B1F3A]">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
