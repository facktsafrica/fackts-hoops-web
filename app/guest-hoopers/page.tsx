import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type GuestHooper = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  jersey_number?: number | string | null;
  position?: string | null;
  role?: string | null;
  photo_url?: string | null;
  photo_position?: string | null;
  bio?: string | null;
  notes?: string | null;
  style_of_play?: string | null;
  strengths?: string | null;
  created_at?: string | null;
  source?: "guest_hoopers" | "players";
};

function hasValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

function getGuestName(guest: GuestHooper) {
  return guest.full_name || guest.name || guest.nickname || "Guest Hooper";
}

function getInitials(guest: GuestHooper) {
  return getGuestName(guest)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function guestKey(guest: GuestHooper) {
  return String(guest.full_name || guest.name || guest.nickname || guest.id)
    .trim()
    .toLowerCase();
}

async function getGuestHoopers() {
  const [guestResult, playersResult] = await Promise.all([
    supabase
      .from("guest_hoopers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),

    supabase
      .from("players")
      .select("*")
      .ilike("role", "%guest%")
      .order("full_name", { ascending: true }),
  ]);

  if (guestResult.error) {
    console.error("Guest hoopers table error:", guestResult.error.message);
  }

  if (playersResult.error) {
    console.error("Players guest role error:", playersResult.error.message);
  }

  const tableGuests: GuestHooper[] = (guestResult.data ?? []).map((guest: any) => ({
    id: `guest-${guest.id}`,
    full_name: guest.full_name,
    name: guest.full_name,
    nickname: guest.nickname,
    jersey_number: null,
    position: guest.position,
    role: guest.role ?? "Guest Hooper",
    photo_url: guest.photo_url,
    photo_position: guest.photo_position,
    bio: guest.bio,
    notes: guest.notes,
    style_of_play: null,
    strengths: null,
    created_at: guest.created_at,
    source: "guest_hoopers",
  }));

  const playerGuests: GuestHooper[] = (playersResult.data ?? []).map((player: any) => ({
    id: `player-${player.id}`,
    full_name: player.full_name || player.name,
    name: player.name,
    nickname: player.nickname,
    jersey_number: player.jersey_number,
    position: player.position,
    role: "Guest Hooper",
    photo_url: player.photo_url,
    photo_position: player.photo_position,
    bio: player.bio,
    notes: null,
    style_of_play: player.style_of_play,
    strengths: player.strengths,
    created_at: player.created_at,
    source: "players",
  }));

  const uniqueGuests = new Map<string, GuestHooper>();

  for (const guest of [...tableGuests, ...playerGuests]) {
    const key = guestKey(guest);
    const existing = uniqueGuests.get(key);

    if (!existing) {
      uniqueGuests.set(key, guest);
      continue;
    }

    const existingHasPhoto = hasValue(existing.photo_url);
    const newHasPhoto = hasValue(guest.photo_url);

    if (!existingHasPhoto && newHasPhoto) {
      uniqueGuests.set(key, guest);
    }
  }

  return Array.from(uniqueGuests.values()).sort((a, b) =>
    getGuestName(a).localeCompare(getGuestName(b))
  );
}

export default async function GuestHoopersPage() {
  const guestHoopers = await getGuestHoopers();

  const withPhotos = guestHoopers.filter((guest) =>
    hasValue(guest.photo_url)
  ).length;

  const positions = Array.from(
    new Set(
      guestHoopers
        .map((guest) => guest.position)
        .filter((value): value is string => hasValue(value))
    )
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                Court Takeover Portal
              </div>

              <h1 className="mt-5 text-4xl font-black uppercase tracking-tight md:text-6xl">
                Guest Hoopers
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                External hoopers and visiting ballers from the guest hooper
                database plus former/converted players marked as{" "}
                <span className="font-black text-orange-300">Guest Hooper</span>.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/guest-leaderboards"
                  className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                >
                  Guest Leaders
                </Link>

                <Link
                  href="/prospects"
                  className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                >
                  Prospects
                </Link>

                <Link
                  href="/players"
                  className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                >
                  Official Players
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <HeroMiniStat label="Guests" value={String(guestHoopers.length)} />
              <HeroMiniStat label="With Photos" value={String(withPhotos)} />
              <HeroMiniStat label="Positions" value={String(positions.length)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {guestHoopers.length === 0 ? (
          <EmptyBox text="No guest hoopers are live yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {guestHoopers.map((guest) => (
              <GuestCard key={guest.id} guest={guest} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function GuestCard({ guest }: { guest: GuestHooper }) {
  const note = guest.bio || guest.notes || guest.style_of_play || guest.strengths;

  return (
    <Link
      href={`/guest-hoopers/${guest.id}`} className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-orange-400/50">
      <div className="relative overflow-hidden bg-slate-950">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {hasValue(guest.jersey_number) ? (
            <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">
              #{guest.jersey_number}
            </span>
          ) : null}

          <span className="rounded-full border border-orange-400/40 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200 backdrop-blur">
            Guest Hooper
          </span>
        </div>

        {guest.photo_url ? (
          <img
            src={guest.photo_url}
            alt={getGuestName(guest)}
            className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
            style={{ objectPosition: guest.photo_position ?? "center center" }}
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_55%),#020617]">
            <div className="text-center">
              <div className="text-5xl font-black text-orange-500">
                {getInitials(guest) || "GH"}
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                Guest Hooper
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="line-clamp-1 text-xl font-black text-white group-hover:text-orange-300">
          {getGuestName(guest)}
        </h2>

        {hasValue(guest.nickname) ? (
          <p className="mt-1 line-clamp-1 text-sm font-bold text-orange-300">
            â€œ{guest.nickname}â€
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniInfo label="Position" value={guest.position ?? "Not set"} />
          <MiniInfo label="Type" value="Guest" />
        </div>

        <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-400">
          {hasValue(note)
            ? note
            : "External hooper connected to FACKTS games, coverage, or battle moments."}
        </p>
      </div>
    </Link>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 backdrop-blur">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-orange-300">{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 truncate text-xs font-black text-slate-100">
        {value}
      </div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
      {text}
    </div>
  );
}