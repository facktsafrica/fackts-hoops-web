const networkItems = [
  {
    name: "Player Visibility",
    category: "Talent Positioning",
    initials: "PV",
    description:
      "Profiles, performance records, media exposure, and visibility pathways for basketball talent.",
  },
  {
    name: "Performance Records",
    category: "Data & Rankings",
    initials: "PR",
    description:
      "Games, stats, leaderboards, 1-on-1 battles, player history, and court performance tracking.",
  },
  {
    name: "Media & Storytelling",
    category: "Content Engine",
    initials: "MS",
    description:
      "Highlights, interviews, documentaries, game-day coverage, and basketball culture stories.",
  },
  {
    name: "Representation Pathways",
    category: "Agency Direction",
    initials: "RP",
    description:
      "Building structures that help players become visible, marketable, followed, and opportunity-ready.",
  },
  {
    name: "Events & Community",
    category: "Basketball Culture",
    initials: "EC",
    description:
      "Court takeovers, 1-on-1 battles, community games, showcases, and basketball experiences.",
  },
  {
    name: "Brands & Partners",
    category: "Commercial Value",
    initials: "BP",
    description:
      "Sponsorships, venue partnerships, media partners, team collaborations, and brand opportunities.",
  },
];

export default function FacktsNetwork() {
  return (
    <section className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-orange-300">
              FACKTS Network
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Building the agency layer for Kenyan basketball.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
              FACKTS Hoops connects player visibility, performance records,
              media storytelling, events, partnerships, and commercial pathways
              into one basketball platform.
            </p>
          </div>

          <div className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
            Players • Media • Data • Partners
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {networkItems.map((item) => (
            <div
              key={item.name}
              className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-orange-400/40 hover:shadow-orange-950/20"
            >
              <div className="flex items-center gap-4 border-b border-slate-800 bg-slate-950/70 p-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-lg font-black text-orange-300 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_42%)]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/70 to-transparent" />
                  <span className="relative z-10">{item.initials}</span>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-white group-hover:text-orange-300">
                    {item.name}
                  </h3>

                  <div className="mt-1 w-fit rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">
                    {item.category}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-orange-300">
                Partnerships
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                FACKTS is open to player features, team collaborations, event
                partnerships, sponsorships, venue relationships, creator
                partnerships, and basketball projects that grow the game.
              </p>
            </div>

            <a
              href="/contact"
              className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400"
            >
              Partner With FACKTS
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}