export const revalidate = 60;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import GameActions from "./GameActions";
import GameMedia, { type GameMediaItem } from "./GameMedia";
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
  getPosterUrl,
  getStage,
  getStatusLabel,
  getVerificationLabel,
  getWinner,
  isVerified,
  parseLineList,
  parsePeriodScores,
  statNumber,
  type GameRecord,
} from "@/lib/hoops/gamePresentation";

type PlayerRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: string | number | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
};

type GuestRow = {
  id: string;
  full_name?: string | null;
  guest_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
};

type StatRow = {
  id: string;
  game_id?: string | null;
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
  minutes?: number | string | null;
  minutes_played?: number | string | null;
  player_of_game?: boolean | null;
  is_homepage_pog?: boolean | null;
  is_player_of_the_game?: boolean | null;
};

type RosterRow = {
  id: string;
  player_id?: string | null;
  roster_role?: string | null;
  roster_status?: string | null;
  notes?: string | null;
};

type EventRow = {
  event_id: string;
  slug: string;
  title: string;
};

type MediaRow = {
  id: string;
  title: string;
  media_type?: string | null;
  url: string;
  thumbnail_url?: string | null;
  rights_status?: string | null;
  is_public?: boolean | null;
};

type DisplayStat = {
  id: string;
  name: string;
  initials: string;
  jersey: string;
  position: string;
  relationship: "FACKTS player" | "Guest hooper";
  profileHref: string;
  photoUrl: string;
  photoPosition: string;
  side: "home" | "away";
  points: number;
  threePointers: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plusMinus: number;
  minutes: number | null;
  playerOfGame: boolean;
};

type TeamTotals = {
  points: number;
  threePointers: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables.");
  return createClient(url, key);
}

function playerName(player?: PlayerRow | null) {
  return player?.full_name || player?.name || player?.nickname || "Unknown player";
}

