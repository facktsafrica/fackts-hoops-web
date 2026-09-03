"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminPermission } from "@/app/components/AdminPermissionContext";
import { supabase } from "@/lib/supabase";

type FeatureSettings = {
  id: number;
  featured_team_id: string | null;
  featured_event_id: string | null;
  featured_competition_id: string | null;
  featured_player_id: string | null;
};

type Option = {
  id: string;
  label: string;
  detail: string;
  imageUrl?: string | null;
};

const EMPTY_SETTINGS: FeatureSettings = {
  id: 1,
  featured_team_id: null,
  featured_event_id: null,
  featured_competition_id: null,
  featured_player_id: null,
};

const CONTROL =
  "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400";

function name(value: unknown, fallback: string) {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export default function HomepageFeaturesAdminPage() {
  const { readOnly } = useAdminPermission();
  const [settings, setSettings] = useState<FeatureSettings>(EMPTY_SETTINGS);
  const [teams, setTeams] = useState<Option[]>([]);
  const [events, setEvents] = useState<Option[]>([]);
  const [competitions, setCompetitions] = useState<Option[]>([]);
  const [players, setPlayers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [settingsResult, teamsResult, eventsResult, competitionsResult, playersResult] =
      await Promise.all([
        supabase.from("homepage_feature_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("team_profiles")
          .select("id,name,short_name,logo_url,current_competition")
          .eq("is_public", true)
          .order("name"),
        supabase
          .from("event_case_studies")
          .select("event_id,title,start_date,poster_url")
          .eq("is_public", true)
          .eq("status", "published")
          .order("start_date", { ascending: false }),
        supabase
          .from("competitions")
          .select("id,name,current_season_label,cover_image_url")
          .eq("is_public", true)
          .order("name"),
        supabase
          .from("players")
          .select("id,full_name,name,nickname,position,current_team,photo_url")
          .eq("is_active", true)
          .order("full_name"),
      ]);

    if (settingsResult.error) {
      setMessage(
        "Homepage controls are not installed yet. Run migration 20260903_002_context_backfill_and_homepage_features.sql in Supabase, then refresh.",
      );
    } else {
      setSettings((settingsResult.data as FeatureSettings | null) || EMPTY_SETTINGS);
    }

    setTeams(
      (teamsResult.data || []).map((row) => ({
        id: String(row.id),
        label: name(row.name, "Unnamed team"),
        detail: name(row.current_competition, row.short_name || "Team profile"),
        imageUrl: row.logo_url,
      })),
    );
    setEvents(
      (eventsResult.data || []).map((row) => ({
        id: String(row.event_id),
        label: name(row.title, "Unnamed event"),
        detail: name(row.start_date, "Date not recorded"),
        imageUrl: row.poster_url,
      })),
    );
    setCompetitions(
      (competitionsResult.data || []).map((row) => ({
        id: String(row.id),
        label: name(row.name, "Unnamed competition"),
        detail: `${name(row.current_season_label, "Current")} season`,
        imageUrl: row.cover_image_url,
      })),
    );
    setPlayers(
      (playersResult.data || []).map((row) => ({
        id: String(row.id),
        label: name(row.full_name || row.name || row.nickname, "Unnamed player"),
        detail: [row.position, row.current_team].filter(Boolean).join(" · ") || "Player profile",
        imageUrl: row.photo_url,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function update(key: keyof FeatureSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value || null }));
  }

  async function save() {
    if (readOnly) return;
    setSaving(true);
    setMessage("");

    const result = await supabase.from("homepage_feature_settings").upsert({
      ...settings,
      id: 1,
      updated_at: new Date().toISOString(),
    });

    setMessage(
      result.error
        ? `Homepage features could not save: ${result.error.message}`
        : "Homepage features updated. The featured team’s latest completed game will follow automatically.",
    );
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#030914] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">
              FACKTS Admin · Public homepage
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Homepage Features</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Choose the exact team, event, competition and player promoted on the public homepage. Changing a selection never changes its underlying record.
            </p>
          </div>
          <Link href="/" className="rounded-xl border border-white/15 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[.12em]">
            View homepage
          </Link>
        </header>

        {message ? (
          <div className="mt-5 rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-8 text-sm text-zinc-500">
            Loading homepage choices…
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <FeaturePicker
              title="Featured team"
              text="The homepage also shows this team’s latest completed team game."
              value={settings.featured_team_id || ""}
              options={teams}
              onChange={(value) => update("featured_team_id", value)}
            />
            <FeaturePicker
              title="Featured player"
              text="Choose the strongest complete public player profile currently available."
              value={settings.featured_player_id || ""}
              options={players}
              onChange={(value) => update("featured_player_id", value)}
            />
            <FeaturePicker
              title="Featured event"
              text="This event is placed first in the homepage event section."
              value={settings.featured_event_id || ""}
              options={events}
              onChange={(value) => update("featured_event_id", value)}
            />
            <FeaturePicker
              title="Featured competition"
              text="This controls the dedicated competition showcase below the events."
              value={settings.featured_competition_id || ""}
              options={competitions}
              onChange={(value) => update("featured_competition_id", value)}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-zinc-500">
            A featured record must remain public. If it is later hidden or deleted, the homepage safely falls back to the next public featured record.
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving || readOnly}
            className="min-h-12 rounded-xl bg-orange-500 px-6 text-[10px] font-black uppercase tracking-[.12em] text-black disabled:opacity-50"
          >
            {saving ? "Saving…" : readOnly ? "Read only" : "Save homepage"}
          </button>
        </div>
      </div>
    </main>
  );
}

function FeaturePicker({
  title,
  text,
  value,
  options,
  onChange,
}: {
  title: string;
  text: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.id === value) || null;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      <div className="flex items-center gap-4 border-b border-white/10 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0B1F3A] text-xs font-black text-orange-300">
          {selected?.imageUrl ? (
            <img src={selected.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            "FT"
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
        </div>
      </div>
      <label className="block p-5">
        <span className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-500">
          Public selection
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className={CONTROL}>
          <option value="">Automatic public fallback</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.detail}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
