"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
<<<<<<< HEAD
=======
import { supabase } from "@/lib/supabase";
>>>>>>> 3e77a30 (add player application review and approval flow)

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";

type PlayerApplicationForm = {
  fullName: string;
<<<<<<< HEAD
  age: string;
  position: string;
  currentTeam: string;
  location: string;
  phone: string;
  email: string;
  socialLink: string;
  highlightLink: string;
  playerGoal: string;
=======
  nickname: string;
  email: string;
  phone: string;
  ageOrYearOfBirth: string;
  location: string;

  position: string;
  height: string;
  dominantHand: string;
  currentTeamOrSchool: string;
  previousTeams: string;
  highestLevelPlayed: string;
  yearsPlayed: string;

  styleOfPlay: string;
  strengths: string;
  improvementAreas: string;

  socialLink: string;
  highlightLink: string;
  playerGoal: string;

  marketingConsent: boolean;
  guardianAwareness: boolean;
>>>>>>> 3e77a30 (add player application review and approval flow)
};

const emptyForm: PlayerApplicationForm = {
  fullName: "",
<<<<<<< HEAD
  age: "",
  position: "",
  currentTeam: "",
  location: "",
  phone: "",
  email: "",
  socialLink: "",
  highlightLink: "",
  playerGoal: "",
=======
  nickname: "",
  email: "",
  phone: "",
  ageOrYearOfBirth: "",
  location: "",

  position: "",
  height: "",
  dominantHand: "",
  currentTeamOrSchool: "",
  previousTeams: "",
  highestLevelPlayed: "",
  yearsPlayed: "",

  styleOfPlay: "",
  strengths: "",
  improvementAreas: "",

  socialLink: "",
  highlightLink: "",
  playerGoal: "",

  marketingConsent: false,
  guardianAwareness: false,
>>>>>>> 3e77a30 (add player application review and approval flow)
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

<<<<<<< HEAD
=======
const dominantHands = ["Right", "Left", "Both", "Not Sure"];

const levels = [
  "Beginner",
  "School Level",
  "High School",
  "College / University",
  "Club Level",
  "County League",
  "National League",
  "Semi-Pro",
  "Professional",
  "Not Sure",
];

>>>>>>> 3e77a30 (add player application review and approval flow)
function buildWhatsAppMessage(form: PlayerApplicationForm) {
  return [
    "Hello FACKTS Hoops, I need guidance on player application.",
    "",
    `Full Name: ${form.fullName || "Not provided"}`,
<<<<<<< HEAD
    `Age / Year of Birth: ${form.age || "Not provided"}`,
    `Position: ${form.position || "Not provided"}`,
    `Current Team / School: ${form.currentTeam || "Not provided"}`,
    `Location: ${form.location || "Not provided"}`,
    `Phone: ${form.phone || "Not provided"}`,
    `Email: ${form.email || "Not provided"}`,
=======
    `Nickname: ${form.nickname || "Not provided"}`,
    `Email: ${form.email || "Not provided"}`,
    `Phone: ${form.phone || "Not provided"}`,
    `Age / Year of Birth: ${form.ageOrYearOfBirth || "Not provided"}`,
    `Location: ${form.location || "Not provided"}`,
    `Position: ${form.position || "Not provided"}`,
    `Height: ${form.height || "Not provided"}`,
    `Dominant Hand: ${form.dominantHand || "Not provided"}`,
    `Current Team / School: ${form.currentTeamOrSchool || "Not provided"}`,
    `Previous Teams: ${form.previousTeams || "Not provided"}`,
    `Highest Level Played: ${form.highestLevelPlayed || "Not provided"}`,
    `Years Played: ${form.yearsPlayed || "Not provided"}`,
>>>>>>> 3e77a30 (add player application review and approval flow)
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
<<<<<<< HEAD
      setMessage("Please select or enter your position.");
=======
      setMessage("Please select your position.");
>>>>>>> 3e77a30 (add player application review and approval flow)
      return;
    }

    setSubmitting(true);
    setMessageType("info");
    setMessage("Submitting your player application...");

<<<<<<< HEAD
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
=======
    const payload = {
      full_name: form.fullName.trim(),
      nickname: form.nickname.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      age_or_year_of_birth: form.ageOrYearOfBirth.trim() || null,
      location: form.location.trim() || null,

      position: form.position.trim() || null,
      height: form.height.trim() || null,
      dominant_hand: form.dominantHand.trim() || null,
      current_team_or_school: form.currentTeamOrSchool.trim() || null,
      previous_teams: form.previousTeams.trim() || null,
      highest_level_played: form.highestLevelPlayed.trim() || null,
      years_played: form.yearsPlayed.trim() || null,

      style_of_play: form.styleOfPlay.trim() || null,
      strengths: form.strengths.trim() || null,
      improvement_areas: form.improvementAreas.trim() || null,

      social_link: form.socialLink.trim() || null,
      highlight_link: form.highlightLink.trim() || null,
      player_goal: form.playerGoal.trim() || null,

      marketing_consent: form.marketingConsent,
      guardian_awareness: form.guardianAwareness,

      application_status: "pending",
    };

    const { error } = await supabase
      .from("player_applications")
      .insert(payload);

    if (error) {
      setMessageType("error");
      setMessage(`Submission failed: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setMessageType("success");
    setMessage(
      "Player application submitted successfully. FACKTS Hoops will review and follow up."
    );

    setForm(emptyForm);
    setSubmitting(false);
>>>>>>> 3e77a30 (add player application review and approval flow)
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
          <InfoCard
            title="Player Profile"
            text="Get your basketball identity properly documented."
          />
          <InfoCard
            title="Stats & Visibility"
            text="Build proof through game records, numbers, and performance history."
          />
          <InfoCard
            title="Media Exposure"
            text="Open doors for highlights, stories, interviews, and future opportunities."
          />
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Application Form
          </p>

          <h2 className="mt-2 text-2xl font-black">Fill and submit</h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
<<<<<<< HEAD
            Submit your details here. Your application will be saved for FACKTS
            Hoops to review and follow up.
=======
            Your application will be saved as pending. FACKTS Hoops will review
            before any player profile is made public.
>>>>>>> 3e77a30 (add player application review and approval flow)
          </p>

          {message ? <div className={getMessageClass()}>{message}</div> : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
<<<<<<< HEAD
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
=======
              <TextInput
                label="Full Name"
                value={form.fullName}
                onChange={(value) => updateField("fullName", value)}
                placeholder="Example: Liam Mazaria"
              />

              <TextInput
                label="Nickname"
                value={form.nickname}
                onChange={(value) => updateField("nickname", value)}
                placeholder="Example: The Bucket"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => updateField("email", value)}
                placeholder="example@email.com"
              />

              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(value) => updateField("phone", value)}
                placeholder="Example: 07..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Age / Year of Birth"
                value={form.ageOrYearOfBirth}
                onChange={(value) => updateField("ageOrYearOfBirth", value)}
                placeholder="Example: 18 or 2008"
              />

              <TextInput
                label="Location"
                value={form.location}
                onChange={(value) => updateField("location", value)}
                placeholder="Example: Nairobi"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput
                label="Position"
                value={form.position}
                onChange={(value) => updateField("position", value)}
                options={positions}
                placeholder="Select position"
              />

              <TextInput
                label="Height"
                value={form.height}
                onChange={(value) => updateField("height", value)}
                placeholder="Example: 6'1 or 185cm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput
                label="Dominant Hand"
                value={form.dominantHand}
                onChange={(value) => updateField("dominantHand", value)}
                options={dominantHands}
                placeholder="Select hand"
              />

              <SelectInput
                label="Highest Level Played"
                value={form.highestLevelPlayed}
                onChange={(value) => updateField("highestLevelPlayed", value)}
                options={levels}
                placeholder="Select level"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Current Team / School"
                value={form.currentTeamOrSchool}
                onChange={(value) => updateField("currentTeamOrSchool", value)}
                placeholder="Example: ACK Kahawa Sukari"
              />

              <TextInput
                label="Years Played"
                value={form.yearsPlayed}
                onChange={(value) => updateField("yearsPlayed", value)}
                placeholder="Example: 4 years"
              />
            </div>

            <TextArea
              label="Previous Teams"
              value={form.previousTeams}
              onChange={(value) => updateField("previousTeams", value)}
              placeholder="List previous teams, schools, clubs, or leagues."
              rows={3}
            />

            <TextArea
              label="Style of Play"
              value={form.styleOfPlay}
              onChange={(value) => updateField("styleOfPlay", value)}
              placeholder="Example: Fast guard, strong defender, slasher, shooter, playmaker..."
              rows={3}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <TextArea
                label="Strengths"
                value={form.strengths}
                onChange={(value) => updateField("strengths", value)}
                placeholder="Example: Handles, shooting, finishing, defense, leadership..."
                rows={4}
              />

              <TextArea
                label="Improvement Areas"
                value={form.improvementAreas}
                onChange={(value) => updateField("improvementAreas", value)}
                placeholder="Example: Fitness, left hand, shooting range, decision-making..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Instagram / TikTok / YouTube"
                value={form.socialLink}
                onChange={(value) => updateField("socialLink", value)}
                placeholder="Paste your profile link"
              />

              <TextInput
                label="Highlight Video Link"
                value={form.highlightLink}
                onChange={(value) => updateField("highlightLink", value)}
                placeholder="YouTube, TikTok, Instagram, Google Drive, etc."
              />
            </div>

            <TextArea
              label="What do you want from FACKTS Hoops?"
              value={form.playerGoal}
              onChange={(value) => updateField("playerGoal", value)}
              placeholder="Example: I want a player profile, media feature, stats tracking, exposure, highlights, or representation guidance."
              rows={5}
            />

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/40 p-4">
              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(event) =>
                    updateField("marketingConsent", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-orange-500"
                />
                <span>
                  I agree to receive FACKTS Hoops updates, opportunities, event
                  information, player features, and communication by email or
                  WhatsApp.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.guardianAwareness}
                  onChange={(event) =>
                    updateField("guardianAwareness", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-orange-500"
                />
                <span>
                  If I am under 18, I confirm that my parent or guardian is
                  aware of this application.
                </span>
              </label>
            </div>
>>>>>>> 3e77a30 (add player application review and approval flow)

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

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-zinc-300">{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}