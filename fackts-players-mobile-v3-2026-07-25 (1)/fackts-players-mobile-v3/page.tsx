import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type PlayerCard = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  is_featured?: boolean | null;

  // Optional classification fields, in case they exist in Supabase.
  player_type?: string | null;
  roster_status?: string | null;
  category?: string | null;
  is_guest?: boolean | null;

  games_played: number;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  total_points: number;
};

type PlayerRecord = Omit<
  PlayerCard,
  | "games_played"
  | "points_per_game"
  | "rebounds_per_game"
  | "assists_per_game"
  | "total_points"
>;

type PlayerStatRecord = {
  player_id: string;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
};

function hasValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
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

function isOfficialRosterPlayer(player: PlayerRecord) {
  const combinedType = [
    player.player_type,
    player.roster_status,
    player.category,
    player.role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (player.is_guest === true) return false;
  if (combinedType.includes("guest")) return false;
  if (combinedType.includes("prospect")) return false;
  if (combinedType.includes("external")) return false;
  if (combinedType.includes("partner team")) return false;

  return true;
}

async function getPlayersWithStats() {
  const [playersResult, statsResult] = await Promise.all([
    supabase
      .from("players")
      .select(
        "id, full_name, name, nickname, jersey_number, position, role, photo_url, photo_position, is_featured, player_type, roster_status, category, is_guest"
      )
      .eq("is_active", true)
      .order("jersey_number", { ascending: true }),

    supabase
      .from("player_game_stats")
      .select("player_id, points, rebounds, assists"),
  ]);

  if (playersResult.error || statsResult.error) {
    return [];
  }

  const players = ((playersResult.data ?? []) as PlayerRecord[]).filter(
    isOfficialRosterPlayer
  );
  const stats = (statsResult.data ?? []) as PlayerStatRecord[];
  const statsByPlayer = new Map<string, PlayerStatRecord[]>();

  stats.forEach((row) => {
    const playerId = String(row.player_id ?? "");
    if (!playerId) return;

    const current = statsByPlayer.get(playerId) ?? [];
    current.push(row);
    statsByPlayer.set(playerId, current);
  });

  const rows: PlayerCard[] = players.map((player) => {
    const playerStats = statsByPlayer.get(String(player.id)) ?? [];
    const gamesPlayed = playerStats.length;

    const totals = playerStats.reduce(
      (acc, row) => {
        acc.points += Number(row.points ?? 0);
        acc.rebounds += Number(row.rebounds ?? 0);
        acc.assists += Number(row.assists ?? 0);
        return acc;
      },
      {
        points: 0,
        rebounds: 0,
        assists: 0,
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
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      is_featured: player.is_featured,
      player_type: player.player_type,
      roster_status: player.roster_status,
      category: player.category,
      is_guest: player.is_guest,
      games_played: gamesPlayed,
      points_per_game: avg(totals.points),
      rebounds_per_game: avg(totals.rebounds),
      assists_per_game: avg(totals.assists),
      total_points: totals.points,
    };
  });

  return rows;
}

export default async function PlayersPage() {
  const players = await getPlayersWithStats();

  const totalPlayers = players.length;
  const totalRecordedPoints = players.reduce(
    (acc, player) => acc + player.total_points,
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
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.94)), url('/images/one-on-one-bg.webp')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-9 sm:px-6 md:py-12 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Official FACKTS Roster
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Players
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Official FACKTS Hoops players only. Guest hoopers, external
                ballers, and battle-only players live inside the Court Takeover
                portal.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/guest-hoopers"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-200 transition hover:border-orange-400 hover:text-orange-300"
                >
                  View Guest Hoopers
                </Link>

                <Link
                  href="/court-takeover"
                  className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                >
                  Court Takeover Portal
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMiniStat label="Players" value={String(totalPlayers)} />
              <HeroMiniStat
                label="Points Recorded"
                value={String(totalRecordedPoints)}
              />
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
          <SectionHeader eyebrow="Spotlight" title="Featured Official Players" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} featured />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Roster" title="Official Active Players" />

        {players.length === 0 ? (
          <EmptyBox text="No official active players found yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(featuredPlayers.length > 0 ? regularPlayers : players).map((player) => (
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
  return (
    <>
      <MobilePlayerRow player={player} featured={featured} />
      <DesktopPlayerCard player={player} featured={featured} />
    </>
  );
}

function MobilePlayerRow({
  player,
  featured = false,
}: {
  player: PlayerCard;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group relative grid min-h-[104px] grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-lg shadow-black/20 transition duration-300 active:scale-[0.985] md:hidden"
    >
      <div className="relative min-h-[104px] overflow-hidden bg-black">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={getPlayerName(player)}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-active:scale-105"
            style={{
              objectPosition: player.photo_position || "center center",
            }}
          />
        ) : (
          <div className="flex h-full min-h-[104px] w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505]">
            <div className="text-center">
              <p className="text-3xl font-black text-orange-500">
                {getInitials(player) || "FH"}
              </p>
              <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-zinc-600">
                FACKTS Player
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/45" />

        {hasValue(player.jersey_number) ? (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black text-black shadow-lg shadow-black/30">
            #{player.jersey_number}
          </span>
        ) : null}
      </div>

      <div className="relative flex min-w-0 flex-col justify-between px-2.5 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1 text-[7px] font-black uppercase leading-none tracking-[0.08em]">
            <span className={featured ? "text-orange-400" : "text-zinc-500"}>
              {featured ? "Featured" : "Official Player"}
            </span>

            {hasValue(player.position) ? (
              <>
                <span className="text-zinc-600">•</span>
                <span className="min-w-0 text-zinc-400">
                  {player.position}
                </span>
              </>
            ) : null}
          </div>

          <h2 className="mt-1 break-words text-[15px] font-black leading-[1.05] text-white transition group-active:text-orange-200">
            {getPlayerName(player)}
          </h2>

          <p className="mt-0.5 truncate text-[9px] font-bold leading-none text-orange-300">
            {hasValue(player.nickname)
              ? `“${player.nickname}”`
              : hasValue(player.role)
                ? player.role
                : "FACKTS Hoops"}
          </p>
        </div>

        <div className="mt-1.5 grid min-w-0 grid-cols-4 gap-1">
          <MobileStat label="GP" value={player.games_played} />
          <MobileStat label="PPG" value={player.points_per_game} />
          <MobileStat label="RPG" value={player.rebounds_per_game} />
          <MobileStat label="APG" value={player.assists_per_game} />
        </div>
      </div>
    </Link>
  );
}

function DesktopPlayerCard({
  player,
  featured = false,
}: {
  player: PlayerCard;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group hidden overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/60 hover:shadow-orange-950/30 md:block"
    >
      <div className="relative overflow-hidden bg-black">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {hasValue(player.jersey_number) ? (
            <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black text-black">
              #{player.jersey_number}
            </span>
          ) : null}

          <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur">
            FACKTS Player
          </span>

          {featured ? (
            <span className="rounded-full border border-orange-400/40 bg-black/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200 backdrop-blur">
              Featured
            </span>
          ) : null}
        </div>

        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={getPlayerName(player)}
            loading="lazy"
            decoding="async"
            className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
            style={{
              objectPosition: player.photo_position || "center center",
            }}
          />
        ) : (
          <div className="flex h-60 w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505]">
            <div className="text-center">
              <p className="text-5xl font-black text-orange-500">
                {getInitials(player) || "FH"}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                FACKTS Player
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-1 text-xl font-black text-white group-hover:text-orange-200">
              {getPlayerName(player)}
            </h2>

            {hasValue(player.nickname) ? (
              <p className="mt-1 line-clamp-1 text-sm font-bold text-orange-300">
                “{player.nickname}”
              </p>
            ) : null}
          </div>

          {hasValue(player.position) ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-zinc-300">
              {player.position}
            </span>
          ) : null}
        </div>

        {hasValue(player.role) ? (
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200">
              {player.role}
            </span>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-2">
          <StatPill label="GP" value={player.games_played} />
          <StatPill label="PPG" value={player.points_per_game} />
          <StatPill label="RPG" value={player.rebounds_per_game} />
          <StatPill label="APG" value={player.assists_per_game} />
        </div>

        <div className="mt-4 text-right">
          <span className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black transition group-hover:bg-orange-400">
            View profile <span className="ml-1" aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="whitespace-nowrap text-[7px] font-black uppercase leading-none tracking-normal text-zinc-500">
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-[12px] font-black leading-none tabular-nums text-white">
        {value}
      </p>
    </div>
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
    <div className="px-1 py-1.5 text-center md:rounded-2xl md:border md:border-white/10 md:bg-black/60 md:px-2 md:py-3">
      <p className="text-[7px] font-black uppercase tracking-[0.08em] text-zinc-500 md:text-[9px] md:tracking-[0.12em]">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-black text-white md:mt-1 md:text-base">{value}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}
