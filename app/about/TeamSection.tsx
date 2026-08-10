"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getTeamMemberInitials,
  type TeamMember,
} from "@/lib/hoops/teamMembers";

function TeamMemberAvatar({ member }: { member: TeamMember }) {
  const [showPhoto, setShowPhoto] = useState(Boolean(member.profile_photo_url));

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border text-base font-black shadow-[0_14px_30px_rgba(0,0,0,0.2)] ${
        member.is_featured
          ? "h-[4.75rem] w-[4.75rem] border-[#F58220]/60 bg-[#F58220] text-[#07182E] sm:h-24 sm:w-24 sm:text-xl"
          : "h-16 w-16 border-white/15 bg-[#F58220] text-[#07182E]"
      }`}
    >
      {showPhoto && member.profile_photo_url ? (
        // Admin-managed Supabase URLs are intentionally rendered without a fixed host allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.profile_photo_url}
          alt={`${member.full_name}, ${member.role_title}`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setShowPhoto(false)}
        />
      ) : (
        <span aria-hidden="true">{getTeamMemberInitials(member)}</span>
      )}
    </div>
  );
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-[1.35rem] border transition duration-300 motion-reduce:transform-none motion-reduce:transition-none md:hover:-translate-y-1 ${
        member.is_featured
          ? "border-[#F58220]/45 border-t-2 border-t-[#F58220] bg-[linear-gradient(125deg,rgba(18,48,82,0.98),rgba(7,24,46,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:col-span-2 sm:p-7 lg:col-span-3 lg:p-8 md:hover:border-[#F58220]/75"
          : "border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035))] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:p-6 md:hover:border-[#F58220]/55 md:hover:shadow-[0_22px_55px_rgba(0,0,0,0.28)]"
      }`}
    >
      {member.is_featured ? (
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#F58220]/10 blur-3xl" />
      ) : null}

      <div
        className={`relative flex min-w-0 gap-4 ${
          member.is_featured
            ? "flex-col sm:flex-row sm:items-center sm:gap-7"
            : "flex-col"
        }`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <TeamMemberAvatar
            key={member.profile_photo_url || "initials"}
            member={member}
          />

          <div className="min-w-0">
            {member.is_featured ? (
              <span className="mb-2 inline-flex rounded-full border border-[#F58220]/35 bg-[#F58220]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#F8A65D]">
                Leadership
              </span>
            ) : null}

            <p className="break-words text-[10px] font-black uppercase leading-4 tracking-[0.1em] text-[#F8A65D]">
              {member.role_title}
            </p>
            <h3
              className={`mt-1 break-words font-black leading-tight tracking-[-0.025em] text-white ${
                member.is_featured ? "text-2xl sm:text-3xl" : "text-xl"
              }`}
            >
              {member.full_name}
            </h3>
          </div>
        </div>

        <p
          className={`break-words text-sm leading-6 text-slate-300 ${
            member.is_featured
              ? "max-w-3xl sm:ml-auto sm:text-base sm:leading-7 lg:max-w-2xl"
              : "mt-1"
          }`}
        >
          {member.public_description}
        </p>
      </div>
    </article>
  );
}

function TeamLoadingState() {
  return (
    <div
      aria-label="Loading the FACKTS team"
      className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <div className="h-44 animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.06] md:col-span-2 lg:col-span-3" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.06]"
        />
      ))}
    </div>
  );
}

function fetchActiveTeamMembers() {
  return supabase
    .from("team_members")
    .select(
      "id, slug, full_name, role_title, public_description, profile_photo_url, initials_fallback, display_order, is_featured, is_active, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export default function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await fetchActiveTeamMembers();

    if (error) {
      setMembers([]);
      setErrorMessage(
        "The team directory is temporarily unavailable. Please try again."
      );
      setLoading(false);
      return;
    }

    setMembers((data ?? []) as TeamMember[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    void fetchActiveTeamMembers().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setMembers([]);
        setErrorMessage(
          "The team directory is temporarily unavailable. Please try again."
        );
      } else {
        setMembers((data ?? []) as TeamMember[]);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-[#07182E] text-white">
      <div className="absolute -left-32 top-24 -z-10 h-80 w-80 rounded-full bg-[#F58220]/10 blur-3xl" />
      <div className="absolute -right-40 bottom-0 -z-10 h-96 w-96 rounded-full bg-[#1D4E89]/25 blur-3xl" />

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-7 border-b border-white/10 pb-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8A65D] sm:tracking-[0.22em]">
              The people behind the platform
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">
              The Team Behind FACKTS
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base lg:justify-self-end">
            FACKTS is run by a hands-on team covering leadership, basketball,
            operations, finance, partnerships and administration. Together, we
            turn ideas on the court into organized work people can see, follow
            and trust.
          </p>
        </div>

        <div aria-live="polite">
          {loading ? <TeamLoadingState /> : null}

          {!loading && errorMessage ? (
            <div className="mt-8 rounded-[1.35rem] border border-amber-300/25 bg-amber-300/10 p-5 sm:p-6">
              <p className="text-sm leading-6 text-amber-50">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadMembers()}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200/30 px-5 py-2 text-xs font-black uppercase tracking-[0.1em] text-amber-100 transition hover:border-[#F58220] hover:text-white"
              >
                Try Again
              </button>
            </div>
          ) : null}

          {!loading && !errorMessage && members.length === 0 ? (
            <div className="mt-8 rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-6 text-center sm:p-8">
              <p className="text-sm leading-6 text-slate-300">
                Team profiles are being prepared. Please check back soon.
              </p>
            </div>
          ) : null}

          {!loading && !errorMessage && members.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="mt-7 max-w-3xl text-xs leading-6 text-slate-400">
          FACKTS is built through shared responsibility: creative ideas become
          real activations, every activation is documented, and every result
          strengthens the basketball community around it.
        </p>
      </div>
    </section>
  );
}
