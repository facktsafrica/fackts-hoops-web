"use client";

import { useMemo, useState } from "react";

type MerchStatus =
  | "Available"
  | "Pre-order"
  | "Coming Soon"
  | "Made on Order"
  | "Sold Out";

type SourceType = "FACKTS" | "Partner" | "Collaboration";

type MerchItem = {
  id: string;
  name: string;
  category: string;
  publicFilter: string;
  status: MerchStatus;
  sourceType: SourceType;
  partnerName?: string;
  description: string;
  priceLabel: string;
  sizes: string[];
  availabilityNote: string;
  featured?: boolean;
  limited?: boolean;
  imageLabel: string;
};

const WHATSAPP_NUMBER = "254700000000";
const CALL_NUMBER = "+254700000000";
const SMS_NUMBER = "+254700000000";

const filters = [
  "All",
  "Bags",
  "Apparel",
  "Footwear",
  "Basketball Gear",
  "Player Drops",
  "Team Drops",
  "Event Drops",
  "Coming Soon",
];

const merchItems: MerchItem[] = [
  {
    id: "madebykelzz-court-bag",
    name: "Madebykelzz Court Bag",
    category: "Bags",
    publicFilter: "Bags",
    status: "Pre-order",
    sourceType: "Partner",
    partnerName: "Madebykelzz",
    description:
      "Court-ready bag designs for hoopers carrying gear, kicks, fits, and daily essentials.",
    priceLabel: "Ask for price",
    sizes: ["Standard"],
    availabilityNote: "Partner bag designs opening for first orders.",
    featured: true,
    limited: true,
    imageLabel: "Bag Drop",
  },
  {
    id: "fackts-kings-tracksuit",
    name: "FACKTS Kings Tracksuit",
    category: "Tracksuits",
    publicFilter: "Apparel",
    status: "Coming Soon",
    sourceType: "FACKTS",
    description:
      "Official FACKTS tracksuits for players, supporters, and court culture.",
    priceLabel: "Price coming soon",
    sizes: ["S", "M", "L", "XL", "XXL"],
    availabilityNote: "Register interest before the first drop opens.",
    featured: true,
    imageLabel: "Tracksuit",
  },
  {
    id: "court-takeover-event-shorts",
    name: "Court Takeover Event Shorts",
    category: "Event Drops",
    publicFilter: "Event Drops",
    status: "Pre-order",
    sourceType: "FACKTS",
    description:
      "Event-inspired shorts built for FACKTS Court Takeover days, warmups, and street runs.",
    priceLabel: "Ask for price",
    sizes: ["S", "M", "L", "XL", "XXL"],
    availabilityNote: "Pre-orders can be placed before event drop confirmation.",
    featured: true,
    limited: true,
    imageLabel: "Event Drop",
  },
  {
    id: "player-name-design",
    name: "Player Name Design",
    category: "Player Name Designs",
    publicFilter: "Player Drops",
    status: "Made on Order",
    sourceType: "FACKTS",
    description:
      "Custom player-name merch for hoopers building their own identity and fanbase.",
    priceLabel: "Ask for quote",
    sizes: ["Custom"],
    availabilityNote:
      "Made after confirming name, size, design direction, and payment steps.",
    imageLabel: "Player Drop",
  },
  {
    id: "team-name-singlet",
    name: "Team Name Singlet",
    category: "Team Name Designs",
    publicFilter: "Team Drops",
    status: "Made on Order",
    sourceType: "FACKTS",
    description:
      "Team-name singlets for squads, crews, school runs, and court takeover matchups.",
    priceLabel: "Ask for quote",
    sizes: ["S", "M", "L", "XL", "XXL", "Custom"],
    availabilityNote: "Best for teams placing group orders.",
    imageLabel: "Team Drop",
  },
  {
    id: "fackts-arm-bands",
    name: "FACKTS Arm Bands",
    category: "Arm Bands",
    publicFilter: "Basketball Gear",
    status: "Coming Soon",
    sourceType: "FACKTS",
    description:
      "Simple FACKTS arm bands for hoopers, supporters, and matchday identity.",
    priceLabel: "Price coming soon",
    sizes: ["Standard"],
    availabilityNote:
      "Register interest and we will confirm once first pieces are ready.",
    imageLabel: "Gear",
  },
  {
    id: "fackts-socks",
    name: "FACKTS Socks",
    category: "Socks",
    publicFilter: "Apparel",
    status: "Coming Soon",
    sourceType: "FACKTS",
    description:
      "Clean basketball socks for everyday hoopers and branded team looks.",
    priceLabel: "Price coming soon",
    sizes: ["39-42", "43-46"],
    availabilityNote: "First drop will open after designs are confirmed.",
    imageLabel: "Socks",
  },
  {
    id: "custom-basketball-design",
    name: "Custom Basketball Design",
    category: "Basketballs",
    publicFilter: "Basketball Gear",
    status: "Made on Order",
    sourceType: "FACKTS",
    description:
      "Custom basketball design concepts for players, teams, events, and special drops.",
    priceLabel: "Ask for quote",
    sizes: ["Size 7", "Custom"],
    availabilityNote: "Design and production steps confirmed through WhatsApp.",
    imageLabel: "Ball Design",
  },
  {
    id: "fackts-kicks-concept",
    name: "FACKTS Kicks Concept",
    category: "Kicks",
    publicFilter: "Footwear",
    status: "Coming Soon",
    sourceType: "FACKTS",
    description:
      "Future footwear ideas and custom kicks concepts for the FACKTS basketball community.",
    priceLabel: "Price coming soon",
    sizes: ["To be confirmed"],
    availabilityNote: "Interest list open before production direction is locked.",
    imageLabel: "Kicks",
  },
];

