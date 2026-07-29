import Link from "next/link";
import {
  getCareerGameTotals,
  mergeCareerGameStats,
  type CareerGameStatRow,
} from "@/lib/hoops/careerStats";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuestHooper = {
  id: string;
  source_player_id?: string | null;
  guest_type?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  bio?: string | null;
  notes?: string | null;
  style_of_play?: string | null;
  strengths?: string | null;
  is_active?: boolean | null;
  profile_source?: "guest_hoopers" | "players";
  linked_guest_ids?: string[];
  linked_player_ids?: string[];
};

type Person = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
};

type Game = {
  id: string;
  game_date?: string | null;
  date?: string | null;
  opponent?: string | null;
  opponent_name?: string | null;
  venue?: string | null;
  location?: string | null;
};

type CareerRow = CareerGameStatRow & {
  plus_minus?: number | string | null;
};

type OneOnOneRow = {
  id: string;
  participant_type?: string | null;
  fackts_player_id?: string | null;
  guest_hooper_id?: string | null;
  participant_name?: string | null;
  opponent_type?: string | null;
  opponent_player_id?: string | null;
  opponent_guest_hooper_id?: string | null;
  opponent_name?: string | null;
  match_title?: string | null;
  match_date?: string | null;
  venue?: string | null;
  location?: string | null;
  status?: string | null;
  result?: string | null;
  points_scored?: number | string | null;
  points_allowed?: number | string | null;
  video_url?: string | null;
  highlight_url?: string | null;
  created_at?: string | null;
};

type ProfileData = {
  guest: GuestHooper;
  careerRows: CareerRow[];
  gamesMap: Record<string, Game>;
  oneOnOneRows: OneOnOneRow[];
  playerMap: Map<string, Person>;
  guestMap: Map<string, Person>;
};

function getName(person?: Person | GuestHooper | null) {
  return (
    person?.full_name ||
    person?.name ||
    person?.nickname ||
    "Unknown Hooper"
  );
}

