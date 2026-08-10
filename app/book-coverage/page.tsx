"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const FACKTS_PHONE_DISPLAY = "+254 711 468 303";
const FACKTS_PHONE_TEL = "+254711468303";
const FACKTS_WHATSAPP = "254711468303";

type BookingForm = {
  organizer: string;
  contactName: string;
  phone: string;
  email: string;
  eventName: string;
  eventDate: string;
  eventFormat: string;
  teamCount: string;
  gameCount: string;
  venue: string;
  city: string;
  mediaNeeds: string[];
  statisticsLevel: string;
  budgetRange: string;
  decisionTimeline: string;
  details: string;
  companyWebsite: string;
};

type MessageType = "info" | "success" | "error";

const eventFormats = [
  "5v5 Tournament",
  "5v5 Friendly",
  "3v3 Tournament",
  "2v2 Competition",
  "1v1 Competition",
  "Showcase",
  "Clinic or Camp",
  "Youth Event",
  "Other",
];

const mediaOptions = [
  {
    value: "Event statistics",
    title: "Event statistics",
    description: "Scores, box scores, leaders and standings.",
  },
  {
    value: "Photography",
    title: "Photography",
    description: "Game action, teams, awards and event moments.",
  },
  {
    value: "Short-form video",
    title: "Short-form video",
    description: "Social clips, reels and fast event storytelling.",
  },
  {
    value: "Full game video",
    title: "Full game video",
    description: "Complete games connected to the event record.",
  },
  {
    value: "Highlights",
    title: "Highlights",
    description: "Edited game and tournament highlight packages.",
  },
  {
    value: "Interviews",
    title: "Interviews",
    description: "Player, coach, organizer and partner interviews.",
  },
  {
    value: "Event digital hub",
    title: "Event digital hub",
    description: "Schedule, results, teams, leaders, media and sponsors.",
  },
  {
    value: "Sponsor reporting",
    title: "Sponsor reporting",
    description: "Activation evidence and a post-event summary.",
  },
];

const statisticsOptions = [
  "No statistics required",
  "Scores and results only",
  "Team statistics",
  "Full player box scores",
  "Full tournament intelligence",
];

const budgetOptions = [
  "Below KES 10,000",
  "KES 10,000 - 25,000",
  "KES 25,000 - 50,000",
  "Above KES 50,000",
  "Need a tailored proposal",
];

const timelineOptions = [
  "Ready to confirm",
  "Within 3 days",
  "Within 1 week",
  "Within 2 weeks",
  "Still exploring options",
];

const initialForm: BookingForm = {
  organizer: "",
  contactName: "",
  phone: "",
  email: "",
  eventName: "",
  eventDate: "",
  eventFormat: "5v5 Tournament",
  teamCount: "",
  gameCount: "",
  venue: "",
  city: "",
  mediaNeeds: ["Event statistics"],
  statisticsLevel: "Full player box scores",
  budgetRange: "Need a tailored proposal",
  decisionTimeline: "Within 1 week",
  details: "",
  companyWebsite: "",
};

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10";

function buildWhatsAppMessage(form: BookingForm) {
  return [
    "Hello FACKTS Hoops, I want to request event coverage.",
    "",
    "ORGANIZER",
    `Organization: ${form.organizer || "Not provided"}`,
    `Contact person: ${form.contactName || "Not provided"}`,
    `Phone: ${form.phone || "Not provided"}`,
    `Email: ${form.email || "Not provided"}`,
    "",
    "EVENT",
    `Event: ${form.eventName || "Not provided"}`,
    `Date: ${form.eventDate || "Not provided"}`,
    `Format: ${form.eventFormat || "Not provided"}`,
    `Teams / participants: ${form.teamCount || "Not provided"}`,
    `Number of games: ${form.gameCount || "Not provided"}`,
    `Venue: ${form.venue || "Not provided"}`,
    `Town / county: ${form.city || "Not provided"}`,
    "",
    "COVERAGE",
    `Services: ${form.mediaNeeds.join(", ") || "Not provided"}`,
    `Statistics level: ${form.statisticsLevel || "Not provided"}`,
    `Budget range: ${form.budgetRange || "Not provided"}`,
    `Decision timeline: ${form.decisionTimeline || "Not provided"}`,
    "",
    `Notes: ${form.details || "Not provided"}`,
  ].join("\n");
}

