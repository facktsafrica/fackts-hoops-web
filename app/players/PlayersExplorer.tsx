"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicPlayerDirectoryItem } from "@/lib/hoops/publicPlayerProfiles";

type SortKey = "name" | "games" | "scoring" | "completeness";

export default function PlayersExplorer({
  players,
  initialClassification,
}: {
  players: PublicPlayerDirectoryItem[];
  initialClassification: string;
}) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState(initialClassification);
  const [verification, setVerification] = useState("all");
  const [position, setPosition] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");
  const positions = useMemo(
    () =>
      Array.from(
        new Set(
          players
            .map((player) => player.position)
            .filter((value) => value && value !== "Position not listed")
        )
      ).sort(),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = players.filter((player) => {
      const searchable = [
        player.name,
        player.nickname,
        player.position,
        player.currentTeam,
        player.location,
        player.classificationLabel,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (classification === "all" || player.classification === classification) &&
        (verification === "all" ||
          (verification === "verified"
            ? player.verificationStatus === "verified"
            : player.verificationStatus !== "verified")) &&
        (position === "all" || player.position === position)
      );
    });

    return rows.sort((left, right) => {
      if (sort === "games") return right.gamesPlayed - left.gamesPlayed;
      if (sort === "scoring") return right.pointsPerGame - left.pointsPerGame;
      if (sort === "completeness") {
        return right.profileCompleteness - left.profileCompleteness;
      }
      return left.name.localeCompare(right.name);
    });
  }, [classification, players, position, query, sort, verification]);

  function clearFilters() {
    setQuery("");
    setClassification("all");
    setVerification("all");
    setPosition("all");
    setSort("name");
  }

  return (
    <div>
      <div className="rounded-[1.5rem] border border-white/10 bg-[#07162b]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <label className="block">
            <span className="sr-only">Search players</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, nickname, team or position"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400"
            />
          </label>
          <FilterSelect
            label="Relationship"
            value={classification}
            onChange={setClassification}
            options={[
              ["all", "All players"],
              ["official", "Official FACKTS"],
              ["guest", "Guest hoopers"],
              ["competition", "Competition players"],
            ]}
          />
          <FilterSelect
            label="Verification"
            value={verification}
            onChange={setVerification}
            options={[
              ["all", "Any verification"],
              ["verified", "Verified profiles"],
              ["review", "Needs review"],
            ]}
          />
          <FilterSelect
            label="Position"
            value={position}
            onChange={setPosition}
            options={[
              ["all", "All positions"],
              ...positions.map((value) => [value, value] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Sort players"
            value={sort}
            onChange={(value) => setSort(value as SortKey)}
            options={[
              ["name", "Name A–Z"],
              ["games", "Most games"],
              ["scoring", "Highest PPG"],
              ["completeness", "Most complete"],
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs font-bold text-zinc-400">
            Showing <span className="text-white">{filteredPlayers.length}</span> of{" "}
            <span className="text-white">{players.length}</span> public profiles
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] font-black uppercase tracking-[.13em] text-orange-300 hover:text-orange-200"
          >
            Clear filters
          </button>
        </div>
      </div>

      {filteredPlayers.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.key} player={player} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/80 px-6 py-12 text-center">
          <p className="text-lg font-black uppercase">No matching profiles</p>
          <p className="mt-2 text-sm text-zinc-500">
            Change the search or clear the filters to view the complete directory.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-black"
          >
            Show all players
          </button>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: PublicPlayerDirectoryItem }) {
  const initials = player.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const verified = player.verificationStatus === "verified";

  return (
    <Link
      href={`/players/${player.routeId}`}
      className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#07162b]/95 shadow-xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-orange-400/55"
    >
      <div className="grid min-h-[164px] grid-cols-[118px_1fr] sm:block">
        <div className="relative min-h-[164px] overflow-hidden bg-[#102a4c] sm:aspect-[4/3] sm:min-h-0">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              style={{ objectPosition: player.photoPosition }}
            />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle,rgba(245,130,32,.25),transparent_62%),#07162b] text-4xl font-black text-orange-300">
              {initials || "FH"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07162b]/85 via-transparent to-transparent" />
          {player.jerseyNumber ? (
            <span className="absolute left-3 top-3 rounded-lg bg-orange-500 px-2.5 py-1 text-[10px] font-black text-black">
              #{player.jerseyNumber}
            </span>
          ) : null}
          {player.featured ? (
            <span className="absolute bottom-3 left-3 rounded-md border border-orange-300/40 bg-black/70 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-orange-200">
              Featured
            </span>
          ) : null}
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-orange-200">
              {player.classificationLabel}
            </span>
            <span
              className={`rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] ${
                verified
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {verified ? "Verified profile" : "Profile review pending"}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-xl font-black uppercase leading-[1.02] tracking-[-.02em] text-white sm:text-2xl">
            {player.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-orange-300">
            {player.nickname ? `“${player.nickname}” · ` : ""}
            {player.position}
          </p>
          <p className="mt-2 line-clamp-1 text-[10px] font-bold uppercase tracking-[.09em] text-zinc-500">
            {player.currentTeam || player.location || player.role}
          </p>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            <MiniStat label="GP" value={player.gamesPlayed} />
            <MiniStat label="PPG" value={player.pointsPerGame} />
            <MiniStat label="RPG" value={player.reboundsPerGame} />
            <MiniStat label="APG" value={player.assistsPerGame} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-[.1em] text-zinc-500">
              <span>Profile completeness</span>
              <span>{player.profileCompleteness}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-orange-500"
                style={{ width: `${player.profileCompleteness}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 px-1 py-2 text-center">
      <p className="text-[7px] font-black uppercase text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-xs font-bold text-white outline-none focus:border-orange-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
