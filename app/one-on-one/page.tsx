export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Player = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
};

type GuestHooper = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
};

type OneOnOneRow = {
  id: string;

  match_number?: string | null;
  match_title?: string | null;
  match_type?: string | null;
  court?: string | null;

  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  participant_name?: string | null;

  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;

  match_date?: string | null;
  venue?: string | null;
  location?: string | null;

  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  result?: string | null;
  status?: string | null;

  notes?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type LeaderboardItem = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  points: number;
  pointsAllowed: number;
  type: "fackts_player" | "guest_hooper" | "external";
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function cleanName(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getPersonName(person?: Player | GuestHooper | null) {
  if (!person) return "Unknown Hooper";
  return person.full_name || person.name || person.nickname || "Unknown Hooper";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not added";

  return date.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRowLocation(row: OneOnOneRow) {
  const parts = [row.venue, row.location, row.court].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Location not added";
}

function findPlayerByName(name: string | null | undefined, players: Player[]) {
  const target = cleanName(name);
  if (!target) return null;

  return (
    players.find((player) => {
      const names = [player.full_name, player.name, player.nickname].map(
        cleanName
      );

      return names.includes(target);
    }) || null
  );
}

function findGuestByName(name: string | null | undefined, guests: GuestHooper[]) {
  const target = cleanName(name);
  if (!target) return null;

  return (
    guests.find((guest) => {
      const names = [guest.full_name, guest.name, guest.nickname].map(
        cleanName
      );

      return names.includes(target);
    }) || null
  );
}

function getPlayer1Identity(
  row: OneOnOneRow,
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>
) {
  if (row.participant_type === "fackts_player" || row.fackts_player_id) {
    const player = row.fackts_player_id
      ? playerMap.get(String(row.fackts_player_id))
      : null;

    return {
      id: `player-${row.fackts_player_id || row.id}`,
      name: getPersonName(player),
      type: "fackts_player" as const,
    };
  }

  if (row.participant_type === "guest_hooper" || row.guest_hooper_id) {
    const guest = row.guest_hooper_id
      ? guestMap.get(String(row.guest_hooper_id))
      : null;

    return {
      id: `guest-${row.guest_hooper_id || row.id}`,
      name: getPersonName(guest),
      type: "guest_hooper" as const,
    };
  }

  return {
    id: `external-player-1-${cleanName(row.participant_name) || row.id}`,
    name: row.participant_name || "Player 1",
    type: "external" as const,
  };
}

function getPlayer2Identity(
  row: OneOnOneRow,
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  players: Player[],
  guests: GuestHooper[]
) {
  if (row.opponent_type === "fackts_player" || row.opponent_player_id) {
    const player = row.opponent_player_id
      ? playerMap.get(String(row.opponent_player_id))
      : null;

    return {
      id: `player-${row.opponent_player_id || row.id}`,
      name: getPersonName(player),
      type: "fackts_player" as const,
    };
  }

  if (row.opponent_type === "guest_hooper" || row.opponent_guest_hooper_id) {
    const guest = row.opponent_guest_hooper_id
      ? guestMap.get(String(row.opponent_guest_hooper_id))
      : null;

    return {
      id: `guest-${row.opponent_guest_hooper_id || row.id}`,
      name: getPersonName(guest),
      type: "guest_hooper" as const,
    };
  }

  const matchedPlayer = findPlayerByName(row.opponent_name, players);
  if (matchedPlayer) {
    return {
      id: `player-${matchedPlayer.id}`,
      name: getPersonName(matchedPlayer),
      type: "fackts_player" as const,
    };
  }

  const matchedGuest = findGuestByName(row.opponent_name, guests);
  if (matchedGuest) {
    return {
      id: `guest-${matchedGuest.id}`,
      name: getPersonName(matchedGuest),
      type: "guest_hooper" as const,
    };
  }

  return {
    id: `external-player-2-${cleanName(row.opponent_name) || row.id}`,
    name: row.opponent_name || "Player 2",
    type: "external" as const,
  };
}

function getPlayer1Score(row: OneOnOneRow) {
  return numberValue(row.points_scored);
}

function getPlayer2Score(row: OneOnOneRow) {
  return numberValue(row.points_allowed);
}

function getMatchStatus(row: OneOnOneRow) {
  const status = (row.status || "").toLowerCase().trim();

  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

function getWinnerSide(row: OneOnOneRow) {
  const score1 = getPlayer1Score(row);
  const score2 = getPlayer2Score(row);

  if (score1 === null || score2 === null) return null;
  if (score1 > score2) return "player1";
  if (score2 > score1) return "player2";
  return "draw";
}

function getResultLabel(row: OneOnOneRow) {
  const status = getMatchStatus(row);

  if (status === "Upcoming") return "Upcoming";
  if (status === "Cancelled") return "Cancelled";

  const winnerSide = getWinnerSide(row);

  if (winnerSide === "player1") return "Player 1 Win";
  if (winnerSide === "player2") return "Player 2 Win";
  if (winnerSide === "draw") return "Draw";

  return "Completed";
}

function getWinnerName(
  row: OneOnOneRow,
  player1Name: string,
  player2Name: string
) {
  const status = getMatchStatus(row);

  if (status !== "Completed") return "Not decided";

  const winnerSide = getWinnerSide(row);

  if (winnerSide === "player1") return player1Name;
  if (winnerSide === "player2") return player2Name;
  if (winnerSide === "draw") return "Draw";

  return "Not decided";
}

function getStatusClass(row: OneOnOneRow) {
  const status = getMatchStatus(row);

  if (status === "Upcoming") return "bg-orange-500/15 text-orange-300";
  if (status === "Cancelled") return "bg-red-500/15 text-red-300";

  return "bg-emerald-500/15 text-emerald-300";
}

function parseDateForSort(row: OneOnOneRow) {
  const value = row.match_date || row.created_at || "";
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseMatchNumber(value?: string | null) {
  if (!value) return 9999;

  const numberOnly = Number(String(value).replace(/[^0-9]/g, ""));

  if (Number.isNaN(numberOnly) || numberOnly === 0) return 9999;

  return numberOnly;
}

async function getData() {
  const supabase = getSupabase();

  const [playersResult, guestsResult, rowsResult] = await Promise.all([
    supabase.from("players").select("*"),
    supabase.from("guest_hoopers").select("*"),
    supabase
      .from("guest_one_on_one_stats")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const players = (playersResult.data || []) as Player[];
  const guests = (guestsResult.data || []) as GuestHooper[];

  const rows = ((rowsResult.data || []) as OneOnOneRow[]).sort((a, b) => {
    const numberDiff =
      parseMatchNumber(a.match_number) - parseMatchNumber(b.match_number);

    if (numberDiff !== 0) return numberDiff;

    return parseDateForSort(b) - parseDateForSort(a);
  });

  const playerMap = new Map<string, Player>();
  players.forEach((player) => playerMap.set(String(player.id), player));

  const guestMap = new Map<string, GuestHooper>();
  guests.forEach((guest) => guestMap.set(String(guest.id), guest));

  return {
    rows,
    players,
    guests,
    playerMap,
    guestMap,
  };
}

function buildLeaderboard(
  rows: OneOnOneRow[],
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  players: Player[],
  guests: GuestHooper[]
) {
  const board = new Map<string, LeaderboardItem>();

  function ensureItem(identity: {
    id: string;
    name: string;
    type: "fackts_player" | "guest_hooper" | "external";
  }) {
    if (!board.has(identity.id)) {
      board.set(identity.id, {
        id: identity.id,
        name: identity.name,
        type: identity.type,
        wins: 0,
        losses: 0,
        draws: 0,
        matches: 0,
        points: 0,
        pointsAllowed: 0,
      });
    }

    return board.get(identity.id)!;
  }

  rows.forEach((row) => {
    if (getMatchStatus(row) !== "Completed") return;

    const player1Score = getPlayer1Score(row);
    const player2Score = getPlayer2Score(row);

    if (player1Score === null || player2Score === null) return;

    const player1 = getPlayer1Identity(row, playerMap, guestMap);
    const player2 = getPlayer2Identity(row, playerMap, guestMap, players, guests);

    const player1Item = ensureItem(player1);
    const player2Item = ensureItem(player2);

    player1Item.matches += 1;
    player1Item.points += player1Score;
    player1Item.pointsAllowed += player2Score;

    player2Item.matches += 1;
    player2Item.points += player2Score;
    player2Item.pointsAllowed += player1Score;

    if (player1Score > player2Score) {
      player1Item.wins += 1;
      player2Item.losses += 1;
    } else if (player2Score > player1Score) {
      player2Item.wins += 1;
      player1Item.losses += 1;
    } else {
      player1Item.draws += 1;
      player2Item.draws += 1;
    }
  });

  return Array.from(board.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.points !== a.points) return b.points - a.points;
    if (a.pointsAllowed !== b.pointsAllowed) {
      return a.pointsAllowed - b.pointsAllowed;
    }
    return b.matches - a.matches;
  });
}

export default async function OneOnOnePage() {
  const { rows, players, guests, playerMap, guestMap } = await getData();

  const leaderboard = buildLeaderboard(
    rows,
    playerMap,
    guestMap,
    players,
    guests
  );

  const upcomingRows = rows.filter((row) => getMatchStatus(row) === "Upcoming");
  const completedRows = rows.filter(
    (row) => getMatchStatus(row) === "Completed"
  );

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.9)), url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Hoops
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                1-on-1 Battles
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Court battles, fixtures, results, scores, posters, videos, and
                matchup history.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Home
              </Link>

              <Link
                href="/games"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Games
              </Link>

              <Link
                href="/players"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Players
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <StatCard label="Total Battles" value={rows.length} />
            <StatCard label="Completed" value={completedRows.length} />
            <StatCard label="Upcoming" value={upcomingRows.length} />
            <StatCard label="Ranked Hoopers" value={leaderboard.length} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LeaderboardCard
          eyebrow="1-on-1 Wins"
          title="Leaderboard"
          emptyText="No completed 1-on-1 results yet."
          items={leaderboard}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Fight Card" title="Upcoming 1-on-1 Battles" />

        {upcomingRows.length > 0 ? (
          <CardGrid
            rows={upcomingRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No upcoming 1-on-1 battles added yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Results" title="Previous 1-on-1 Results" />

        {completedRows.length > 0 ? (
          <CardGrid
            rows={completedRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No completed 1-on-1 results yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Full Log" title="All 1-on-1 Battles" />

        {rows.length > 0 ? (
          <CardGrid
            rows={rows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No 1-on-1 battles found yet." />
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="text-2xl font-black">{title}</h2>
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

function CardGrid({
  rows,
  players,
  guests,
  playerMap,
  guestMap,
}: {
  rows: OneOnOneRow[];
  players: Player[];
  guests: GuestHooper[];
  playerMap: Map<string, Player>;
  guestMap: Map<string, GuestHooper>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <BattleCard
          key={row.id}
          row={row}
          players={players}
          guests={guests}
          playerMap={playerMap}
          guestMap={guestMap}
        />
      ))}
    </div>
  );
}

function LeaderboardCard({
  eyebrow,
  title,
  emptyText,
  items,
}: {
  eyebrow: string;
  title: string;
  emptyText: string;
  items: LeaderboardItem[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-4 backdrop-blur-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
          {eyebrow}
        </p>

        <h2 className="text-2xl font-black">{title}</h2>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/50 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-black">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {item.name}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {item.matches} battles • {item.points} pts •{" "}
                    {item.pointsAllowed} allowed
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-black text-white">{item.wins}</p>

                <p className="text-[11px] font-bold uppercase text-zinc-500">
                  wins
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-black/40 p-4 text-sm text-zinc-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

function BattleCard({
  row,
  players,
  guests,
  playerMap,
  guestMap,
}: {
  row: OneOnOneRow;
  players: Player[];
  guests: GuestHooper[];
  playerMap: Map<string, Player>;
  guestMap: Map<string, GuestHooper>;
}) {
  const player1 = getPlayer1Identity(row, playerMap, guestMap);
  const player2 = getPlayer2Identity(row, playerMap, guestMap, players, guests);

  const player1Score = getPlayer1Score(row);
  const player2Score = getPlayer2Score(row);

  const status = getMatchStatus(row);
  const resultLabel = getResultLabel(row);
  const winnerName = getWinnerName(row, player1.name, player2.name);

  const winnerSide = getWinnerSide(row);

  return (
    <Link
      href={`/one-on-one/${row.id}`}
      className="block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50"
    >
      {row.poster_url ? (
        <div className="h-56 w-full overflow-hidden bg-zinc-900">
          <img
            src={row.poster_url}
            alt={`${player1.name} vs ${player2.name}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-300">
              {row.match_number ? `#${row.match_number}` : "Battle"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
                row
              )}`}
            >
              {status}
            </span>
          </div>

          <span className="text-xs font-bold text-zinc-500">
            {formatDate(row.match_date || row.created_at)}
          </span>
        </div>

        {row.match_title ? (
          <p className="mb-3 text-sm font-black uppercase tracking-[0.15em] text-orange-200">
            {row.match_title}
          </p>
        ) : null}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">
              {player1.name}
            </p>

            <p
              className={
                winnerSide === "player1"
                  ? "text-3xl font-black text-orange-300"
                  : "text-3xl font-black text-white"
              }
            >
              {player1Score ?? "-"}
            </p>
          </div>

          <div className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-zinc-500">
            vs
          </div>

          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-black text-white">
              {player2.name}
            </p>

            <p
              className={
                winnerSide === "player2"
                  ? "text-3xl font-black text-orange-300"
                  : "text-3xl font-black text-white"
              }
            >
              {player2Score ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
            {row.match_type || "1v1"}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
            {resultLabel}
          </span>

          {status === "Completed" ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              Winner: {winnerName}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="truncate text-xs text-zinc-500">
            {getRowLocation(row)}
          </p>

          <span className="text-xs font-black text-orange-300">
            Open Match
          </span>
        </div>

        {(row.video_url || row.highlight_url) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {row.video_url ? (
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
                Video Added
              </span>
            ) : null}

            {row.highlight_url ? (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                Highlight Added
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}