function buildWhatsAppUrl(form: BookingForm) {
  return `https://wa.me/${FACKTS_WHATSAPP}?text=${encodeURIComponent(
    buildWhatsAppMessage(form)
  )}`;
}

function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-slate-200"
    >
      <span>{children}</span>
      {optional ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Optional
        </span>
      ) : null}
    </label>
  );
}

function StepHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-white/10 pb-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 text-sm font-black text-orange-300">
        {number}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function ValueCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="group relative box-border w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/70 transition duration-300 hover:-translate-y-1 hover:border-orange-400/35 hover:shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative box-border min-w-0 p-5 sm:p-6">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="min-w-0 break-words text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
            {number}
          </span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.8)]" />
        </div>
        <h2 className="mt-8 min-w-0 break-words text-xl font-black tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-3 min-w-0 break-words text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}

export default function BookCoveragePage() {
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  const selectedServiceCount = form.mediaNeeds.length;
  const whatsappUrl = useMemo(() => buildWhatsAppUrl(form), [form]);

  function updateField<K extends keyof BookingForm>(
    field: K,
    value: BookingForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleMediaNeed(value: string) {
    setForm((current) => ({
      ...current,
      mediaNeeds: current.mediaNeeds.includes(value)
        ? current.mediaNeeds.filter((item) => item !== value)
        : [...current.mediaNeeds, value],
    }));
  }

  function validateForm() {
    if (!form.organizer.trim()) return "Please enter the organizer or organization.";
    if (!form.contactName.trim()) return "Please enter the contact person's name.";
    if (!form.phone.trim() && !form.email.trim()) {
      return "Please enter either a phone number or email address.";
    }
    if (!form.eventName.trim()) return "Please enter the event name.";
    if (!form.eventDate) return "Please select the event date.";
    if (!form.teamCount || Number(form.teamCount) < 1) {
      return "Please enter the expected number of teams or participants.";
    }
    if (!form.gameCount || Number(form.gameCount) < 1) {
      return "Please enter the expected number of games.";
    }
    if (!form.venue.trim()) return "Please enter the event venue.";
    if (form.mediaNeeds.length === 0) {
      return "Please select at least one coverage service.";
    }
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      setMessageType("error");
      setMessage(validationMessage);
      return;
    }

    setSubmitting(true);
    setMessageType("info");
    setMessage("Sending your coverage brief to FACKTS...");

    try {
      const response = await fetch("/api/book-coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || result.success === false) {
        throw new Error(result.error || "The booking request could not be sent.");
      }

      setMessageType("success");
      setMessage(
        "Coverage request received. The FACKTS team will review the brief and follow up with the next step."
      );
      setForm(initialForm);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The request could not be sent. Please use WhatsApp or call FACKTS."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const messageClass =
    messageType === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : messageType === "error"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : "border-orange-400/30 bg-orange-500/10 text-orange-100";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050a14] text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,0.2),transparent_31%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.2),transparent_30%),linear-gradient(145deg,#050a14_0%,#071326_52%,#04070d_100%)]" />
        <div className="absolute left-1/2 top-0 h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="max-w-4xl">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200 transition hover:border-orange-400/40 hover:text-white"
              >
                <span aria-hidden="true">←</span>
                Back to FACKTS
              </Link>

              <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">
                Organizer Coverage Intake
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.96] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Turn your event into a complete basketball record.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Tell us what you are organizing. We will shape the right mix of
                statistics, media, digital event coverage and sponsor reporting
                around your schedule and budget.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#coverage-brief"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-orange-400"
                >
                  Start coverage brief
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/15"
                >
                  Discuss on WhatsApp
                </a>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                    What happens next
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    One brief. One clear proposal.
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-400/30 bg-orange-500/10 text-sm font-black text-orange-300">
                  3
                </span>
              </div>

              <ol className="mt-5 space-y-5">
                {[
                  ["01", "Brief review", "We confirm the event scope and delivery needs."],
                  ["02", "Package & quote", "You receive a tailored coverage proposal."],
                  ["03", "Crew planning", "Once confirmed, we lock the event workflow."],
                ].map(([number, title, description]) => (
                  <li key={number} className="flex gap-4">
                    <span className="mt-0.5 text-xs font-black text-orange-300">
                      {number}
                    </span>
                    <div>
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <ValueCard
            number="01 / DATA"
            title="Statistics that stay useful"
            description="Verified scores, player and team performance, standings and tournament leaders connected to the event."
          />
          <ValueCard
            number="02 / MEDIA"
            title="Content with a purpose"
            description="Photography, video, highlights and interviews built for players, organizers, supporters and partners."
          />
          <ValueCard
            number="03 / EVENT HUB"
            title="One digital home"
            description="Schedule, results, teams, leaders, media and sponsors organized in one event experience."
          />
        </div>
      </section>

      <section
        id="coverage-brief"
        className="scroll-mt-24 border-t border-white/10 bg-slate-950/45"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <form onSubmit={handleSubmit} className="min-w-0 space-y-6" noValidate>
            <section className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <StepHeading
                number="01"
                eyebrow="Organizer"
                title="Who should we speak to?"
                description="Give us one reliable contact so the coverage discussion moves quickly."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="organizer">Organizer / organization</FieldLabel>
                  <input
                    id="organizer"
                    value={form.organizer}
                    onChange={(event) => updateField("organizer", event.target.value)}
                    placeholder="Example: FAM Sports Kenya"
                    autoComplete="organization"
                    maxLength={120}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="contactName">Contact person</FieldLabel>
                  <input
                    id="contactName"
                    value={form.contactName}
                    onChange={(event) => updateField("contactName", event.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    maxLength={100}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="Example: 07..."
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={30}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="email" optional>
                    Email address
                  </FieldLabel>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="name@organization.com"
                    autoComplete="email"
                    maxLength={160}
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <StepHeading
                number="02"
                eyebrow="Event"
                title="What are you organizing?"
                description="These details help us estimate the crew, equipment, statistics workflow and delivery load."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="eventName">Event or tournament name</FieldLabel>
                  <input
                    id="eventName"
                    value={form.eventName}
                    onChange={(event) => updateField("eventName", event.target.value)}
                    placeholder="What is the event called?"
                    maxLength={140}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="eventDate">Event date</FieldLabel>
                  <input
                    id="eventDate"
                    type="date"
                    value={form.eventDate}
                    onChange={(event) => updateField("eventDate", event.target.value)}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="eventFormat">Competition format</FieldLabel>
                  <select
                    id="eventFormat"
                    value={form.eventFormat}
                    onChange={(event) => updateField("eventFormat", event.target.value)}
                    className={fieldClass}
                  >
                    {eventFormats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="teamCount">Teams / participants</FieldLabel>
                  <input
                    id="teamCount"
                    type="number"
                    min="1"
                    max="500"
                    value={form.teamCount}
                    onChange={(event) => updateField("teamCount", event.target.value)}
                    placeholder="Example: 12"
                    inputMode="numeric"
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="gameCount">Expected games</FieldLabel>
                  <input
                    id="gameCount"
                    type="number"
                    min="1"
                    max="1000"
                    value={form.gameCount}
                    onChange={(event) => updateField("gameCount", event.target.value)}
                    placeholder="Example: 18"
                    inputMode="numeric"
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="venue">Venue</FieldLabel>
                  <input
                    id="venue"
                    value={form.venue}
                    onChange={(event) => updateField("venue", event.target.value)}
                    placeholder="Court or facility"
                    maxLength={160}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="city" optional>
                    Town / county
                  </FieldLabel>
                  <input
                    id="city"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Example: Nairobi"
                    maxLength={100}
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <StepHeading
                number="03"
                eyebrow="Coverage"
                title="What should FACKTS deliver?"
                description="Select everything you may need. The final package will be adjusted to your event and budget."
              />

              <fieldset>
                <legend className="text-sm font-black text-slate-200">
                  Coverage services
                </legend>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {selectedServiceCount} selected
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {mediaOptions.map((option) => {
                    const selected = form.mediaNeeds.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                          selected
                            ? "border-orange-400/55 bg-orange-500/10 shadow-[0_0_0_3px_rgba(249,115,22,0.05)]"
                            : "border-white/10 bg-slate-950/70 hover:border-white/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMediaNeed(option.value)}
                          className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                        />
                        <span>
                          <span className="block text-sm font-black text-white">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-400">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="statisticsLevel">Statistics level</FieldLabel>
                  <select
                    id="statisticsLevel"
                    value={form.statisticsLevel}
                    onChange={(event) =>
                      updateField("statisticsLevel", event.target.value)
                    }
                    className={fieldClass}
                  >
                    {statisticsOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="budgetRange">Budget range</FieldLabel>
                  <select
                    id="budgetRange"
                    value={form.budgetRange}
                    onChange={(event) => updateField("budgetRange", event.target.value)}
                    className={fieldClass}
                  >
                    {budgetOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="decisionTimeline">Decision timeline</FieldLabel>
                  <select
                    id="decisionTimeline"
                    value={form.decisionTimeline}
                    onChange={(event) =>
                      updateField("decisionTimeline", event.target.value)
                    }
                    className={fieldClass}
                  >
                    {timelineOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="details" optional>
                    Additional information
                  </FieldLabel>
                  <textarea
                    id="details"
                    rows={5}
                    value={form.details}
                    onChange={(event) => updateField("details", event.target.value)}
                    placeholder="Tell us about the schedule, audience, partners, special deliverables or anything else that affects the coverage."
                    maxLength={1800}
                    className={`${fieldClass} resize-y`}
                  />
                </div>
              </div>

              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="companyWebsite">Company website</label>
                <input
                  id="companyWebsite"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.companyWebsite}
                  onChange={(event) =>
                    updateField("companyWebsite", event.target.value)
                  }
                />
              </div>

              {message ? (
                <div
                  role={messageType === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={`mt-6 rounded-2xl border px-4 py-3.5 text-sm font-bold leading-6 ${messageClass}`}
                >
                  {message}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:flex-wrap">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending brief..." : "Request coverage proposal"}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-200 transition hover:border-emerald-300/60"
                >
                  Send via WhatsApp
                </a>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Submitting a brief does not lock you into a package. FACKTS will
                confirm scope, availability and pricing before coverage is booked.
              </p>
            </section>
          </form>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[2rem] border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-slate-900 to-blue-950 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                Your coverage brief
              </p>
              <dl className="mt-6 space-y-4">
                {[
                  ["Format", form.eventFormat || "Not selected"],
                  ["Services", `${selectedServiceCount} selected`],
                  ["Statistics", form.statisticsLevel],
                  ["Budget", form.budgetRange],
                  ["Timeline", form.decisionTimeline],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                    <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-black leading-5 text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                Prefer to talk first?
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Reach FACKTS directly and we will help shape the brief with you.
              </p>
              <div className="mt-5 grid gap-3">
                <a
                  href={`tel:${FACKTS_PHONE_TEL}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-orange-400/45"
                >
                  Call {FACKTS_PHONE_DISPLAY}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-200 transition hover:border-emerald-300/60"
                >
                  Open WhatsApp
                </a>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