function getCtaLabel(status: MerchStatus) {
  if (status === "Available") return "Place Order";
  if (status === "Pre-order") return "Pre-order Now";
  if (status === "Coming Soon") return "Register Interest";
  if (status === "Made on Order") return "Start Custom Order";
  if (status === "Sold Out") return "Ask About Restock";
  return "Contact FACKTS";
}

function getWhatsAppMessage(item: MerchItem) {
  if (item.status === "Available") {
    return `Hi FACKTS, I want to place an order for ${item.name}. Please confirm price, size options, availability, delivery, and payment steps.`;
  }

  if (item.status === "Pre-order") {
    return `Hi FACKTS, I want to pre-order ${item.name}. Please confirm price, available designs, delivery, and payment steps.`;
  }

  if (item.status === "Coming Soon") {
    return `Hi FACKTS, I am interested in ${item.name}. Please notify me when orders open and share the available sizes or designs.`;
  }

  if (item.status === "Made on Order") {
    return `Hi FACKTS, I want to start a custom order for ${item.name}. Please share the design, pricing, size, and payment steps.`;
  }

  if (item.status === "Sold Out") {
    return `Hi FACKTS, I am interested in ${item.name}. Please let me know if there will be a restock.`;
  }

  return `Hi FACKTS, I am interested in ${item.name}. Please share more details.`;
}