function guestName(guest?: GuestRow | null) {
  return guest?.full_name || guest?.guest_name || guest?.name || guest?.nickname || "Guest hooper";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function side(value?: string | null): "home" | "away" {
  return (value || "").toLowerCase() === "away" ? "away" : "home";
}

function displayStat(row: StatRow, player: PlayerRow | null, guest: GuestRow | null): DisplayStat {
  const isGuest = Boolean(guest);
  const name = isGuest ? guestName(guest) : playerName(player);

  return {
    id: row.id,
    name,
    initials: initials(name),
    jersey: String(player?.jersey_number ?? "–"),
    position: player?.position || guest?.position || player?.role || "Player",
    relationship: isGuest ? "Guest hooper" : "FACKTS player",
    profileHref: isGuest && guest ? `/guest-hoopers/${guest.id}` : player ? `/players/${player.id}` : "#",
    photoUrl: player?.photo_url || guest?.photo_url || "",
    photoPosition: player?.photo_position || guest?.photo_position || "center center",
    side: side(row.team_side),
    points: statNumber(row.points),
    threePointers: statNumber(row.three_pointers_made),
    rebounds: statNumber(row.rebounds),
    assists: statNumber(row.assists),
    steals: statNumber(row.steals),
    blocks: statNumber(row.blocks),
    turnovers: statNumber(row.turnovers),
    fouls: statNumber(row.fouls),
    plusMinus: statNumber(row.plus_minus),
    minutes: row.minutes !== null && row.minutes !== undefined
      ? statNumber(row.minutes)
      : row.minutes_played !== null && row.minutes_played !== undefined
        ? statNumber(row.minutes_played)
        : null,
    playerOfGame: Boolean(row.player_of_game || row.is_homepage_pog || row.is_player_of_the_game),
  };
}

function totals(rows: DisplayStat[]): TeamTotals {
  return rows.reduce(
    (result, row) => ({
      points: result.points + row.points,
      threePointers: result.threePointers + row.threePointers,
      rebounds: result.rebounds + row.rebounds,
      assists: result.assists + row.assists,
      steals: result.steals + row.steals,
      blocks: result.blocks + row.blocks,
      turnovers: result.turnovers + row.turnovers,
      fouls: result.fouls + row.fouls,
    }),
    { points: 0, threePointers: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 }
  );
}

function contribution(row: DisplayStat) {
  return row.points + row.rebounds + row.assists + row.steals + row.blocks + Math.max(row.plusMinus, 0);
}

async function loadGame(gameId: string) {
  const supabase = getSupabase();
  const gameResult = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
  if (gameResult.error || !gameResult.data) return null;

  const game = gameResult.data as GameRecord;
  if (game.is_public === false) return null;

  const [playerStatsResult, guestStatsResult, rosterResult, mediaResult] = await Promise.all([
    supabase.from("player_game_stats").select("*").eq("game_id", gameId),
    supabase.from("guest_game_stats").select("*").eq("game_id", gameId),
    supabase.from("game_rosters").select("*").eq("game_id", gameId),
    supabase.from("game_media").select("*").eq("game_id", gameId).eq("is_public", true).order("display_order"),
  ]);

  const playerStats = (playerStatsResult.data || []) as StatRow[];
  const guestStats = (guestStatsResult.data || []) as StatRow[];
  const roster = (rosterResult.data || []) as RosterRow[];
  const playerIds = [...new Set([...playerStats.map((row) => row.player_id), ...roster.map((row) => row.player_id)].filter(Boolean))] as string[];
  const guestIds = [...new Set(guestStats.map((row) => row.guest_hooper_id).filter(Boolean))] as string[];

  const [playersResult, guestsResult, eventResult] = await Promise.all([
    playerIds.length ? supabase.from("players").select("*").in("id", playerIds) : Promise.resolve({ data: [] }),
    guestIds.length ? supabase.from("guest_hoopers").select("*").in("id", guestIds) : Promise.resolve({ data: [] }),
    game.event_id
      ? supabase.from("event_case_studies").select("event_id,slug,title").eq("event_id", game.event_id).eq("is_public", true).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const players = (playersResult.data || []) as PlayerRow[];
  const guests = (guestsResult.data || []) as GuestRow[];
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const guestMap = new Map(guests.map((guest) => [guest.id, guest]));

  const stats = [
    ...playerStats.map((row) => displayStat(row, row.player_id ? playerMap.get(row.player_id) || null : null, null)),
    ...guestStats.map((row) => displayStat(row, null, row.guest_hooper_id ? guestMap.get(row.guest_hooper_id) || null : null)),
  ].sort((a, b) => contribution(b) - contribution(a));

  const rosterPlayers = roster
    .filter((row) => row.roster_status !== "unavailable")
    .map((row) => ({
      ...row,
      player: row.player_id ? playerMap.get(row.player_id) || null : null,
    }));

  return {
    game,
    stats,
    roster: rosterPlayers,
    event: (eventResult.data || null) as EventRow | null,
    media: (mediaResult.data || []) as MediaRow[],
  };
}

export default async function GameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadGame(id);
  if (!loaded) notFound();

  const { game, stats, roster, event, media } = loaded;
  const status = getGameStatus(game);
  const homeTeam = getHomeTeam(game);
  const awayTeam = getAwayTeam(game);
  const homeScore = getHomeScore(game);
  const awayScore = getAwayScore(game);
  const scored = homeScore !== null && awayScore !== null;
  const winner = getWinner(game);
  const homeStats = stats.filter((row) => row.side === "home");
  const awayStats = stats.filter((row) => row.side === "away");
  const homeTotals = totals(homeStats);
  const awayTotals = totals(awayStats);
  const playerOfGame = stats.find((row) => row.playerOfGame) || stats[0] || null;
  const periods = parsePeriodScores(game.period_scores);
  const savedHomeRoster = parseLineList(game.home_roster);
  const savedAwayRoster = parseLineList(game.away_roster);
  const officialRoster = roster.map((row) => ({
    name: playerName(row.player),
    detail: [row.roster_role, row.roster_status].filter(Boolean).join(" · ") || "Rostered",
    href: row.player ? `/players/${row.player.id}` : "#",
  }));
  const homeRoster = savedHomeRoster.length
    ? savedHomeRoster.map((name) => ({ name, detail: "Published lineup", href: "#" }))
    : homeTeam.toLowerCase().includes("fackts")
      ? officialRoster
      : [];
  const awayRoster = savedAwayRoster.map((name) => ({ name, detail: "Published lineup", href: "#" }));

  const builtInMedia: GameMediaItem[] = [];
  const fullVideo = game.video_url || game.game_video_url || "";
  if (fullVideo) builtInMedia.push({ id: "full-game", title: `${homeTeam} vs ${awayTeam} — full game`, mediaType: "Full game", url: fullVideo, thumbnailUrl: getPosterUrl(game) });
  if (game.highlight_url && game.highlight_url !== fullVideo) builtInMedia.push({ id: "highlights", title: `${homeTeam} vs ${awayTeam} — highlights`, mediaType: "Highlights", url: game.highlight_url, thumbnailUrl: getPosterUrl(game) });

  const mediaItems: GameMediaItem[] = [
    ...builtInMedia,
    ...media
      .filter((row) => !["photo", "image"].includes((row.media_type || "").toLowerCase()))
      .map((row) => ({ id: row.id, title: row.title, mediaType: row.media_type || "Game video", url: row.url, thumbnailUrl: row.thumbnail_url || getPosterUrl(game), rightsStatus: row.rights_status || undefined })),
  ];
  const photos = media.filter((row) => ["photo", "image"].includes((row.media_type || "").toLowerCase()));

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,.78),rgba(2,6,23,.96)),url('/images/one-on-one-bg.png')" }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/80">
        {getPosterUrl(game) ? (
          <div className="absolute inset-0">
            <img src={getPosterUrl(game)} alt="" className="h-full w-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07162b] via-[#07162b]/95 to-[#07162b]/65" />
          </div>
        ) : null}
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Link href="/games" className="rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-white">← All games</Link>
              {event ? <Link href={`/events/${event.slug}`} className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-blue-200">Open event hub</Link> : null}
            </div>
            <GameActions gameId={game.id} title={getGameTitle(game)} />
          </div>

          <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_1.2fr_1fr] lg:items-center">
            <ScoreTeam name={homeTeam} score={homeScore} align="left" winner={winner === homeTeam} />
            <div className="order-first text-center lg:order-none">
              <div className="flex flex-wrap justify-center gap-2">
                <Badge color={status === "live" ? "red" : status === "completed" ? "green" : "blue"}>{getStatusLabel(status)}</Badge>
                <Badge color={isVerified(game) ? "green" : "neutral"}>{getVerificationLabel(game)}</Badge>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{event?.title || getCompetition(game)}</p>
              <h1 className="mx-auto mt-2 max-w-xl text-2xl font-black uppercase leading-tight sm:text-4xl">{getGameTitle(game)}</h1>
              <p className="mt-3 text-xs font-bold uppercase tracking-[.1em] text-zinc-400">{getStage(game)} · {getGameFormat(game)}</p>
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/45 px-5 py-5 backdrop-blur">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">{scored ? "Final score" : "Tip-off"}</p>
                <p className="mt-1 text-5xl font-black tracking-[-.05em] sm:text-7xl">{scored ? `${homeScore}–${awayScore}` : "VS"}</p>
                {winner && winner !== "Draw" ? <p className="mt-2 text-xs font-black uppercase tracking-[.12em] text-orange-300">Winner: {winner}</p> : null}
              </div>
            </div>
            <ScoreTeam name={awayTeam} score={awayScore} align="right" winner={winner === awayTeam} />
          </div>

          <div className="mt-9 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Date and time" value={formatGameDate(getGameDate(game), true)} />
            <Info label="Venue" value={getLocation(game)} />
            <Info label="Competition" value={event?.title || getCompetition(game)} />
            <Info label="Record updated" value={formatGameDate(game.updated_at || game.created_at)} />
          </div>
        </div>
      </section>

      <nav className="sticky top-[72px] z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          {[["Overview", "overview"], ["Box score", "box-score"], ["Rosters", "rosters"], ["Media", "media"], ["Officials", "officials"]].map(([label, target]) => (
            <a key={target} href={`#${target}`} className="shrink-0 rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-[.12em] text-zinc-400 transition hover:bg-white/[.05] hover:text-orange-300">{label}</a>
          ))}
        </div>
      </nav>

      <section id="overview" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
        <SectionTitle kicker="Match evidence" title="Game overview" subtitle="The recorded score, period breakdown and context attached to this matchup." />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/85">
            <div className="border-b border-white/10 px-5 py-4"><h3 className="text-sm font-black uppercase tracking-[.13em]">Score by period</h3></div>
            {periods.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead><tr className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-600"><th className="px-5 py-3">Team</th>{periods.map((period) => <th key={period.label} className="px-3 py-3 text-center">{period.label}</th>)}<th className="px-5 py-3 text-center">Total</th></tr></thead>
                  <tbody>
                    <PeriodRow name={homeTeam} scores={periods.map((period) => period.home)} total={homeScore} />
                    <PeriodRow name={awayTeam} scores={periods.map((period) => period.away)} total={awayScore} />
                  </tbody>
                </table>
              </div>
            ) : <Empty text="A period-by-period breakdown has not been published for this game." />}
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">Record status</p>
            <h3 className="mt-2 text-2xl font-black uppercase">{getVerificationLabel(game)}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {isVerified(game) ? "The published result has been marked as verified by FACKTS Hoops." : "This record is published with its current evidence status and will not be presented as verified until confirmation is recorded."}
            </p>
            {game.verified_by || game.verified_at ? <p className="mt-4 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-300">{game.verified_by ? `Verified by ${game.verified_by}` : "Verified"}{game.verified_at ? ` · ${formatGameDate(game.verified_at)}` : ""}</p> : null}
            {game.correction_status && game.correction_status !== "none" ? (
              <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-amber-300">Correction status: {game.correction_status}</p>
                {game.correction_note ? <p className="mt-2 text-xs leading-5 text-amber-50/80">{game.correction_note}</p> : null}
              </div>
            ) : null}
          </div>
        </div>

        {game.notes ? <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/75 p-5"><p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">Match note</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-300">{game.notes}</p></div> : null}
      </section>

      <section id="box-score" className="mx-auto max-w-7xl scroll-mt-32 px-4 pb-12 sm:px-6 lg:px-8">
        <SectionTitle kicker="Verified performance" title="Player box score" subtitle="Official and guest participants use the same statistics view for this game." />

        {stats.length ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <LeaderCard label="Scoring leader" row={[...stats].sort((a, b) => b.points - a.points)[0]} value="points" />
              <LeaderCard label="Rebound leader" row={[...stats].sort((a, b) => b.rebounds - a.rebounds)[0]} value="rebounds" />
              <LeaderCard label="Assist leader" row={[...stats].sort((a, b) => b.assists - a.assists)[0]} value="assists" />
              <LeaderCard label="Player of game" row={playerOfGame} value="points" special />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <TeamSummary name={homeTeam} totals={homeTotals} players={homeStats.length} />
              <TeamSummary name={awayTeam} totals={awayTotals} players={awayStats.length} />
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/90">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead><tr className="bg-white/[.035] text-[8px] font-black uppercase tracking-[.12em] text-zinc-600"><th className="px-4 py-4">Player</th><th className="px-3 py-4">Team</th><th className="px-3 py-4 text-center">MIN</th><th className="px-3 py-4 text-center">PTS</th><th className="px-3 py-4 text-center">3PM</th><th className="px-3 py-4 text-center">REB</th><th className="px-3 py-4 text-center">AST</th><th className="px-3 py-4 text-center">STL</th><th className="px-3 py-4 text-center">BLK</th><th className="px-3 py-4 text-center">TO</th><th className="px-3 py-4 text-center">PF</th><th className="px-3 py-4 text-center">+/-</th></tr></thead>
                  <tbody>{stats.map((row) => <BoxScoreRow key={row.id} row={row} team={row.side === "home" ? homeTeam : awayTeam} />)}</tbody>
                </table>
              </div>
            </div>
          </>
        ) : <div className="mt-6"><Empty text="Individual statistics were not captured for this game. No player performance has been estimated." /></div>}
      </section>

      <section id="rosters" className="mx-auto max-w-7xl scroll-mt-32 px-4 pb-12 sm:px-6 lg:px-8">
        <SectionTitle kicker="Match participants" title="Published rosters" subtitle="Line-ups attached specifically to this game record." />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RosterCard name={homeTeam} players={homeRoster} />
          <RosterCard name={awayTeam} players={awayRoster} />
        </div>
      </section>

      <section id="media" className="mx-auto max-w-7xl scroll-mt-32 px-4 pb-12 sm:px-6 lg:px-8">
        <SectionTitle kicker="Watch the game" title="Match media" subtitle="Playable full games, highlights and approved media attached to this matchup." />
        <div className="mt-6"><GameMedia items={mediaItems} /></div>
        {photos.length ? (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {photos.map((photo) => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:rounded-2xl"><img src={photo.thumbnail_url || photo.url} alt={photo.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><p className="absolute inset-x-3 bottom-3 text-[10px] font-black uppercase leading-4">{photo.title}</p></a>)}
          </div>
        ) : null}
      </section>

      <section id="officials" className="mx-auto max-w-7xl scroll-mt-32 px-4 pb-14 sm:px-6 lg:px-8">
        <SectionTitle kicker="Game administration" title="Officials and venue" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ListCard title="Game officials" items={parseLineList(game.officials)} empty="Officials not published" />
          <ListCard title="Table officials" items={parseLineList(game.table_officials)} empty="Table officials not published" />
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/85 p-5"><p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">Venue</p><h3 className="mt-2 text-xl font-black uppercase">{game.venue || "Venue TBA"}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{[game.court, game.location].filter(Boolean).join(" · ") || "Court and location details have not been published."}</p></div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#07162b]/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Document your next game</p><h2 className="mt-2 text-2xl font-black uppercase sm:text-4xl">Scores, stats and media that stay connected.</h2></div>
          <Link href="/book-coverage" className="shrink-0 rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black">Book game coverage</Link>
        </div>
      </section>
    </main>
  );
}

