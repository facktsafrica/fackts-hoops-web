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
    <main className="min-h-screen overflow-x-hidden bg-slate-950 pt-16 text-white md:pt-0">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300 md:text-sm">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-6xl">
              1-on-1 Battles
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-lg">
              Follow head-to-head battles, upcoming matchups, past results, and player rankings.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2 md:mt-8 md:gap-4">
              <HeroStat label="Completed" value={String(totalBattles)} />
              <HeroStat label="Upcoming" value={String(totalUpcoming)} />
              <HeroStat label="Ranked" value={String(totalCompetitors)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <SectionHeader
          eyebrow="Upcoming"
          title="Upcoming 1-on-1 Battles"
          text="Upcoming battles before the score is settled."
          badge={`${upcomingMatches.length} upcoming`}
        />

        {upcomingMatches.length === 0 ? (
          <EmptyState text="No upcoming 1-on-1 battles have been added yet." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
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
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <SectionHeader
            eyebrow="Leaderboard"
            title="Overall 1-on-1 Rankings"
            text="Track the strongest 1-on-1 performers by wins, points, and appearances."
          />

          {leaders.length === 0 ? (
            <EmptyState text="No completed 1-on-1 results yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <SectionHeader
          eyebrow="Community"
          title="Guest Hooper Rankings"
          text="Track visiting ballers, challengers, and community players making their mark on the court."
        />

        {guestLeaders.length === 0 ? (
          <EmptyState text="No guest hooper 1-on-1 results yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <SectionHeader
            eyebrow="Results"
            title="Past 1-on-1 Results"
            text="Review completed battles and score history."
            badge={`${completedMatches.length} completed`}
          />

          {completedMatches.length === 0 ? (
            <EmptyState text="No completed 1-on-1 results have been added yet." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
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

function SectionHeader({
  eyebrow,
  title,
  text,
  badge,
}: {
  eyebrow: string;
  title: string;
  text: string;
  badge?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
          {eyebrow}
        </div>

        <h2 className="mt-1 text-2xl font-black md:text-3xl">{title}</h2>

        <p className="mt-2 max-w-2xl text-sm text-slate-400">{text}</p>
      </div>

      {badge ? (
        <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 md:px-4 md:py-2 md:text-sm">
          {badge}
        </div>
      ) : null}
    </div>
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
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
      {match.poster_url ? (
        <div className="relative h-52 md:h-72">
          <img
            src={match.poster_url}
            alt="1-on-1 poster"
            className="h-full w-full object-cover"
            style={{
              objectPosition: match.poster_position ?? "center center",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black text-slate-950">
            {match.status === "upcoming" ? "UPCOMING" : "RESULT"}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="break-words text-xl font-black md:text-2xl">
              {competitorOne?.full_name ?? "Player One"} vs{" "}
              {competitorTwo?.full_name ?? "Player Two"}
            </div>

            <div className="mt-1 text-xs text-slate-300 md:text-sm">
              {match.match_date ?? "Date TBA"} • {match.venue ?? "Venue TBA"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-4 md:p-5">
        {!match.poster_url ? (
          <div className="mb-4">
            <div className="w-fit rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black text-slate-950">
              {match.status === "upcoming" ? "UPCOMING" : "RESULT"}
            </div>

            <div className="mt-3 text-xs text-slate-400 md:text-sm">
              {match.match_date ?? "Date TBA"} • {match.venue ?? "Venue TBA"}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          <CompetitorMini
            competitor={competitorOne}
            isWinner={winnerSide === "one"}
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-center">
            {match.status === "completed" ? (
              <>
                <div className="text-3xl font-black text-orange-300 md:text-4xl">
                  {match.player_one_score ?? 0} - {match.player_two_score ?? 0}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                  Final Score
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black text-orange-300">VS</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
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

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
          {resultLabel}
        </div>

        {match.notes ? (
          <p className="mt-3 break-words text-sm leading-6 text-slate-500">
            {match.notes}
          </p>
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
      className={`rounded-2xl border p-3 transition ${
        isWinner
          ? "border-orange-400/50 bg-orange-500/10"
          : "border-slate-800 bg-slate-950"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {competitor?.photo_url ? (
          <img
            src={competitor.photo_url}
            alt={competitor.full_name}
            className="h-14 w-14 shrink-0 rounded-2xl border border-slate-700 object-cover"
            style={{
              objectPosition: competitor.photo_position ?? "center center",
            }}
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
            🏀
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {competitor?.jersey_number
              ? `#${competitor.jersey_number} `
              : ""}
            {competitor?.full_name ?? "Player"}
          </div>

          <div className="mt-1 truncate text-xs text-slate-400">
            {competitor?.label ?? "Competitor"} •{" "}
            {competitor?.position ?? "Position TBA"}
          </div>

          {isWinner ? (
            <div className="mt-2 w-fit rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-slate-950">
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-400/40">
      <div className="grid grid-cols-[34px,48px,1fr] items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
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
            className="h-12 w-12 rounded-2xl border border-slate-700 object-cover"
            style={{
              objectPosition: competitor.photo_position ?? "center center",
            }}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl">
            🏀
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {competitor.jersey_number ? `#${competitor.jersey_number} ` : ""}
            {competitor.full_name}
          </div>

          <div className="mt-1 truncate text-xs text-slate-400">
            {competitor.label} • {competitor.position ?? "Position TBA"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Wins" value={String(competitor.wins)} />
        <MiniStat label="Played" value={String(competitor.games_played)} />
        <MiniStat label="Points" value={String(competitor.points_for)} />
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl shadow-black/20 md:p-5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 md:text-xs">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-orange-300 md:mt-2 md:text-3xl">
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
      <div className="text-[8px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-base font-black text-orange-300">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
      {text}
    </div>
  );
}