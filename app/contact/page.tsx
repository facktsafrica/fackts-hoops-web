import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About & Contact | FACKTS Hoops",
  description:
    "Learn how FACKTS Hoops documents basketball through competition, statistics, player records and media, then contact the team or book tournament coverage.",
};

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";
const FACKTS_EMAIL = "facktsafrica@gmail.com";
const FACKTS_LOCATION =
  "Krishna Center, 12 Woodvale Grove, 3rd Floor, Suite E05, Nairobi";

const platformPillars = [
  {
    number: "01",
    title: "Competition",
    text: "Tournament homes, schedules, results, standings and match centres that keep every competition easy to follow.",
  },
  {
    number: "02",
    title: "Statistics",
    text: "Player and team performance records that turn a game into useful basketball intelligence.",
  },
  {
    number: "03",
    title: "Profiles",
    text: "Permanent player and team pages that build identity, history and a credible body of work over time.",
  },
  {
    number: "04",
    title: "Media",
    text: "Full games, highlights, interviews and event stories connected to the people and competitions they belong to.",
  },
];

const enquiryRoutes = [
  {
    eyebrow: "For organizers",
    title: "Bring your tournament into one complete digital home.",
    text: "Tell us your event date, venue, format and coverage needs. We will follow up with the right statistics and media plan.",
    href: "/book-coverage",
    action: "Book Tournament Coverage",
    featured: true,
  },
  {
    eyebrow: "For players & teams",
    title: "Build a record people can actually find and follow.",
    text: "Apply for a player profile, connect your team, or ask about stats, features and media coverage.",
    href: "/player-application",
    action: "Start Player Application",
    featured: false,
  },
  {
    eyebrow: "For brands & partners",
    title: "Support basketball with visible, measurable work.",
    text: "Explore event, media, community and youth basketball partnerships built around real activity and documented reach.",
    href: "/partner",
    action: "Discuss A Partnership",
    featured: false,
  },
];

const socialLinks = [
  {
    label: "Instagram",
    handle: "@facktsafrica_nba",
    href: "https://www.instagram.com/facktsafrica_nba",
  },
  {
    label: "TikTok",
    handle: "@facktsafricanba",
    href: "https://www.tiktok.com/@facktsafricanba",
  },
  {
    label: "YouTube",
    handle: "@facktsNBA",
    href: "https://www.youtube.com/@facktsNBA",
  },
  {
    label: "Facebook",
    handle: "Fackts Africa",
    href: "https://www.facebook.com/facktsafrica",
  },
];

