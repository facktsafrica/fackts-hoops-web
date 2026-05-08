import Link from "next/link";

export default function HomeContactActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <a
        href="https://wa.me/254711468303"
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-slate-950 transition hover:bg-orange-400"
      >
        WhatsApp FACKTS
      </a>

      <a
        href="mailto:facktsafrica@gmail.com"
        className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
      >
        Email FACKTS
      </a>

      <Link
        href="/contact"
        className="rounded-2xl border border-orange-500/40 px-4 py-3 text-orange-300 transition hover:bg-orange-500/10"
      >
        Contact Page
      </Link>

      <a
        href="https://www.instagram.com/facktsafrica_nba?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
      >
        Instagram
      </a>

      <a
        href="https://www.youtube.com/@facktsNBA"
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl border border-slate-700 px-4 py-3 text-slate-200 transition hover:bg-slate-800"
      >
        YouTube
      </a>
    </div>
  );
}