import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Leader = {
  id: string;
  type: "player" | "guest";
  full_name: string;
  nickname: string | null;
  jersey_number: number | null;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  photo_position: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  points_for: number;
  points_allowed: number;
  win_rate: number;
};

async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  if (error) return [];
  return data ?? [];
}

async function getGuestHoopers() {
  const { data, error } = await supabase
    .from("guest_hoopers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

async function getOneOnOneGames() {
  const { data, error } = await supabase
    .from("one_on_one_games")
    .select("*")
    .order("match_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

async function getGuestOneOnOneStats() {
  const { data, error } = await supabase
    .from("guest_one_on_one_stats")
    .select("*")
    .order("match_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

function getCompetitorId(match: any, side: "one" | "two") {
  const typeKey = side === "one" ? "player_one_type" : "player_two_type";
  const playerKey = side === "one" ? "player_one_id" : "player_two_id";
  const guestKey = side === "one" ? "guest_player_one_id" : "guest_player_two_id";

  const type = match[typeKey] ?? "fackts";
  const id = type === "guest" ? match[guestKey] : match[playerKey];

  return {
    type: type === "guest" ? "guest" : "player",
    id,
  };
}

function isCompleted(match: any) {
  return (
    match.status === "completed" &&
    match.player_one_score !== null &&
    match.player_one_score !== undefined &&
    match.player_two_score !== null &&
    match.player_two_score !== undefined
  );
}

function makeLeader(profile: any, type: "player" | "guest"): Leader {
  return {
    id: profile.id,
    type,
    full_name: profile.full_name ?? "Unknown",
    nickname: profile.nickname ?? null,
    jersey_number: type === "player" ? profile.jersey_number ?? null : null,
    position: profile.position ?? null,
    role: profile.role ?? (type === "guest" ? "Guest Hooper" : null),
    photo_url: profile.photo_url ?? null,
    photo_position: profile.photo_position ?? null,
    matches_played: 0,
    wins: 0,
    losses: 0,
    points_for: 0,
    points_allowed: 0,
    win_rate: 0,
  };
}

function calculateWinRate(leader: Leader) {
  return leader.matches_played > 0
    ? Number(((leader.wins / leader.matches_played) * 100).toFixed(1))
    : 0;
}

function buildLeaderboards({
  players,
  guests,
  matches,
  guestStats,
}: {
  players: any[];
  guests: any[];
  matches: any[];
  guestStats: any[];
}) {
  const playerMap = new Map<string, Leader>();
  const guestMap = new Map<string, Leader>();

  players.forEach((player) => {
    playerMap.set(player.id, makeLeader(player, "player"));
  });

  guests.forEach((guest) => {
    guestMap.set(guest.id, makeLeader(guest, "guest"));
  });

  matches.filter(isCompleted).forEach((match) => {
    const one = getCompetitorId(match, "one");
    const two = getCompetitorId(match, "two");

    const oneScore = Number(match.player_one_score ?? 0);
    const twoScore = Number(match.player_two_score ?? 0);

    const oneLeader =
      one.type === "guest" ? guestMap.get(one.id) : playerMap.get(one.id);
    const twoLeader =
      two.type === "guest" ? guestMap.get(two.id) : playerMap.get(two.id);

    if (oneLeader) {
      oneLeader.matches_played += 1;
      oneLeader.points_for += oneScore;
      oneLeader.points_allowed += twoScore;

      if (oneScore > twoScore) oneLeader.wins += 1;
      if (oneScore < twoScore) oneLeader.losses += 1;
    }

    if (twoLeader) {
      twoLeader.matches_played += 1;
      twoLeader.points_for += twoScore;
      twoLeader.points_allowed += oneScore;

      if (twoScore > oneScore) twoLeader.wins += 1;
      if (twoScore < oneScore) twoLeader.losses += 1;
    }
  });

  guestStats.forEach((row) => {
    const guestId = row.guest_hooper_id;
    const guestLeader = guestMap.get(guestId);

    if (!guestLeader) return;

    guestLeader.matches_played += Number(row.matches_played ?? 0);
    guestLeader.wins += Number(row.wins ?? 0);
    guestLeader.losses += Number(row.losses ?? 0);
    guestLeader.points_for += Number(row.points_scored ?? 0);
    guestLeader.points_allowed += Number(row.points_allowed ?? 0);
  });

  const playerLeaders = Array.from(playerMap.values()).map((leader) => ({
    ...leader,
    win_rate: calculateWinRate(leader),
  }));

  const guestLeaders = Array.from(guestMap.values()).map((leader) => ({
    ...leader,
    win_rate: calculateWinRate(leader),
  }));

  return {
    playerLeaders,
    guestLeaders,
  };
}

function sortByStat(leaders: Leader[], statKey: keyof Leader) {
  return [...leaders].sort((a: any, b: any) => {
    const statDiff = Number(b[statKey] ?? 0) - Number(a[statKey] ?? 0);

    if (statDiff !== 0) return statDiff;

    return Number(b.matches_played ?? 0) - Number(a.matches_played ?? 0);
  });
}

function formatStat(value: any, statKey: keyof Leader) {
  if (statKey === "win_rate") {
    return `${Number(value ?? 0).toFixed(1)}%`;
  }

  return String(value ?? 0);
}

function getCompetitorProfile({
  match,
  side,
  players,
  guests,
}: {
  match: any;
  side: "one" | "two";
  players: any[];
  guests: any[];
}) {
  const competitor = getCompetitorId(match, side);

  if (competitor.type === "guest") {
    return {
      type: "guest",
      profile: guests.find((guest) => guest.id === competitor.id) ?? null,
    };
  }

  return {
    type: "player",
    profile: players.find((player) => player.id === competitor.id) ?? null,
  };
}

function getWinnerText(match: any, oneName: string, twoName: string) {
  if (match.status === "upcoming") return "Upcoming";

  if (!isCompleted(match)) return "Completed";

  const oneScore = Number(match.player_one_score ?? 0);
  const twoScore = Number(match.player_two_score ?? 0);

  if (oneScore > twoScore) return `${oneName} won`;
  if (twoScore > oneScore) return `${twoName} won`;

  return "Tied";
}

export default async function OneOnOnePage() {
  const [players, guests, matches, guestStats] = await Promise.all([
    getPlayers(),
    getGuestHoopers(),
    getOneOnOneGames(),
    getGuestOneOnOneStats(),
  ]);

  const { playerLeaders, guestLeaders } = buildLeaderboards({
    players,
    guests,
    matches,
    guestStats,
  });

  const playerWins = sortByStat(playerLeaders, "wins");
  const playerMatches = sortByStat(playerLeaders, "matches_played");
  const playerWinRate = sortByStat(
    playerLeaders.filter((leader) => leader.matches_played > 0),
    "win_rate"
  );
  const playerPoints = sortByStat(playerLeaders, "points_for");

  const guestWins = sortByStat(guestLeaders, "wins");
  const guestMatches = sortByStat(guestLeaders, "matches_played");
  const guestWinRate = sortByStat(
    guestLeaders.filter((leader) => leader.matches_played > 0),
    "win_rate"
  );
  const guestPoints = sortByStat(guestLeaders, "points_for");

  const completedMatches = matches.filter((match: any) => match.status === "completed");
  const upcomingMatches = matches.filter((match: any) => match.status === "upcoming");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="max-w-4xl">
            <div className="text-[10px] uppercase tracking-[0.25em] text-orange-300 md:text-xs">
              FACKTS Hoops
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              1-on-1 Battles
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Follow FACKTS player battles, guest hooper matchups, wins, records,
              and 1-on-1 performance rankings.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat label="Total Matches" value={String(matches.length)} />
            <HeroStat label="Completed" value={String(completedMatches.length)} />
            <HeroStat label="Upcoming" value={String(upcomingMatches.length)} />
            <HeroStat label="Guest Entries" value={String(guestStats.length)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-6">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
            FACKTS 1v1 Leaders
          </div>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">
            Player Leaderboards
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LeaderboardTableCard
            title="FACKTS 1v1 Wins"
            statLabel="WINS"
            leaders={playerWins}
            statKey="wins"
          />

          <LeaderboardTableCard
            title="FACKTS 1v1 Matches"
            statLabel="GP"
            leaders={playerMatches}
            statKey="matches_played"
          />

          <LeaderboardTableCard
            title="FACKTS 1v1 Win Rate"
            statLabel="WIN%"
            leaders={playerWinRate}
            statKey="win_rate"
          />

          <LeaderboardTableCard
            title="FACKTS 1v1 Points"
            statLabel="PTS"
            leaders={playerPoints}
            statKey="points_for"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-6">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
            Guest 1v1 Leaders
          </div>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">
            Guest Hooper Leaderboards
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <LeaderboardTableCard
            title="Guest 1v1 Wins"
            statLabel="WINS"
            leaders={guestWins}
            statKey="wins"
          />

          <LeaderboardTableCard
            title="Guest 1v1 Matches"
            statLabel="GP"
            leaders={guestMatches}
            statKey="matches_played"
          />

          <LeaderboardTableCard
            title="Guest 1v1 Win Rate"
            statLabel="WIN%"
            leaders={guestWinRate}
            statKey="win_rate"
          />

          <LeaderboardTableCard
            title="Guest 1v1 Points"
            statLabel="PTS"
            leaders={guestPoints}
            statKey="points_for"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Match Feed
            </div>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">
              Recent 1-on-1 Battles
            </h2>
          </div>

          <Link
            href="/admin/guest-one-on-one-stats"
            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
          >
            Admin Feed
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            No 1-on-1 battles have been created yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.slice(0, 8).map((match: any) => {
              const one = getCompetitorProfile({
                match,
                side: "one",
                players,
                guests,
              });
              const two = getCompetitorProfile({
                match,
                side: "two",
                players,
                guests,
              });

              const oneName = one.profile?.full_name ?? "Player One";
              const twoName = two.profile?.full_name ?? "Player Two";

              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20"
                >
                  {match.poster_url ? (
                    <img
                      src={match.poster_url}
                      alt={`${oneName} vs ${twoName}`}
                      className="h-52 w-full object-cover"
                      style={{
                        objectPosition: match.poster_position ?? "center center",
                      }}
                    />
                  ) : null}

                  <div className="p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          match.status === "upcoming"
                            ? "bg-orange-500 text-slate-950"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {match.status === "upcoming" ? "UPCOMING" : "COMPLETED"}
                      </div>

                      <div className="text-xs text-slate-400">
                        {match.match_date ?? "Date TBA"}
                        {match.venue ? ` - ${match.venue}` : ""}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
                      <CompetitorCard competitor={one} fallback="Player One" />

                      <div className="text-center">
                        <div className="text-2xl font-black text-orange-300">
                          VS
                        </div>

                        {match.status === "completed" ? (
                          <div className="mt-2 text-sm font-black text-white">
                            {match.player_one_score ?? 0} -{" "}
                            {match.player_two_score ?? 0}
                          </div>
                        ) : null}
                      </div>

                      <CompetitorCard competitor={two} fallback="Player Two" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-slate-300">
                      {getWinnerText(match, oneName, twoName)}
                    </div>

                    {match.notes ? (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {match.notes}
                      </p>
                    ) : null}
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

function LeaderboardTableCard({
  title,
  statLabel,
  leaders,
  statKey,
}: {
  title: string;
  statLabel: string;
  leaders: Leader[];
  statKey: keyof Leader;
}) {
  const topLeaders = leaders.slice(0, 7);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-md shadow-black/20">
      <div className="border-b border-slate-800 bg-slate-950/70 px-3 py-2">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
          {statLabel}
        </div>

        <h2 className="mt-0.5 text-sm font-black leading-tight md:text-base">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-800">
        {topLeaders.length === 0 ? (
          <div className="px-3 py-3 text-sm text-slate-500">No data yet.</div>
        ) : (
          topLeaders.map((leader, index) => (
            <Link
              key={`${leader.type}-${leader.id}`}
              href={leader.type === "guest" ? "/guest-hoopers" : `/players/${leader.id}`}
              className="grid grid-cols-[1.7rem_2.45rem_minmax(0,1fr)_3rem] items-center gap-2 px-2.5 py-1.5 transition hover:bg-slate-800/60 md:grid-cols-[1.9rem_2.65rem_minmax(0,1fr)_3.2rem] md:px-3"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-[11px] font-black text-orange-300 ring-1 ring-slate-800">
                {index + 1}
              </div>

              <div className="h-9 w-9 overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800 md:h-10 md:w-10">
                {leader.photo_url ? (
                  <img
                    src={leader.photo_url}
                    alt={leader.full_name}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: leader.photo_position ?? "center center",
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-orange-300">
                    {leader.type === "guest" ? "GH" : "FH"}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-[11px] font-black leading-tight text-white md:text-xs">
                  {leader.jersey_number ? `#${leader.jersey_number} ` : ""}
                  {leader.full_name}
                </div>

                <div className="mt-0.5 truncate text-[9px] leading-tight text-slate-400 md:text-[10px]">
                  {leader.type === "guest"
                    ? "Guest Hooper"
                    : leader.position ?? "FACKTS Player"}
                  {leader.nickname ? ` • ${leader.nickname}` : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-black leading-none text-orange-300 md:text-lg">
                  {formatStat(leader[statKey], statKey)}
                </div>

                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                  {statLabel}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function CompetitorCard({
  competitor,
  fallback,
}: {
  competitor: { type: string; profile: any };
  fallback: string;
}) {
  const profile = competitor.profile;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3">
      {profile?.photo_url ? (
        <img
          src={profile.photo_url}
          alt={profile.full_name}
          className="h-14 w-14 rounded-2xl border border-slate-700 object-cover"
          style={{
            objectPosition: profile.photo_position ?? "center center",
          }}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xs font-black text-orange-300">
          {competitor.type === "guest" ? "GH" : "FH"}
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white">
          {profile?.full_name ?? fallback}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {competitor.type === "guest"
            ? "Guest Hooper"
            : profile?.position ?? "FACKTS Player"}
        </div>
      </div>
    </div>
  );
}