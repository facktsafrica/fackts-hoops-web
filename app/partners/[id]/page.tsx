export const revalidate = 60;

import Link from "next/link";
import { notFound } from "next/navigation";
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
};

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

async function getPartner(id: string) {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Partner;
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getPartner(id);

  if (!partner || partner.is_active === false) {
    notFound();
  }

  const initials = partner.initials || getInitials(partner.name);
  const heroImage = partner.cover_image_url || partner.logo_url || "";
  const galleryImages = [
    partner.gallery_image_1,
    partner.gallery_image_2,
    partner.gallery_image_3,
  ].filter(Boolean) as string[];

  return (
    <main
      className="min-h-screen bg-black bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.96)), url('/images/HOME%20PAGE%20BACKGROUND.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 md:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30">
            {heroImage ? (
              <img
                src={heroImage}
                alt={partner.name}
                className="h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.25),_transparent_55%),#050505]">
                <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/10 bg-black/70 text-5xl font-black text-orange-400">
                  {initials}
                </div>
              </div>
            )}
          </div>

          <div>
            <Link
              href="/partners"
              className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
            >
              Back To Partners
            </Link>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase text-orange-300">
                {partner.badge || partner.category || "Partner"}
              </span>

              {partner.is_featured ? (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-200">
                  Featured Partner
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight sm:text-6xl">
              {partner.name}
            </h1>

            {partner.role ? (
              <p className="mt-4 text-xl font-black text-orange-300">
                {partner.role}
              </p>
            ) : null}

            {partner.description ? (
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                {partner.description}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {partner.website_url ? (
                <a
                  href={partner.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-orange-500 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400"
                >
                  Website
                </a>
              ) : null}

              {partner.instagram_url ? (
                <a
                  href={partner.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
                >
                  Instagram
                </a>
              ) : null}

              <Link
                href="/partner"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-orange-400/60"
              >
                Partner With FACKTS
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
        <DetailBlock title="About The Partner" value={partner.about} />
        <DetailBlock title="How They Work With FACKTS" value={partner.how_we_work} />
        <DetailBlock title="Support Areas" value={partner.support_areas} />
        <DetailBlock title="Products / Services" value={partner.products_services} />
      </section>

      {partner.impact_note || partner.call_to_action ? (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailBlock title="Impact On The Movement" value={partner.impact_note} />
            <DetailBlock title="Call To Action" value={partner.call_to_action} />
          </div>
        </section>
      ) : null}

      {galleryImages.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Gallery" title="Partner Media" />

          <div className="grid gap-4 md:grid-cols-3">
            {galleryImages.map((image) => (
              <div
                key={image}
                className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 shadow-xl shadow-black/20"
              >
                <img
                  src={image}
                  alt={`${partner.name} gallery`}
                  className="h-72 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function DetailBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!hasValue(value)) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-5 text-sm text-zinc-600">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
          {title}
        </p>
        <p className="mt-3">Not added yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-zinc-950/90 p-5 shadow-xl shadow-black/20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
        {title}
      </p>

      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300">
        {value}
      </p>
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