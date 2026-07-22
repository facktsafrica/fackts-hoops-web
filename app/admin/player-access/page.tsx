"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isOfficialFacktsPlayer } from "@/lib/hoops/playerClassification";

type PlayerRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  nickname?: string | null;
  role?: string | null;
  player_type?: string | null;
  email?: string | null;
  is_active?: boolean | null;
};

type PlayerCredentials = {
  email: string;
  temporary_password: string;
  login_url: string;
};

function playerName(player: PlayerRow) {
  return player.full_name || player.name || player.nickname || "Unnamed Player";
}

export default function AdminPlayerAccessPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [playerMessages, setPlayerMessages] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<PlayerCredentials | null>(null);
  const [credentialsPlayerId, setCredentialsPlayerId] = useState("");

  const officialPlayers = useMemo(
    () => players.filter((player) => player.is_active !== false && isOfficialFacktsPlayer(player)).sort((a, b) => playerName(a).localeCompare(playerName(b))),
    [players]
  );

  async function loadPlayers() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/player-access", {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({
        ok: false,
        error: "The server returned an unreadable response.",
      }));

      if (!response.ok || !result.ok) {
        const rawError = String(result.error || "Could not load player accounts.");
        setMessage(
          rawError.includes("player_type")
            ? "Run the supplied player-classification migration in Supabase first."
            : rawError
        );
        setPlayers([]);
        return;
      }

      const rows = (result.players ?? []) as PlayerRow[];
      setMessage("");
      setPlayers(rows);
      setEmails(
        rows.reduce<Record<string, string>>((acc, player) => {
          acc[player.id] = player.email || "";
          return acc;
        }, {})
      );
    } catch (error) {
      setPlayers([]);
      setMessage(error instanceof Error ? error.message : "Could not load player accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadPlayers();
    });
  }, []);

  async function updateAccess(player: PlayerRow, action: "issue" | "unlink") {
    if (
      action === "issue" &&
      player.user_id &&
      !window.confirm("This will replace the player's current password. Continue?")
    ) {
      return;
    }

    setBusyId(player.id);
    setMessage("");
    setPlayerMessages((current) => ({ ...current, [player.id]: "Working on this account..." }));
    setCredentials(null);
    setCredentialsPlayerId("");

    const requestedEmail = (emails[player.id] || player.email || "").trim();
    if (action === "issue" && !requestedEmail.includes("@")) {
      setPlayerMessages((current) => ({ ...current, [player.id]: "Add a valid player email first." }));
      setBusyId("");
      return;
    }

    try {
      const response = await fetch("/api/admin/player-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action,
          player_id: player.id,
          email: requestedEmail,
        }),
      });

      const result = await response.json().catch(() => ({
        ok: false,
        error: "The server returned an unreadable response.",
      }));
      const resultMessage = result.message || result.error || "Player access request finished.";

      setPlayerMessages((current) => ({ ...current, [player.id]: resultMessage }));

      if (!response.ok || !result.ok) return;

      setCredentials(result.credentials || null);
      setCredentialsPlayerId(result.credentials ? player.id : "");
      await loadPlayers();
    } catch (error) {
      setPlayerMessages((current) => ({
        ...current,
        [player.id]: error instanceof Error ? error.message : "Player account request failed.",
      }));
    } finally {
      setBusyId("");
    }
  }

  async function copyCredentials() {
    if (!credentials) return;

    const text = `FACKTS Hoops Player Login\n${credentials.login_url}\nEmail: ${credentials.email}\nTemporary password: ${credentials.temporary_password}\nPlease change the password after logging in.`;

    try {
      await navigator.clipboard.writeText(text);
      setPlayerMessages((current) => ({
        ...current,
        [credentialsPlayerId]: "Player login details copied. You can paste them on WhatsApp.",
      }));
    } catch {
      setPlayerMessages((current) => ({
        ...current,
        [credentialsPlayerId]: "Copy failed. Select the details below and copy them manually.",
      }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              FACKTS Admin
            </p>
            <h1 className="mt-2 text-4xl font-black">Player Accounts</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Create a login for each active official player. Add the player's email, then copy the temporary details to WhatsApp. Guests and prospects remain separate.
            </p>
          </div>
          <Link href="/admin" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black">
            Back to Admin
          </Link>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Loading players...
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {officialPlayers.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400 md:col-span-2">
                No active official FACKTS players are available for accounts.
              </div>
            ) : null}
            {officialPlayers.map((player) => (
              <div key={player.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{playerName(player)}</h2>
                    <p className="mt-1 text-sm text-slate-500">{player.role || "Player"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                    player.user_id
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {player.user_id ? "Access Active" : "No Account"}
                  </span>
                </div>

                <input
                  type="email"
                  value={emails[player.id] || ""}
                  onChange={(event) =>
                    setEmails((current) => ({ ...current, [player.id]: event.target.value }))
                  }
                  placeholder="player@email.com"
                  disabled={Boolean(player.user_id) || busyId === player.id}
                  className="mt-4 w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 outline-none focus:border-orange-400 disabled:opacity-60"
                />

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateAccess(player, "issue")}
                    disabled={busyId === player.id}
                    className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black disabled:opacity-60"
                  >
                    {busyId === player.id
                      ? "Working..."
                      : player.user_id
                        ? "Reset Login"
                        : "Create Player Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAccess(player, "unlink")}
                    disabled={!player.user_id || busyId === player.id}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 disabled:opacity-30"
                  >
                    Revoke Access
                  </button>
                </div>

                {playerMessages[player.id] ? (
                  <div
                    aria-live="polite"
                    className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-100"
                  >
                    {playerMessages[player.id]}
                  </div>
                ) : null}

                {credentials && credentialsPlayerId === player.id ? (
                  <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Copy These Details Now
                    </p>
                    <div className="mt-3 space-y-1 break-words text-sm text-emerald-50">
                      <p><strong>Login:</strong> {credentials.login_url}</p>
                      <p><strong>Email:</strong> {credentials.email}</p>
                      <p><strong>Temporary password:</strong> {credentials.temporary_password}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="mt-4 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-emerald-950"
                    >
                      Copy for WhatsApp
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
