import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const contactDetails = [
  {
    label: "Phone / WhatsApp",
    value: "+254 711 468 303",
    href: "https://wa.me/254711468303",
    action: "Message",
    icon: "💬",
  },
  {
    label: "Email",
    value: "facktsafrica@gmail.com",
    href: "mailto:facktsafrica@gmail.com",
    action: "Email",
    icon: "✉️",
  },
  {
    label: "Location",
    value: "Krishna Center, 12 Woodvale Grv, Nairobi, 3rd floor, suite E05",
    href: "https://www.google.com/maps/search/?api=1&query=Krishna%20Center%2012%20Woodvale%20Grove%20Nairobi",
    action: "Map",
    icon: "📍",
  },
];

const socialLinks = [
  {
    label: "Instagram",
    handle: "@facktsafrica_nba",
    href: "https://www.instagram.com/facktsafrica_nba?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    icon: "📸",
  },
  {
    label: "TikTok",
    handle: "@facktsafricanba",
    href: "https://www.tiktok.com/@facktsafricanba?is_from_webapp=1&sender_device=pc",
    icon: "🎵",
  },
  {
    label: "YouTube",
    handle: "@facktsNBA",
    href: "https://www.youtube.com/@facktsNBA",
    icon: "▶️",
  },
  {
    label: "Facebook",
    handle: "Fackts Africa",
    href: "https://www.facebook.com/people/Fackts-Africa/61583843182510/#",
    icon: "👥",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/25">
        <div className="absolute left-0 top-0 h-full w-full opacity-[0.035]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>

        <div className="absolute -left-20 top-10 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-12">
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300 md:text-sm">
              FACKTS Hoops
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:mt-3 md:text-6xl">
              Contact FACKTS
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:mt-4 md:text-lg">
              Games, collaborations, player features, sponsorships, and media
              partnerships.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-10">
        <div className="grid gap-3 lg:grid-cols-[1fr,0.9fr] md:gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 md:rounded-3xl md:p-6 md:shadow-xl">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Reach Us
            </div>

            <h2 className="mt-1 text-xl font-black md:mt-2 md:text-3xl">
              Talk to the FACKTS team
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400 md:mt-3">
              Reach out for coverage, player stories, collaborations, events,
              sponsorships, and community basketball projects.
            </p>

            <div className="mt-4 grid gap-2 md:mt-6 md:gap-3">
              {contactDetails.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.label === "Location" ? "_blank" : undefined}
                  rel={item.label === "Location" ? "noreferrer" : undefined}
                  className="group rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-400/40 hover:bg-slate-900 md:p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-lg ring-1 ring-orange-500/20 md:h-11 md:w-11">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.label}
                      </div>

                      <div className="mt-0.5 break-words text-sm font-bold text-white md:text-base">
                        {item.value}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-xl border border-orange-500/30 px-2.5 py-1.5 text-xs font-bold text-orange-300 transition group-hover:bg-orange-500 group-hover:text-slate-950 md:rounded-2xl md:px-3 md:py-2">
                      {item.action}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 md:rounded-3xl md:p-6 md:shadow-xl">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Socials
            </div>

            <h2 className="mt-1 text-xl font-black md:mt-2 md:text-3xl">
              Follow the movement
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400 md:mt-3">
              Game updates, player moments, highlights, court stories, and
              basketball culture.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 md:mt-6 md:gap-3">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-400/40 hover:bg-slate-900 md:p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg ring-1 ring-slate-800">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
                        {item.label}
                      </div>

                      <div className="mt-1 truncate text-sm font-bold text-white">
                        {item.handle}
                      </div>
                    </div>

                    <div className="text-sm font-black text-orange-300">→</div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 md:mt-6 md:p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-orange-300">
                Partnerships
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                FACKTS is open to basketball events, brand collaborations,
                player features, media coverage, sponsorships, and community
                basketball projects.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 md:mt-6 md:rounded-3xl md:p-6 md:shadow-xl">
          <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center md:gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Quick Action
              </div>

              <h2 className="mt-1 text-xl font-black md:mt-2 md:text-2xl">
                Ready to connect?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400 md:mt-2">
                Send a message and the FACKTS team will pick it up.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
              <a
                href="https://wa.me/254711468303"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-orange-500 px-4 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-orange-400 md:py-3"
              >
                WhatsApp
              </a>

              <a
                href="mailto:facktsafrica@gmail.com"
                className="rounded-2xl border border-slate-700 px-4 py-2.5 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-800 md:py-3"
              >
                Email
              </a>

              <Link
                href="/"
                className="rounded-2xl border border-orange-500/40 px-4 py-2.5 text-center text-sm font-bold text-orange-300 transition hover:bg-orange-500/10 md:py-3"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}