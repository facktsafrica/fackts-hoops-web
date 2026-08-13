import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLeaguePortal } from "@/lib/hoops/leagues";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaguePortalPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ division?: string; season?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const portal = await loadLeaguePortal(slug);
  if (!portal) notFound();

  const divisions = portal.divisions;
  const seasons = Array.from(new Set(portal.memberships.map((item) => item.season_label))).sort().reverse();
  const division = query.division && divisions.includes(query.division) ? query.division : divisions[0];
  const season = query.season && seasons.includes(query.season) ? query.season : seasons[0] || "";
  const standings = portal.standings.filter((row) => row.division === division && (!season || row.seasonLabel === season));
  const memberships = portal.memberships.filter((row) => row.division === division && (!season || row.season_label === season));
  const primary = safeColor(portal.league.primary_color, "#0B1F3A");
  const secondary = safeColor(portal.league.secondary_color, "#F58220");
  const themeStyle = {
    "--league-primary": primary,
    "--league-accent": secondary,
    background: `radial-gradient(circle at 8% 18%,${withAlpha(primary, "28")},transparent 30rem),radial-gradient(circle at 94% 42%,${withAlpha(secondary, "16")},transparent 28rem),#030914`,
  } as CSSProperties;
  const accentText = readableText(secondary);

  const href = (nextDivision: string, nextSeason = season) => {
    const parameters = new URLSearchParams({ division: nextDivision });
    if (nextSeason) parameters.set("season", nextSeason);
    return `/leagues/${portal.league.slug}?${parameters.toString()}`;
  };

  return (
    <main className="min-h-screen text-white" style={themeStyle}>
      <section className="relative overflow-hidden border-b border-white/10">
        {portal.league.cover_image_url ? <img src={portal.league.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" /> : null}
        <div className="absolute inset-0" style={{ background: `linear-gradient(105deg,#030914f8 8%,${withAlpha(primary, "dc")} 55%,#030914e8)` }} />
        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Link href="/leagues" className="inline-flex rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-[8px] font-black uppercase tracking-[.1em]">← All leagues</Link>
          <div className="mt-7 flex items-center gap-4">
            {portal.league.logo_url ? (
              <img src={portal.league.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-2xl sm:h-20 sm:w-20" />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-black/20 text-xl font-black sm:h-20 sm:w-20" style={{ color: secondary }}>{portal.league.short_name || portal.league.name.slice(0, 3)}</span>
            )}
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/55">League portal · {portal.league.country}</p>
              <h1 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">{portal.league.name}</h1>
              {portal.league.description ? <p className="mt-3 max-w-2xl text-xs leading-5 text-white/65 sm:text-sm">{portal.league.description}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#07162b]/90">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">
          <p className="text-[8px] font-black uppercase tracking-[.16em] text-zinc-500">Choose division</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {divisions.map((item) => (
              <Link
                key={item}
                href={href(item)}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-[9px] font-black uppercase tracking-[.08em] transition ${item === division ? "shadow-lg" : "border border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/25 hover:text-white"}`}
                style={item === division ? { backgroundColor: secondary, color: accentText } : undefined}
              >
                {item}
              </Link>
            ))}
          </div>
          {seasons.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto">{seasons.map((item) => <Link key={item} href={href(division, item)} className={`shrink-0 rounded-md px-3 py-1.5 text-[8px] font-black uppercase ${item === season ? "bg-white text-slate-950" : "border border-white/10 text-zinc-500"}`}>{item}</Link>)}</div> : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: secondary }}>{season || "Current season"}</p>
            <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">{division}</h2>
          </div>
          <p className="max-w-lg text-xs leading-5 text-zinc-500">Verified basketball records use wins and losses only. Tied final scores remain unpublished until overtime produces a winner.</p>
        </div>

        {memberships.length ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {memberships.map((membership) => {
                const record = standings.find((row) => row.membershipId === membership.id);
                return (
                  <Link key={membership.id} href={`/teams/${membership.team.slug}`} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#07162b]/90 p-3 transition hover:border-[var(--league-accent)]">
                    {membership.team.logo_url ? <img src={membership.team.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-black">{(membership.team.short_name || membership.team.name).slice(0, 2)}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black uppercase">{membership.team.name}</span>
                      <span className="mt-1 block text-[8px] font-black uppercase text-zinc-500">{record?.played || 0} played · {record?.wins || 0}W · {record?.losses || 0}L</span>
                    </span>
                    <span className="text-sm font-black transition group-hover:translate-x-0.5" style={{ color: secondary }}>→</span>
                  </Link>
                );
              })}
            </div>

            <div id="standings" className="mt-7 scroll-mt-24 overflow-x-auto rounded-2xl border border-white/10 bg-[#07162b]/95">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-white/10 bg-black/20 text-[8px] font-black uppercase tracking-[.1em] text-zinc-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Team</th><th className="px-3 py-3">P</th><th className="px-3 py-3">W</th><th className="px-3 py-3">L</th><th className="px-3 py-3">PF</th><th className="px-3 py-3">PA</th><th className="px-3 py-3">+/-</th><th className="px-3 py-3">Win %</th></tr></thead>
                <tbody>{standings.map((row, index) => <tr key={row.membershipId} className="border-b border-white/[.06] text-sm"><td className="px-4 py-3 font-black text-zinc-600">{index + 1}</td><td className="px-4 py-3"><Link href={`/teams/${row.team.slug}`} className="flex items-center gap-2.5">{row.team.logo_url ? <img src={row.team.logo_url} alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-0.5" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[8px] font-black">{(row.team.short_name || row.team.name).slice(0, 2)}</span>}<span className="font-black">{row.team.name}</span></Link></td><td className="px-3 py-3 font-black">{row.played}</td><td className="px-3 py-3 font-black text-emerald-300">{row.wins}</td><td className="px-3 py-3 font-black text-red-300">{row.losses}</td><td className="px-3 py-3">{row.pointsFor}</td><td className="px-3 py-3">{row.pointsAgainst}</td><td className="px-3 py-3 font-black">{row.pointDifference > 0 ? "+" : ""}{row.pointDifference}</td><td className="px-3 py-3 font-black">{row.winPercentage.toFixed(1)}%</td></tr>)}</tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-zinc-500">Click any team to open its public roster, statistics and player leaderboards.</p>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-[#07162b]/55 p-8 text-center">
            <p className="text-lg font-black uppercase">No teams yet</p>
            <p className="mt-2 text-sm text-zinc-500">Teams will appear here after FACKTS assigns them to {division}.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function safeColor(value: string | null | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
}

function withAlpha(color: string, alpha: string) {
  return `${safeColor(color, "#0B1F3A")}${alpha}`;
}

function readableText(color: string) {
  const normalized = safeColor(color, "#F58220").slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 165 ? "#06101f" : "#ffffff";
}
