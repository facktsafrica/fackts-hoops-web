"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";
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

type Notice = {
  tone: "error" | "success";
  text: string;
} | null;

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

const steps = [
  { short: "Profile", title: "Player profile" },
  { short: "Game", title: "Basketball details" },
  { short: "Story", title: "Your player story" },
  { short: "Review", title: "Review & submit" },
];

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
    return new Date().getFullYear() - numericValue < 18;
  }

  return numericValue < 18;
}

function displayValue(value: string, fallback = "Not provided") {
  return value.trim() || fallback;
}

export default function PlayerApplicationPage() {
  const [form, setForm] = useState<PlayerApplicationForm>(emptyForm);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const isUnder18 = useMemo(
    () => isLikelyUnder18(form.ageOrYearOfBirth),
    [form.ageOrYearOfBirth]
  );

  const whatsappMessage = encodeURIComponent(
    "Hello FACKTS Hoops, I need help with the player application."
  );

  function updateField<K extends keyof PlayerApplicationForm>(
    key: K,
    value: PlayerApplicationForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (notice?.tone === "error") setNotice(null);
  }

  function moveToFormTop() {
    window.requestAnimationFrame(() => {
      document
        .getElementById("player-application-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function validateStep(currentStep: number) {
    if (currentStep === 0) {
      if (!form.fullName.trim()) {
        setNotice({ tone: "error", text: "Please enter your full name." });
        return false;
      }

      if (!form.phone.trim() && !form.email.trim()) {
        setNotice({
          tone: "error",
          text: "Please add at least a phone number or email address.",
        });
        return false;
      }
    }

    if (currentStep === 1 && !form.position.trim()) {
      setNotice({
        tone: "error",
        text: "Please select your main playing position.",
      });
      return false;
    }

    if (currentStep === 3 && !form.marketingConsent) {
      setNotice({
        tone: "error",
        text: "Please give application and data consent before submitting.",
      });
      return false;
    }

    if (currentStep === 3 && isUnder18 && !form.guardianAwareness) {
      setNotice({
        tone: "error",
        text: "Please confirm that a parent or guardian has given permission for this application.",
      });
      return false;
    }

    return true;
  }

  function goForward() {
    setNotice(null);
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
    moveToFormTop();
  }

  function goBack() {
    setNotice(null);
    setStep((current) => Math.max(current - 1, 0));
    moveToFormTop();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (step !== steps.length - 1) {
      goForward();
      return;
    }

    if (!validateStep(0) || !validateStep(1) || !validateStep(3)) return;

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
      setNotice({
        tone: "error",
        text: `Application failed: ${error.message}`,
      });
      setSubmitting(false);
      return;
    }

    setForm(emptyForm);
    setStep(0);
    setNotice({
      tone: "success",
      text: "Application received. The FACKTS team will review it before anything is published.",
    });
    setSubmitting(false);
    moveToFormTop();
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_15%,rgba(249,115,22,.18),transparent_32%),radial-gradient(circle_at_86%_70%,rgba(37,99,235,.18),transparent_34%),linear-gradient(135deg,#020617_0%,#071b35_52%,#020617_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:px-8 lg:py-24">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">
              FACKTS Player Network
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Make your game
              <span className="block text-orange-400">visible.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Tell us who you are, how you play and what you want to build. One
              application connects you to FACKTS player profiles, statistics,
              media opportunities and basketball coverage.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Admin reviewed",
                "Private until approved",
                "Built for Kenyan hoopers",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="box-border w-full rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-5 shadow-2xl backdrop-blur sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
              One application
            </p>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              Four focused stages.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your details stay in the FACKTS review system. A public profile is
              only created after approval.
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-blue-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-18">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <form
            id="player-application-form"
            onSubmit={handleSubmit}
            className="box-border min-w-0 scroll-mt-28 rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-7 lg:p-9"
          >
            <div className="min-w-0 border-b border-white/10 pb-6">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                    Stage {step + 1} of {steps.length}
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {steps[step].title}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-xs font-black text-orange-200">
                  {Math.round(((step + 1) / steps.length) * 100)}%
                </span>
              </div>

              <div className="mt-6 grid min-w-0 grid-cols-4 gap-2" aria-label="Application progress">
                {steps.map((item, index) => {
                  const complete = index < step;
                  const current = index === step;

                  return (
                    <div key={item.short} className="min-w-0 text-center">
                      <div
                        aria-current={current ? "step" : undefined}
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition sm:h-10 sm:w-10 ${
                          complete || current
                            ? "border-orange-400 bg-orange-500 text-black"
                            : "border-white/10 bg-slate-950 text-slate-500"
                        }`}
                      >
                        {complete ? "✓" : index + 1}
                      </div>
                      <p
                        className={`mt-2 truncate text-[9px] font-black uppercase tracking-[0.08em] sm:text-[10px] ${
                          current ? "text-white" : "text-slate-500"
                        }`}
                      >
                        {item.short}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {notice ? (
              <div
                role={notice.tone === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`mt-6 box-border w-full rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                  notice.tone === "success"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-orange-400/30 bg-orange-400/10 text-orange-200"
                }`}
              >
                {notice.text}
              </div>
            ) : null}

            <div className="mt-7 min-w-0">
              {step === 0 ? (
                <FormStage
                  eyebrow="01 / Identity"
                  title="Start with the essentials"
                  description="Use the name and contact details FACKTS should use when reviewing your application."
                >
                  <div className="grid min-w-0 gap-5 md:grid-cols-2">
                    <TextInput
                      label="Full name"
                      value={form.fullName}
                      onChange={(value) => updateField("fullName", value)}
                      placeholder="Your official name"
                      autoComplete="name"
                      required
                    />
                    <TextInput
                      label="Basketball nickname"
                      value={form.nickname}
                      onChange={(value) => updateField("nickname", value)}
                      placeholder="Optional"
                    />
                    <TextInput
                      label="Phone number"
                      value={form.phone}
                      onChange={(value) => updateField("phone", value)}
                      placeholder="Example: 0712 345 678"
                      autoComplete="tel"
                      inputMode="tel"
                      helper="A phone number or email is required."
                    />
                    <TextInput
                      label="Email address"
                      type="email"
                      value={form.email}
                      onChange={(value) => updateField("email", value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                    />
                    <TextInput
                      label="Age or year of birth"
                      value={form.ageOrYearOfBirth}
                      onChange={(value) => updateField("ageOrYearOfBirth", value)}
                      placeholder="Example: 18 or 2008"
                      inputMode="numeric"
                      helper="Used only for the correct player and guardian workflow."
                    />
                    <TextInput
                      label="Location"
                      value={form.location}
                      onChange={(value) => updateField("location", value)}
                      placeholder="Town, county or neighbourhood"
                      autoComplete="address-level2"
                    />
                  </div>
                </FormStage>
              ) : null}

              {step === 1 ? (
                <FormStage
                  eyebrow="02 / Basketball"
                  title="Describe your game"
                  description="Give the review team a clear snapshot of where and how you play."
                >
                  <div className="grid min-w-0 gap-5 md:grid-cols-2">
                    <SelectInput
                      label="Main position"
                      value={form.position}
                      onChange={(value) => updateField("position", value)}
                      options={positionOptions}
                      placeholder="Select your position"
                      required
                    />
                    <TextInput
                      label="Height"
                      value={form.height}
                      onChange={(value) => updateField("height", value)}
                      placeholder="Example: 6'1 or 185 cm"
                    />
                    <SelectInput
                      label="Dominant hand"
                      value={form.dominantHand}
                      onChange={(value) => updateField("dominantHand", value)}
                      options={dominantHandOptions}
                      placeholder="Select dominant hand"
                    />
                    <SelectInput
                      label="Highest level played"
                      value={form.highestLevelPlayed}
                      onChange={(value) => updateField("highestLevelPlayed", value)}
                      options={highestLevelOptions}
                      placeholder="Select playing level"
                    />
                    <TextInput
                      label="Current team or school"
                      value={form.currentTeamOrSchool}
                      onChange={(value) => updateField("currentTeamOrSchool", value)}
                      placeholder="Team, club, school or unattached"
                    />
                    <TextInput
                      label="Years played"
                      value={form.yearsPlayed}
                      onChange={(value) => updateField("yearsPlayed", value)}
                      placeholder="Example: 3 years"
                    />
                  </div>
                  <div className="mt-5">
                    <TextArea
                      label="Previous teams and competitions"
                      value={form.previousTeams}
                      onChange={(value) => updateField("previousTeams", value)}
                      placeholder="List relevant teams, schools, clubs, leagues or tournaments."
                    />
                  </div>
                </FormStage>
              ) : null}

              {step === 2 ? (
                <FormStage
                  eyebrow="03 / Player story"
                  title="Show us what makes you different"
                  description="Short, honest answers help FACKTS understand your game and the opportunity you are pursuing."
                >
                  <div className="grid min-w-0 gap-5 md:grid-cols-2">
                    <TextArea
                      label="Style of play"
                      value={form.styleOfPlay}
                      onChange={(value) => updateField("styleOfPlay", value)}
                      placeholder="Shooter, playmaker, defender, rebounder, floor general..."
                    />
                    <TextArea
                      label="Strongest parts of your game"
                      value={form.strengths}
                      onChange={(value) => updateField("strengths", value)}
                      placeholder="What can a coach or teammate rely on you to do?"
                    />
                    <TextArea
                      label="Areas you are improving"
                      value={form.improvementAreas}
                      onChange={(value) => updateField("improvementAreas", value)}
                      placeholder="What are you actively working on?"
                    />
                    <TextArea
                      label="What do you want from FACKTS?"
                      value={form.playerGoal}
                      onChange={(value) => updateField("playerGoal", value)}
                      placeholder="Stats, player profile, exposure, media, coverage or another goal."
                    />
                    <TextInput
                      label="Social profile"
                      type="url"
                      value={form.socialLink}
                      onChange={(value) => updateField("socialLink", value)}
                      placeholder="Instagram, TikTok or YouTube link"
                      inputMode="url"
                    />
                    <TextInput
                      label="Highlight video"
                      type="url"
                      value={form.highlightLink}
                      onChange={(value) => updateField("highlightLink", value)}
                      placeholder="Paste a public video link"
                      inputMode="url"
                    />
                  </div>
                </FormStage>
              ) : null}

              {step === 3 ? (
                <FormStage
                  eyebrow="04 / Final check"
                  title="Review before you submit"
                  description="Confirm the key details below. You can go back to make changes."
                >
                  <div className="grid min-w-0 gap-4 md:grid-cols-3">
                    <ReviewCard
                      label="Player"
                      lines={[
                        displayValue(form.fullName),
                        displayValue(form.nickname, "No nickname"),
                        displayValue(form.location, "Location not provided"),
                      ]}
                    />
                    <ReviewCard
                      label="Basketball"
                      lines={[
                        displayValue(form.position),
                        displayValue(form.currentTeamOrSchool, "No current team listed"),
                        displayValue(form.highestLevelPlayed, "Playing level not provided"),
                      ]}
                    />
                    <ReviewCard
                      label="Contact"
                      lines={[
                        displayValue(form.phone, "No phone provided"),
                        displayValue(form.email, "No email provided"),
                        isUnder18 ? "Guardian permission required" : "Standard review workflow",
                      ]}
                    />
                  </div>

                  <div className="mt-6 grid min-w-0 gap-3">
                    <ConsentCard
                      checked={form.marketingConsent}
                      onChange={(checked) => updateField("marketingConsent", checked)}
                      required
                    >
                      I consent to FACKTS securely collecting and reviewing the
                      details in this application and contacting me about the
                      application. I understand that nothing will be published
                      until it is separately reviewed and approved.
                    </ConsentCard>

                    <ConsentCard
                      checked={form.guardianAwareness}
                      onChange={(checked) => updateField("guardianAwareness", checked)}
                      required={isUnder18}
                    >
                      If I am under 18, I confirm that a parent or guardian has
                      given me permission to submit this application.
                    </ConsentCard>
                  </div>

                  <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/[.07] p-4 text-sm leading-6 text-slate-300">
                    Submitting an application does not automatically create a
                    public profile or guarantee selection. FACKTS reviews every
                    application first.
                  </div>
                </FormStage>
              ) : null}
            </div>

            <div className="mt-8 flex min-w-0 flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || submitting}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[.04] px-6 py-3 text-sm font-black text-white transition hover:border-orange-400/60 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goForward}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-orange-500 px-7 py-3 text-sm font-black text-black transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                >
                  Continue to {steps[step + 1].short}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-orange-500 px-7 py-3 text-sm font-black text-black transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? "Submitting application..." : "Submit application"}
                </button>
              )}
            </div>
          </form>

          <aside className="grid min-w-0 gap-4 lg:sticky lg:top-24">
            <div className="box-border w-full rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                What happens next
              </p>
              <div className="mt-5 grid gap-5">
                {[
                  ["01", "Review", "The FACKTS team checks your basketball and contact details."],
                  ["02", "Decision", "We may contact you for more information before approval."],
                  ["03", "Player pathway", "Approved applicants can move into the correct FACKTS player experience."],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex min-w-0 gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-400/30 bg-orange-400/10 text-[10px] font-black text-orange-200">
                      {number}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-white">{title}</p>
                      <p className="mt-1 break-words text-sm leading-6 text-slate-400">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="box-border w-full rounded-[1.75rem] border border-blue-400/20 bg-blue-500/[.08] p-5 sm:p-6">
              <p className="text-lg font-black text-white">Need help applying?</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Contact FACKTS if you are unsure what to enter. Do not send
                passwords or private account details.
              </p>
              <div className="mt-5 grid gap-2">
                <a
                  href={`https://wa.me/${FACKTS_WHATSAPP}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-center text-sm font-black text-slate-950 transition hover:bg-orange-100"
                >
                  WhatsApp FACKTS
                </a>
                <a
                  href={`tel:${FACKTS_PHONE_TEL}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-black text-white transition hover:border-orange-400/60 hover:text-orange-200"
                >
                  Call {FACKTS_PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <Link
              href="/players"
              className="box-border inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/[.04] px-5 py-3 text-center text-sm font-black text-white transition hover:border-orange-400/60 hover:text-orange-200"
            >
              Explore FACKTS players
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function FormStage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>
      <h3 className="mt-2 break-words text-xl font-black text-white sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-400">
        {description}
      </p>
      <div className="mt-6 min-w-0">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-black text-slate-200">
      {label}
      {required ? <span className="text-orange-300"> *</span> : null}
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  helper,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  helper?: string;
  autoComplete?: string;
  inputMode?: "email" | "numeric" | "tel" | "text" | "url";
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="box-border min-h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
      />
      {helper ? (
        <span className="mt-2 block break-words text-xs leading-5 text-slate-500">
          {helper}
        </span>
      ) : null}
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
    <label className="block min-w-0">
      <FieldLabel label={label} required={required} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="box-border min-h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition hover:border-white/20 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
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
    <label className="block min-w-0">
      <FieldLabel label={label} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder={placeholder}
        className="box-border min-h-36 w-full min-w-0 resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-base leading-6 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15"
      />
    </label>
  );
}

function ReviewCard({ label, lines }: { label: string; lines: string[] }) {
  return (
    <article className="box-border min-w-0 rounded-2xl border border-white/10 bg-slate-950/75 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">
        {label}
      </p>
      <div className="mt-3 grid min-w-0 gap-1.5">
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className={`min-w-0 break-words text-sm leading-5 ${
              index === 0 ? "font-black text-white" : "text-slate-400"
            }`}
          >
            {line}
          </p>
        ))}
      </div>
    </article>
  );
}

function ConsentCard({
  checked,
  onChange,
  required = false,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="box-border flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-slate-950/75 p-4 text-sm leading-6 text-slate-300 transition hover:border-white/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required={required}
        className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500"
      />
      <span className="min-w-0 break-words">
        {children}
        {required ? <strong className="text-orange-300"> Required.</strong> : null}
      </span>
    </label>
  );
}
