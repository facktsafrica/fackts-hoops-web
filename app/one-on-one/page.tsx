import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OneOnOneMatch = {
  id: string;
  player_one_type?: string | null;
  player_one_id?: string | null;
  guest_player_one_id?: string | null;

  player_two_type?: string | null;
  player_two_id?: string | null;
  guest_player_two_id?: string | null;

  match_date?: string | null;
  venue?: string | null;
  status?: string | null;
  player_one_score?: number | null;
  player_two_score?: number | null;
  poster_url?: string | null;
  poster_position?: string | null;
  notes?: string | null;
};

type Competitor = {
  id: string;
  type: "fackts" | "guest";
  full_name: string;
  nickname?: string | null;
  jersey_number?: number | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  label: string;
};

type OneOnOneLeader = Competitor & {
  games_played: number;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  win_rate: number;
};

async function getOneOnOneMatches() {
  const { data, error } = await supabase
    .from("one_on_one_games")
    .select("*")
    .order("match_date", { ascending: false });

  if (error) return [];

  return (data ?? []) as OneOnOneMatch[];
}

async function getPlayersByIds(playerIds: string[]) {
  if (playerIds.length === 0) return {};

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds);

  if (error) return {};

  return (data ?? []).reduce((acc: Record<string, Competitor>, player: any) => {
    acc[player.id] = {
      id: player.id,
      type: "fackts",
      full_name: player.full_name,
      nickname: player.nickname,
      jersey_number: player.jersey_number,
      position: player.position,
      role: player.role,
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      label: "FACKTS Player",
    };

    return acc;
  }, {});
}

async function getGuestHoopersByIds(guestIds: string[]) {
  if (guestIds.length === 0) return {};

  const { data, error } = await supabase
    .from("guest_hoopers")
    .select("*")
    .in("id", guestIds);

  if (error) return {};

  return (data ?? []).reduce((acc: Record<string, Competitor>, guest: any) => {
    acc[guest.id] = {
      id: guest.id,
      type: "guest",
      full_name: guest.full_name,
      nickname: guest.nickname,
      jersey_number: null,
      position: guest.position,
      role: "Guest Hooper",
      photo_url: guest.photo_url,
      photo_position: guest.photo_position,
      label: "Guest Hooper",
    };

    return acc;
  }, {});
}

function getCompetitorOne(
  match: OneOnOneMatch,
  playersMap: Record<string, Competitor>,
  guestMap: Record<string, Competitor>
) {
  const type = match.player_one_type ?? "fackts";

  if (type === "guest") {
    return match.guest_player_one_id
      ? guestMap[match.guest_player_one_id]
      : null;
  }

  return match.player_one_id ? playersMap[match.player_one_id] : null;
}

function getCompetitorTwo(
  match: OneOnOneMatch,
  playersMap: Record<string, Competitor>,
  guestMap: Record<string, Competitor>
) {
  const type = match.player_two_type ?? "fackts";

  if (type === "guest") {
    return match.guest_player_two_id
      ? guestMap[match.guest_player_two_id]
      : null;
  }

  return match.player_two_id ? playersMap[match.player_two_id] : null;
}

function getWinnerSide(match: OneOnOneMatch) {
  if (match.status !== "completed") return null;

  const p1 = match.player_one_score;
  const p2 = match.player_two_score;

  if (p1 === null || p1 === undefined || p2 === null || p2 === undefined) {
    return null;
  }

  if (Number(p1) > Number(p2)) return "one";
  if (Number(p2) > Number(p1)) return "two";

  return null;
}

function getResultLabel(
  match: OneOnOneMatch,
  competitorOne: Competitor | null,
  competitorTwo: Competitor | null
) {
  if (match.status === "upcoming") {
    return "Upcoming Battle";
  }

  const winnerSide = getWinnerSide(match);

  if (!winnerSide) {
    return "Completed";
  }

  if (winnerSide === "one") {
    return `${competitorOne?.full_name ?? "Player One"} won`;
  }

  return `${competitorTwo?.full_name ?? "Player Two"} won`;
}

function getCompetitorKey(competitor: Competitor) {
  return `${competitor.type}:${competitor.id}`;
}

