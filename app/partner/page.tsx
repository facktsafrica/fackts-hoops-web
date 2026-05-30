import Link from "next/link";

export default function PartnerPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
          >
            Back Home
          </Link>

          <div className="mt-8 max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Partner With FACKTS Hoops
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Put your brand inside the basketball culture.
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              FACKTS Hoops gives brands, venues, teams, and community partners a direct way to connect with basketball players, fans, creators, and youth culture through games, media, stats, player stories, and court coverage.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <PartnerCard
            title="Brand Visibility"
            text="Get your brand seen through game posters, media stories, player profiles, video coverage, and event content."
          />

          <PartnerCard
            title="Community Access"
            text="Reach basketball players, fans, schools, teams, coaches, parents, and young creators in a real community setting."
          />

          <PartnerCard
            title="Content Value"
            text="Turn games and events into photos, videos, highlights, interviews, stats, and digital moments people can share."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Partnership Options
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Option title="Game Coverage Partner" />
            <Option title="Court Takeover Partner" />
            <Option title="Player Visibility Partner" />
            <Option title="Media / Content Partner" />
            <Option title="Venue Partner" />
            <Option title="Event Sponsor" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/book-coverage"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              Book Coverage
            </Link>

            <a
              href="mailto:facktsafrica@gmail.com?subject=FACKTS Hoops Partnership Inquiry"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              Email Partnership Inquiry
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function PartnerCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function Option({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-300">
      {title}
    </div>
  );
}