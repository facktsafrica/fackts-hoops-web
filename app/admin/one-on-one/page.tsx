"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompetitorType = "fackts" | "guest";

type OneOnOneForm = {
  player_one_type: CompetitorType;
  player_one_id: string;
  guest_player_one_id: string;

  player_two_type: CompetitorType;
  player_two_id: string;
  guest_player_two_id: string;

  match_date: string;
  venue: string;
  status: string;
  player_one_score: string;
  player_two_score: string;
  poster_url: string;
  poster_position: string;
  notes: string;
};

const emptyForm: OneOnOneForm = {
  player_one_type: "fackts",
  player_one_id: "",
  guest_player_one_id: "",

  player_two_type: "fackts",
  player_two_id: "",
  guest_player_two_id: "",

  match_date: "",
  venue: "",
  status: "upcoming",
  player_one_score: "",
  player_two_score: "",
  poster_url: "",
  poster_position: "center center",
  notes: "",
};

const imagePositions = [
  { label: "Center", value: "center center" },
  { label: "Top", value: "center top" },
  { label: "Bottom", value: "center bottom" },
  { label: "Left", value: "left center" },
  { label: "Right", value: "right center" },
  { label: "Top Left", value: "left top" },
  { label: "Top Right", value: "right top" },
  { label: "Bottom Left", value: "left bottom" },
  { label: "Bottom Right", value: "right bottom" },
];

