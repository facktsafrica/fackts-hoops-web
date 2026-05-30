import Link from "next/link";

export default function PlayerApplicationPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
          >
            Back Home
          </Link>

          <div className="mt-8">
            <div className="mb-4 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Player Application
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Apply to be featured on FACKTS Hoops.
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              This is for players who want visibility, a player profile, game stats, media coverage, highlights, or future exposure opportunities through FACKTS Hoops.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            What to send
          </p>

          <div className="mt-6 grid gap-3">
            <Item text="Full name" />
            <Item text="Age / year of birth" />
            <Item text="Position" />
            <Item text="Current team or school" />
            <Item text="Location" />
            <Item text="Instagram, TikTok, or YouTube link" />
            <Item text="Highlight video link if available" />
            <Item text="What you want from FACKTS Hoops" />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:facktsafrica@gmail.com?subject=FACKTS Hoops Player Application"
              className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
            >
              Apply by Email
            </a>

            <Link
              href="/players"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              View Player Profiles
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Item({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-zinc-300">
      {text}
    </div>
  );
}