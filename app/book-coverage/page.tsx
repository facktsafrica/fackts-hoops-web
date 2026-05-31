"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";

type BookingForm = {
  name: string;
  phone: string;
  email: string;
  coverageType: string;
  date: string;
  venue: string;
  details: string;
};

const emptyForm: BookingForm = {
  name: "",
  phone: "",
  email: "",
  coverageType: "Game Coverage",
  date: "",
  venue: "",
  details: "",
};

const coverageOptions = [
  "Game Coverage",
  "Event Coverage",
  "Player Feature",
  "Team Media Day",
  "Court Takeover",
  "1-on-1 Battle Coverage",
  "Full Media Package",
];

function buildWhatsAppMessage(form: BookingForm) {
  return [
    "Hello FACKTS Hoops, I want to book coverage.",
    "",
    `Name / Organization: ${form.name || "Not provided"}`,
    `Phone: ${form.phone || "Not provided"}`,
    `Email: ${form.email || "Not provided"}`,
    `Coverage Type: ${form.coverageType || "Not provided"}`,
    `Date: ${form.date || "Not provided"}`,
    `Venue: ${form.venue || "Not provided"}`,
    "",
    `Details: ${form.details || "Not provided"}`,
  ].join("\n");
}

function buildWhatsAppUrl(form: BookingForm) {
  const text = encodeURIComponent(buildWhatsAppMessage(form));
  return `https://wa.me/${FACKTS_WHATSAPP}?text=${text}`;
}

export default function BookCoveragePage() {
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">(
    "info"
  );

  function updateField<K extends keyof BookingForm>(
    field: K,
    value: BookingForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submitting) return;

    if (!form.name.trim()) {
      setMessageType("error");
      setMessage("Please enter your name or organization.");
      return;
    }

    if (!form.phone.trim() && !form.email.trim()) {
      setMessageType("error");
      setMessage("Please enter either your phone number or email.");
      return;
    }

    if (!form.venue.trim()) {
      setMessageType("error");
      setMessage("Please enter the venue.");
      return;
    }

    setSubmitting(true);
    setMessageType("info");
    setMessage("Submitting your booking request...");

    try {
      const response = await fetch("/api/book-coverage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || "Submission failed.");
      }

      setMessageType("success");
      setMessage(
        "Booking request submitted successfully. FACKTS Hoops will follow up."
      );

      setForm(emptyForm);
    } catch (error: any) {
      setMessageType("error");
      setMessage(
        error?.message ||
          "Submission failed. Please try WhatsApp or call FACKTS Hoops."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getMessageClass() {
    if (messageType === "success") {
      return "mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200";
    }

    if (messageType === "error") {
      return "mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200";
    }

    return "mt-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200";
  }

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
              Fill the form and submit. Your request will go directly to the
              FACKTS Hoops booking sheet. No Gmail redirect needed.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`tel:${FACKTS_PHONE_TEL}`}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                Call Now
              </a>

              <a
                href={buildWhatsAppUrl(form)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/20"
              >
                WhatsApp
              </a>
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              Phone: {FACKTS_PHONE_DISPLAY}
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
            Coverage Request
          </p>

          <h2 className="mt-2 text-2xl font-black">Fill and submit</h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Submit your details here. The request will be saved for FACKTS Hoops
            to follow up.
          </p>

          {message ? <div className={getMessageClass()}>{message}</div> : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Name / Organization
                </div>

                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Example: FACKTS Hoops"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Phone
                </div>

                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="Example: 07..."
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Email
                </div>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="example@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Coverage Type
                </div>

                <select
                  value={form.coverageType}
                  onChange={(event) =>
                    updateField("coverageType", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  {coverageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Date
                </div>

                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Venue
                </div>

                <input
                  value={form.venue}
                  onChange={(event) => updateField("venue", event.target.value)}
                  placeholder="Example: ACK Kahawa Sukari"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-sm font-bold text-zinc-300">
                Details
              </div>

              <textarea
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                rows={5}
                placeholder="Tell us what you need: photos, video, highlights, interviews, stats, full package, etc."
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Booking Request"}
              </button>

              <a
                href={buildWhatsAppUrl(form)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/20"
              >
                WhatsApp
              </a>

              <a
                href={`tel:${FACKTS_PHONE_TEL}`}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Call
              </a>
            </div>
          </form>
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