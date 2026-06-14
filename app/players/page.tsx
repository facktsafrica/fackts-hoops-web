import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlayerCard = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  position?: string | null;
  role?: string | null;
  height?: string | null;
  weight?: string | null;
  wingspan?: string | null;
  vertical_leap?: string | null;
  speed?: string | null;
  standing_reach?: string | null;
  age?: string | null;
  location?: string | null;
  dominant_hand?: string | null;
  current_team?: string | null;
  previous_teams?: string | null;
  highest_level?: string | null;
  years_played?: string | null;
  style_of_play?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  bio?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  highlight_url?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  is_featured?: boolean | null;
  games_played: number;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  total_points: number;
};

function hasValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

function display(value?: string | number | null) {
  return hasValue(value) ? String(value) : "";
}

function getPlayerName(player: PlayerCard) {
  return player.full_name || player.name || player.nickname || "Unnamed Player";
}

function getInitials(player: PlayerCard) {
  return getPlayerName(player)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function getPlayersWithStats() {
  const [playersResult, statsResult] = await Promise.all([
    supabase
      .from("players")
      .select("*")
      .eq("is_active", true)
      .order("jersey_number", { ascending: true }),

    supabase.from("player_game_stats").select("*"),
  ]);

  if (playersResult.error || statsResult.error) {
    return [];
  }

  const players = playersResult.data ?? [];
  const stats = statsResult.data ?? [];

  const rows: PlayerCard[] = players.map((player: any) => {
    const playerStats = stats.filter((row: any) => row.player_id === player.id);
    const gamesPlayed = playerStats.length;

    const totals = playerStats.reduce(
      (acc: any, row: any) => {
        acc.points += Number(row.points ?? 0);
        acc.rebounds += Number(row.rebounds ?? 0);
        acc.assists += Number(row.assists ?? 0);
        acc.steals += Number(row.steals ?? 0);
        acc.blocks += Number(row.blocks ?? 0);
        return acc;
      },
      {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
      }
    );

    function avg(value: number) {
      return gamesPlayed > 0 ? Number((value / gamesPlayed).toFixed(1)) : 0;
    }

    return {
      id: player.id,
      full_name: player.full_name || player.name,
      name: player.name,
      nickname: player.nickname,
      jersey_number: player.jersey_number,
      position: player.position,
      role: player.role,
      height: player.height,
      weight: player.weight,
      wingspan: player.wingspan,
      vertical_leap: player.vertical_leap,
      speed: player.speed,
      standing_reach: player.standing_reach,
      age: player.age,
      location: player.location,
      dominant_hand: player.dominant_hand,
      current_team: player.current_team,
      previous_teams: player.previous_teams,
      highest_level: player.highest_level,
      years_played: player.years_played,
      style_of_play: player.style_of_play,
      strengths: player.strengths,
      improvements: player.improvements,
      bio: player.bio,
      instagram_url: player.instagram_url,
      tiktok_url: player.tiktok_url,
      youtube_url: player.youtube_url,
      highlight_url: player.highlight_url,
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      is_featured: player.is_featured,
      games_played: gamesPlayed,
      points_per_game: avg(totals.points),
      rebounds_per_game: avg(totals.rebounds),
      assists_per_game: avg(totals.assists),
      steals_per_game: avg(totals.steals),
      blocks_per_game: avg(totals.blocks),
      total_points: totals.points,
    };
  });

  return rows;
}

export default async function PlayersPage() {
  const players = await getPlayersWithStats();

  const totalPlayers = players.length;

  const totalStatEntries = players.reduce(
    (acc, player) => acc + player.games_played,
    0
  );

  const topScorer = [...players].sort(
    (a, b) => b.points_per_game - a.points_per_game
  )[0];

  const mostExperienced = [...players].sort(
    (a, b) => b.games_played - a.games_played
  )[0];

  const featuredPlayers = players.filter((player) => player.is_featured);
  const regularPlayers = players.filter((player) => !player.is_featured);

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] px-0 text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.94)), url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-9 sm:px-6 md:py-12 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Players
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Explore the roster, view player profiles, and follow each
                player’s growth, performance, role, measurements, and basketball
                development.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMiniStat label="Players" value={String(totalPlayers)} />
              <HeroMiniStat label="Stat Entries" value={String(totalStatEntries)} />
              <HeroMiniStat
                label="Top PPG"
                value={topScorer ? String(topScorer.points_per_game) : "0"}
                sub={topScorer ? getPlayerName(topScorer) : "No data"}
              />
              <HeroMiniStat
                label="Most Games"
                value={
                  mostExperienced ? String(mostExperienced.games_played) : "0"
                }
                sub={mostExperienced ? getPlayerName(mostExperienced) : "No data"}
              />
            </div>
          </div>
        </div>
      </section>

      {featuredPlayers.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Spotlight" title="Featured Players" />

          <div className="grid gap-5 lg:grid-cols-2">
            {featuredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} featured />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Roster" title="Active Players" />

        {players.length === 0 ? (
          <EmptyBox text="No active players found yet." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...featuredPlayers, ...regularPlayers].map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerCard({
  player,
  featured = false,
}: {
  player: PlayerCard;
  featured?: boolean;
}) {
  const profileInfo = [
    { label: "Position", value: player.position },
    { label: "Role", value: player.role },
    { label: "Height", value: player.height },
    { label: "Weight", value: player.weight },
    { label: "Wingspan", value: player.wingspan },
    { label: "Standing Reach", value: player.standing_reach },
    { label: "Vertical", value: player.vertical_leap },
    { label: "Speed", value: player.speed },
    { label: "Hand", value: player.dominant_hand },
    { label: "Age", value: player.age },
    { label: "Location", value: player.location },
    { label: "Team", value: player.current_team },
    { label: "Level", value: player.highest_level },
    { label: "Years Played", value: player.years_played },
  ].filter((item) => hasValue(item.value));

  const hasProfileText =
    hasValue(player.style_of_play) ||
    hasValue(player.strengths) ||
    hasValue(player.bio);

  const hasLinks =
    hasValue(player.instagram_url) ||
    hasValue(player.tiktok_url) ||
    hasValue(player.youtube_url) ||
    hasValue(player.highlight_url);

  return (
    <Link
      href={`/players/${player.id}`}
      className={`group block overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 shadow-2xl shadow-black/25 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/60 hover:shadow-orange-950/30 ${
        featured ? "lg:grid lg:grid-cols-[0.85fr_1.15fr]" : ""
      }`}
    >
      <div className={`relative overflow-hidden bg-black ${featured ? "lg:h-full" : ""}`}>
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {hasValue(player.jersey_number) ? (
            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
              #{player.jersey_number}
            </span>
          ) : null}

          {player.is_featured ? (
            <span className="rounded-full border border-orange-400/40 bg-black/60 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-orange-200 backdrop-blur">
              Featured
            </span>
          ) : null}
        </div>

        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={getPlayerName(player)}
            className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
              featured ? "h-96 lg:h-full" : "h-80"
            }`}
            style={{
              objectPosition: player.photo_position || "center center",
            }}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505] ${
              featured ? "h-96 lg:h-full" : "h-80"
            }`}
          >
            <div className="text-center">
              <p className="text-6xl font-black text-orange-500">
                {getInitials(player) || "FH"}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                FACKTS Hooper
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-white group-hover:text-orange-200">
              {getPlayerName(player)}
            </h2>

            {hasValue(player.nickname) ? (
              <p className="mt-1 text-sm font-bold text-orange-300">
                "{player.nickname}"
              </p>
            ) : null}
          </div>

          {hasValue(player.position) ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase text-zinc-300">
              {player.position}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2">
          <StatPill label="GP" value={player.games_played} />
          <StatPill label="PPG" value={player.points_per_game} />
          <StatPill label="RPG" value={player.rebounds_per_game} />
          <StatPill label="APG" value={player.assists_per_game} />
          <StatPill label="SPG" value={player.steals_per_game} />
        </div>

        {profileInfo.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {profileInfo.map((item) => (
              <InfoPill key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        ) : null}

        {hasProfileText ? (
          <div className="mt-5 space-y-3">
            <TextBlock label="Style" value={player.style_of_play} />
            <TextBlock label="Strengths" value={player.strengths} />
            <TextBlock label="Bio" value={player.bio} />
          </div>
        ) : null}

        {hasLinks ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <SocialBadge label="Instagram" value={player.instagram_url} />
            <SocialBadge label="TikTok" value={player.tiktok_url} />
            <SocialBadge label="YouTube" value={player.youtube_url} />
            <SocialBadge label="Highlights" value={player.highlight_url} />
          </div>
        ) : null}

        <div className="mt-5">
          <span className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            Open Full Profile
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroMiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">{value}</p>

      {sub ? <p className="mt-1 truncate text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-3xl font-black">{title}</h2>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 px-2 py-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">{display(value)}</p>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
        {label}
      </p>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
        {value}
      </p>
    </div>
  );
}

function SocialBadge({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!hasValue(value)) return null;

  return (
    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-orange-200">
      {label}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}