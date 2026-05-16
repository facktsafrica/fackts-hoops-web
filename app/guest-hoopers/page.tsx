import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getGuestHoopers() {
  const { data, error } = await supabase
    .from("guest_hoopers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Guest hoopers error:", error.message);
    return [];
  }

  return data ?? [];
}

export default async function GuestHoopersPage() {
  const guestHoopers = await getGuestHoopers();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-12">
          <Link
            href="/players"
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300 backdrop-blur transition hover:bg-slate-800"
          >
            Back to Players
          </Link>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950">
                Guest Hoopers
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight md:text-6xl">
                Visiting Ballers &{" "}
                <span className="text-orange-400">Community Talent</span>
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-lg md:leading-8">
                Guest hoopers are visiting players, community ballers, and
                special guests who join FACKTS games, 1-on-1 battles, or court
                takeover moments.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <HeroMiniStat label="Guests" value={String(guestHoopers.length)} />
              <HeroMiniStat label="Status" value="Live" />
              <HeroMiniStat label="Type" value="Open" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-10">
        {guestHoopers.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400 md:rounded-3xl md:p-6">
            No guest hoopers are live yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
            {guestHoopers.map((guest: any) => (
              <article
                key={guest.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20 transition hover:border-orange-400/30 md:rounded-[2rem] md:shadow-xl"
              >
                <div className="relative h-36 overflow-hidden bg-slate-950 md:h-48">
                  {guest.photo_url ? (
                    <img
                      src={guest.photo_url}
                      alt={guest.full_name ?? "Guest Hooper"}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: guest.photo_position ?? "center center",
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 to-orange-950/30 text-5xl">
                      🏀
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

                  <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
                    Guest Hooper
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h2 className="truncate text-lg font-black md:text-xl">
                      {guest.full_name ?? "Guest Hooper"}
                    </h2>

                    {guest.nickname ? (
                      <div className="mt-1 truncate text-sm text-orange-300">
                        {guest.nickname}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-3 md:p-5">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniInfo label="Position" value={guest.position ?? "Not set"} />
                    <MiniInfo label="Role" value={guest.role ?? "Guest Hooper"} />
                  </div>

                  {guest.notes || guest.bio ? (
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400 md:text-sm md:leading-6">
                      {guest.notes ?? guest.bio}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500 md:text-sm md:leading-6">
                      No notes added yet.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 backdrop-blur md:p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 md:text-xs">
        {label}
      </div>

      <div className="mt-1 text-xl font-black text-orange-300 md:text-2xl">
        {value}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 md:rounded-2xl md:p-3">
      <div className="text-[9px] uppercase tracking-wide text-slate-500 md:text-[10px]">
        {label}
      </div>

      <div className="mt-0.5 truncate text-xs font-black text-slate-200 md:text-sm">
        {value}
      </div>
    </div>
  );
}