function ScoreTeam({ name, score, align, winner }: { name: string; score: number | null; align: "left" | "right"; winner: boolean }) {
  return <div className={`min-w-0 text-center ${align === "right" ? "lg:text-right" : "lg:text-left"}`}><div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border ${winner ? "border-orange-400 bg-orange-500 text-black" : "border-white/10 bg-[#0B1F3A] text-orange-300"} text-lg font-black lg:mx-0 ${align === "right" ? "lg:ml-auto" : "lg:mr-auto"}`}>{initials(name)}</div><p className="mt-3 break-words text-2xl font-black uppercase leading-tight sm:text-3xl">{name}</p>{score !== null ? <p className={`mt-2 text-sm font-black uppercase tracking-[.12em] ${winner ? "text-orange-300" : "text-zinc-500"}`}>{winner ? "Winner" : "Score"} · {score}</p> : null}</div>;
}

function Badge({ children, color }: { children: React.ReactNode; color: "red" | "green" | "blue" | "neutral" }) {
  const styles = { red: "border-red-300/40 bg-red-500 text-white", green: "border-emerald-300/30 bg-emerald-500/15 text-emerald-200", blue: "border-blue-300/30 bg-blue-500/15 text-blue-200", neutral: "border-white/15 bg-white/[.05] text-zinc-300" };
  return <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.13em] ${styles[color]}`}>{children}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">{label}</p><p className="mt-1 break-words text-xs font-bold leading-5 text-zinc-200">{value}</p></div>;
}