function getWhatsAppUrl(item: MerchItem) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    getWhatsAppMessage(item)
  )}`;
}

function getSmsUrl(item: MerchItem) {
  return `sms:${SMS_NUMBER}?body=${encodeURIComponent(getWhatsAppMessage(item))}`;
}

function getStatusClass(status: MerchStatus) {
  if (status === "Available") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-300";
  }

  if (status === "Pre-order") {
    return "border-orange-400/30 bg-orange-500/15 text-orange-300";
  }

  if (status === "Coming Soon") {
    return "border-sky-400/30 bg-sky-500/15 text-sky-300";
  }

  if (status === "Made on Order") {
    return "border-purple-400/30 bg-purple-500/15 text-purple-300";
  }

  return "border-zinc-400/30 bg-zinc-500/15 text-zinc-300";
}

function getSourceLabel(item: MerchItem) {
  if (item.sourceType === "Partner" && item.partnerName) {
    return `Partner Drop by ${item.partnerName}`;
  }

  if (item.sourceType === "Collaboration" && item.partnerName) {
    return `FACKTS x ${item.partnerName}`;
  }

  return "Official FACKTS Drop";
}

export default function MerchPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const visibleItems = useMemo(() => {
    if (activeFilter === "All") return merchItems;

    if (activeFilter === "Coming Soon") {
      return merchItems.filter((item) => item.status === "Coming Soon");
    }

    return merchItems.filter((item) => item.publicFilter === activeFilter);
  }, [activeFilter]);

  const featuredItems = merchItems.filter((item) => item.featured);
  const partnerItems = merchItems.filter((item) => item.sourceType === "Partner");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.26),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.92))]" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8 lg:py-20 xl:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-center xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
            <div className="min-w-0">
              <p className="mb-5 inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.32em] text-orange-300">
                First Orders Open
              </p>

              <h1 className="max-w-4xl text-[4rem] font-black uppercase leading-[0.9] tracking-tight sm:text-[5.5rem] md:text-[7rem] lg:text-[7.5rem] xl:text-[8.5rem]">
                FACKTS
                <span className="block text-orange-400">Merch</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-200 md:text-lg">
                Official FACKTS drops, player-inspired designs, team gear, event
                releases, and partner-powered products for hoopers and culture
                builders.
              </p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Place your first order through WhatsApp. Our team will confirm
                size, availability, delivery, and payment steps before production
                or release.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#drops"
                  className="rounded-full bg-orange-500 px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400"
                >
                  View Drops
                </a>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    "Hi FACKTS, I want to place a merch order. Please share the available drops, prices, sizes, and payment steps."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/15"
                >
                  Order on WhatsApp
                </a>
              </div>
            </div>

            <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <div className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">
                  Partner Bag Drops
                </p>
                <h2 className="mt-4 whitespace-nowrap text-[1.35rem] font-black uppercase leading-tight tracking-tight sm:text-[1.55rem] md:text-[1.7rem] lg:text-[1.6rem] xl:text-[1.75rem]">
                  Madebykelzz
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Bag partner designs for hoopers who move with gear, kicks, and
                  identity.
                </p>
              </div>

              <div className="min-w-0 rounded-[2rem] border border-orange-400/20 bg-orange-500/10 p-6 shadow-2xl backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">
                  Custom Culture
                </p>
                <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-tight md:text-4xl lg:text-3xl xl:text-4xl">
                  Player & Team Drops
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Player-name designs, team-name singlets, event shorts, and
                  custom court identity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="drops" className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-300">
              Featured First
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase md:text-5xl">
              First Drops
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm leading-6 text-zinc-300">
            Manual orders now. Card checkout, M-Pesa checkout, and bank payment
            flows come later.
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featuredItems.map((item) => (
            <MerchCard key={item.id} item={item} featured />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 md:px-8">
        <div className="sticky top-0 z-10 -mx-5 border-y border-white/10 bg-[#050505]/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                  activeFilter === filter
                    ? "border-orange-400 bg-orange-500 text-black"
                    : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-400/50 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase md:text-4xl">
              {activeFilter === "All" ? "All Merch" : activeFilter}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}{" "}
              showing
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <MerchCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-300">
              Partner-Powered Drops
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase md:text-5xl">
              Madebykelzz Bag Partner
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              Madebykelzz powers selected FACKTS bag drops and partner bag
              designs. They are not the whole merch department. They are our bag
              partner while FACKTS continues building official merch, player
              drops, team drops, and event releases.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hi FACKTS, I want to ask about Madebykelzz bag drops. Please share designs, prices, and order steps."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-orange-500 px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400"
              >
                Ask About Bags
              </a>

              <a
                href="/partners"
                className="rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/[0.1]"
              >
                View Partners
              </a>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {partnerItems.map((item) => (
              <MerchCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="rounded-[2rem] border border-orange-400/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_32%),rgba(255,255,255,0.04)] p-6 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-300">
                Custom Orders
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase md:text-5xl">
                Player Names. Team Names. Event Drops.
              </h2>
              <p className="mt-5 text-base leading-8 text-zinc-300">
                FACKTS merch is not only about selling clothes. It is about
                giving hoopers, teams, and events an identity. Start with a name,
                team, event, or design idea and we will guide the order process
                through WhatsApp.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h3 className="text-xl font-black uppercase">
                Custom Order Ideas
              </h3>
              <div className="mt-5 grid gap-3 text-sm text-zinc-300">
                <p className="rounded-2xl bg-white/[0.05] p-4">
                  Player-name tees and singlets
                </p>
                <p className="rounded-2xl bg-white/[0.05] p-4">
                  Team-name shorts and warmup gear
                </p>
                <p className="rounded-2xl bg-white/[0.05] p-4">
                  Event drops for Court Takeovers
                </p>
                <p className="rounded-2xl bg-white/[0.05] p-4">
                  Custom basketball design concepts
                </p>
              </div>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hi FACKTS, I want to start a custom merch order for a player, team, or event. Please share the steps."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block rounded-full bg-orange-500 px-6 py-3 text-center text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400"
              >
                Start Custom Order
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-3 md:px-8">
          <ContactCard
            title="WhatsApp Orders"
            text="Best option for first orders, pre-orders, custom orders, and price confirmation."
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              "Hi FACKTS, I want to order merch. Please share available items, prices, sizes, and payment steps."
            )}`}
            label="Open WhatsApp"
          />

          <ContactCard
            title="Call FACKTS"
            text="Call us to ask about sizes, deliveries, group orders, or event drops."
            href={`tel:${CALL_NUMBER}`}
            label="Call Now"
          />

          <ContactCard
            title="SMS Order"
            text="Send a simple SMS with the product name and your preferred size."
            href={`sms:${SMS_NUMBER}?body=${encodeURIComponent(
              "Hi FACKTS, I want to order merch. Please contact me with details."
            )}`}
            label="Send SMS"
          />
        </div>
      </section>
    </main>
  );
}

