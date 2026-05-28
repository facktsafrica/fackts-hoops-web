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

  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;

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

function getRowDate(row: OneOnOneRow) {
  return row.match_date || row.created_at || "Date not added";
}

function getRowLocation(row: OneOnOneRow) {
  return row.venue || row.location || "Location not added";
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

function getParticipantIdentity(
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
    id: `external-participant-${row.id}`,
    name: "Unknown Hooper",
    type: "external" as const,
  };
}

function getOpponentIdentity(
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
    id: `external-${cleanName(row.opponent_name) || row.id}`,
    name: row.opponent_name || "Opponent",
    type: "external" as const,
  };
}

function getParticipantScore(row: OneOnOneRow) {
  return numberValue(row.points_scored);
}

function getOpponentScore(row: OneOnOneRow) {
  return numberValue(row.points_allowed);
}

function getResult(row: OneOnOneRow) {
  const result = (row.result || "").toLowerCase().trim();

  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  if (result === "draw") return "Draw";
  if (result === "pending") return "Upcoming";

  const participantScore = getParticipantScore(row);
  const opponentScore = getOpponentScore(row);

  if (participantScore !== null && opponentScore !== null) {
    if (participantScore > opponentScore) return "Win";
    if (participantScore < opponentScore) return "Loss";
    return "Draw";
  }

  return "Upcoming";
}

function getMatchStatus(row: OneOnOneRow) {
  return getResult(row) === "Upcoming" ? "Upcoming" : "Completed";
}

function getStatusClass(status: string, result: string) {
  if (status === "Upcoming") return "bg-orange-500/15 text-orange-300";
  if (result === "Win") return "bg-emerald-500/15 text-emerald-300";
  if (result === "Loss") return "bg-red-500/15 text-red-300";
  if (result === "Draw") return "bg-zinc-500/15 text-zinc-300";

  return "bg-emerald-500/15 text-emerald-300";
}

function parseDateForSort(row: OneOnOneRow) {
  const value = row.match_date || row.created_at || "";
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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
  const rows = ((rowsResult.data || []) as OneOnOneRow[]).sort(
    (a, b) => parseDateForSort(b) - parseDateForSort(a)
  );

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
    const result = getResult(row);
    if (result === "Upcoming") return;

    const participantScore = getParticipantScore(row);
    const opponentScore = getOpponentScore(row);

    if (participantScore === null || opponentScore === null) return;

    const participant = getParticipantIdentity(row, playerMap, guestMap);
    const opponent = getOpponentIdentity(
      row,
      playerMap,
      guestMap,
      players,
      guests
    );

    const participantItem = ensureItem(participant);
    const opponentItem = ensureItem(opponent);

    participantItem.matches += 1;
    participantItem.points += participantScore;
    participantItem.pointsAllowed += opponentScore;

    opponentItem.matches += 1;
    opponentItem.points += opponentScore;
    opponentItem.pointsAllowed += participantScore;

    if (participantScore > opponentScore) {
      participantItem.wins += 1;
      opponentItem.losses += 1;
    } else if (opponentScore > participantScore) {
      opponentItem.wins += 1;
      participantItem.losses += 1;
    } else {
      participantItem.draws += 1;
      opponentItem.draws += 1;
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
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.2),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
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
                1-on-1 games, results, points, wins, videos, and matchup history.
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
            <StatCard label="Total 1-on-1 Games" value={rows.length} />
            <StatCard label="Completed Results" value={completedRows.length} />
            <StatCard label="Upcoming Games" value={upcomingRows.length} />
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
        <SectionHeader eyebrow="Fixtures" title="Upcoming 1-on-1 Games" />

        {upcomingRows.length > 0 ? (
          <CardGrid
            rows={upcomingRows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No upcoming 1-on-1 games added yet." />
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
        <SectionHeader eyebrow="Full Log" title="All 1-on-1 Games" />

        {rows.length > 0 ? (
          <CardGrid
            rows={rows}
            players={players}
            guests={guests}
            playerMap={playerMap}
            guestMap={guestMap}
          />
        ) : (
          <EmptyBox text="No 1-on-1 games found yet." />
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
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
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
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
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
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
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
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
                    {item.matches} games • {item.points} pts •{" "}
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
  const participant = getParticipantIdentity(row, playerMap, guestMap);
  const opponent = getOpponentIdentity(row, playerMap, guestMap, players, guests);

  const participantScore = getParticipantScore(row);
  const opponentScore = getOpponentScore(row);

  const result = getResult(row);
  const status = getMatchStatus(row);

  return (
    <Link
      href={`/one-on-one/${row.id}`}
      className="block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-orange-400/50"
    >
      {row.poster_url ? (
        <div className="h-44 w-full overflow-hidden bg-zinc-900">
          <img
            src={row.poster_url}
            alt={`${participant.name} vs ${opponent.name}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${getStatusClass(
              status,
              result
            )}`}
          >
            {status === "Completed" ? result : status}
          </span>

          <span className="text-xs font-bold text-zinc-500">
            {getRowDate(row)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">
              {participant.name}
            </p>

            <p
              className={
                result === "Win"
                  ? "text-3xl font-black text-orange-300"
                  : "text-3xl font-black text-white"
              }
            >
              {participantScore ?? "-"}
            </p>
          </div>

          <div className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-zinc-500">
            vs
          </div>

          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-black text-white">
              {opponent.name}
            </p>

            <p
              className={
                result === "Loss"
                  ? "text-3xl font-black text-orange-300"
                  : "text-3xl font-black text-white"
              }
            >
              {opponentScore ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="truncate text-xs text-zinc-500">
            {getRowLocation(row)}
          </p>

          <span className="text-xs font-black text-orange-300">
            Open Match
          </span>
        </div>
      </div>
    </Link>
  );
}