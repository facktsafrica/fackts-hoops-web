"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const FACKTS_PHONE_DISPLAY = "+254 700 000 000";
const FACKTS_PHONE_TEL = "+254700000000";
const FACKTS_WHATSAPP = "254700000000";

type PlayerApplicationForm = {
  fullName: string;
  age: string;
  position: string;
  currentTeam: string;
  location: string;
  phone: string;
  email: string;
  socialLink: string;
  highlightLink: string;
  playerGoal: string;
};

const emptyForm: PlayerApplicationForm = {
  fullName: "",
  age: "",
  position: "",
  currentTeam: "",
  location: "",
  phone: "",
  email: "",
  socialLink: "",
  highlightLink: "",
  playerGoal: "",
};

const positions = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Combo Guard",
  "Wing",
  "Forward",
  "Not Sure",
];

function buildWhatsAppMessage(form: PlayerApplicationForm) {
  return [
    "Hello FACKTS Hoops, I need guidance on player application.",
    "",
    `Full Name: ${form.fullName || "Not provided"}`,
    `Age / Year of Birth: ${form.age || "Not provided"}`,
    `Position: ${form.position || "Not provided"}`,
    `Current Team / School: ${form.currentTeam || "Not provided"}`,
    `Location: ${form.location || "Not provided"}`,
    `Phone: ${form.phone || "Not provided"}`,
    `Email: ${form.email || "Not provided"}`,
    `Social Link: ${form.socialLink || "Not provided"}`,
    `Highlight Link: ${form.highlightLink || "Not provided"}`,
    "",
    `What I want from FACKTS Hoops: ${form.playerGoal || "Not provided"}`,
  ].join("\n");
}

function buildWhatsAppUrl(form: PlayerApplicationForm) {
  const text = encodeURIComponent(buildWhatsAppMessage(form));
  return `https://wa.me/${FACKTS_WHATSAPP}?text=${text}`;
}

export default function PlayerApplicationPage() {
  const [form, setForm] = useState<PlayerApplicationForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">(
    "info"
  );

  function updateField<K extends keyof PlayerApplicationForm>(
    field: K,
    value: PlayerApplicationForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submitting) return;

    if (!form.fullName.trim()) {
      setMessageType("error");
      setMessage("Please enter your full name.");
      return;
    }

    if (!form.phone.trim() && !form.email.trim()) {
      setMessageType("error");
      setMessage("Please enter either your phone number or email.");
      return;
    }

    if (!form.position.trim()) {
      setMessageType("error");
      setMessage("Please select or enter your position.");
      return;
    }

    setSubmitting(true);
    setMessageType("info");
    setMessage("Submitting your player application...");

    try {
      const response = await fetch("/api/player-application", {
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
        "Player application submitted successfully. FACKTS Hoops will follow up."
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
              Player Application
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Apply to be featured on FACKTS Hoops.
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              Submit your player information for visibility, profile creation,
              media coverage, highlights, stats tracking, and future exposure
              opportunities.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={buildWhatsAppUrl(form)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
              >
                WhatsApp for Guidance
              </a>

              <a
                href={`tel:${FACKTS_PHONE_TEL}`}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:border-orange-400/60"
              >
                Call FACKTS
              </a>
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              Phone: {FACKTS_PHONE_DISPLAY}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Player Profile" text="Get your basketball identity properly documented." />
          <InfoCard title="Stats & Visibility" text="Build proof through game records, numbers, and performance history." />
          <InfoCard title="Media Exposure" text="Open doors for highlights, stories, interviews, and future opportunities." />
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Application Form
          </p>

          <h2 className="mt-2 text-2xl font-black">Fill and submit</h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Submit your details here. Your application will be saved for FACKTS
            Hoops to review and follow up.
          </p>

          {message ? <div className={getMessageClass()}>{message}</div> : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Full Name
                </div>

                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Example: Liam Mazaria"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Age / Year of Birth
                </div>

                <input
                  value={form.age}
                  onChange={(event) => updateField("age", event.target.value)}
                  placeholder="Example: 18 or 2008"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Position
                </div>

                <select
                  value={form.position}
                  onChange={(event) =>
                    updateField("position", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                >
                  <option value="">Select position</option>
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Current Team / School
                </div>

                <input
                  value={form.currentTeam}
                  onChange={(event) =>
                    updateField("currentTeam", event.target.value)
                  }
                  placeholder="Example: ACK Kahawa Sukari"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-bold text-zinc-300">
                  Location
                </div>

                <input
                  value={form.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder="Example: Nairobi"
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
                  Instagram / TikTok / YouTube
                </div>

                <input
                  value={form.socialLink}
                  onChange={(event) =>
                    updateField("socialLink", event.target.value)
                  }
                  placeholder="Paste your profile link"
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-sm font-bold text-zinc-300">
                Highlight Video Link
              </div>

              <input
                value={form.highlightLink}
                onChange={(event) =>
                  updateField("highlightLink", event.target.value)
                }
                placeholder="YouTube, TikTok, Instagram, Google Drive, etc."
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-bold text-zinc-300">
                What do you want from FACKTS Hoops?
              </div>

              <textarea
                value={form.playerGoal}
                onChange={(event) =>
                  updateField("playerGoal", event.target.value)
                }
                rows={5}
                placeholder="Example: I want a player profile, media feature, stats tracking, exposure, highlights, or representation guidance."
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Player Application"}
              </button>

              <a
                href={buildWhatsAppUrl(form)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-500/20"
              >
                WhatsApp for Guidance
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

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-5">
      <h2 className="text-xl font-black text-orange-300">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}