function whatsAppUrl(message: string) {
  return `https://wa.me/${FACKTS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ChannelIcon({ type }: { type: "phone" | "message" | "email" | "map" }) {
  if (type === "phone") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.9Z" />
      </svg>
    );
  }

  if (type === "message") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.8-4.4A8.5 8.5 0 1 1 21 11.5Z" />
      </svg>
    );
  }

  if (type === "email") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="m22 6-10 7L2 6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F4F6F8] text-[#172033]">
      <section className="relative isolate overflow-hidden bg-[#07182E] text-white">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/images/HOME%20PAGE%20BACKGROUND.png')" }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(7,24,46,0.98)_0%,rgba(7,24,46,0.92)_50%,rgba(7,24,46,0.58)_100%)]" />
        <div className="absolute -right-24 top-4 -z-10 h-80 w-80 rounded-full bg-[#F58220]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -z-10 h-48 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-8 lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#F8A65D]">
              About FACKTS Hoops
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Basketball,
              <span className="block text-[#F58220]">documented properly.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              FACKTS Hoops is a basketball competition, data and media platform.
              We help organizers run visible events, give players and teams
              permanent records, and keep the game connected long after the
              final whistle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/book-coverage"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#F58220] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-[#07182E] hover:bg-[#ff9a43]"
              >
                Book Tournament Coverage
                <ArrowIcon />
              </Link>
              <a
                href={whatsAppUrl(
                  "Hello FACKTS Hoops, I would like to discuss basketball coverage or a collaboration."
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-white hover:border-[#F58220] hover:bg-white/15"
              >
                Talk To The Team
                <ArrowIcon />
              </a>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F8A65D]">
                  The platform
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                  One connected basketball record
                </h2>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F58220] text-sm font-black text-[#07182E]">
                FH
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5">
              {platformPillars.map((pillar) => (
                <div key={pillar.title} className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[10px] font-black text-[#F8A65D]">{pillar.number}</p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.05em] text-white">
                    {pillar.title}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E56F0E]">
                What FACKTS does
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[#0B1F3A] sm:text-5xl">
                From one game to a lasting record.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                The platform connects every part of the basketball story. A
                result can lead to a match centre, player performance, team
                record, competition standing and watchable media without
                sending the audience to five different places.
              </p>
              <Link
                href="/competitions"
                className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[#0B1F3A] hover:text-[#E56F0E]"
              >
                Explore competitions
                <ArrowIcon />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {platformPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-[1.5rem] border border-slate-200 bg-[#F8FAFC] p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[11px] font-black text-[#E56F0E]">{pillar.number}</p>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F58220]" />
                  </div>
                  <h3 className="mt-8 text-xl font-black uppercase tracking-[-0.02em] text-[#0B1F3A]">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E56F0E]">
            Start in the right place
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[#0B1F3A] sm:text-5xl">
            What do you want to build with FACKTS?
          </h2>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {enquiryRoutes.map((route) => (
            <article
              key={route.eyebrow}
              className={`flex min-h-[330px] flex-col rounded-[1.75rem] border p-6 sm:p-7 ${
                route.featured
                  ? "border-[#F58220] bg-[#0B1F3A] text-white shadow-xl shadow-slate-900/15"
                  : "border-slate-200 bg-white text-[#172033] shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  route.featured ? "text-[#F8A65D]" : "text-[#E56F0E]"
                }`}
              >
                {route.eyebrow}
              </p>
              <h3 className="mt-5 text-2xl font-black uppercase leading-tight tracking-[-0.03em]">
                {route.title}
              </h3>
              <p className={`mt-4 text-sm leading-6 ${route.featured ? "text-slate-300" : "text-slate-600"}`}>
                {route.text}
              </p>
              <Link
                href={route.href}
                className={`mt-auto flex min-h-12 items-center justify-between gap-3 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] ${
                  route.featured
                    ? "bg-[#F58220] text-[#07182E] hover:bg-[#ff9a43]"
                    : "border border-slate-200 bg-[#F4F6F8] text-[#0B1F3A] hover:border-[#F58220]"
                }`}
              >
                {route.action}
                <ArrowIcon />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0B1F3A] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F8A65D]">
                Official contact channels
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">
                Reach the FACKTS team.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                For tournament coverage, use the booking form so we receive the
                full event brief. For a quick question, call, WhatsApp or email
                through the official channels below.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ContactChannel
                icon="phone"
                label="Call"
                value={FACKTS_PHONE_DISPLAY}
                href={`tel:${FACKTS_PHONE_TEL}`}
              />
              <ContactChannel
                icon="message"
                label="WhatsApp"
                value={FACKTS_PHONE_DISPLAY}
                href={whatsAppUrl("Hello FACKTS Hoops, I would like to connect with the team.")}
                external
              />
              <ContactChannel
                icon="email"
                label="Email"
                value={FACKTS_EMAIL}
                href={`mailto:${FACKTS_EMAIL}`}
              />
              <ContactChannel
                icon="map"
                label="Nairobi office"
                value={FACKTS_LOCATION}
                href="https://www.google.com/maps/search/?api=1&query=Krishna%20Center%2012%20Woodvale%20Grove%20Nairobi"
                external
              />
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Follow FACKTS Hoops
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Games, player stories, highlights and basketball culture.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${social.label}: ${social.handle}`}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-white hover:border-[#F58220] hover:bg-white/10"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactChannel({
  icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: "phone" | "message" | "email" | "map";
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex min-h-36 flex-col rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-5 hover:border-[#F58220]/70 hover:bg-white/[0.09]"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F58220] text-[#07182E]">
          <ChannelIcon type={icon} />
        </span>
        <ArrowIcon className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-[#F8A65D]" />
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F8A65D]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold leading-5 text-white">{value}</p>
    </a>
  );
}
