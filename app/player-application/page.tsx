"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";

type PlayerApplicationForm = {
  fullName: string;
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
};

const emptyForm: PlayerApplicationForm = {
  fullName: "",
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
};

const positionOptions = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
  "Combo Guard",
  "Wing",
  "Big",
  "Any Position",
];

const dominantHandOptions = ["Right", "Left", "Both"];

const highestLevelOptions = [
  "School Basketball",
  "College Basketball",
  "Local League",
  "Club Basketball",
  "County Level",
  "National Level",
  "Pro / Semi-Pro",
  "Street / Community Basketball",
  "Beginner",
];

function isLikelyUnder18(ageOrYearOfBirth: string) {
  const cleanValue = ageOrYearOfBirth.trim();

  if (!cleanValue) return false;

  const numericValue = Number(cleanValue);

  if (Number.isNaN(numericValue)) return false;

  if (numericValue > 1900) {
    const currentYear = new Date().getFullYear();
    return currentYear - numericValue < 18;
  }

  return numericValue < 18;
}

export default function PlayerApplicationPage() {
  const [form, setForm] = useState<PlayerApplicationForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const whatsappMessage = encodeURIComponent(
    "Hello FACKTS Hoops, I have submitted a player application on the website."
  );

  function updateField<K extends keyof PlayerApplicationForm>(
    key: K,
    value: PlayerApplicationForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.fullName.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!form.phone.trim() && !form.email.trim()) {
      setMessage("Please add at least a phone number or email.");
      return;
    }

    if (!form.position.trim()) {
      setMessage("Please select your playing position.");
      return;
    }

    if (isLikelyUnder18(form.ageOrYearOfBirth) && !form.guardianAwareness) {
      setMessage(
        "If you are under 18, please confirm that a parent or guardian is aware."
      );
      return;
    }

    setSubmitting(true);

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

    const { error } = await supabase.from("player_applications").insert(payload);

    if (error) {
      setMessage(`Application failed: ${error.message}`);
      setSubmitting(false);
      return;
    }

    setMessage(
      "Application submitted successfully. FACKTS Hoops will review it before approval."
    );
    setForm(emptyForm);
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl md:p-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
            Application Form
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Apply to Join FACKTS Hoops
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Submit your details below. Your application will be saved for admin
            review. You only become visible publicly after approval.
          </p>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Full Name"
              value={form.fullName}
              onChange={(value) => updateField("fullName", value)}
              placeholder="Example: Liam Mazaria"
              required
            />

            <TextInput
              label="Nickname"
              value={form.nickname}
              onChange={(value) => updateField("nickname", value)}
              placeholder="Example: The Bucket"
            />

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

            <SelectInput
              label="Position"
              value={form.position}
              onChange={(value) => updateField("position", value)}
              options={positionOptions}
              placeholder="Select position"
              required
            />

            <TextInput
              label="Height"
              value={form.height}
              onChange={(value) => updateField("height", value)}
              placeholder="Example: 6'1 or 185cm"
            />

            <SelectInput
              label="Dominant Hand"
              value={form.dominantHand}
              onChange={(value) => updateField("dominantHand", value)}
              options={dominantHandOptions}
              placeholder="Select dominant hand"
            />

            <SelectInput
              label="Highest Level Played"
              value={form.highestLevelPlayed}
              onChange={(value) => updateField("highestLevelPlayed", value)}
              options={highestLevelOptions}
              placeholder="Select level"
            />

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
              placeholder="Example: 3 years"
            />
          </div>

          <TextArea
            label="Previous Teams"
            value={form.previousTeams}
            onChange={(value) => updateField("previousTeams", value)}
            placeholder="List previous teams, schools, clubs, or leagues."
          />

          <TextArea
            label="Style of Play"
            value={form.styleOfPlay}
            onChange={(value) => updateField("styleOfPlay", value)}
            placeholder="Example: Fast guard, shooter, defender, rebounder, playmaker..."
          />

          <TextArea
            label="Strengths"
            value={form.strengths}
            onChange={(value) => updateField("strengths", value)}
            placeholder="Tell us what you are good at."
          />

          <TextArea
            label="Improvement Areas"
            value={form.improvementAreas}
            onChange={(value) => updateField("improvementAreas", value)}
            placeholder="Tell us what you are working to improve."
          />

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
          />

          <div className="grid gap-3">
            <label className="flex gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) =>
                  updateField("marketingConsent", event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-orange-500"
              />
              <span>
                I allow FACKTS Hoops to contact me about basketball
                opportunities, player features, events, and media coverage.
              </span>
            </label>

            <label className="flex gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={form.guardianAwareness}
                onChange={(event) =>
                  updateField("guardianAwareness", event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-orange-500"
              />
              <span>
                If I am under 18, I confirm that a parent or guardian is aware
                that I am applying.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Player Application"}
            </button>

            <a
              href={`https://wa.me/${FACKTS_WHATSAPP}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              WhatsApp FACKTS
            </a>

            <a
              href={`tel:${FACKTS_PHONE_TEL}`}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              Call {FACKTS_PHONE_DISPLAY}
            </a>

            <Link
              href="/players"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:border-orange-400/70 hover:text-orange-300"
            >
              View Players
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </div>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </div>

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">{label}</div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
      />
    </label>
  );
}