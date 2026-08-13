import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { loadLeagueDirectory } from "@/lib/hoops/leagues";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Basketball Leagues | FACKTS Hoops",
  description: "Explore basketball leagues, divisions, teams and verified public standings on FACKTS Hoops.",
};

export default async function LeaguesPage() {
  const leagues = await loadLeagueDirectory();
  const teams = leagues.reduce((sum, item) => sum + item.teamCount, 0);

  return (
    <main className="fackts-public-bg min-h-screen text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/92">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-orange-300">FACKTS League Network</p>
              <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-.035em] sm:text-5xl">Leagues, divisions<br/><span className="text-orange-400">and live standings.</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Choose a league, open its division, then see every registered team and its verified basketball record.</p>
            </div>
            <div className="flex gap-2">
              <HeroMetric value={leagues.length} label="Leagues" />
              <HeroMetric value={teams} label="Teams placed" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300">League directory</p>
            <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">Choose a league</h2>
          </div>
          <Link href="/teams" className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-400 transition hover:text-orange-300">View all teams →</Link>
        </div>

        {leagues.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {leagues.map((item) => <LeagueCard key={item.league.id} item={item} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">No public leagues yet.</div>
        )}
      </section>
    </main>
  );
}

function LeagueCard({ item }: { item: Awaited<ReturnType<typeof loadLeagueDirectory>>[number] }) {
  const { league } = item;
  const primary = safeColor(league.primary_color, "#0B1F3A");
  const secondary = safeColor(league.secondary_color, "#F58220");
  const style = { "--league-primary": primary, "--league-accent": secondary } as CSSProperties;

  return (
    <Link
      href={`/leagues/${league.slug}`}
      style={style}
      className="group relative min-h-28 overflow-hidden rounded-2xl border border-white/10 bg-[#07162b] p-4 transition hover:-translate-y-0.5 hover:border-[var(--league-accent)]"
    >
      {league.cover_image_url ? <img src={league.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.08] transition duration-500 group-hover:opacity-[.14]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07162b] via-[#07162b]/95 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-20 opacity-20" style={{ background: `linear-gradient(90deg,transparent,${primary})` }} />
      <div className="relative flex items-center gap-3">
        {league.logo_url ? (
          <img src={league.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/15 bg-black/25 text-sm font-black" style={{ color: secondary }}>{league.short_name || league.name.slice(0, 3)}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-black uppercase">{league.name}</span>
          <span className="mt-1 block text-[8px] font-black uppercase tracking-[.1em] text-zinc-500">{item.teamCount} team{item.teamCount === 1 ? "" : "s"} · {item.divisions.length} division{item.divisions.length === 1 ? "" : "s"}</span>
        </span>
        <span className="text-lg font-black transition group-hover:translate-x-1" style={{ color: secondary }}>→</span>
      </div>
      <div className="relative mt-3 flex gap-1.5 overflow-hidden">
        {item.divisions.slice(0, 4).map((division) => <span key={division} className="truncate rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[7px] font-black uppercase text-zinc-400">{division}</span>)}
      </div>
    </Link>
  );
}

function safeColor(value: string | null | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
}

function HeroMetric({ value, label }: { value: number; label: string }) {
  return <div className="min-w-24 rounded-xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-2xl font-black text-orange-300">{value}</p><p className="mt-1 text-[7px] font-black uppercase tracking-[.1em] text-zinc-500">{label}</p></div>;
}