function MerchCard({
  item,
  featured = false,
}: {
  item: MerchItem;
  featured?: boolean;
}) {
  return (
    <article
      className={`group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.045] shadow-xl transition hover:-translate-y-1 hover:border-orange-400/40 ${
        featured ? "min-h-full" : ""
      }`}
    >
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.35),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]">
        <div className="absolute inset-0 opacity-35 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.08)_25%,rgba(255,255,255,0.08)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:28px_28px]" />

        <div className="relative text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-300">
            {item.imageLabel}
          </p>
          <p className="mt-3 text-4xl font-black uppercase tracking-tight text-white/90">
            FACKTS
          </p>
        </div>

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusClass(
              item.status
            )}`}
          >
            {item.status}
          </span>

          {item.limited && (
            <span className="rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-300">
              Limited
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
          {item.category}
        </p>

        <h3 className="mt-2 text-2xl font-black uppercase leading-tight">
          {item.name}
        </h3>

        <p className="mt-3 text-sm font-semibold text-zinc-300">
          {getSourceLabel(item)}
        </p>

        <p className="mt-4 text-sm leading-7 text-zinc-400">
          {item.description}
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">Price</span>
            <span className="font-bold text-white">{item.priceLabel}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-zinc-500">Sizes</span>
            <span className="text-right font-bold text-white">
              {item.sizes.join(", ")}
            </span>
          </div>

          <div className="border-t border-white/10 pt-3 text-xs leading-5 text-zinc-400">
            {item.availabilityNote}
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <a
            href={getWhatsAppUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-orange-500 px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400"
          >
            {getCtaLabel(item.status)}
          </a>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${CALL_NUMBER}`}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-zinc-200 transition hover:bg-white/[0.1]"
            >
              Call
            </a>

            <a
              href={getSmsUrl(item)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-zinc-200 transition hover:bg-white/[0.1]"
            >
              SMS
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function ContactCard({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-6">
      <h3 className="text-xl font-black uppercase">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{text}</p>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="mt-5 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-orange-300 transition hover:bg-orange-500 hover:text-black"
      >
        {label}
      </a>
    </div>
  );
}