function SectionTitle({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">{kicker}</p><h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">{title}</h2>{subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle}</p> : null}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center"><p className="mx-auto max-w-xl text-sm leading-6 text-zinc-500">{text}</p></div>;
}

function PeriodRow({ name, scores, total }: { name: string; scores: (number | null)[]; total: number | null }) {
  return <tr className="border-t border-white/[.07]"><td className="px-5 py-4 text-sm font-black uppercase">{name}</td>{scores.map((score, index) => <td key={index} className="px-3 py-4 text-center text-sm font-bold text-zinc-300">{score ?? "–"}</td>)}<td className="px-5 py-4 text-center text-xl font-black text-orange-300">{total ?? "–"}</td></tr>;
}

function LeaderCard({ label, row, value, special = false }: { label: string; row: DisplayStat | null; value: "points" | "rebounds" | "assists"; special?: boolean }) {
  if (!row) return null;
  return <Link href={row.profileHref} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${special ? "border-orange-400/35 bg-orange-500/10" : "border-white/10 bg-slate-950/85"}`}><PlayerAvatar row={row} /><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.12em] text-orange-300">{label}</p><p className="mt-1 truncate text-sm font-black uppercase">{row.name}</p><p className="mt-1 text-xs font-bold text-zinc-500">{row[value]} {value === "points" ? "PTS" : value === "rebounds" ? "REB" : "AST"}</p></div></Link>;
}

function PlayerAvatar({ row }: { row: DisplayStat }) {
  return row.photoUrl ? <img src={row.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover" style={{ objectPosition: row.photoPosition }} /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0B1F3A] text-xs font-black text-orange-300">{row.initials}</span>;
}

function TeamSummary({ name, totals: teamTotals, players }: { name: string; totals: TeamTotals; players: number }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-black uppercase">{name}</h3><span className="text-[9px] font-black uppercase text-zinc-600">{players} stat lines</span></div><div className="mt-4 grid grid-cols-4 gap-2"><MiniStat label="PTS" value={teamTotals.points} /><MiniStat label="REB" value={teamTotals.rebounds} /><MiniStat label="AST" value={teamTotals.assists} /><MiniStat label="3PM" value={teamTotals.threePointers} /></div></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.03] p-2 text-center"><p className="text-lg font-black text-orange-300">{value}</p><p className="text-[7px] font-black uppercase tracking-[.1em] text-zinc-600">{label}</p></div>;
}

function BoxScoreRow({ row, team }: { row: DisplayStat; team: string }) {
  return <tr className="border-t border-white/[.07] text-xs"><td className="px-4 py-3"><Link href={row.profileHref} className="flex items-center gap-3"><PlayerAvatar row={row} /><span><span className="block font-black uppercase text-white">{row.name}</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[.08em] text-zinc-600">{row.relationship} · {row.position}</span></span></Link></td><td className="px-3 py-3 font-bold text-zinc-400">{team}</td><Cell value={row.minutes ?? "–"} /><Cell value={row.points} strong /><Cell value={row.threePointers} /><Cell value={row.rebounds} /><Cell value={row.assists} /><Cell value={row.steals} /><Cell value={row.blocks} /><Cell value={row.turnovers} /><Cell value={row.fouls} /><Cell value={row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus} /></tr>;
}

function Cell({ value, strong = false }: { value: string | number; strong?: boolean }) {
  return <td className={`px-3 py-3 text-center ${strong ? "text-base font-black text-orange-300" : "font-bold text-zinc-400"}`}>{value}</td>;
}

function RosterCard({ name, players }: { name: string; players: { name: string; detail: string; href: string }[] }) {
  return <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85"><div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><h3 className="text-lg font-black uppercase">{name}</h3><span className="rounded-full bg-white/[.05] px-3 py-1 text-[8px] font-black uppercase text-zinc-500">{players.length} players</span></div>{players.length ? <div className="grid gap-px bg-white/[.06] sm:grid-cols-2">{players.map((player, index) => <Link key={`${player.name}-${index}`} href={player.href} className="flex min-w-0 items-center gap-3 bg-slate-950 px-4 py-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-black">{index + 1}</span><span className="min-w-0"><span className="block truncate text-xs font-black uppercase">{player.name}</span><span className="mt-1 block text-[8px] font-bold uppercase text-zinc-600">{player.detail}</span></span></Link>)}</div> : <Empty text="No lineup has been published for this team." />}</article>;
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/85 p-5"><p className="text-[9px] font-black uppercase tracking-[.15em] text-orange-300">{title}</p>{items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="rounded-lg bg-white/[.035] px-3 py-2 text-sm font-bold text-zinc-300">{item}</li>)}</ul> : <p className="mt-3 text-sm text-zinc-500">{empty}</p>}</div>;
}