function buildLeaderboards(
  matches: OneOnOneMatch[],
  playersMap: Record<string, Competitor>,
  guestMap: Record<string, Competitor>
) {
  const leaders: Record<string, OneOnOneLeader> = {};

  matches
    .filter((match) => match.status === "completed")
    .forEach((match) => {
      const competitorOne = getCompetitorOne(match, playersMap, guestMap);
      const competitorTwo = getCompetitorTwo(match, playersMap, guestMap);

      if (!competitorOne || !competitorTwo) return;

      const keyOne = getCompetitorKey(competitorOne);
      const keyTwo = getCompetitorKey(competitorTwo);

      if (!leaders[keyOne]) {
        leaders[keyOne] = {
          ...competitorOne,
          games_played: 0,
          wins: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
          win_rate: 0,
        };
      }

      if (!leaders[keyTwo]) {
        leaders[keyTwo] = {
          ...competitorTwo,
          games_played: 0,
          wins: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
          win_rate: 0,
        };
      }

      const scoreOne = Number(match.player_one_score ?? 0);
      const scoreTwo = Number(match.player_two_score ?? 0);

      leaders[keyOne].games_played += 1;
      leaders[keyTwo].games_played += 1;

      leaders[keyOne].points_for += scoreOne;
      leaders[keyOne].points_against += scoreTwo;

      leaders[keyTwo].points_for += scoreTwo;
      leaders[keyTwo].points_against += scoreOne;

      const winnerSide = getWinnerSide(match);

      if (winnerSide === "one") {
        leaders[keyOne].wins += 1;
        leaders[keyTwo].losses += 1;
      }

      if (winnerSide === "two") {
        leaders[keyTwo].wins += 1;
        leaders[keyOne].losses += 1;
      }
    });

  const leadersArray = Object.values(leaders).map((leader) => ({
    ...leader,
    win_rate:
      leader.games_played > 0
        ? Math.round((leader.wins / leader.games_played) * 100)
        : 0,
  }));

  return leadersArray.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.points_for !== a.points_for) return b.points_for - a.points_for;
    return b.games_played - a.games_played;
  });
}

