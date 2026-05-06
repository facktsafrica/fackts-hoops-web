"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminHighlightsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [gamesMap, setGamesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRows() {
    setLoading(true);
    setMessage("");

    const { data: statsData, error: statsError } = await supabase
      .from("player_game_stats")
      .select(
        `
        *,
        players (
          id,
          full_name,
          jersey_number,
          position,
          photo_url
        )
      `
      )
      .order("created_at", { ascending: false });

    if (statsError) {
      console.error("Stats load error:", statsError);
      setMessage(`Failed to load stats: ${statsError.message}`);
      setLoading(false);
      return;
    }

    const gameIds = Array.from(
      new Set((statsData ?? []).map((row: any) => row.game_id).filter(Boolean))
    );

    let gameLookup: Record<string, any> = {};

    if (gameIds.length > 0) {
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .in("id", gameIds);

      if (gamesError) {
        console.error("Games load error:", gamesError);
      } else {
        gameLookup = (gamesData ?? []).reduce((acc: Record<string, any>, game: any) => {
          acc[game.id] = game;
          return acc;
        }, {});
      }
    }

    setRows(statsData ?? []);
    setGamesMap(gameLookup);
    setLoading(false);
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function setHomepagePOG(rowId: string) {
    setMessage("Updating homepage Player of the Game...");

    const clearResult = await supabase
      .from("player_game_stats")
      .update({ is_homepage_pog: false })
      .not("id", "is", null);

    if (clearResult.error) {
      console.error("Clear homepage POG error:", clearResult.error);
      setMessage(`Failed to clear previous homepage POG: ${clearResult.error.message}`);
      return;
    }

    const setResult = await supabase
      .from("player_game_stats")
      .update({
        is_homepage_pog: true,
        player_of_game: true,
      })
      .eq("id", rowId);

    if (setResult.error) {
      console.error("Set homepage POG error:", setResult.error);
      setMessage(`Failed to set homepage POG: ${setResult.error.message}`);
      return;
    }

    setMessage("Homepage Player of the Game updated successfully.");
    await loadRows();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Admin
          </Link>

          <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Homepage Highlights
          </h1>

          <p className="mt-3 text-slate-400">
            Choose which Player of the Game appears on the homepage.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading player stats...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No player stats found yet.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const game = gamesMap[row.game_id];

              return (
                <div
                  key={row.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      {row.players?.photo_url ? (
                        <img
                          src={row.players.photo_url}
                          alt={row.players.full_name}
                          className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                          🏀
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-bold">
                            #{row.players?.jersey_number ?? "—"}{" "}
                            {row.players?.full_name ?? "Unknown Player"}
                          </div>

                          {row.is_homepage_pog ? (
                            <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-slate-950">
                              HOMEPAGE
                            </span>
                          ) : null}

                          {row.player_of_game ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                              POG
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-sm text-slate-400">
                          FACKTS vs {game?.opponent ?? "Opponent"} •{" "}
                          {game?.game_date ?? "Date TBA"} •{" "}
                          {game?.venue ?? "Venue TBA"}
                        </div>

                        <div className="mt-2 text-sm text-slate-500">
                          PTS {row.points ?? 0} • REB {row.rebounds ?? 0} • AST{" "}
                          {row.assists ?? 0} • +/- {row.plus_minus ?? 0}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setHomepagePOG(row.id)}
                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                    >
                      Show on Homepage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}