function cleanName(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGameDate(game?: Game | null) {
  return game?.game_date || game?.date || null;
}

function getGameOpponent(game?: Game | null) {
  return game?.opponent || game?.opponent_name || "Opponent";
}

function getGameLocation(game?: Game | null) {
  return game?.venue || game?.location || "Venue TBA";
}

function belongsToGuest(row: OneOnOneRow, guest: GuestHooper) {
  const guestIds = new Set(
    guest.linked_guest_ids?.length ? guest.linked_guest_ids : [guest.id]
  );
  const playerIds = new Set(
    guest.linked_player_ids?.length
      ? guest.linked_player_ids
      : guest.source_player_id
        ? [guest.source_player_id]
        : []
  );

  return (
    Boolean(row.guest_hooper_id && guestIds.has(row.guest_hooper_id)) ||
    Boolean(
      row.opponent_guest_hooper_id &&
        guestIds.has(row.opponent_guest_hooper_id)
    ) ||
    Boolean(row.fackts_player_id && playerIds.has(row.fackts_player_id)) ||
    Boolean(
      row.opponent_player_id && playerIds.has(row.opponent_player_id)
    )
  );
}

function isParticipant(row: OneOnOneRow, guest: GuestHooper) {
  const guestIds = new Set(
    guest.linked_guest_ids?.length ? guest.linked_guest_ids : [guest.id]
  );
  const playerIds = new Set(
    guest.linked_player_ids?.length
      ? guest.linked_player_ids
      : guest.source_player_id
        ? [guest.source_player_id]
        : []
  );

  return (
    Boolean(row.guest_hooper_id && guestIds.has(row.guest_hooper_id)) ||
    Boolean(row.fackts_player_id && playerIds.has(row.fackts_player_id))
  );
}

function isCompleted(row: OneOnOneRow) {
  const status = String(row.status || "").toLowerCase();
  if (["upcoming", "pending", "scheduled", "cancelled"].includes(status)) {
    return false;
  }

  const scoreOne = nullableNumber(row.points_scored);
  const scoreTwo = nullableNumber(row.points_allowed);
  const result = String(row.result || "").toLowerCase();

  return (
    (scoreOne !== null && scoreTwo !== null) ||
    ["win", "won", "loss", "lost", "draw"].includes(result)
  );
}

function getOneOnOneView(
  row: OneOnOneRow,
  guest: GuestHooper,
  playerMap: Map<string, Person>,
  guestMap: Map<string, Person>
) {
  const guestIsParticipant = isParticipant(row, guest);
  const playerOne =
    (row.fackts_player_id && playerMap.get(row.fackts_player_id)) ||
    (row.guest_hooper_id && guestMap.get(row.guest_hooper_id)) ||
    null;
  const playerTwo =
    (row.opponent_player_id && playerMap.get(row.opponent_player_id)) ||
    (row.opponent_guest_hooper_id &&
      guestMap.get(row.opponent_guest_hooper_id)) ||
    null;

  const opponentName = guestIsParticipant
    ? getName(playerTwo) !== "Unknown Hooper"
      ? getName(playerTwo)
      : row.opponent_name || "Opponent"
    : getName(playerOne) !== "Unknown Hooper"
      ? getName(playerOne)
      : row.participant_name || "Opponent";

  const scoreOne = nullableNumber(row.points_scored);
  const scoreTwo = nullableNumber(row.points_allowed);
  const ownScore = guestIsParticipant ? scoreOne : scoreTwo;
  const opponentScore = guestIsParticipant ? scoreTwo : scoreOne;

  let result = "Upcoming";
  if (isCompleted(row)) {
    if (ownScore !== null && opponentScore !== null) {
      result =
        ownScore > opponentScore
          ? "Win"
          : ownScore < opponentScore
            ? "Loss"
            : "Draw";
    } else {
      const stored = String(row.result || "").toLowerCase();
      const participantWon = stored === "win" || stored === "won";
      const participantLost = stored === "loss" || stored === "lost";

      if (stored === "draw") result = "Draw";
      if (
        (guestIsParticipant && participantWon) ||
        (!guestIsParticipant && participantLost)
      ) {
        result = "Win";
      }
      if (
        (guestIsParticipant && participantLost) ||
        (!guestIsParticipant && participantWon)
      ) {
        result = "Loss";
      }
    }
  }

  return {
    opponentName,
    ownScore,
    opponentScore,
    result,
  };
}

function parseProfileRouteId(value: string) {
  if (value.startsWith("player-")) {
    return { source: "players" as const, id: value.slice("player-".length) };
  }

  if (value.startsWith("guest-")) {
    return {
      source: "guest_hoopers" as const,
      id: value.slice("guest-".length),
    };
  }

  return { source: "guest_hoopers" as const, id: value };
}

async function getProfileData(routeId: string): Promise<ProfileData | null> {
  const route = parseProfileRouteId(routeId);
  const [playersResult, guestsResult] = await Promise.all([
    supabase.from("players").select("*"),
    supabase.from("guest_hoopers").select("*"),
  ]);

  const allPlayers = (playersResult.data || []) as GuestHooper[];
  const allGuests = (guestsResult.data || []) as GuestHooper[];

  let guest: GuestHooper | null = null;

  if (route.source === "players") {
    const player = allPlayers.find(
      (item) => String(item.id) === String(route.id)
    );

    if (!player) return null;

    guest = {
      ...player,
      source_player_id: player.id,
      guest_type: "player_guest",
      role: player.role || "Guest Hooper",
      profile_source: "players",
    };
  } else {
    const tableGuest = allGuests.find(
      (item) => String(item.id) === String(route.id)
    );

    if (!tableGuest || tableGuest.is_active === false) return null;

    guest = {
      ...tableGuest,
      profile_source: "guest_hoopers",
    };
  }

  const profileName = cleanName(getName(guest));
  const linkedGuestIds = new Set<string>();
  const linkedPlayerIds = new Set<string>();

  if (route.source === "guest_hoopers") linkedGuestIds.add(guest.id);
  if (route.source === "players") linkedPlayerIds.add(guest.id);
  if (guest.source_player_id) linkedPlayerIds.add(guest.source_player_id);

  allGuests.forEach((item) => {
    const sameSourcePlayer = Boolean(
      item.source_player_id && linkedPlayerIds.has(item.source_player_id)
    );
    const sameName =
      profileName !== "" && cleanName(getName(item)) === profileName;

    if (sameSourcePlayer || sameName) linkedGuestIds.add(item.id);
  });

  allPlayers.forEach((item) => {
    const sameName =
      profileName !== "" && cleanName(getName(item)) === profileName;
    const markedGuest = String(item.role || "")
      .toLowerCase()
      .includes("guest");

    if (sameName && markedGuest) linkedPlayerIds.add(item.id);
  });

  guest.linked_guest_ids = Array.from(linkedGuestIds);
  guest.linked_player_ids = Array.from(linkedPlayerIds);

  const guestStatsPromise =
    guest.linked_guest_ids.length > 0
      ? supabase
          .from("guest_game_stats")
          .select("*")
          .in("guest_hooper_id", guest.linked_guest_ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const playerStatsPromise =
    guest.linked_player_ids.length > 0
      ? supabase
          .from("player_game_stats")
          .select("*")
          .in("player_id", guest.linked_player_ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const [guestStatsResult, formerPlayerStatsResult, oneOnOneResult] =
    await Promise.all([
      guestStatsPromise,
      playerStatsPromise,
      supabase
        .from("guest_one_on_one_stats")
        .select("*")
        .order("match_date", { ascending: false }),
    ]);

  const careerRows = mergeCareerGameStats(
    (guestStatsResult.data || []) as CareerRow[],
    (formerPlayerStatsResult.data || []) as CareerRow[]
  ) as CareerRow[];

  const gameIds = Array.from(
    new Set(careerRows.map((row) => row.game_id).filter(Boolean))
  ) as string[];

  let gamesMap: Record<string, Game> = {};

  if (gameIds.length > 0) {
    const gamesResult = await supabase.from("games").select("*").in("id", gameIds);
    gamesMap = ((gamesResult.data || []) as Game[]).reduce(
      (lookup, game) => {
        lookup[game.id] = game;
        return lookup;
      },
      {} as Record<string, Game>
    );
  }

  const oneOnOneRows = ((oneOnOneResult.data || []) as OneOnOneRow[]).filter(
    (row) => belongsToGuest(row, guest)
  );

  const playerMap = new Map<string, Person>();
  (allPlayers as Person[]).forEach((player) => {
    playerMap.set(player.id, player);
  });

  const guestMap = new Map<string, Person>();
  (allGuests as Person[]).forEach((person) => {
    guestMap.set(person.id, person);
  });

  return {
    guest,
    careerRows,
    gamesMap,
    oneOnOneRows,
    playerMap,
    guestMap,
  };
}

export default async function GuestHooperProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfileData(id);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/guest-hoopers"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
          >
            Back to Guest Hoopers
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Guest Hooper profile not found.
          </div>
        </div>
      </main>
    );
  }

  const { guest, careerRows, gamesMap, oneOnOneRows, playerMap, guestMap } =
    data;
  const totals = getCareerGameTotals(careerRows);
  const average = (value: number) =>
    totals.gamesPlayed > 0 ? (value / totals.gamesPlayed).toFixed(1) : "0.0";

  const oneOnOneViews = oneOnOneRows.map((row) => ({
    row,
    ...getOneOnOneView(row, guest, playerMap, guestMap),
  }));
  const completedOneOnOne = oneOnOneViews.filter(
    (item) => item.result !== "Upcoming"
  );
  const wins = completedOneOnOne.filter((item) => item.result === "Win").length;
  const losses = completedOneOnOne.filter(
    (item) => item.result === "Loss"
  ).length;
  const draws = completedOneOnOne.filter(
    (item) => item.result === "Draw"
  ).length;
  const role =
    guest.role ||
    (guest.guest_type === "external_player"
      ? "External Player"
      : "Guest Hooper");
  const about =
    guest.bio || guest.notes || guest.style_of_play || guest.strengths || "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        {guest.photo_url ? (
          <div className="absolute inset-0">
            <img
              src={guest.photo_url}
              alt={getName(guest)}
              className="h-full w-full object-cover"
              style={{
                objectPosition: guest.photo_position || "center center",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/85" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-orange-950/40" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/30" />
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-14">
          <Link
            href="/guest-hoopers"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            Back to Guest Hoopers
          </Link>

          <div className="mt-7 grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div className="overflow-hidden rounded-[2rem] border border-orange-500/20 bg-slate-900 shadow-2xl shadow-black/30">
              {guest.photo_url ? (
                <img
                  src={guest.photo_url}
                  alt={getName(guest)}
                  className="h-[390px] w-full object-cover md:h-[520px]"
                  style={{
                    objectPosition: guest.photo_position || "center center",
                  }}
                />
              ) : (
                <div className="flex h-[390px] items-center justify-center bg-slate-900 text-7xl font-black text-orange-300 md:h-[520px]">
                  GH
                </div>
              )}
            </div>

            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-950">
                {role}
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-7xl">
                {getName(guest)}
              </h1>

              <div className="mt-3 text-lg font-bold text-orange-300 md:text-xl">
                {guest.nickname ? `"${guest.nickname}"` : "FACKTS Guest Hooper"}
              </div>

              <div className="mt-4 text-base text-slate-300 md:text-lg">
                {guest.position || "Position TBA"} • {role}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ProfileInfo
                  label="Games"
                  value={String(totals.gamesPlayed)}
                />
                <ProfileInfo
                  label="1v1 Matches"
                  value={String(completedOneOnOne.length)}
                />
                <ProfileInfo label="1v1 Wins" value={String(wins)} />
                <ProfileInfo
                  label="Profile"
                  value={guest.guest_type === "external_player" ? "External" : "Guest"}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SectionHeader eyebrow="Performance" title="Career Summary" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <BigStat label="GP" value={String(totals.gamesPlayed)} />
          <BigStat label="PPG" value={average(totals.points)} />
          <BigStat label="RPG" value={average(totals.rebounds)} />
          <BigStat label="APG" value={average(totals.assists)} />
          <BigStat label="SPG" value={average(totals.steals)} />
          <BigStat label="BPG" value={average(totals.blocks)} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              About
            </div>
            <h2 className="mt-2 text-2xl font-black">Hooper Profile</h2>
            <div className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
              {about || "More profile information will be added soon."}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              1v1 Record
            </div>
            <h2 className="mt-2 text-2xl font-black">
              {wins}W - {losses}L - {draws}D
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SmallStat label="Wins" value={String(wins)} />
              <SmallStat label="Losses" value={String(losses)} />
              <SmallStat label="Draws" value={String(draws)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <SectionHeader eyebrow="Game Log" title="Covered Game Stats" />

        {careerRows.length > 0 ? (
          <div className="space-y-3">
            {careerRows.map((row, index) => {
              const game = row.game_id ? gamesMap[row.game_id] : null;

              return (
                <Link
                  key={row.id || `${row.game_id || "game"}-${index}`}
                  href={game?.id ? `/games/${game.id}` : "/games"}
                  className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-orange-400/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-base font-black text-white md:text-lg">
                        FACKTS vs {getGameOpponent(game)}
                      </div>
                      <div className="mt-1 text-xs text-slate-400 md:text-sm">
                        {formatDate(getGameDate(game))} • {getGameLocation(game)}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <SmallStat label="PTS" value={String(numberValue(row.points))} />
                      <SmallStat
                        label="REB"
                        value={String(numberValue(row.rebounds))}
                      />
                      <SmallStat
                        label="AST"
                        value={String(numberValue(row.assists))}
                      />
                      <SmallStat
                        label="+/-"
                        value={String(numberValue(row.plus_minus))}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyBox text="No covered game stats have been added for this Guest Hooper yet." />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeader eyebrow="Battle Log" title="1v1 Matchups" />

        {oneOnOneViews.length > 0 ? (
          <div className="space-y-3">
            {oneOnOneViews.map((item) => (
              <Link
                key={item.row.id}
                href={`/one-on-one/${item.row.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-orange-400/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-black text-white md:text-lg">
                      {getName(guest)} vs {item.opponentName}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 md:text-sm">
                      {formatDate(item.row.match_date || item.row.created_at)} •{" "}
                      {item.row.venue || item.row.location || "Venue TBA"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-black text-white">
                        {item.ownScore ?? "-"} - {item.opponentScore ?? "-"}
                      </div>
                      <div
                        className={`text-[10px] font-black uppercase tracking-[0.12em] ${
                          item.result === "Win"
                            ? "text-emerald-300"
                            : item.result === "Loss"
                              ? "text-red-300"
                              : item.result === "Draw"
                                ? "text-slate-300"
                                : "text-orange-300"
                        }`}
                      >
                        {item.result}
                      </div>
                    </div>

                    {item.row.video_url || item.row.highlight_url ? (
                      <span className="rounded-full bg-orange-500 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-black">
                        Watch
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyBox text="No 1v1 matchups have been recorded for this Guest Hooper yet." />
        )}
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-2xl font-black md:text-3xl">{title}</h2>
    </div>
  );
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3 backdrop-blur">
      <div className="text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-orange-500/20 bg-slate-900 p-4 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[3.5rem] rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
      <div className="text-[8px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-orange-300">{value}</div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
      {text}
    </div>
  );
}
