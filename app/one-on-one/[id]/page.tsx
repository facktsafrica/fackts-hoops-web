import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";

type Player = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  position?: string | null;
};

type GuestHooper = {
  id: string;
  source_player_id?: string | null;
  is_active?: boolean | null;
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
  notes?: string | null;
  poster_url?: string | null;
  video_url?: string | null;
  highlight_url?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
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

function getName(person?: Player | GuestHooper | null) {
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

function findByName<T extends Player | GuestHooper>(
  name: string | null | undefined,
  list: T[]
) {
  const target = cleanName(name);
  if (!target) return null;

  return (
    list.find((item) => {
      const names = [item.full_name, item.name, item.nickname].map(cleanName);
      return names.includes(target);
    }) || null
  );
}

function getParticipant(
  row: OneOnOneRow,
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  guestBySourcePlayerId: Map<string, GuestHooper>
) {
  if (row.participant_type === "fackts_player" || row.fackts_player_id) {
    const linkedGuest = row.fackts_player_id
      ? guestBySourcePlayerId.get(String(row.fackts_player_id))
      : null;

    if (linkedGuest && linkedGuest.is_active !== false) {
      return {
        name: getName(linkedGuest),
        type: "Guest Hooper",
      };
    }

    const player = row.fackts_player_id
      ? playerMap.get(String(row.fackts_player_id))
      : null;

    return {
      name: getName(player),
      type: "FACKTS Player",
    };
  }

  if (row.participant_type === "guest_hooper" || row.guest_hooper_id) {
    const guest = row.guest_hooper_id
      ? guestMap.get(String(row.guest_hooper_id))
      : null;

    const promotedPlayer = guest?.source_player_id
      ? playerMap.get(String(guest.source_player_id))
      : null;

    if (promotedPlayer) {
      return {
        name: getName(promotedPlayer),
        type: "FACKTS Player",
      };
    }

    return {
      name: getName(guest),
      type: "Guest Hooper",
    };
  }

  return {
    name: "Unknown Hooper",
    type: "Hooper",
  };
}

function getOpponent(
  row: OneOnOneRow,
  players: Player[],
  guests: GuestHooper[],
  playerMap: Map<string, Player>,
  guestMap: Map<string, GuestHooper>,
  guestBySourcePlayerId: Map<string, GuestHooper>
) {
  if (row.opponent_type === "fackts_player" || row.opponent_player_id) {
    const linkedGuest = row.opponent_player_id
      ? guestBySourcePlayerId.get(String(row.opponent_player_id))
      : null;

    if (linkedGuest && linkedGuest.is_active !== false) {
      return {
        name: getName(linkedGuest),
        type: "Guest Hooper",
      };
    }

    const player = row.opponent_player_id
      ? playerMap.get(String(row.opponent_player_id))
      : null;

    return {
      name: getName(player),
      type: "FACKTS Player",
    };
  }

  if (row.opponent_type === "guest_hooper" || row.opponent_guest_hooper_id) {
    const guest = row.opponent_guest_hooper_id
      ? guestMap.get(String(row.opponent_guest_hooper_id))
      : null;

    const promotedPlayer = guest?.source_player_id
      ? playerMap.get(String(guest.source_player_id))
      : null;

    if (promotedPlayer) {
      return {
        name: getName(promotedPlayer),
        type: "FACKTS Player",
      };
    }

    return {
      name: getName(guest),
      type: "Guest Hooper",
    };
  }

  const matchedPlayer = findByName(row.opponent_name, players);
  if (matchedPlayer) {
    return {
      name: getName(matchedPlayer),
      type: "FACKTS Player",
    };
  }

  const matchedGuest = findByName(row.opponent_name, guests);
  if (matchedGuest) {
    return {
      name: getName(matchedGuest),
      type: "Guest Hooper",
    };
  }

  return {
    name: row.opponent_name || "Opponent",
    type: "External Hooper",
  };
}

function getResult(row: OneOnOneRow) {
  const result = (row.result || "").toLowerCase().trim();

  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  if (result === "draw") return "Draw";
  if (result === "pending") return "Upcoming";

  const scored = numberValue(row.points_scored);
  const allowed = numberValue(row.points_allowed);

  if (scored !== null && allowed !== null) {
    if (scored > allowed) return "Win";
    if (scored < allowed) return "Loss";
    return "Draw";
  }

  return "Upcoming";
}

function getStatusClass(result: string) {
  if (result === "Win") return "bg-emerald-500/15 text-emerald-300";
  if (result === "Loss") return "bg-red-500/15 text-red-300";
  if (result === "Draw") return "bg-zinc-500/15 text-zinc-300";
  return "bg-orange-500/15 text-orange-300";
}

function getVideoUrl(row: OneOnOneRow) {
  return row.video_url || row.highlight_url || "";
}

function getEmbedUrl(videoUrl?: string | null) {
  if (!videoUrl) return "";

  try {
    const url = new URL(videoUrl);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/watch")) {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
      }

      if (url.pathname.startsWith("/embed/")) {
        return videoUrl;
      }
    }

    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://player.vimeo.com/video/${id}` : videoUrl;
    }

    return videoUrl;
  } catch {
    return videoUrl || "";
  }
}