export default async function OneOnOnePage() {
  const matches = await getOneOnOneMatches();

  const facktsPlayerIds = Array.from(
    new Set(
      matches
        .flatMap((match) => [match.player_one_id, match.player_two_id])
        .filter(Boolean) as string[]
    )
  );

  const guestHooperIds = Array.from(
    new Set(
      matches
        .flatMap((match) => [
          match.guest_player_one_id,
          match.guest_player_two_id,
        ])
        .filter(Boolean) as string[]
    )
  );

  const [playersMap, guestMap] = await Promise.all([
    getPlayersByIds(facktsPlayerIds),
    getGuestHoopersByIds(guestHooperIds),
  ]);

  const upcomingMatches = matches.filter((match) => match.status === "upcoming");
  const completedMatches = matches.filter((match) => match.status === "completed");

  const leaders = buildLeaderboards(matches, playersMap, guestMap);
  const guestLeaders = leaders.filter((leader) => leader.type === "guest");

  const totalBattles = completedMatches.length;
  const totalUpcoming = upcomingMatches.length;
  const totalCompetitors = leaders.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="max-w-4xl">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
              1-on-1 Battles
            </h1>

            <p className="mt-4 text-lg text-slate-300">
              FACKTS players and guest hoopers going head-to-head. Upcoming
              battles, past results, rankings, and community bragging rights.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <HeroStat label="Completed Battles" value={String(totalBattles)} />
              <HeroStat label="Upcoming Battles" value={String(totalUpcoming)} />
              <HeroStat label="Ranked Competitors" value={String(totalCompetitors)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Upcoming
            </div>
            <h2 className="mt-1 text-3xl font-black">Upcoming 1-on-1 Battles</h2>
            <p className="mt-2 text-slate-400">
              New matchups before the score is settled.
            </p>
          </div>

          <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
            {upcomingMatches.length} upcoming
          </div>
        </div>

        {upcomingMatches.length === 0 ? (
          <EmptyState text="No upcoming 1-on-1 battles have been added yet." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                playersMap={playersMap}
                guestMap={guestMap}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6">
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              Leaderboard
            </div>
            <h2 className="mt-1 text-3xl font-black">Overall 1-on-1 Rankings</h2>
            <p className="mt-2 text-slate-400">
              Ranked by wins, points scored, and games played.
            </p>
          </div>

          {leaders.length === 0 ? (
            <EmptyState text="No completed 1-on-1 results yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leaders.slice(0, 12).map((competitor, index) => (
                <LeaderCard
                  key={`${competitor.type}-${competitor.id}`}
                  competitor={competitor}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
            Community
          </div>
          <h2 className="mt-1 text-3xl font-black">Guest Hooper Rankings</h2>
          <p className="mt-2 text-slate-400">
            Guest-only rankings for visiting ballers and challengers.
          </p>
        </div>

        {guestLeaders.length === 0 ? (
          <EmptyState text="No guest hooper 1-on-1 results yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guestLeaders.slice(0, 12).map((competitor, index) => (
              <LeaderCard
                key={`guest-${competitor.id}`}
                competitor={competitor}
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
                Results
              </div>
              <h2 className="mt-1 text-3xl font-black">Past 1-on-1 Results</h2>
              <p className="mt-2 text-slate-400">
                Completed battles and score history.
              </p>
            </div>

            <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300">
              {completedMatches.length} completed
            </div>
          </div>

          {completedMatches.length === 0 ? (
            <EmptyState text="No completed 1-on-1 results have been added yet." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {completedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  playersMap={playersMap}
                  guestMap={guestMap}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MatchCard({
  match,
  playersMap,
  guestMap,
}: {
  match: OneOnOneMatch;
  playersMap: Record<string, Competitor>;
  guestMap: Record<string, Competitor>;
}) {
  const competitorOne = getCompetitorOne(match, playersMap, guestMap);
  const competitorTwo = getCompetitorTwo(match, playersMap, guestMap);

  const resultLabel = getResultLabel(match, competitorOne, competitorTwo);
  const winnerSide = getWinnerSide(match);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
      {match.poster_url ? (
        <div className="relative h-72">
          <img
            src={match.poster_url}
            alt="1-on-1 poster"
            className="h-full w-full object-cover"
            style={{
              objectPosition: match.poster_position ?? "center center",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          <div className="absolute left-5 top-5 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
            {match.status === "upcoming" ? "UPCOMING" : "RESULT"}
          </div>

          <div className="absolute bottom-5 left-5 right-5">
            <div className="text-2xl font-black">
              {competitorOne?.full_name ?? "Player One"} vs{" "}
              {competitorTwo?.full_name ?? "Player Two"}
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {match.match_date ?? "Date TBA"} • {match.venue ?? "Venue TBA"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-5">
        {!match.poster_url ? (
          <div className="mb-5">
            <div className="w-fit rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
              {match.status === "upcoming" ? "UPCOMING" : "RESULT"}
            </div>

            <div className="mt-4 text-sm text-slate-400">
              {match.match_date ?? "Date TBA"} • {match.venue ?? "Venue TBA"}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
          <CompetitorMini
            competitor={competitorOne}
            isWinner={winnerSide === "one"}
          />

          <div className="text-center">
            {match.status === "completed" ? (
              <>
                <div className="text-4xl font-black text-orange-300">
                  {match.player_one_score ?? 0} - {match.player_two_score ?? 0}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  Final Score
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-orange-300">VS</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  Battle
                </div>
              </>
            )}
          </div>

          <CompetitorMini
            competitor={competitorTwo}
            isWinner={winnerSide === "two"}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          {resultLabel}
        </div>

        {match.notes ? (
          <p className="mt-3 text-sm leading-6 text-slate-500">{match.notes}</p>
        ) : null}
      </div>
    </article>
  );
}

function CompetitorMini({
  competitor,
  isWinner,
}: {
  competitor: Competitor | null;
  isWinner: boolean;
}) {
  const content = (
    <div
      className={`rounded-3xl border p-4 transition ${
        isWinner
          ? "border-orange-400/50 bg-orange-500/10"
          : "border-slate-800 bg-slate-950"
      }`}
    >
      <div className="flex items-center gap-3">
        {competitor?.photo_url ? (
          <img
            src={competitor.photo_url}
            alt={competitor.full_name}
            className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
            style={{
              objectPosition: competitor.photo_position ?? "center center",
            }}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
            🏀
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate font-bold">
            {competitor?.jersey_number
              ? `#${competitor.jersey_number} `
              : ""}
            {competitor?.full_name ?? "Player"}
          </div>

          <div className="mt-1 text-sm text-slate-400">
            {competitor?.label ?? "Competitor"} •{" "}
            {competitor?.position ?? "Position TBA"}
          </div>

          {isWinner ? (
            <div className="mt-2 w-fit rounded-full bg-orange-500 px-2 py-1 text-xs font-black text-slate-950">
              WINNER
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (competitor?.type === "fackts") {
    return <Link href={`/players/${competitor.id}`}>{content}</Link>;
  }

  return content;
}

function LeaderCard({
  competitor,
  index,
}: {
  competitor: OneOnOneLeader;
  index: number;
}) {
  const card = (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 transition hover:border-orange-400/40">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            index === 0
              ? "bg-orange-500 text-slate-950"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          {index + 1}
        </div>

        {competitor.photo_url ? (
          <img
            src={competitor.photo_url}
            alt={competitor.full_name}
            className="h-16 w-16 rounded-2xl border border-slate-700 object-cover"
            style={{
              objectPosition: competitor.photo_position ?? "center center",
            }}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
            🏀
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate font-bold">
            {competitor.jersey_number ? `#${competitor.jersey_number} ` : ""}
            {competitor.full_name}
          </div>

          <div className="mt-1 text-sm text-slate-400">
            {competitor.label} • {competitor.position ?? "Position TBA"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
        <MiniStat label="W" value={String(competitor.wins)} />
        <MiniStat label="L" value={String(competitor.losses)} />
        <MiniStat label="GP" value={String(competitor.games_played)} />
        <MiniStat label="PTS" value={String(competitor.points_for)} />
        <MiniStat label="WIN%" value={`${competitor.win_rate}%`} />
      </div>
    </div>
  );

  if (competitor.type === "fackts") {
    return <Link href={`/players/${competitor.id}`}>{card}</Link>;
  }

  return card;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-orange-300">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
      {text}
    </div>
  );
}