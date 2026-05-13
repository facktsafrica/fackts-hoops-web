"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  opponent: string | null;
  game_date: string | null;
  venue: string | null;
  match_type: string | null;
  is_upcoming: boolean | null;
};

type Player = {
  id: string;
  full_name: string;
  nickname: string | null;
  jersey_number: number | null;
  position: string | null;
};

type RosterRow = {
  id: string;
  game_id: string;
  player_id: string;
  roster_role: string | null;
  roster_status: string | null;
  notes: string | null;
  player?: Player | null;
};

function formatGameDate(value: string | null | undefined) {
  if (!value) return "Date TBA";

  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-KE", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function playerLine(row: RosterRow) {
  const number = row.player?.jersey_number ?? "—";
  const name = row.player?.full_name ?? "Unknown Player";
  const position = row.player?.position ?? "Player";

  return `#${number} ${name} — ${position}`;
}

function buildWhatsAppText(game: Game, roster: RosterRow[]) {
  const starters = roster.filter(
    (row) => row.roster_role?.toLowerCase() === "starter"
  );

  const bench = roster.filter(
    (row) => row.roster_role?.toLowerCase() !== "starter"
  );

  const startersText =
    starters.length > 0
      ? starters.map((row) => playerLine(row)).join("\n")
      : "To be confirmed";

  const benchText =
    bench.length > 0
      ? bench.map((row) => playerLine(row)).join("\n")
      : "To be confirmed";

  return `🏀 FACKTS GAME ROSTER

FACKTS vs ${game.opponent ?? "Opponent"}
${game.match_type ?? "Game"}
📍 ${game.venue ?? "Venue TBA"}
📅 ${formatGameDate(game.game_date)}

🔥 STARTERS
${startersText}

💪 BENCH
${benchText}

FACKTS Hoops. Kenyan basketball, documented.`;
}

export default function AdminRosterAnnouncementsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [rosters, setRosters] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [gamesResult, rosterResult] = await Promise.all([
      supabase
        .from("games")
        .select("id, opponent, game_date, venue, match_type, is_upcoming")
        .eq("is_upcoming", true)
        .order("game_date", { ascending: true }),

      supabase
        .from("game_rosters")
        .select(
          `
          id,
          game_id,
          player_id,
          roster_role,
          roster_status,
          notes,
          player:players (
            id,
            full_name,
            nickname,
            jersey_number,
            position
          )
        `
        ),
    ]);

    if (gamesResult.error) {
      setMessage(`Failed to load games: ${gamesResult.error.message}`);
      setGames([]);
    } else {
      setGames((gamesResult.data ?? []) as Game[]);
    }

    if (rosterResult.error) {
      setMessage(`Failed to load rosters: ${rosterResult.error.message}`);
      setRosters([]);
    } else {
      setRosters((rosterResult.data ?? []) as unknown as RosterRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const rosterByGame = useMemo(() => {
    const map = new Map<string, RosterRow[]>();

    rosters.forEach((row) => {
      const current = map.get(row.game_id) ?? [];
      current.push(row);
      map.set(row.game_id, current);
    });

    return map;
  }, [rosters]);

  async function copyAnnouncement(game: Game) {
    const gameRoster = rosterByGame.get(game.id) ?? [];
    const text = buildWhatsAppText(game, gameRoster);

    try {
      await navigator.clipboard.writeText(text);
      setMessage("WhatsApp roster announcement copied.");
    } catch {
      setMessage("Copy failed. Open the public roster and share from there.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Admin
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-5xl">
                Roster Announcements
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Open public roster pages and copy WhatsApp-ready roster
                announcements for upcoming games.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/rosters"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                Manage Rosters
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {message ? (
          <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading roster announcements...
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No upcoming games found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => {
              const gameRoster = rosterByGame.get(game.id) ?? [];
              const starters = gameRoster.filter(
                (row) => row.roster_role?.toLowerCase() === "starter"
              );
              const bench = gameRoster.filter(
                (row) => row.roster_role?.toLowerCase() !== "starter"
              );

              return (
                <article
                  key={game.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl shadow-black/20"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
                      Upcoming
                    </span>

                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {gameRoster.length} listed
                    </span>
                  </div>

                  <h2 className="text-xl font-black">
                    FACKTS vs {game.opponent ?? "Opponent"}
                  </h2>

                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {formatGameDate(game.game_date)} •{" "}
                    {game.venue ?? "Venue TBA"} •{" "}
                    {game.match_type ?? "Game"}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Roster
                      </div>
                      <div className="mt-1 text-xl font-black text-orange-300">
                        {gameRoster.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Starters
                      </div>
                      <div className="mt-1 text-xl font-black text-orange-300">
                        {starters.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">
                        Bench
                      </div>
                      <div className="mt-1 text-xl font-black text-orange-300">
                        {bench.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Link
                      href={`/rosters/${game.id}`}
                      target="_blank"
                      className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400"
                    >
                      Open Public Roster
                    </Link>

                    <button
                      type="button"
                      onClick={() => copyAnnouncement(game)}
                      className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
                    >
                      Copy WhatsApp Announcement
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}