function isDirectVideoUrl(videoUrl?: string | null) {
  const clean = (videoUrl || "").toLowerCase().split("?")[0];

  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg")
  );
}

async function getData(id: string) {
  const supabase = getSupabase();

  const [playersResult, guestsResult, rowResult] = await Promise.all([
    supabase.from("players").select("*").eq("player_type", FACKTS_PLAYER_TYPE),
    supabase.from("guest_hoopers").select("*"),
    supabase.from("guest_one_on_one_stats").select("*").eq("id", id).maybeSingle(),
  ]);

  const players = (playersResult.data || []) as Player[];
  const guests = (guestsResult.data || []) as GuestHooper[];
  const row = rowResult.data as OneOnOneRow | null;

  const playerMap = new Map<string, Player>();
  players.forEach((player) => playerMap.set(String(player.id), player));

  const guestMap = new Map<string, GuestHooper>();
  guests.forEach((guest) => guestMap.set(String(guest.id), guest));

  const guestBySourcePlayerId = new Map<string, GuestHooper>();
  guests.forEach((guest) => {
    if (guest.source_player_id) {
      guestBySourcePlayerId.set(String(guest.source_player_id), guest);
    }
  });

  return {
    row,
    players,
    guests,
    playerMap,
    guestMap,
    guestBySourcePlayerId,
    error: rowResult.error?.message || "",
  };
}

export default async function OneOnOneMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getData(id);

  if (!data.row) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <Link
            href="/one-on-one"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white"
          >
            Back to 1-on-1
          </Link>

          <h1 className="mt-6 text-3xl font-black">Match not found</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            The route is working, but this match ID was not found in Supabase.
          </p>

          <p className="mt-4 break-all rounded-2xl bg-black/40 p-4 text-xs text-zinc-500">
            Requested ID: {id}
          </p>

          {data.error ? (
            <p className="mt-3 rounded-2xl bg-red-500/10 p-4 text-xs text-red-300">
              Supabase error: {data.error}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  const row = data.row;
  const participant = getParticipant(
    row,
    data.playerMap,
    data.guestMap,
    data.guestBySourcePlayerId
  );
  const opponent = getOpponent(
    row,
    data.players,
    data.guests,
    data.playerMap,
    data.guestMap,
    data.guestBySourcePlayerId
  );

  const result = getResult(row);
  const participantScore = numberValue(row.points_scored);
  const opponentScore = numberValue(row.points_allowed);
  const videoUrl = getVideoUrl(row);
  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/one-on-one"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
          >
            Back to 1-on-1
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
              {row.poster_url ? (
                <img
                  src={row.poster_url}
                  alt={`${participant.name} vs ${opponent.name}`}
                  className="h-full max-h-[520px] w-full object-cover"
                />
              ) : (
                <div className="flex h-80 items-center justify-center bg-zinc-900 text-4xl font-black text-zinc-700">
                  FACKTS
                </div>
              )}
            </div>

            <div>
              <div
                className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                  result
                )}`}
              >
                {result}
              </div>

              <h1 className="text-4xl font-black leading-tight sm:text-6xl">
                {participant.name}
                <span className="block text-orange-300">vs</span>
                {opponent.name}
              </h1>

              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-5">
                <div>
                  <p className="truncate text-sm font-black text-white">
                    {participant.name}
                  </p>
                  <p className="text-xs text-zinc-500">{participant.type}</p>
                  <p className="mt-3 text-5xl font-black text-orange-300">
                    {participantScore ?? "-"}
                  </p>
                </div>

                <div className="rounded-full bg-white/5 px-3 py-2 text-xs font-black uppercase text-zinc-500">
                  vs
                </div>

                <div className="text-right">
                  <p className="truncate text-sm font-black text-white">
                    {opponent.name}
                  </p>
                  <p className="text-xs text-zinc-500">{opponent.type}</p>
                  <p className="mt-3 text-5xl font-black text-white">
                    {opponentScore ?? "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoCard label="Date" value={row.match_date || "Date not added"} />
                <InfoCard
                  label="Venue"
                  value={row.venue || row.location || "Location not added"}
                />
              </div>

              {row.notes ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-950 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {row.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            Watch
          </p>
          <h2 className="text-2xl font-black">Game Video</h2>
        </div>

        {videoUrl ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-3">
            {isDirectVideoUrl(videoUrl) ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-video w-full rounded-2xl bg-black"
              />
            ) : (
              <iframe
                src={embedUrl}
                title={`${participant.name} vs ${opponent.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-video w-full rounded-2xl bg-black"
              />
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-400">
            No video has been linked to this 1-on-1 game yet.
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
