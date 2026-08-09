export const revalidate = 60;

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportActions from "./ReportActions";
import {
  formatGameDate,
  getAwayScore,
  getAwayTeam,
  getCompetition,
  getGameDate,
  getGameFormat,
  getGameStatus,
  getGameTitle,
  getHomeScore,
  getHomeTeam,
  getLocation,
  getStage,
  getStatusLabel,
  getVerificationLabel,
  parsePeriodScores,
  statNumber,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";

type StatRow = {
  id: string;
  player_id?: string | null;
  guest_hooper_id?: string | null;
  team_side?: string | null;
  points?: number | string | null;
  three_pointers_made?: number | string | null;
  rebounds?: number | string | null;
  assists?: number | string | null;
  steals?: number | string | null;
  blocks?: number | string | null;
  turnovers?: number | string | null;
  fouls?: number | string | null;
  plus_minus?: number | string | null;
};

type Identity = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
};

type ReportStat = {
  id: string;
  name: string;
  team: string;
  points: number;
  threePointers: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables.");
  return createClient(url, key);
}

function name(identity?: Identity | null) {
  return identity?.full_name || identity?.name || identity?.nickname || "Unknown player";
}

async function loadReport(gameId: string) {
  const supabase = getSupabase();
  const gameResult = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!gameResult.data || (gameResult.data as GameRecord).is_public === false) return null;

  const game = gameResult.data as GameRecord;
  const [playerStatsResult, guestStatsResult] = await Promise.all([
    supabase.from("player_game_stats").select("*").eq("game_id", gameId),
    supabase.from("guest_game_stats").select("*").eq("game_id", gameId),
  ]);
  const playerStats = (playerStatsResult.data || []) as StatRow[];
  const guestStats = (guestStatsResult.data || []) as StatRow[];
  const playerIds = playerStats.map((row) => row.player_id).filter(Boolean) as string[];
  const guestIds = guestStats.map((row) => row.guest_hooper_id).filter(Boolean) as string[];
  const [playersResult, guestsResult] = await Promise.all([
    playerIds.length ? supabase.from("players").select("id,full_name,name,nickname").in("id", playerIds) : Promise.resolve({ data: [] }),
    guestIds.length ? supabase.from("guest_hoopers").select("id,full_name,name,nickname").in("id", guestIds) : Promise.resolve({ data: [] }),
  ]);
  const players = new Map(((playersResult.data || []) as Identity[]).map((row) => [row.id, row]));
  const guests = new Map(((guestsResult.data || []) as Identity[]).map((row) => [row.id, row]));
  const home = getHomeTeam(game);
  const away = getAwayTeam(game);

  const build = (row: StatRow, playerName: string): ReportStat => ({
    id: row.id,
    name: playerName,
    team: (row.team_side || "").toLowerCase() === "away" ? away : home,
    points: statNumber(row.points),
    threePointers: statNumber(row.three_pointers_made),
    rebounds: statNumber(row.rebounds),
    assists: statNumber(row.assists),
    steals: statNumber(row.steals),
    blocks: statNumber(row.blocks),
    turnovers: statNumber(row.turnovers),
    fouls: statNumber(row.fouls),
    plusMinus: statNumber(row.plus_minus),
  });

  const stats = [
    ...playerStats.map((row) => build(row, name(row.player_id ? players.get(row.player_id) : null))),
    ...guestStats.map((row) => build(row, name(row.guest_hooper_id ? guests.get(row.guest_hooper_id) : null))),
  ].sort((a, b) => b.points - a.points);

  return { game, stats };
}

