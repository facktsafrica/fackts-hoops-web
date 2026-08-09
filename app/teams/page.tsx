import Link from "next/link";
import TeamsExplorer from "./TeamsExplorer";
import { loadTeamDirectory } from "@/lib/hoops/teamProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage() {
  const teams = await loadTeamDirectory();
  const verified = teams.filter(
    (team) => team.profile.verification_status === "verified"
  ).length;
  const players = teams.reduce((sum, team) => sum + team.rosterCount, 0);
  const games = teams.reduce((sum, team) => sum + team.gameCount, 0);

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,.78),rgba(2,6,23,.97)),url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/85">
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:items-end lg:px-8 lg:pb-24">
          <div>
            <div className="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-orange-300">
              Permanent basketball identities
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] sm:text-6xl lg:text-7xl">
              Every team deserves a <span className="text-orange-400">proper record.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Discover permanent team and organization profiles with connected rosters, verified results, statistics, event history, training and playable media. Tournament-only participants remain inside their Event Hub.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#team-directory" className="rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-black transition hover:bg-orange-400">
                Browse teams
              </a>
              <Link href="/events" className="rounded-xl border border-white/15 bg-white/[.04] px-6 py-3 text-[10px] font-black uppercase tracking-[.14em] text-white transition hover:border-orange-400/60">
                Event participants
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            <HeroStat value={String(teams.length)} label="Permanent teams" />
            <HeroStat value={String(verified)} label="Verified profiles" accent="green" />
            <HeroStat value={String(players)} label="Rostered players" accent="blue" />
            <HeroStat value={String(games)} label="Connected games" />
          </div>
        </div>
      </section>

      <TeamsExplorer teams={teams} />

      <section className="border-t border-white/10 bg-[#07162b]/95">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
              For clubs, schools and corporate teams
            </p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black uppercase leading-tight sm:text-4xl">
              Give your team a permanent home beyond one tournament.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              FACKTS can build a verified team space for organizations such as ABSA, including players, results, team statistics, training coverage and media.
            </p>
          </div>
          <Link href="/book-coverage" className="rounded-xl bg-orange-500 px-6 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-black hover:bg-orange-400">
            Book team coverage
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ value, label, accent = "orange" }: { value: string; label: string; accent?: "orange" | "green" | "blue" }) {
  const colors = { orange: "text-orange-300", green: "text-emerald-300", blue: "text-blue-300" };
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur sm:p-5">
      <p className={`text-3xl font-black sm:text-4xl ${colors[accent]}`}>{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-zinc-500 sm:text-[9px]">{label}</p>
    </div>
  );
}
