export const revalidate = 60;

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Partner = {
  id: string;
  name: string;
  category?: string | null;
  role?: string | null;
  description?: string | null;
  about?: string | null;
  how_we_work?: string | null;
  support_areas?: string | null;
  products_services?: string | null;
  impact_note?: string | null;
  call_to_action?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  gallery_image_1?: string | null;
  gallery_image_2?: string | null;
  gallery_image_3?: string | null;
  initials?: string | null;
  badge?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | string | null;
  created_at?: string | null;
};

const partnerTypes = [
  {
    title: "Creative Partners",
    text: "Designers, photographers, editors, stylists, videographers, and media creators who help FACKTS look premium.",
  },
  {
    title: "Institutional Partners",
    text: "Companies and organizations that support governance, strategy, training, operations, and long-term structure.",
  },
  {
    title: "Commercial Partners",
    text: "Brands that support events, activations, sponsorship, products, services, and youth-facing campaigns.",
  },
  {
    title: "Community Partners",
    text: "Schools, courts, leagues, coaches, artists, and grassroots groups helping the movement reach more people.",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim() !== "");
}

async function getPartners() {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as Partner[];
}

export default async function PartnersPage() {
  const partners = await getPartners();

  const featuredPartners = partners.filter((partner) => partner.is_featured);
  const otherPartners = partners.filter((partner) => !partner.is_featured);

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.95)), url('/images/HOME%20PAGE%20BACKGROUND.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                FACKTS Partners
              </div>

              <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl">
                The Brands Behind The Movement
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                FACKTS is built through collaboration. This page highlights the
                creatives, institutions, agencies, companies, and community
                partners helping us grow basketball, media, events, talent, and
                youth opportunity.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/partner"
                  className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                >
                  Become A Partner
                </Link>

                <Link
                  href="/events"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
                >
                  View Events
                </Link>

                <Link
                  href="/"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
                >
                  Home
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroStat label="Current Partners" value={partners.length} />
              <HeroStat label="Featured" value={featuredPartners.length} />
              <HeroStat label="Partner Types" value={partnerTypes.length} />
              <HeroStat label="Growth Focus" value="Youth" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Featured Partners" title="Current Partner Network" />

        {partners.length === 0 ? (
          <EmptyBox text="No active partners have been added yet." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...featuredPartners, ...otherPartners].map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Partnership Areas" title="How Partners Fit In" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {partnerTypes.map((type) => (
            <PartnerTypeCard key={type.title} title={type.title} text={type.text} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-orange-500/30 bg-zinc-950/90 shadow-2xl shadow-orange-950/20 backdrop-blur-sm lg:grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505] p-8">
            <div className="text-center">
              <p className="text-7xl font-black text-orange-500">FACKTS</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.35em] text-zinc-500">
                Partnership Engine
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Why Partner With FACKTS
            </p>

            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">
              We Bring Culture, Data, Media, Events And Youth Energy Together.
            </h2>

            <p className="mt-5 text-sm leading-7 text-zinc-400 sm:text-base">
              FACKTS is a growing youth sports and media ecosystem with player
              profiles, match data, event coverage, highlight content, community
              activations, and a strong grassroots audience.
            </p>

            <div className="mt-7">
              <Link
                href="/partner"
                className="inline-flex rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
              >
                Start Partnership Talk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const initials = partner.initials || getInitials(partner.name);
  const image = partner.cover_image_url || partner.logo_url || "";
  const hasExtraDetails =
    hasValue(partner.about) ||
    hasValue(partner.how_we_work) ||
    hasValue(partner.support_areas) ||
    hasValue(partner.products_services);

  return (
    <Link
      href={`/partners/${partner.id}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 shadow-xl shadow-black/20 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-400/60 hover:shadow-orange-950/20"
    >
      <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[radial-gradient(circle,_rgba(249,115,22,0.2),_transparent_58%),#050505]">
        {image ? (
          <img
            src={image}
            alt={partner.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-black/70 text-4xl font-black text-orange-400 shadow-2xl shadow-black/30">
            {initials}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/20" />

        <div className="absolute left-4 top-4">
          <span className="rounded-full border border-orange-500/30 bg-black/70 px-3 py-1 text-[11px] font-black uppercase text-orange-300 backdrop-blur">
            {partner.badge || partner.category || "Partner"}
          </span>
        </div>

        {partner.logo_url ? (
          <div className="absolute bottom-4 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/75 backdrop-blur">
            <img
              src={partner.logo_url}
              alt={`${partner.name} logo`}
              className="h-full w-full object-contain p-2"
            />
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
          {partner.category || "Partner"}
        </p>

        <h2 className="mt-2 text-2xl font-black text-white group-hover:text-orange-200">
          {partner.name}
        </h2>

        {partner.role ? (
          <p className="mt-2 text-sm font-bold leading-6 text-zinc-300">
            {partner.role}
          </p>
        ) : null}

        {partner.description ? (
          <p className="mt-4 text-sm leading-7 text-zinc-500">
            {partner.description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition group-hover:bg-orange-400">
            View Partner
          </span>

          {hasExtraDetails ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
              Full Profile
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PartnerTypeCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
        Partner Type
      </p>

      <h3 className="mt-2 text-xl font-black text-white">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-zinc-500">{text}</p>
    </div>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:border-orange-400/50">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-3xl font-black">{title}</h2>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5 text-sm text-zinc-400 backdrop-blur-sm">
      {text}
    </div>
  );
}