export default async function GameReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadReport(id);
  if (!loaded) notFound();

  const { game, stats } = loaded;
  const periods = parsePeriodScores(game.period_scores);
  const home = getHomeTeam(game);
  const away = getAwayTeam(game);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0 sm:px-6 sm:py-10">
      <div className="mx-auto mb-5 flex max-w-[1050px] justify-end print:hidden">
        <ReportActions
          gameId={game.id}
          report={{
            title: getGameTitle(game),
            competition: getCompetition(game),
            stage: getStage(game),
            format: getGameFormat(game),
            status: getStatusLabel(getGameStatus(game)),
            verification: getVerificationLabel(game),
            homeTeam: home,
            awayTeam: away,
            homeScore: getHomeScore(game),
            awayScore: getAwayScore(game),
            dateTime: formatGameDate(getGameDate(game), true),
            venue: getLocation(game),
            updatedAt: formatGameDate(game.updated_at || game.created_at, true),
            periods,
            stats,
          }}
        />
      </div>
      <article className="mx-auto max-w-[1050px] overflow-hidden bg-white shadow-xl print:max-w-none print:shadow-none">
        <header className="bg-[#0B1F3A] px-7 py-7 text-white sm:px-10">
          <div className="flex items-start justify-between gap-6">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">FACKTS Hoops · Official game record</p><h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">{getGameTitle(game)}</h1><p className="mt-3 text-sm text-slate-300">{getCompetition(game)} · {getStage(game)} · {getGameFormat(game)}</p></div>
            <img src="/fackts-hoops-logo.png" alt="FACKTS Hoops" className="h-16 w-16 rounded-xl bg-slate-950 object-cover sm:h-20 sm:w-20" />
          </div>
        </header>

        <section className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 border-b border-slate-200 px-7 py-8 sm:px-10">
          <Team name={home} score={getHomeScore(game)} />
          <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{getStatusLabel(getGameStatus(game))}</p><p className="mt-2 text-4xl font-black text-[#0B1F3A] sm:text-6xl">{getHomeScore(game) ?? "–"}–{getAwayScore(game) ?? "–"}</p><p className="mt-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-700">{getVerificationLabel(game)}</p></div>
          <Team name={away} score={getAwayScore(game)} align="right" />
        </section>

        <section className="grid gap-3 border-b border-slate-200 px-7 py-6 sm:grid-cols-3 sm:px-10">
          <Info label="Date and time" value={formatGameDate(getGameDate(game), true)} />
          <Info label="Venue" value={getLocation(game)} />
          <Info label="Record updated" value={formatGameDate(game.updated_at || game.created_at, true)} />
        </section>

        {periods.length ? <section className="border-b border-slate-200 px-7 py-6 sm:px-10"><Title>Score by period</Title><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr className="bg-slate-100 text-[9px] font-black uppercase text-slate-500"><th className="px-4 py-3 text-left">Team</th>{periods.map((period) => <th key={period.label} className="px-3 py-3 text-center">{period.label}</th>)}<th className="px-4 py-3 text-center">Total</th></tr></thead><tbody><Period name={home} values={periods.map((row) => row.home)} total={getHomeScore(game)} /><Period name={away} values={periods.map((row) => row.away)} total={getAwayScore(game)} /></tbody></table></div></section> : null}

        <section className="px-7 py-7 sm:px-10">
          <div className="flex items-end justify-between gap-4"><Title>Player box score</Title><p className="text-[9px] font-black uppercase tracking-[.1em] text-slate-400">{stats.length} stat lines</p></div>
          {stats.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] border-collapse text-xs"><thead><tr className="bg-[#0B1F3A] text-[8px] font-black uppercase tracking-[.1em] text-white"><th className="px-4 py-3 text-left">Player</th><th className="px-3 py-3 text-left">Team</th><th className="px-3 py-3 text-center">PTS</th><th className="px-3 py-3 text-center">3PM</th><th className="px-3 py-3 text-center">REB</th><th className="px-3 py-3 text-center">AST</th><th className="px-3 py-3 text-center">STL</th><th className="px-3 py-3 text-center">BLK</th><th className="px-3 py-3 text-center">TO</th><th className="px-3 py-3 text-center">PF</th><th className="px-3 py-3 text-center">+/-</th></tr></thead><tbody>{stats.map((row) => <tr key={row.id} className="border-b border-slate-200"><td className="px-4 py-3 font-black uppercase">{row.name}</td><td className="px-3 py-3 text-slate-500">{row.team}</td><Strong value={row.points} /><Cell value={row.threePointers} /><Cell value={row.rebounds} /><Cell value={row.assists} /><Cell value={row.steals} /><Cell value={row.blocks} /><Cell value={row.turnovers} /><Cell value={row.fouls} /><Cell value={row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus} /></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl bg-slate-100 p-5 text-sm text-slate-500">Individual statistics were not captured for this game and have not been estimated.</p>}
        </section>

        <footer className="border-t border-slate-200 px-7 py-5 text-[9px] font-bold uppercase tracking-[.1em] text-slate-400 sm:px-10">FACKTS Hoops · Basketball, documented properly · fackts-hoops-web.vercel.app</footer>
      </article>
    </main>
  );
}

function Team({ name, score, align = "left" }: { name: string; score: number | null; align?: "left" | "right" }) { return <div className={align === "right" ? "text-right" : "text-left"}><p className="text-xl font-black uppercase leading-tight text-[#0B1F3A] sm:text-3xl">{name}</p><p className="mt-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Team score · {score ?? "–"}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[8px] font-black uppercase tracking-[.12em] text-orange-600">{label}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-700">{value}</p></div>; }
function Title({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-black uppercase text-[#0B1F3A] sm:text-2xl">{children}</h2>; }
function Period({ name, values, total }: { name: string; values: (number | null)[]; total: number | null }) { return <tr className="border-b border-slate-200"><td className="px-4 py-3 font-black uppercase">{name}</td>{values.map((value, index) => <td key={index} className="px-3 py-3 text-center font-bold text-slate-600">{value ?? "–"}</td>)}<td className="px-4 py-3 text-center text-lg font-black text-orange-600">{total ?? "–"}</td></tr>; }
function Cell({ value }: { value: string | number }) { return <td className="px-3 py-3 text-center font-bold text-slate-600">{value}</td>; }
function Strong({ value }: { value: number }) { return <td className="px-3 py-3 text-center text-sm font-black text-orange-600">{value}</td>; }
