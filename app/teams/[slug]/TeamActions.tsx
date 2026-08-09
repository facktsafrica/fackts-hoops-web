"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TeamActions({ teamId, teamName, teamSlug, claimStatus, contactEmail, canClaim }: { teamId: string; teamName: string; teamSlug: string; claimStatus: string; contactEmail: string; canClaim: boolean }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${teamName} | FACKTS Hoops`, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Team link copied.");
      }
    } catch {
      // A cancelled native share does not need an error message.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const requesterName = String(data.get("requester_name") || "").trim();
    const workEmail = String(data.get("work_email") || "").trim();
    const role = String(data.get("role") || "").trim();
    if (!requesterName || !workEmail || !role) {
      setError("Your name, work email and relationship to the team are required.");
      return;
    }

    setSending(true);
    setError("");
    setMessage("");
    const result = await supabase.from("team_profile_claims").insert({
      team_id: teamId,
      request_type: claimStatus === "claimed" ? "update" : "claim",
      requester_name: requesterName,
      work_email: workEmail,
      phone: String(data.get("phone") || "").trim() || null,
      role,
      organization_name: String(data.get("organization_name") || "").trim() || teamName,
      evidence_url: String(data.get("evidence_url") || "").trim() || null,
      message: String(data.get("message") || "").trim() || null,
      status: "pending",
    });

    if (result.error) {
      setError("The request could not be submitted yet. Please use the team contact or FACKTS coverage form.");
      setSending(false);
      return;
    }
    form.reset();
    setMessage("Request received. FACKTS will verify your relationship before any profile access or change.");
    setSending(false);
  }

  return (
    <div className="relative flex shrink-0 flex-wrap gap-2 sm:justify-end">
      <button type="button" onClick={share} className="rounded-xl border border-white/20 bg-black/45 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] backdrop-blur hover:border-orange-400/60">Share team</button>
      {canClaim ? <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-black hover:bg-orange-400">{claimStatus === "claimed" ? "Request update" : "Claim team"}</button> : <a href={contactEmail ? `mailto:${contactEmail}?subject=${encodeURIComponent(`${teamName} team profile`)}` : `/book-coverage?team=${encodeURIComponent(teamSlug)}`} className="rounded-xl bg-orange-500 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-black hover:bg-orange-400">Contact team</a>}
      {message && !open ? <span className="basis-full text-right text-[9px] font-bold text-emerald-300">{message}</span> : null}

      {open ? <div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><button type="button" aria-label="Close team request" onClick={() => setOpen(false)} className="absolute inset-0"/><div role="dialog" aria-modal="true" aria-labelledby="team-claim-title" className="relative z-10 my-8 w-full max-w-xl rounded-[1.7rem] border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300">Controlled team access</p><h2 id="team-claim-title" className="mt-2 text-2xl font-black uppercase">{claimStatus === "claimed" ? "Request a profile update" : "Claim this team profile"}</h2><p className="mt-3 text-xs leading-5 text-zinc-500">FACKTS verifies the requester and the organization before changing ownership, rosters, results or public information.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-zinc-400">×</button></div>
        {message ? <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{message}</div> : <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2"><input name="requester_name" placeholder="Your full name *" className={inputClass}/><input type="email" name="work_email" placeholder="Work email *" className={inputClass}/><input name="role" placeholder="Role / relationship to team *" className={inputClass}/><input name="phone" placeholder="Phone (optional)" className={inputClass}/><input name="organization_name" defaultValue={teamName} placeholder="Organization" className={inputClass}/><input name="evidence_url" placeholder="Official website or evidence URL" className={inputClass}/><textarea name="message" rows={4} placeholder="What should FACKTS verify or update?" className={`${inputClass} h-auto py-3 sm:col-span-2`}/>{error ? <p className="text-xs font-bold text-red-300 sm:col-span-2">{error}</p> : null}<button disabled={sending} className="rounded-xl bg-orange-500 px-5 py-3 text-[9px] font-black uppercase tracking-[.13em] text-black disabled:opacity-50 sm:col-span-2">{sending ? "Submitting..." : "Submit for verification"}</button></form>}
      </div></div> : null}
    </div>
  );
}

const inputClass = "h-12 w-full rounded-xl border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-400";
