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
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]/90">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-20">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300">FACKTS League Network</p>
          <h1 className="mt-4 max-w-5xl text-5xl font-black uppercase leading-[.9] tracking-[-.04em] sm:text-7xl lg:text-8xl">Teams belong to leagues.<br/><span className="text-orange-400">Leagues deserve proper tables.</span></h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">Open a league to see its clubs, seasons, divisions and verified wins-and-losses standings. One-off tournaments remain separate Event Hubs.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#league-directory" className="rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black">Browse leagues</a><Link href="/teams" className="rounded-xl border border-white/15 bg-white/[.04] px-6 py-3 text-[10px] font-black uppercase tracking-[.13em]">Browse teams</Link></div>
          <div className="mt-9 grid max-w-lg grid-cols-2 gap-3"><HeroMetric value={leagues.length} label="Public leagues"/><HeroMetric value={teams} label="League team placements"/></div>
        </div>
      </section>

      <section id="league-directory" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">League portals</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Choose the competition structure.</h2></div>
        {leagues.length ? <div className="mt-8 grid gap-5 md:grid-cols-2">{leagues.map((item) => <LeagueCard key={item.league.id} item={item}/>)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-12 text-center text-zinc-500">League records will appear after the production migration is applied.</div>}
      </section>
    </main>
  );
}

function LeagueCard({ item }: { item: Awaited<ReturnType<typeof loadLeagueDirectory>>[number] }) {
  const { league } = item;
  return <article className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/90 transition hover:-translate-y-1 hover:border-orange-400/45"><div className="relative aspect-[16/8] overflow-hidden" style={{ background: `linear-gradient(135deg,${safeColor(league.primary_color, "#0B1F3A")},${safeColor(league.secondary_color, "#F58220")})` }}>{league.cover_image_url ? <img src={league.cover_image_url} alt="" className="h-full w-full object-cover opacity-55 transition duration-700 group-hover:scale-105"/> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent"/><div className="absolute inset-x-5 bottom-5 flex items-end gap-4">{league.logo_url ? <img src={league.logo_url} alt="" className="h-16 w-16 rounded-2xl border border-white/20 bg-white object-contain p-1"/> : <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-black/35 text-xl font-black">{league.short_name || league.name.slice(0,3)}</span>}<div><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/65">{league.country} · {league.status}</p><h2 className="mt-1 text-3xl font-black uppercase leading-none">{league.name}</h2></div></div></div><div className="p-5 sm:p-6"><p className="text-sm leading-6 text-zinc-400">{league.description || "Public league teams, divisions and verified standings."}</p><div className="mt-5 grid grid-cols-3 gap-2"><SmallMetric value={item.teamCount} label="Teams"/><SmallMetric value={item.divisions.length} label="Divisions"/><SmallMetric value={item.seasons.length} label="Seasons"/></div>{item.divisions.length ? <p className="mt-4 text-[9px] font-black uppercase tracking-[.1em] text-zinc-500">{item.divisions.join(" · ")}</p> : null}<Link href={`/leagues/${league.slug}`} className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 text-[10px] font-black uppercase tracking-[.13em] text-black">Open league portal</Link></div></article>;
}

function safeColor(value: string | null | undefined, fallback: string) { return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback; }
function HeroMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl border border-white/10 bg-black/30 p-4"><p className="text-4xl font-black text-orange-300">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.1em] text-zinc-500">{label}</p></div>; }
function SmallMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[7px] font-black uppercase text-zinc-600">{label}</p></div>; }
