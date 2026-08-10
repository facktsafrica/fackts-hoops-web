"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FACKTS_PLAYER_TYPE } from "@/lib/hoops/playerClassification";
import { supabase } from "@/lib/supabase";

type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "accepted"
  | "rejected"
  | "needs_more_info";

type PlayerApplication = {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  age_or_year_of_birth: string | null;
  location: string | null;
  position: string | null;
  height: string | null;
  dominant_hand: string | null;
  current_team_or_school: string | null;
  previous_teams: string | null;
  highest_level_played: string | null;
  years_played: string | null;
  style_of_play: string | null;
  strengths: string | null;
  improvement_areas: string | null;
  social_link: string | null;
  highlight_link: string | null;
  player_goal: string | null;
  marketing_consent: boolean | null;
  guardian_awareness: boolean | null;
  application_status: ApplicationStatus;
  review_notes: string | null;
  accepted_player_id: string | null;
  created_at: string;
};

type AcceptForm = {
  jerseyNumber: string;
  role: string;
  photoPosition: string;
  isFeatured: boolean;
  isActive: boolean;
};

const reviewStatusOptions: ApplicationStatus[] = [
  "pending",
  "reviewing",
  "needs_more_info",
  "rejected",
];

const roleOptions = [
  "Player",
  "Starter",
  "Bench",
  "Captain",
  "Co-Captain",
];

const photoPositionOptions = [
  "center center",
  "center top",
  "center bottom",
  "left center",
  "right center",
  "left top",
  "right top",
  "left bottom",
  "right bottom",
];

const emptyAcceptForm: AcceptForm = {
  jerseyNumber: "",
  role: "Player",
  photoPosition: "center center",
  isFeatured: false,
  isActive: true,
};

function statusLabel(status: ApplicationStatus) {
  if (status === "needs_more_info") return "Needs More Info";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function safeText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "Not provided";
}

function makeSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPlayerApplicationsPage() {
  const [applications, setApplications] = useState<PlayerApplication[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<PlayerApplication | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState("");

  const [acceptForm, setAcceptForm] = useState<AcceptForm>(emptyAcceptForm);
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState("");

  async function loadApplications() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("player_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setApplications([]);
      setMessage(`Failed to load applications: ${error.message}`);
      setLoading(false);
      return;
    }

    setApplications((data ?? []) as PlayerApplication[]);
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function openApplication(application: PlayerApplication) {
    setSelectedApplication(application);
    setStatus(application.application_status);
    setReviewNotes(application.review_notes ?? "");
    setAcceptForm(emptyAcceptForm);
    setPlayerPhotoFile(null);
    setPlayerPhotoPreview("");
    setMessage("");
  }

  async function saveReview() {
    if (!selectedApplication) return;

    if (status === "accepted" && !selectedApplication.accepted_player_id) {
      setMessage("Use Accept as Official FACKTS Player so the player profile is created correctly.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("player_applications")
      .update({
        application_status: status,
        review_notes: reviewNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedApplication.id);

    if (error) {
      setMessage(`Failed to save review: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Review saved.");
    setSaving(false);
    await loadApplications();

    setSelectedApplication({
      ...selectedApplication,
      application_status: status,
      review_notes: reviewNotes.trim() || null,
    });
  }

  async function uploadPlayerPhoto() {
    if (!playerPhotoFile || !selectedApplication) return null;

    const safeName =
      makeSafeFileName(playerPhotoFile.name) || `player-photo-${Date.now()}.jpg`;

    const filePath = `applications/${selectedApplication.id}-${Date.now()}-${safeName}`;

    const uploadResult = await supabase.storage
      .from("player-photos")
      .upload(filePath, playerPhotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const publicUrlResult = supabase.storage
      .from("player-photos")
      .getPublicUrl(filePath);

    return publicUrlResult.data.publicUrl;
  }

  async function acceptAsPlayer() {
    if (!selectedApplication) return;

    if (selectedApplication.accepted_player_id) {
      setMessage("This application has already been accepted as a player.");
      return;
    }

    if (!selectedApplication.full_name.trim()) {
      setMessage("Cannot accept an application without a full name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const jerseyNumber = acceptForm.jerseyNumber.trim()
      ? Number(acceptForm.jerseyNumber)
      : null;

    if (
      acceptForm.jerseyNumber.trim() &&
      Number.isNaN(Number(acceptForm.jerseyNumber))
    ) {
      setMessage("Jersey number must be a number.");
      setSaving(false);
      return;
    }

    let uploadedPhotoUrl: string | null = null;

    try {
      uploadedPhotoUrl = await uploadPlayerPhoto();
    } catch (error: any) {
      setMessage(`Photo upload failed: ${error.message}`);
      setSaving(false);
      return;
    }

    const playerPayload: Record<string, any> = {
      full_name: selectedApplication.full_name,
      nickname: selectedApplication.nickname || null,
      jersey_number: jerseyNumber,
      position: selectedApplication.position || null,
      role: acceptForm.role,
      player_type: FACKTS_PLAYER_TYPE,
      height: selectedApplication.height || null,
      dominant_hand: selectedApplication.dominant_hand || null,
      current_team: selectedApplication.current_team_or_school || null,
      previous_teams: selectedApplication.previous_teams || null,
      highest_level: selectedApplication.highest_level_played || null,
      years_played: selectedApplication.years_played || null,
      style_of_play: selectedApplication.style_of_play || null,
      strengths: selectedApplication.strengths || null,
      improvements: selectedApplication.improvement_areas || null,
      bio: selectedApplication.player_goal || null,
      email: selectedApplication.email || null,
      phone: selectedApplication.phone || null,
      location: selectedApplication.location || null,
      instagram_url: selectedApplication.social_link || null,
      highlight_url: selectedApplication.highlight_link || null,
      photo_url: uploadedPhotoUrl,
      photo_position: acceptForm.photoPosition,
      is_featured: acceptForm.isFeatured,
      is_active: acceptForm.isActive,
    };

    const { data: createdPlayer, error: playerError } = await supabase
      .from("players")
      .insert(playerPayload)
      .select("id")
      .single();

    if (playerError) {
      setMessage(`Failed to create player: ${playerError.message}`);
      setSaving(false);
      return;
    }

    const { error: applicationError } = await supabase
      .from("player_applications")
      .update({
        application_status: "accepted",
        review_notes:
          reviewNotes.trim() ||
          "Accepted as player from public player application.",
        reviewed_at: new Date().toISOString(),
        accepted_player_id: createdPlayer.id,
      })
      .eq("id", selectedApplication.id);

    if (applicationError) {
      await supabase.from("players").delete().eq("id", createdPlayer.id);
      setMessage(
        `Acceptance was not completed and the partial player record was rolled back: ${applicationError.message}`
      );
      setSaving(false);
      return;
    }

    setMessage("Application accepted. Official FACKTS player profile created. You can now create their login in Player Accounts.");
    setSaving(false);

    await loadApplications();

    setSelectedApplication({
      ...selectedApplication,
      application_status: "accepted",
      review_notes:
        reviewNotes.trim() ||
        "Accepted as player from public player application.",
      accepted_player_id: createdPlayer.id,
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </p>

            <h1 className="mt-2 text-3xl font-black">Player Applications</h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Review public player applications before creating official player
              profiles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:border-orange-400/60"
            >
              Back to Admin
            </Link>

            <button
              type="button"
              onClick={loadApplications}
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-black transition hover:bg-orange-400"
            >
              Refresh
            </button>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Applications</h2>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-black text-slate-300">
                {applications.length}
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
                No applications found.
              </div>
            ) : (
              <div className="grid gap-3">
                {applications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => openApplication(application)}
                    className={
                      selectedApplication?.id === application.id
                        ? "rounded-2xl border border-orange-500/60 bg-orange-500/10 p-4 text-left"
                        : "rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition hover:border-orange-400/60"
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">
                          {application.full_name}
                        </div>

                        <div className="mt-1 text-sm text-slate-400">
                          {safeText(application.position)} •{" "}
                          {safeText(application.current_team_or_school)}
                        </div>
                      </div>

                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                        {statusLabel(application.application_status)}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Submitted:{" "}
                      {new Date(application.created_at).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900 p-4">
            {!selectedApplication ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-slate-400">
                Select an application to review.
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                    Review
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    {selectedApplication.full_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {safeText(selectedApplication.position)} •{" "}
                    {safeText(selectedApplication.location)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailCard title="Contact">
                    <Detail label="Phone" value={selectedApplication.phone} />
                    <Detail label="Email" value={selectedApplication.email} />
                    <Detail
                      label="Social Link"
                      value={selectedApplication.social_link}
                    />
                    <Detail
                      label="Highlight Link"
                      value={selectedApplication.highlight_link}
                    />
                  </DetailCard>

                  <DetailCard title="Player Details">
                    <Detail
                      label="Nickname"
                      value={selectedApplication.nickname}
                    />
                    <Detail
                      label="Age / Year"
                      value={selectedApplication.age_or_year_of_birth}
                    />
                    <Detail
                      label="Height"
                      value={selectedApplication.height}
                    />
                    <Detail
                      label="Dominant Hand"
                      value={selectedApplication.dominant_hand}
                    />
                  </DetailCard>

                  <DetailCard title="Team & Level">
                    <Detail
                      label="Current Team / School"
                      value={selectedApplication.current_team_or_school}
                    />
                    <Detail
                      label="Previous Teams"
                      value={selectedApplication.previous_teams}
                    />
                    <Detail
                      label="Highest Level"
                      value={selectedApplication.highest_level_played}
                    />
                    <Detail
                      label="Years Played"
                      value={selectedApplication.years_played}
                    />
                  </DetailCard>

                  <DetailCard title="Consent">
                    <Detail
                      label="Application & Data Consent"
                      value={
                        selectedApplication.marketing_consent ? "Yes" : "No"
                      }
                    />
                    <Detail
                      label="Parent / Guardian Permission"
                      value={
                        selectedApplication.guardian_awareness ? "Yes" : "No"
                      }
                    />
                  </DetailCard>
                </div>

                <div className="mt-4">
                  <DetailCard title="Basketball Notes">
                    <Detail
                      label="Style of Play"
                      value={selectedApplication.style_of_play}
                    />
                    <Detail
                      label="Strengths"
                      value={selectedApplication.strengths}
                    />
                    <Detail
                      label="Improvement Areas"
                      value={selectedApplication.improvement_areas}
                    />
                    <Detail
                      label="Player Goal"
                      value={selectedApplication.player_goal}
                    />
                  </DetailCard>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
                  <h3 className="text-lg font-black">Review Decision</h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-sm font-bold text-slate-300">
                        Status
                      </div>

                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(event.target.value as ApplicationStatus)
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                      >
                        {(selectedApplication.accepted_player_id
                          ? (["accepted"] as ApplicationStatus[])
                          : reviewStatusOptions
                        ).map((option) => (
                          <option key={option} value={option}>
                            {statusLabel(option)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={saveReview}
                        disabled={saving}
                        className="w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Review"}
                      </button>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <div className="mb-2 text-sm font-bold text-slate-300">
                      Review Notes
                    </div>

                    <textarea
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      rows={5}
                      placeholder="Add notes about this applicant..."
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-3xl border border-orange-500/30 bg-orange-500/10 p-4">
                  <h3 className="text-lg font-black text-orange-200">
                    Accept as Official FACKTS Player
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Use this after review. Admin uploads the player photo before
                    creating the public player profile.
                  </p>

                  {selectedApplication.accepted_player_id ? (
                    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
                      This application has already been accepted as a player.
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <SmallInput
                          label="Jersey Number"
                          value={acceptForm.jerseyNumber}
                          onChange={(value) =>
                            setAcceptForm((prev) => ({
                              ...prev,
                              jerseyNumber: value,
                            }))
                          }
                          placeholder="Example: 7"
                        />

                        <SmallSelect
                          label="Role"
                          value={acceptForm.role}
                          onChange={(value) =>
                            setAcceptForm((prev) => ({
                              ...prev,
                              role: value,
                            }))
                          }
                          options={roleOptions}
                        />
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <div className="mb-2 text-sm font-bold text-slate-300">
                            Upload Player Photo
                          </div>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              setPlayerPhotoFile(file);

                              if (file) {
                                setPlayerPhotoPreview(URL.createObjectURL(file));
                              } else {
                                setPlayerPhotoPreview("");
                              }
                            }}
                            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                          />

                          {playerPhotoFile ? (
                            <div className="mt-2 text-xs font-bold text-orange-300">
                              Selected: {playerPhotoFile.name}
                            </div>
                          ) : null}
                        </label>

                        <SmallSelect
                          label="Photo Position"
                          value={acceptForm.photoPosition}
                          onChange={(value) =>
                            setAcceptForm((prev) => ({
                              ...prev,
                              photoPosition: value,
                            }))
                          }
                          options={photoPositionOptions}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-slate-200">
                          <input
                            type="checkbox"
                            checked={acceptForm.isActive}
                            onChange={(event) =>
                              setAcceptForm((prev) => ({
                                ...prev,
                                isActive: event.target.checked,
                              }))
                            }
                            className="h-5 w-5 accent-orange-500"
                          />
                          Active Player
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-bold text-slate-200">
                          <input
                            type="checkbox"
                            checked={acceptForm.isFeatured}
                            onChange={(event) =>
                              setAcceptForm((prev) => ({
                                ...prev,
                                isFeatured: event.target.checked,
                              }))
                            }
                            className="h-5 w-5 accent-orange-500"
                          />
                          Featured Player
                        </label>
                      </div>

                      {playerPhotoPreview ? (
                        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                          <img
                            src={playerPhotoPreview}
                            alt="Player preview"
                            className="h-72 w-full object-cover"
                            style={{
                              objectPosition:
                                acceptForm.photoPosition || "center center",
                            }}
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={acceptAsPlayer}
                        disabled={saving}
                        className="mt-4 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-60"
                      >
                        {saving
                          ? "Creating Player..."
                          : "Accept and Create Player"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-orange-300">
        {title}
      </h3>

      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">
        {safeText(value)}
      </div>
    </div>
  );
}

function SmallInput({
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
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
      />
    </label>
  );
}

function SmallSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-300">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
