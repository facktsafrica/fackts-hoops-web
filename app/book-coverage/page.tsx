import Link from "next/link";

export default function BookCoveragePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
          >
            Back Home
          </Link>

          <div className="mt-8 max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Book Coverage
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Book FACKTS Hoops for your game or event.
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              Book coverage for games, tournaments, team sessions, player features, 1-on-1 battles, media shoots, and court takeover events.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <CoverageCard title="Game Coverage" />
          <CoverageCard title="Event Coverage" />
          <CoverageCard title="Player Feature" />
          <CoverageCard title="Team Media Day" />
          <CoverageCard title="Court Takeover" />
          <CoverageCard title="1-on-1 Battle Coverage" />
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Send these details
          </p>

          <div className="mt-5 grid gap-3">
            <Detail text="Name / organization" />
            <Detail text="Type of coverage needed" />
            <Detail text="Date and venue" />
            <Detail text="Number of teams or players" />
            <Detail text="What you want delivered: photos, video, highlights, interviews, stats, or full package" />
            <Detail text="Your phone number or email" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:facktsafrica@gmail.com?subject=Book FACKTS Hoops Coverage"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              Book by Email
            </a>

            <Link
              href="/partner"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CoverageCard({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-5">
      <h2 className="text-xl font-black text-orange-300">{title}</h2>
    </div>
  );
}

function Detail({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-zinc-300">
      {text}
    </div>
  );
}