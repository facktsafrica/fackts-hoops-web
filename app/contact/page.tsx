import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const contactDetails = [
  {
    label: "Phone / WhatsApp",
    value: "+254 711 468 303",
    href: "https://wa.me/254711468303",
    action: "Message on WhatsApp",
  },
  {
    label: "Email",
    value: "facktsafrica@gmail.com",
    href: "mailto:facktsafrica@gmail.com",
    action: "Send Email",
  },
  {
    label: "Location",
    value: "Krishna Center, 12 Woodvale Grv, Nairobi, 3rd floor, suite E05",
    href: "https://www.google.com/maps/search/?api=1&query=Krishna%20Center%2012%20Woodvale%20Grove%20Nairobi",
    action: "Open Map",
  },
];

const socialLinks = [
  {
    label: "Instagram",
    handle: "@facktsafrica_nba",
    href: "https://www.instagram.com/facktsafrica_nba?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  },
  {
    label: "TikTok",
    handle: "@facktsafricanba",
    href: "https://www.tiktok.com/@facktsafricanba?is_from_webapp=1&sender_device=pc",
  },
  {
    label: "YouTube",
    handle: "@facktsNBA",
    href: "https://www.youtube.com/@facktsNBA",
  },
  {
    label: "Facebook",
    handle: "Fackts Africa",
    href: "https://www.facebook.com/people/Fackts-Africa/61583843182510/#",
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

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300 md:text-sm">
              FACKTS Hoops
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-6xl">
              Contact FACKTS
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-lg">
              For games, collaborations, player features, sponsorships, and media
              partnerships.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 md:p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Reach Us
            </div>

            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              Talk to the FACKTS team
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Reach out for game coverage, basketball content, player stories,
              collaborations, event partnerships, and sponsorship conversations.
            </p>

            <div className="mt-6 space-y-3">
              {contactDetails.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.label === "Location" ? "_blank" : undefined}
                  rel={item.label === "Location" ? "noreferrer" : undefined}
                  className="group block rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:bg-slate-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        {item.label}
                      </div>

                      <div className="mt-1 break-words text-sm font-bold text-white md:text-base">
                        {item.value}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-orange-500/30 px-3 py-2 text-xs font-bold text-orange-300 transition group-hover:bg-orange-500 group-hover:text-slate-950">
                      {item.action}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 md:p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
              Socials
            </div>

            <h2 className="mt-2 text-2xl font-black md:text-3xl">
              Follow the movement
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Follow FACKTS Hoops for game updates, player moments, highlights,
              court stories, and basketball culture.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:bg-slate-900"
                >
                  <div className="text-[10px] uppercase tracking-[0.2em] text-orange-300">
                    {item.label}
                  </div>

                  <div className="mt-2 truncate text-sm font-bold text-white">
                    {item.handle}
                  </div>

                  <div className="mt-3 text-xs font-semibold text-slate-500 transition group-hover:text-orange-300">
                    Open →
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
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

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-orange-300">
                Quick Action
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Ready to connect?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Send a message and the FACKTS team will pick it up.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="https://wa.me/254711468303"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                WhatsApp FACKTS
              </a>

              <a
                href="mailto:facktsafrica@gmail.com"
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Email FACKTS
              </a>

              <Link
                href="/"
                className="rounded-2xl border border-orange-500/40 px-4 py-3 text-sm font-bold text-orange-300 transition hover:bg-orange-500/10"
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