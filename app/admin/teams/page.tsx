"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TeamRow = Record<string, unknown> & {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  team_type?: string | null;
  logo_url?: string | null;
  city?: string | null;
  verification_status?: string | null;
  claim_status?: string | null;
  is_public?: boolean | null;
};

type PersonOption = {
  key: string;
  source: "player" | "guest";
  id: string;
  name: string;
  nickname: string;
  position: string;
  photoUrl: string;
};

type GameOption = Record<string, unknown> & { id: string };
type EventOption = { event_id: string; title: string; slug: string };
type AttachedRow = Record<string, unknown> & { id: string; title?: string | null; display_name?: string | null };
type ClaimRow = AttachedRow & {
  requester_name?: string | null;
  work_email?: string | null;
  role?: string | null;
  request_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  message?: string | null;
};

type ProfileForm = {
  name: string;
  short_name: string;
  slug: string;
  tagline: string;
  organization_name: string;
  team_type: string;
  division: string;
  age_category: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  primary_color: string;
  secondary_color: string;
  city: string;
  country: string;
  founded_year: string;
  current_competition: string;
  coach_name: string;
  assistant_coach_name: string;
  manager_name: string;
  manager_title: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  instagram_url: string;
  aliases: string;
  verification_status: string;
  verified_by: string;
  claim_status: string;
  is_featured: boolean;
  is_public: boolean;
  display_order: string;
};

const emptyProfile: ProfileForm = {
  name: "",
  short_name: "",
  slug: "",
  tagline: "",
  organization_name: "",
  team_type: "basketball_team",
  division: "",
  age_category: "",
  description: "",
  logo_url: "",
  cover_image_url: "",
  primary_color: "#0B1F3A",
  secondary_color: "#F58220",
  city: "Nairobi",
  country: "Kenya",
  founded_year: "",
  current_competition: "",
  coach_name: "",
  assistant_coach_name: "",
  manager_name: "",
  manager_title: "Team Manager",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  instagram_url: "",
  aliases: "",
  verification_status: "unverified",
  verified_by: "",
  claim_status: "unclaimed",
  is_featured: false,
  is_public: true,
  display_order: "100",
};

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nameOf(row: Record<string, unknown>) {
  return clean(row.full_name) || clean(row.name) || clean(row.guest_name) || clean(row.nickname) || "Unnamed player";
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return value === "" || value === null || value === undefined || !Number.isFinite(parsed) ? null : parsed;
}

