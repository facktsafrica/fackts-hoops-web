import Link from "next/link";

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";
const FACKTS_EMAIL = "facktsafrica@gmail.com";

function buildWhatsAppUrl() {
  const message = encodeURIComponent(
    "Hello FACKTS Hoops, I would like to connect with the team."
  );

  return `https://wa.me/${FACKTS_WHATSAPP}?text=${message}`;
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(135deg,_#050505,_#111111_45%,_#020202)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
          >
            Back Home
          </Link>

          <div className="mt-8 max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              FACKTS Hoops
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Contact FACKTS
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              Games, collaborations, player features, sponsorships, media
              partnerships, court coverage, and community basketball projects.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`tel:${FACKTS_PHONE_TEL}`}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                Call Now
              </a>

              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/20"
              >
                WhatsApp
              </a>

              <a
                href={`mailto:${FACKTS_EMAIL}`}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Email
              </a>
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              Phone / WhatsApp: {FACKTS_PHONE_DISPLAY}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Reach Us
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Talk to the FACKTS team
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Reach out for coverage, player stories, collaborations, events,
              sponsorships, team media days, and community basketball projects.
            </p>

            <div className="mt-6 grid gap-3">
              <ContactAction
                title="Call"
                value={FACKTS_PHONE_DISPLAY}
                href={`tel:${FACKTS_PHONE_TEL}`}
                buttonText="Call Now"
              />

              <ContactAction
                title="WhatsApp"
                value={FACKTS_PHONE_DISPLAY}
                href={buildWhatsAppUrl()}
                buttonText="Message"
                external
              />

              <ContactAction
                title="Email"
                value={FACKTS_EMAIL}
                href={`mailto:${FACKTS_EMAIL}`}
                buttonText="Email"
              />

              <ContactAction
                title="Location"
                value="Krishna Center, 12 Woodvale Grove, Nairobi, 3rd floor, suite E05"
                href="https://www.google.com/maps/search/?api=1&query=Krishna%20Center%2012%20Woodvale%20Grove%20Nairobi"
                buttonText="Map"
                external
              />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Socials
              </p>

              <h2 className="mt-2 text-2xl font-black">Follow the movement</h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Game updates, player moments, highlights, court stories, and
                basketball culture.
              </p>

              <div className="mt-6 grid gap-3">
                <SocialLink
                  label="Instagram"
                  value="@facktsafrica_nba"
                  href="https://www.instagram.com/facktsafrica_nba"
                />

                <SocialLink
                  label="TikTok"
                  value="@facktsafricanba"
                  href="https://www.tiktok.com/@facktsafricanba"
                />

                <SocialLink
                  label="YouTube"
                  value="@facktsNBA"
                  href="https://www.youtube.com/@facktsNBA"
                />

                <SocialLink
                  label="Facebook"
                  value="Fackts Africa"
                  href="https://www.facebook.com/facktsafrica"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Partnerships
              </p>

              <h2 className="mt-2 text-2xl font-black">Ready to connect?</h2>

              <p className="mt-3 text-sm leading-6 text-zinc-300">
                FACKTS is open to basketball events, brand collaborations,
                player features, media coverage, sponsorships, and community
                basketball projects.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/book-coverage"
                  className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                >
                  Book Coverage
                </Link>

                <Link
                  href="/partner"
                  className="rounded-full border border-orange-500/40 bg-black/20 px-5 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20"
                >
                  Partner With Us
                </Link>

                <Link
                  href="/player-application"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
                >
                  Player Application
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactAction({
  title,
  value,
  href,
  buttonText,
  external,
}: {
  title: string;
  value: string;
  href: string;
  buttonText: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            {title}
          </div>

          <div className="mt-1 text-sm font-bold text-zinc-200">{value}</div>
        </div>

        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-400"
        >
          {buttonText}
        </a>
      </div>
    </div>
  );
}

function SocialLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-orange-400/60"
    >
      <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold text-zinc-200">{value}</div>
    </a>
  );
}