import Link from "next/link";
import PlayersExplorer from "./PlayersExplorer";
import { loadPublicPlayerDirectory } from "@/lib/hoops/publicPlayerProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const players = await loadPublicPlayerDirectory();
  const resolvedSearchParams = await searchParams;
  const requestedStatus = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;
  const initialClassification = ["official", "guest", "competition"].includes(
    requestedStatus || ""
  )
    ? requestedStatus || "all"
    : "all";
  const officialCount = players.filter(
    (player) => player.classification === "official"
  ).length;
  const guestCount = players.filter(
    (player) => player.classification === "guest"
  ).length;
  const competitionCount = players.filter(
    (player) => player.classification === "competition"
  ).length;
  const documentedGames = players.reduce(
    (total, player) => total + player.gamesPlayed,
    0
  );

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,.76),rgba(2,6,23,.97)),url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/80">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.12fr_.88fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.24em] text-orange-300">
                FACKTS basketball records
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[.92] tracking-[-.045em] sm:text-6xl lg:text-7xl">
                Every player. One verified journey.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Official FACKTS players, guest hoopers and competition players
                now share one searchable directory. Each profile connects the
                person to recorded games, competition statistics, teams,
                achievements and playable media.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/games"
                  className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black transition hover:bg-orange-400"
                >
                  Explore verified games
                </Link>
                <Link
                  href="/player-application"
                  className="rounded-xl border border-white/15 bg-black/35 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-white transition hover:border-orange-400/60"
                >
                  Join the directory
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <HeroStat label="Official players" value={officialCount} />
              <HeroStat label="Guest hoopers" value={guestCount} />
              <HeroStat label="Competition players" value={competitionCount} />
              <HeroStat label="Player-game records" value={documentedGames} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
            Player discovery
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[-.025em] sm:text-4xl">
            Find a hooper
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Filter by FACKTS relationship, verification state, position or
            performance. The labels describe the player&apos;s current relationship;
            their earlier game history remains attached.
          </p>
        </div>

        <PlayersExplorer
          players={players}
          initialClassification={initialClassification}
        />
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur">
      <p className="text-[9px] font-black uppercase tracking-[.15em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
    </div>
  );
}