function scoreValue(row: GameOption, side: "home" | "away") {
  const values = side === "home"
    ? [row.home_score, row.team_score, row.fackts_score]
    : [row.away_score, row.opponent_score];
  for (const value of values) {
    const parsed = optionalNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function profileForm(row: TeamRow): ProfileForm {
  return {
    name: clean(row.name),
    short_name: clean(row.short_name),
    slug: clean(row.slug),
    tagline: clean(row.tagline),
    organization_name: clean(row.organization_name),
    team_type: clean(row.team_type) || "basketball_team",
    division: clean(row.division),
    age_category: clean(row.age_category),
    description: clean(row.description),
    logo_url: clean(row.logo_url),
    cover_image_url: clean(row.cover_image_url),
    primary_color: clean(row.primary_color) || "#0B1F3A",
    secondary_color: clean(row.secondary_color) || "#F58220",
    city: clean(row.city),
    country: clean(row.country) || "Kenya",
    founded_year: clean(row.founded_year),
    current_competition: clean(row.current_competition),
    coach_name: clean(row.coach_name),
    assistant_coach_name: clean(row.assistant_coach_name),
    manager_name: clean(row.manager_name),
    manager_title: clean(row.manager_title) || "Team Manager",
    contact_email: clean(row.contact_email),
    contact_phone: clean(row.contact_phone),
    website_url: clean(row.website_url),
    instagram_url: clean(row.instagram_url),
    aliases: Array.isArray(row.aliases) ? row.aliases.map(String).join(", ") : clean(row.aliases),
    verification_status: clean(row.verification_status) || "unverified",
    verified_by: clean(row.verified_by),
    claim_status: clean(row.claim_status) || "unclaimed",
    is_featured: row.is_featured === true,
    is_public: row.is_public !== false,
    display_order: clean(row.display_order) || "100",
  };
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<TeamRow | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [games, setGames] = useState<GameOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [roster, setRoster] = useState<AttachedRow[]>([]);
  const [teamGames, setTeamGames] = useState<AttachedRow[]>([]);
  const [teamEvents, setTeamEvents] = useState<AttachedRow[]>([]);
  const [training, setTraining] = useState<AttachedRow[]>([]);
  const [media, setMedia] = useState<AttachedRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredTeams = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return teams.filter((team) => `${team.name} ${clean(team.short_name)} ${clean(team.city)} ${clean(team.team_type)}`.toLowerCase().includes(needle));
  }, [query, teams]);

  async function loadAttached(teamId: string) {
    const results = await Promise.all([
      supabase.from("team_roster_members").select("*").eq("team_id", teamId).order("display_order"),
      supabase.from("team_games").select("*").eq("team_id", teamId).order("game_date", { ascending: false }),
      supabase.from("team_event_links").select("*").eq("team_id", teamId).order("display_order"),
      supabase.from("team_training_sessions").select("*").eq("team_id", teamId).order("session_date", { ascending: false }),
      supabase.from("team_media").select("*").eq("team_id", teamId).order("display_order"),
      supabase.from("team_profile_claims").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setError("Run the complete Teams SQL migration before managing team records.");
      setRoster([]); setTeamGames([]); setTeamEvents([]); setTraining([]); setMedia([]); setClaims([]);
      return;
    }
    setRoster((results[0].data || []) as AttachedRow[]);
    setTeamGames((results[1].data || []) as AttachedRow[]);
    setTeamEvents((results[2].data || []) as AttachedRow[]);
    setTraining((results[3].data || []) as AttachedRow[]);
    setMedia((results[4].data || []) as AttachedRow[]);
    setClaims((results[5].data || []) as ClaimRow[]);
  }

  function chooseTeam(team: TeamRow) {
    setSelected(team);
    setForm(profileForm(team));
    setMessage("");
    setError("");
    void loadAttached(team.id);
  }

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    const [teamsResult, playersResult, guestsResult, gamesResult, eventsResult] = await Promise.all([
      supabase.from("team_profiles").select("*").order("display_order"),
      supabase.from("players").select("*").eq("is_active", true).order("full_name"),
      supabase.from("guest_hoopers").select("*").eq("is_active", true).order("full_name"),
      supabase.from("games").select("*").order("game_date", { ascending: false }).limit(250),
      supabase.from("event_case_studies").select("event_id,title,slug").eq("is_public", true).order("start_date", { ascending: false }),
    ]);
    if (teamsResult.error) {
      setError("Teams Admin needs the complete Teams SQL migration before it can load.");
      setLoading(false);
      return;
    }
    const nextTeams = (teamsResult.data || []) as TeamRow[];
    const playerOptions = ((playersResult.data || []) as Record<string, unknown>[]).map((row) => ({ key: `player:${row.id}`, source: "player" as const, id: String(row.id), name: nameOf(row), nickname: clean(row.nickname), position: clean(row.position || row.role), photoUrl: clean(row.photo_url) }));
    const guestOptions = ((guestsResult.data || []) as Record<string, unknown>[]).map((row) => ({ key: `guest:${row.id}`, source: "guest" as const, id: String(row.id), name: nameOf(row), nickname: clean(row.nickname), position: clean(row.position || row.guest_type), photoUrl: clean(row.photo_url) }));
    setTeams(nextTeams);
    setPeople([...playerOptions, ...guestOptions].sort((a, b) => a.name.localeCompare(b.name)));
    setGames((gamesResult.data || []) as GameOption[]);
    setEvents((eventsResult.data || []) as EventOption[]);
    const next = nextTeams.find((team) => team.id === selected?.id) || nextTeams[0] || null;
    if (next) chooseTeam(next);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
    // The initial workspace load is mount-only. Explicit writes refresh the
    // affected records without resetting the active team.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNewTeam() {
    setSelected(null);
    setForm(emptyProfile);
    setRoster([]); setTeamGames([]); setTeamEvents([]); setTraining([]); setMedia([]); setClaims([]);
    setMessage("");
    setError("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) return setError("Team name and a valid slug are required.");
    setSaving(true); setError(""); setMessage("");
    const payload = {
      name,
      slug,
      short_name: form.short_name.trim() || null,
      tagline: form.tagline.trim() || null,
      organization_name: form.organization_name.trim() || null,
      team_type: form.team_type,
      division: form.division.trim() || null,
      age_category: form.age_category.trim() || null,
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      primary_color: form.primary_color || "#0B1F3A",
      secondary_color: form.secondary_color || "#F58220",
      city: form.city.trim() || null,
      country: form.country.trim() || "Kenya",
      founded_year: optionalNumber(form.founded_year),
      current_competition: form.current_competition.trim() || null,
      coach_name: form.coach_name.trim() || null,
      assistant_coach_name: form.assistant_coach_name.trim() || null,
      manager_name: form.manager_name.trim() || null,
      manager_title: form.manager_title.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      website_url: form.website_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      aliases: form.aliases.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
      verification_status: form.verification_status,
      verified_at: form.verification_status === "verified" ? new Date().toISOString() : null,
      verified_by: form.verified_by.trim() || null,
      claim_status: form.claim_status,
      is_featured: form.is_featured,
      is_public: form.is_public,
      display_order: optionalNumber(form.display_order) ?? 100,
      updated_at: new Date().toISOString(),
    };
    const result = selected
      ? await supabase.from("team_profiles").update(payload).eq("id", selected.id).select().single()
      : await supabase.from("team_profiles").insert(payload).select().single();
    if (result.error || !result.data) {
      setError(result.error?.message || "Team profile could not be saved.");
      setSaving(false);
      return;
    }
    const saved = result.data as TeamRow;
    setTeams((current) => [...current.filter((team) => team.id !== saved.id), saved].sort((a, b) => Number(a.display_order || 100) - Number(b.display_order || 100)));
    setSelected(saved);
    setForm(profileForm(saved));
    if (!selected) await loadAttached(saved.id);
    setMessage(selected ? "Team profile updated." : "Permanent team profile created.");
    setSaving(false);
  }

  async function addRosterMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const sourceKey = clean(data.get("person"));
    const person = people.find((item) => item.key === sourceKey);
    const manualName = clean(data.get("display_name"));
    const displayName = person?.name || manualName;
    if (!displayName) return setError("Choose a player or enter a team member name.");
    const result = await supabase.from("team_roster_members").insert({
      team_id: selected.id,
      player_id: person?.source === "player" ? person.id : null,
      guest_hooper_id: person?.source === "guest" ? person.id : null,
      display_name: displayName,
      nickname: person?.nickname || clean(data.get("nickname")) || null,
      jersey_number: clean(data.get("jersey_number")) || null,
      position: person?.position || clean(data.get("position")) || null,
      role: clean(data.get("role")) || "Player",
      photo_url: person?.photoUrl || clean(data.get("photo_url")) || null,
      status: clean(data.get("status")) || "active",
      is_captain: data.get("is_captain") === "on",
      is_public: true,
    });
    if (result.error) return setError(result.error.message);
    formElement.reset(); setMessage("Roster member added."); await loadAttached(selected.id);
  }

  async function addGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const gameId = clean(data.get("game_id"));
    const linked = games.find((game) => game.id === gameId);
    const side = clean(data.get("home_away")) === "away" ? "away" : "home";
    const opponentName = linked
      ? clean(side === "home" ? linked.away_team_name || linked.opponent || linked.opponent_name : linked.home_team_name)
      : clean(data.get("opponent_name"));
    if (!opponentName) return setError("Choose an existing game or enter an opponent.");
    const teamScore = linked ? scoreValue(linked, side) : optionalNumber(data.get("team_score"));
    const opponentScore = linked ? scoreValue(linked, side === "home" ? "away" : "home") : optionalNumber(data.get("opponent_score"));
    if (teamScore !== null && opponentScore !== null && teamScore === opponentScore) {
      return setError("A completed basketball result must have a winner. Enter the overtime final score.");
    }
    const resultCode = teamScore === null || opponentScore === null ? null : teamScore > opponentScore ? "W" : "L";
    const result = await supabase.from("team_games").insert({
      team_id: selected.id,
      game_id: linked?.id || null,
      event_id: clean(linked?.event_id || data.get("event_id")) || null,
      title: clean(linked?.game_title || linked?.title || data.get("title")) || `${selected.name} vs ${opponentName}`,
      competition_name: clean(linked?.competition_name || linked?.match_type || data.get("competition_name")) || null,
      opponent_name: opponentName,
      game_date: clean(linked?.game_date || linked?.date || data.get("game_date")) || null,
      venue: clean(linked?.venue || linked?.court || data.get("venue")) || null,
      status: clean(linked?.status || data.get("status")) || (resultCode ? "completed" : "scheduled"),
      team_score: teamScore,
      opponent_score: opponentScore,
      result: resultCode,
      home_away: side,
      image_url: clean(linked?.poster_url || linked?.image_url) || null,
      is_public: true,
    });
    if (result.error) return setError(result.error.message);
    formElement.reset(); setMessage("Team game linked."); await loadAttached(selected.id);
  }

  async function addEventLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const eventId = clean(data.get("event_id"));
    if (!eventId) return setError("Choose a published event.");
    const result = await supabase.from("team_event_links").upsert({
      team_id: selected.id,
      event_id: eventId,
      participation_status: clean(data.get("participation_status")) || "recorded",
      division: clean(data.get("division")) || null,
      final_position: clean(data.get("final_position")) || null,
      is_public: true,
    }, { onConflict: "team_id,event_id" });
    if (result.error) return setError(result.error.message);
    formElement.reset(); setMessage("Event participation linked."); await loadAttached(selected.id);
  }

  async function addTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const title = clean(data.get("title"));
    if (!title) return setError("Training-session title is required.");
    const result = await supabase.from("team_training_sessions").insert({ team_id: selected.id, title, session_date: clean(data.get("session_date")) || null, venue: clean(data.get("venue")) || null, focus_area: clean(data.get("focus_area")) || null, summary: clean(data.get("summary")) || null, image_url: clean(data.get("image_url")) || null, is_public: true });
    if (result.error) return setError(result.error.message);
    formElement.reset(); setMessage("Training update published."); await loadAttached(selected.id);
  }

  async function addMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const title = clean(data.get("title"));
    const url = clean(data.get("url"));
    if (!title || !url) return setError("Media title and URL are required.");
    const result = await supabase.from("team_media").insert({ team_id: selected.id, title, url, media_type: clean(data.get("media_type")) || "video", thumbnail_url: clean(data.get("thumbnail_url")) || null, platform: clean(data.get("platform")) || null, rights_status: clean(data.get("rights_status")) || "approved", publish_status: "published", is_public: true, published_at: new Date().toISOString() });
    if (result.error) return setError(result.error.message);
    formElement.reset(); setMessage("Team media published."); await loadAttached(selected.id);
  }

  async function removeAttached(table: "team_roster_members" | "team_games" | "team_event_links" | "team_training_sessions" | "team_media", id: string) {
    if (!selected || !window.confirm("Remove this item from the permanent team profile?")) return;
    const result = await supabase.from(table).delete().eq("id", id);
    if (result.error) return setError(result.error.message);
    setMessage("Team profile item removed."); await loadAttached(selected.id);
  }

  async function reviewClaim(claim: ClaimRow, status: "approved" | "rejected") {
    if (!selected || !window.confirm(`${status === "approved" ? "Approve" : "Reject"} this team-profile request?`)) return;
    const reviewer = window.prompt("Reviewer name or short decision note:", "FACKTS Admin") || "FACKTS Admin";
    const result = await supabase.from("team_profile_claims").update({ status, admin_response: reviewer, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", claim.id);
    if (result.error) return setError(result.error.message);
    if (status === "approved") await supabase.from("team_profiles").update({ claim_status: "claimed", updated_at: new Date().toISOString() }).eq("id", selected.id);
    setMessage(`Team request ${status}.`); await loadAttached(selected.id);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_36%),#050b16]">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Teams administration</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.035em] sm:text-5xl">Permanent team manager</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">Create organization profiles, connect existing players and Match Centres, publish training and media, record event participation, verify teams and review ownership requests. Event-only teams stay in Events Admin.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[330px_1fr] lg:px-8">
        <aside className="h-fit rounded-[1.5rem] border border-white/10 bg-zinc-950 p-4 lg:sticky lg:top-24">
          <button type="button" onClick={startNewTeam} className="mb-3 w-full rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black">+ New permanent team</button>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permanent teams" className={inputClass}/>
          <div className="mt-4 max-h-[68vh] space-y-2 overflow-y-auto pr-1">
            {loading ? <Empty text="Loading teams..."/> : filteredTeams.map((team) => <button key={team.id} type="button" onClick={() => chooseTeam(team)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected?.id === team.id ? "border-orange-400/60 bg-orange-500/10" : "border-white/10 bg-black/35 hover:border-white/25"}`}><span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-xs font-black text-orange-300">{team.logo_url ? <img src={clean(team.logo_url)} alt="" className="h-full w-full object-cover"/> : team.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-black">{team.name}</span><span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">{clean(team.verification_status) || "unverified"} · {team.is_public === false ? "hidden" : "public"}</span></span></button>)}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {message ? <Notice tone="success" text={message}/> : null}
          {error ? <Notice tone="error" text={error}/> : null}

          <form onSubmit={saveProfile} className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><FormHeading kicker="Identity and governance" title={selected ? selected.name : "Create permanent team"}/>{selected ? <Link href={`/teams/${selected.slug}`} className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[.12em] hover:border-orange-400">Open public profile</Link> : null}</div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Team name *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: form.slug || slugify(event.target.value) })} className={inputClass}/></Field>
              <Field label="Public slug *"><input value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} className={inputClass}/></Field>
              <Field label="Short name"><input value={form.short_name} onChange={(event) => setForm({ ...form, short_name: event.target.value })} className={inputClass}/></Field>
              <Field label="Organization"><input value={form.organization_name} onChange={(event) => setForm({ ...form, organization_name: event.target.value })} className={inputClass}/></Field>
              <Field label="Team type"><select value={form.team_type} onChange={(event) => setForm({ ...form, team_type: event.target.value })} className={inputClass}><option value="basketball_team">Basketball team</option><option value="corporate_team">Corporate team</option><option value="club">Club</option><option value="school_team">School team</option><option value="academy">Academy</option><option value="community_team">Community team</option><option value="FACKTS organization team">FACKTS organization team</option></select></Field>
              <Field label="Current competition"><input value={form.current_competition} onChange={(event) => setForm({ ...form, current_competition: event.target.value })} className={inputClass}/></Field>
              <Field label="Division"><input value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value })} className={inputClass} placeholder="Men, Women, Mixed..."/></Field>
              <Field label="Age category"><input value={form.age_category} onChange={(event) => setForm({ ...form, age_category: event.target.value })} className={inputClass} placeholder="Senior, U18, Open..."/></Field>
              <Field label="City"><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className={inputClass}/></Field>
              <Field label="Country"><input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className={inputClass}/></Field>
              <Field label="Founded year"><input type="number" value={form.founded_year} onChange={(event) => setForm({ ...form, founded_year: event.target.value })} className={inputClass}/></Field>
              <Field label="Search aliases"><input value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} className={inputClass} placeholder="ABSA, ABSA Basketball"/></Field>
              <Field label="Public headline"><input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} className={inputClass}/></Field>
              <Field label="Display order"><input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} className={inputClass}/></Field>
              <Field label="Logo URL"><input value={form.logo_url} onChange={(event) => setForm({ ...form, logo_url: event.target.value })} className={inputClass}/></Field>
              <Field label="Cover image URL"><input value={form.cover_image_url} onChange={(event) => setForm({ ...form, cover_image_url: event.target.value })} className={inputClass}/></Field>
              <Field label="Primary colour"><input type="color" value={form.primary_color} onChange={(event) => setForm({ ...form, primary_color: event.target.value })} className={inputClass}/></Field>
              <Field label="Secondary colour"><input type="color" value={form.secondary_color} onChange={(event) => setForm({ ...form, secondary_color: event.target.value })} className={inputClass}/></Field>
            </div>
            <Field label="Team description"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className={`${inputClass} mt-4 h-auto py-3`}/></Field>

            <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              <Field label="Head coach"><input value={form.coach_name} onChange={(event) => setForm({ ...form, coach_name: event.target.value })} className={inputClass}/></Field>
              <Field label="Assistant coach"><input value={form.assistant_coach_name} onChange={(event) => setForm({ ...form, assistant_coach_name: event.target.value })} className={inputClass}/></Field>
              <Field label="Manager name"><input value={form.manager_name} onChange={(event) => setForm({ ...form, manager_name: event.target.value })} className={inputClass}/></Field>
              <Field label="Manager title"><input value={form.manager_title} onChange={(event) => setForm({ ...form, manager_title: event.target.value })} className={inputClass}/></Field>
              <Field label="Public email"><input type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} className={inputClass}/></Field>
              <Field label="Contact phone"><input value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} className={inputClass}/></Field>
              <Field label="Website"><input value={form.website_url} onChange={(event) => setForm({ ...form, website_url: event.target.value })} className={inputClass}/></Field>
              <Field label="Instagram"><input value={form.instagram_url} onChange={(event) => setForm({ ...form, instagram_url: event.target.value })} className={inputClass}/></Field>
            </div>

            <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              <Field label="Verification"><select value={form.verification_status} onChange={(event) => setForm({ ...form, verification_status: event.target.value })} className={inputClass}><option value="unverified">Unverified</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="disputed">Disputed</option></select></Field>
              <Field label="Verified by"><input value={form.verified_by} onChange={(event) => setForm({ ...form, verified_by: event.target.value })} className={inputClass}/></Field>
              <Field label="Profile ownership"><select value={form.claim_status} onChange={(event) => setForm({ ...form, claim_status: event.target.value })} className={inputClass}><option value="unclaimed">Unclaimed</option><option value="pending">Pending</option><option value="claimed">Claimed</option><option value="restricted">Restricted</option></select></Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-4"><Check label="Public profile" checked={form.is_public} onChange={(checked) => setForm({ ...form, is_public: checked })}/><Check label="Featured team" checked={form.is_featured} onChange={(checked) => setForm({ ...form, is_featured: checked })}/></div>
            <button disabled={saving} className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black disabled:opacity-50">{saving ? "Saving..." : selected ? "Save team profile" : "Create permanent team"}</button>
          </form>

          {selected ? <>
            <ManagerSection kicker="People" title="Permanent roster" description="Link an existing official player or guest hooper. Use a manual name only for team staff or someone without a public profile.">
              <form onSubmit={addRosterMember} className="grid gap-3 sm:grid-cols-2"><select name="person" className={inputClass}><option value="">Manual / unlisted member</option>{people.map((person) => <option key={person.key} value={person.key}>{person.name} · {person.source === "guest" ? "Guest" : "Official"}</option>)}</select><input name="display_name" placeholder="Manual display name" className={inputClass}/><input name="nickname" placeholder="Nickname" className={inputClass}/><input name="jersey_number" placeholder="Jersey number" className={inputClass}/><input name="position" placeholder="Position" className={inputClass}/><select name="role" className={inputClass}><option value="Player">Player</option><option value="Head Coach">Head Coach</option><option value="Assistant Coach">Assistant Coach</option><option value="Team Manager">Team Manager</option><option value="Physiotherapist">Physiotherapist</option><option value="Official">Official</option></select><select name="status" className={inputClass}><option value="active">Active</option><option value="inactive">Inactive</option><option value="alumni">Alumni</option></select><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/45 px-4 text-[9px] font-black uppercase"><input type="checkbox" name="is_captain" className="accent-orange-500"/> Team captain</label><button className={addButtonClass}>Add roster member</button></form>
              <AttachedGrid rows={roster} title={(row) => clean(row.display_name) || "Team member"} detail={(row) => `${clean(row.position || row.role) || "Member"} · ${clean(row.status) || "active"}`} onRemove={(id) => removeAttached("team_roster_members", id)}/>
            </ManagerSection>

            <ManagerSection kicker="Match record" title="Games and results" description="Choose an existing Match Centre whenever possible. Manual results remain available for older team records.">
              <form onSubmit={addGame} className="grid gap-3 sm:grid-cols-2"><select name="game_id" className={`${inputClass} sm:col-span-2`}><option value="">Manual / historical result</option>{games.map((game) => <option key={game.id} value={game.id}>{clean(game.game_title || game.title) || `${clean(game.home_team_name) || "FACKTS"} vs ${clean(game.away_team_name || game.opponent) || "Opponent"}`}</option>)}</select><select name="home_away" className={inputClass}><option value="home">Team is home side</option><option value="away">Team is away side</option></select><select name="event_id" className={inputClass}><option value="">No event link</option>{events.map((item) => <option key={item.event_id} value={item.event_id}>{item.title}</option>)}</select><input name="title" placeholder="Manual game title" className={inputClass}/><input name="opponent_name" placeholder="Manual opponent" className={inputClass}/><input name="competition_name" placeholder="Competition" className={inputClass}/><input type="datetime-local" name="game_date" className={inputClass}/><input name="venue" placeholder="Venue" className={inputClass}/><select name="status" className={inputClass}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select><input type="number" name="team_score" placeholder="Team score" className={inputClass}/><input type="number" name="opponent_score" placeholder="Opponent score" className={inputClass}/><button className={addButtonClass}>Link team game</button></form>
              <AttachedGrid rows={teamGames} title={(row) => clean(row.title) || `vs ${clean(row.opponent_name)}`} detail={(row) => `${clean(row.competition_name) || "Game"} · ${clean(row.team_score) || "–"}–${clean(row.opponent_score) || "–"}`} onRemove={(id) => removeAttached("team_games", id)}/>
            </ManagerSection>

            <ManagerSection kicker="Competition history" title="Event participation" description="This controlled link records a permanent team’s real participation. It does not promote other event entrants into Teams.">
              <form onSubmit={addEventLink} className="grid gap-3 sm:grid-cols-2"><select name="event_id" className={`${inputClass} sm:col-span-2`}><option value="">Choose published event</option>{events.map((item) => <option key={item.event_id} value={item.event_id}>{item.title}</option>)}</select><select name="participation_status" className={inputClass}><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="upcoming">Upcoming</option><option value="recorded">Recorded</option></select><input name="division" placeholder="Division" className={inputClass}/><input name="final_position" placeholder="Final position / outcome" className={inputClass}/><button className={addButtonClass}>Link event</button></form>
              <AttachedGrid rows={teamEvents} title={(row) => events.find((item) => item.event_id === clean(row.event_id))?.title || clean(row.event_id) || "Event"} detail={(row) => `${clean(row.participation_status) || "recorded"}${row.final_position ? ` · ${clean(row.final_position)}` : ""}`} onRemove={(id) => removeAttached("team_event_links", id)}/>
            </ManagerSection>

            <ManagerSection kicker="Development" title="Training updates" description="Publish only team sessions and images cleared for public use.">
              <form onSubmit={addTraining} className="grid gap-3 sm:grid-cols-2"><input name="title" placeholder="Session title *" className={inputClass}/><input type="datetime-local" name="session_date" className={inputClass}/><input name="focus_area" placeholder="Focus area" className={inputClass}/><input name="venue" placeholder="Venue" className={inputClass}/><input name="image_url" placeholder="Approved image URL" className={`${inputClass} sm:col-span-2`}/><textarea name="summary" rows={4} placeholder="Training summary" className={`${inputClass} h-auto py-3 sm:col-span-2`}/><button className={addButtonClass}>Publish training update</button></form>
              <AttachedGrid rows={training} title={(row) => clean(row.title) || "Training session"} detail={(row) => clean(row.focus_area || row.venue) || "Team development"} onRemove={(id) => removeAttached("team_training_sessions", id)}/>
            </ManagerSection>

            <ManagerSection kicker="Rights-aware coverage" title="Team media" description="Approved YouTube, Instagram, TikTok, Facebook, Vimeo and direct-video links play inside the team profile when embedding is supported.">
              <form onSubmit={addMedia} className="grid gap-3 sm:grid-cols-2"><input name="title" placeholder="Media title *" className={inputClass}/><select name="media_type" className={inputClass}><option value="highlight">Highlight</option><option value="full_game">Full game</option><option value="interview">Interview</option><option value="training">Training</option><option value="announcement">Announcement</option></select><input name="url" placeholder="Video or social media URL *" className={`${inputClass} sm:col-span-2`}/><input name="thumbnail_url" placeholder="Thumbnail URL" className={inputClass}/><input name="platform" placeholder="Platform" className={inputClass}/><select name="rights_status" className={`${inputClass} sm:col-span-2`}><option value="approved">Approved</option><option value="owned">FACKTS owned</option><option value="licensed">Licensed</option><option value="permission_pending">Permission pending</option></select><button className={addButtonClass}>Publish team media</button></form>
              <AttachedGrid rows={media} title={(row) => clean(row.title) || "Team media"} detail={(row) => `${clean(row.media_type) || "Media"} · ${clean(row.rights_status) || "Rights not set"}`} onRemove={(id) => removeAttached("team_media", id)}/>
            </ManagerSection>

            <ManagerSection kicker="Controlled access" title="Profile claims and updates" description="Never approve a request until the person’s relationship to the team or organization has been verified independently.">
              {claims.length ? <div className="grid gap-3">{claims.map((claim) => <article key={claim.id} className="rounded-xl border border-white/10 bg-black/35 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.13em] text-orange-300">{clean(claim.request_type) || "claim"} · {clean(claim.status) || "pending"}</p><h3 className="mt-2 font-black">{clean(claim.requester_name) || "Requester"}</h3><p className="mt-1 text-xs text-zinc-500">{clean(claim.role)} · {clean(claim.work_email)}</p>{claim.message ? <p className="mt-3 text-xs leading-5 text-zinc-400">{clean(claim.message)}</p> : null}</div>{claim.status === "pending" ? <div className="flex gap-2"><button type="button" onClick={() => reviewClaim(claim, "approved")} className="rounded-lg bg-emerald-500 px-3 py-2 text-[8px] font-black uppercase text-black">Approve</button><button type="button" onClick={() => reviewClaim(claim, "rejected")} className="rounded-lg bg-red-500/15 px-3 py-2 text-[8px] font-black uppercase text-red-200">Reject</button></div> : null}</div></article>)}</div> : <Empty text="No ownership or profile-update requests."/>}
            </ManagerSection>
          </> : <Empty text="Save the permanent team profile before adding its roster, games, events, training or media."/>}
        </div>
      </section>
    </main>
  );
}

const inputClass = "h-12 w-full rounded-xl border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400";
const addButtonClass = "rounded-xl bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black sm:col-span-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[8px] font-black uppercase tracking-[.13em] text-zinc-500">{label}</span>{children}</label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-[9px] font-black uppercase"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-orange-500"/>{label}</label>; }
function FormHeading({ kicker, title }: { kicker: string; title: string }) { return <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">{kicker}</p><h2 className="mt-2 text-2xl font-black uppercase">{title}</h2></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-500">{text}</div>; }
function Notice({ tone, text }: { tone: "success" | "error"; text: string }) { return <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>{text}</div>; }
function ManagerSection({ kicker, title, description, children }: { kicker: string; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-white/10 bg-zinc-950 p-5 sm:p-6"><FormHeading kicker={kicker} title={title}/><p className="mt-3 max-w-3xl text-xs leading-5 text-zinc-500">{description}</p><div className="mt-6">{children}</div></section>; }
function AttachedGrid({ rows, title, detail, onRemove }: { rows: AttachedRow[]; title: (row: AttachedRow) => string; detail: (row: AttachedRow) => string; onRemove: (id: string) => void }) { return rows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{rows.map((row) => <article key={row.id} className="rounded-xl border border-white/10 bg-black/35 p-4"><h3 className="font-black">{title(row)}</h3><p className="mt-2 text-[8px] font-bold uppercase tracking-[.1em] text-zinc-500">{detail(row)}</p><button type="button" onClick={() => onRemove(row.id)} className="mt-4 text-[8px] font-black uppercase tracking-[.12em] text-red-300">Remove</button></article>)}</div> : null; }