export default function AdminOneOnOnePage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [guestHoopers, setGuestHoopers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [form, setForm] = useState<OneOnOneForm>(emptyForm);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPageData() {
    setLoadingPage(true);
    setMessage("");

    const [playersResult, guestResult, matchesResult] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("is_active", true)
        .order("jersey_number", { ascending: true }),

      supabase
        .from("guest_hoopers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),

      supabase
        .from("one_on_one_games")
        .select("*")
        .order("match_date", { ascending: false }),
    ]);

    if (playersResult.error) {
      setMessage(`Failed to load FACKTS players: ${playersResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (guestResult.error) {
      setMessage(`Failed to load guest hoopers: ${guestResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    if (matchesResult.error) {
      setMessage(`Failed to load 1-on-1 games: ${matchesResult.error.message}`);
      setLoadingPage(false);
      return;
    }

    setPlayers(playersResult.data ?? []);
    setGuestHoopers(guestResult.data ?? []);
    setMatches(matchesResult.data ?? []);
    setLoadingPage(false);
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function updateField<K extends keyof OneOnOneForm>(
    field: K,
    value: OneOnOneForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function getFacktsPlayer(playerId: string) {
    return players.find((player) => player.id === playerId) ?? null;
  }

  function getGuestHooper(guestId: string) {
    return guestHoopers.find((guest) => guest.id === guestId) ?? null;
  }

  function getCompetitor(type: string, facktsId?: string, guestId?: string) {
    if (type === "guest") {
      const guest = getGuestHooper(guestId ?? "");
      if (!guest) return null;

      return {
        id: guest.id,
        full_name: guest.full_name,
        nickname: guest.nickname,
        position: guest.position,
        photo_url: guest.photo_url,
        photo_position: guest.photo_position,
        label: "Guest Hooper",
        type: "guest",
      };
    }

    const player = getFacktsPlayer(facktsId ?? "");
    if (!player) return null;

    return {
      id: player.id,
      full_name: player.full_name,
      nickname: player.nickname,
      jersey_number: player.jersey_number,
      position: player.position,
      photo_url: player.photo_url,
      photo_position: player.photo_position,
      label: "FACKTS Player",
      type: "fackts",
    };
  }

  const selectedPlayerOne = useMemo(() => {
    return getCompetitor(
      form.player_one_type,
      form.player_one_id,
      form.guest_player_one_id
    );
  }, [
    players,
    guestHoopers,
    form.player_one_type,
    form.player_one_id,
    form.guest_player_one_id,
  ]);

  const selectedPlayerTwo = useMemo(() => {
    return getCompetitor(
      form.player_two_type,
      form.player_two_id,
      form.guest_player_two_id
    );
  }, [
    players,
    guestHoopers,
    form.player_two_type,
    form.player_two_id,
    form.guest_player_two_id,
  ]);

  function resetForm() {
    setForm(emptyForm);
    setEditingMatchId(null);
    setMessage("");
  }

  function startEdit(match: any) {
    const playerOneType = (match.player_one_type ?? "fackts") as CompetitorType;
    const playerTwoType = (match.player_two_type ?? "fackts") as CompetitorType;

    setEditingMatchId(match.id);

    setForm({
      player_one_type: playerOneType,
      player_one_id: match.player_one_id ?? "",
      guest_player_one_id: match.guest_player_one_id ?? "",

      player_two_type: playerTwoType,
      player_two_id: match.player_two_id ?? "",
      guest_player_two_id: match.guest_player_two_id ?? "",

      match_date: match.match_date ?? "",
      venue: match.venue ?? "",
      status: match.status ?? "upcoming",
      player_one_score: match.player_one_score?.toString() ?? "",
      player_two_score: match.player_two_score?.toString() ?? "",
      poster_url: match.poster_url ?? "",
      poster_position: match.poster_position ?? "center center",
      notes: match.notes ?? "",
    });

    setMessage("Editing 1-on-1 matchup. Make changes above, then click Update Match.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePosterUpload(file: File) {
    if (!file) return;

    setUploadingPoster(true);
    setMessage("");

    const fileExt = file.name.split(".").pop();
    const cleanName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const playerOneName = selectedPlayerOne?.full_name ?? "player-one";
    const playerTwoName = selectedPlayerTwo?.full_name ?? "player-two";

    const safeMatchName = `${playerOneName}-vs-${playerTwoName}`
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();

    const filePath = `one-on-one/${Date.now()}-${safeMatchName}-${cleanName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-posters")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setMessage(`Poster upload failed: ${uploadError.message}`);
      setUploadingPoster(false);
      return;
    }

    const { data } = supabase.storage.from("game-posters").getPublicUrl(filePath);

    updateField("poster_url", data.publicUrl);
    setMessage("Poster uploaded successfully. Remember to click Create Match or Update Match.");
    setUploadingPoster(false);
  }

  function validateCompetitors() {
    const sideOneId =
      form.player_one_type === "guest"
        ? form.guest_player_one_id
        : form.player_one_id;

    const sideTwoId =
      form.player_two_type === "guest"
        ? form.guest_player_two_id
        : form.player_two_id;

    if (!sideOneId) {
      return "Select Player One.";
    }

    if (!sideTwoId) {
      return "Select Player Two.";
    }

    if (form.player_one_type === form.player_two_type && sideOneId === sideTwoId) {
      return "Player One and Player Two cannot be the same person.";
    }

    return "";
  }

  async function handleSaveMatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const validationMessage = validateCompetitors();

    if (validationMessage) {
      setMessage(validationMessage);
      setLoading(false);
      return;
    }

    const payload = {
      player_one_type: form.player_one_type,
      player_one_id: form.player_one_type === "fackts" ? form.player_one_id : null,
      guest_player_one_id:
        form.player_one_type === "guest" ? form.guest_player_one_id : null,

      player_two_type: form.player_two_type,
      player_two_id: form.player_two_type === "fackts" ? form.player_two_id : null,
      guest_player_two_id:
        form.player_two_type === "guest" ? form.guest_player_two_id : null,

      match_date: form.match_date || null,
      venue: form.venue.trim() || null,
      status: form.status || "upcoming",
      player_one_score:
        form.player_one_score === "" ? null : Number(form.player_one_score),
      player_two_score:
        form.player_two_score === "" ? null : Number(form.player_two_score),
      poster_url: form.poster_url.trim() || null,
      poster_position: form.poster_position || "center center",
      notes: form.notes.trim() || null,
    };

    if (editingMatchId) {
      const result = await supabase
        .from("one_on_one_games")
        .update(payload)
        .eq("id", editingMatchId);

      if (result.error) {
        setMessage(`Failed to update match: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("1-on-1 match updated successfully.");
    } else {
      const result = await supabase.from("one_on_one_games").insert([payload]);

      if (result.error) {
        setMessage(`Failed to create match: ${result.error.message}`);
        setLoading(false);
        return;
      }

      setMessage("1-on-1 match created successfully.");
    }

    resetForm();
    await loadPageData();
    setLoading(false);
  }

  async function handleDeleteMatch(matchId: string) {
    const yes = window.confirm("Delete this 1-on-1 match?");
    if (!yes) return;

    const result = await supabase
      .from("one_on_one_games")
      .delete()
      .eq("id", matchId);

    if (result.error) {
      setMessage(`Failed to delete match: ${result.error.message}`);
      return;
    }

    setMessage("1-on-1 match deleted.");
    await loadPageData();
  }

  function getMatchCompetitorOne(match: any) {
    return getCompetitor(
      match.player_one_type ?? "fackts",
      match.player_one_id ?? "",
      match.guest_player_one_id ?? ""
    );
  }

  function getMatchCompetitorTwo(match: any) {
    return getCompetitor(
      match.player_two_type ?? "fackts",
      match.player_two_id ?? "",
      match.guest_player_two_id ?? ""
    );
  }

  function getResultLabel(match: any) {
    if (match.status === "upcoming") return "UPCOMING";

    if (
      match.player_one_score === null ||
      match.player_two_score === null ||
      match.player_one_score === undefined ||
      match.player_two_score === undefined
    ) {
      return "COMPLETED";
    }

    const p1 = Number(match.player_one_score);
    const p2 = Number(match.player_two_score);
    const competitorOne = getMatchCompetitorOne(match);
    const competitorTwo = getMatchCompetitorTwo(match);

    if (p1 > p2) return `${competitorOne?.full_name ?? "Player One"} WON`;
    if (p2 > p1) return `${competitorTwo?.full_name ?? "Player Two"} WON`;

    return "TIED";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Admin
          </Link>

          <div className="mt-4 text-sm uppercase tracking-[0.25em] text-orange-300">
            FACKTS Admin
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            1-on-1 Matchups
          </h1>

          <p className="mt-3 text-slate-400">
            Create FACKTS vs FACKTS, FACKTS vs Guest, or Guest vs Guest 1-on-1 battles.
          </p>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        {loadingPage ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading 1-on-1 games...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-orange-300">
                    {editingMatchId ? "Edit Match" : "New Match"}
                  </div>
                  <h2 className="mt-1 text-2xl font-bold">
                    {editingMatchId ? "Update 1-on-1 Match" : "Create 1-on-1 Match"}
                  </h2>
                </div>

                {editingMatchId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSaveMatch} className="space-y-4">
                <CompetitorSelector
                  title="Player One"
                  competitorType={form.player_one_type}
                  facktsPlayerId={form.player_one_id}
                  guestHooperId={form.guest_player_one_id}
                  players={players}
                  guestHoopers={guestHoopers}
                  onTypeChange={(value) => {
                    updateField("player_one_type", value as CompetitorType);
                    updateField("player_one_id", "");
                    updateField("guest_player_one_id", "");
                  }}
                  onFacktsChange={(value) => updateField("player_one_id", value)}
                  onGuestChange={(value) => updateField("guest_player_one_id", value)}
                />

                <CompetitorSelector
                  title="Player Two"
                  competitorType={form.player_two_type}
                  facktsPlayerId={form.player_two_id}
                  guestHooperId={form.guest_player_two_id}
                  players={players}
                  guestHoopers={guestHoopers}
                  onTypeChange={(value) => {
                    updateField("player_two_type", value as CompetitorType);
                    updateField("player_two_id", "");
                    updateField("guest_player_two_id", "");
                  }}
                  onFacktsChange={(value) => updateField("player_two_id", value)}
                  onGuestChange={(value) => updateField("guest_player_two_id", value)}
                />

                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-3 text-sm uppercase tracking-wide text-orange-300">
                    Match Preview
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
                    <CompetitorPreview competitor={selectedPlayerOne} fallback="Player One" />
                    <div className="text-center text-2xl font-black text-orange-300">
                      VS
                    </div>
                    <CompetitorPreview competitor={selectedPlayerTwo} fallback="Player Two" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Match Date"
                    value={form.match_date}
                    onChange={(v) => updateField("match_date", v)}
                    type="date"
                  />

                  <FormInput
                    label="Venue"
                    value={form.venue}
                    onChange={(v) => updateField("venue", v)}
                  />
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Status
                  </div>
                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Player One Score"
                    value={form.player_one_score}
                    onChange={(v) => updateField("player_one_score", v)}
                    type="number"
                  />

                  <FormInput
                    label="Player Two Score"
                    value={form.player_two_score}
                    onChange={(v) => updateField("player_two_score", v)}
                    type="number"
                  />
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Upload 1-on-1 Poster
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePosterUpload(file);
                    }}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300"
                  />

                  {uploadingPoster ? (
                    <div className="mt-3 text-sm text-orange-300">
                      Uploading poster...
                    </div>
                  ) : null}

                  {form.poster_url ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Poster Preview
                      </div>

                      <img
                        src={form.poster_url}
                        alt="1-on-1 poster preview"
                        className="h-72 w-full rounded-2xl border border-slate-700 object-cover"
                        style={{ objectPosition: form.poster_position }}
                      />

                      <div className="mt-3 text-sm text-slate-500">
                        Poster uploaded. Adjust focus below if needed, then save.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
                      No poster uploaded yet.
                    </div>
                  )}
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-300">
                    Poster Focus Position
                  </div>
                  <select
                    value={form.poster_position}
                    onChange={(e) => updateField("poster_position", e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
                  >
                    {imagePositions.map((position) => (
                      <option key={position.value} value={position.value}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                </label>

                <FormTextarea
                  label="Notes"
                  value={form.notes}
                  onChange={(v) => updateField("notes", v)}
                />

                <button
                  type="submit"
                  disabled={loading || uploadingPoster}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {loading
                    ? "Saving..."
                    : editingMatchId
                    ? "Update Match"
                    : "Create Match"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
              <div className="mb-5">
                <div className="text-sm uppercase tracking-wide text-orange-300">
                  Match List
                </div>
                <h2 className="mt-1 text-2xl font-bold">All 1-on-1 Games</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Edit upcoming or completed 1-on-1 battles.
                </p>
              </div>

              {matches.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
                  No 1-on-1 games created yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => {
                    const competitorOne = getMatchCompetitorOne(match);
                    const competitorTwo = getMatchCompetitorTwo(match);
                    const resultLabel = getResultLabel(match);

                    return (
                      <div
                        key={match.id}
                        className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
                      >
                        {match.poster_url ? (
                          <img
                            src={match.poster_url}
                            alt="1-on-1 poster"
                            className="h-56 w-full object-cover"
                            style={{
                              objectPosition:
                                match.poster_position ?? "center center",
                            }}
                          />
                        ) : null}

                        <div className="p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-slate-950">
                              {match.status === "upcoming"
                                ? "UPCOMING"
                                : "COMPLETED"}
                            </div>

                            <div className="text-sm text-slate-400">
                              {match.match_date ?? "Date TBA"} •{" "}
                              {match.venue ?? "Venue TBA"}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-[1fr,auto,1fr] sm:items-center">
                            <CompetitorPreview competitor={competitorOne} fallback="Player One" />

                            <div className="text-center">
                              <div className="text-2xl font-black text-orange-300">
                                VS
                              </div>
                              {match.status === "completed" ? (
                                <div className="mt-2 text-sm font-bold text-white">
                                  {match.player_one_score ?? 0} -{" "}
                                  {match.player_two_score ?? 0}
                                </div>
                              ) : null}
                            </div>

                            <CompetitorPreview competitor={competitorTwo} fallback="Player Two" />
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
                            {resultLabel}
                          </div>

                          {match.notes ? (
                            <div className="mt-3 text-sm text-slate-500">
                              {match.notes}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(match)}
                              className="rounded-2xl border border-orange-500/40 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-500/10"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMatch(match.id)}
                              className="rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function CompetitorSelector({
  title,
  competitorType,
  facktsPlayerId,
  guestHooperId,
  players,
  guestHoopers,
  onTypeChange,
  onFacktsChange,
  onGuestChange,
}: {
  title: string;
  competitorType: CompetitorType;
  facktsPlayerId: string;
  guestHooperId: string;
  players: any[];
  guestHoopers: any[];
  onTypeChange: (value: string) => void;
  onFacktsChange: (value: string) => void;
  onGuestChange: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 text-sm uppercase tracking-wide text-orange-300">
        {title}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-sm font-medium text-slate-300">
            Competitor Type
          </div>

          <select
            value={competitorType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-orange-400"
          >
            <option value="fackts">FACKTS Player</option>
            <option value="guest">Guest Hooper</option>
          </select>
        </label>

        {competitorType === "guest" ? (
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-300">
              Select Guest Hooper
            </div>

            <select
              value={guestHooperId}
              onChange={(e) => onGuestChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-orange-400"
            >
              <option value="">Select guest hooper</option>
              {guestHoopers.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.full_name} {guest.position ? `• ${guest.position}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-300">
              Select FACKTS Player
            </div>

            <select
              value={facktsPlayerId}
              onChange={(e) => onFacktsChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-orange-400"
            >
              <option value="">Select FACKTS player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  #{player.jersey_number ?? "—"} {player.full_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

function CompetitorPreview({
  competitor,
  fallback,
}: {
  competitor: any;
  fallback: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      {competitor?.photo_url ? (
        <img
          src={competitor.photo_url}
          alt={competitor.full_name}
          className="h-14 w-14 rounded-2xl border border-slate-700 object-cover"
          style={{
            objectPosition: competitor.photo_position ?? "center center",
          }}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
          🏀
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate font-bold">
          {competitor
            ? `${
                competitor.jersey_number ? `#${competitor.jersey_number} ` : ""
              }${competitor.full_name}`
            : fallback}
        </div>

        <div className="mt-1 text-xs text-slate-400">
          {competitor?.label ?? "Select competitor"} •{" "}
          {competitor?.position ?? "Position TBA"}
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"
      />
    </label>
  );
}