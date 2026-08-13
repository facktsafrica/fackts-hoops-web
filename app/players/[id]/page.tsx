import Link from "next/link";
import { notFound } from "next/navigation";
import GameMedia from "@/app/games/[id]/GameMedia";
import ProfileActions from "./ProfileActions";
import {
  loadPublicPlayerProfile,
  type PublicPlayerGameLog,
} from "@/lib/hoops/publicPlayerProfiles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function value(record: Record<string, unknown>, key: string) {
  const result = record[key];
  return result === null || result === undefined ? "" : String(result).trim();
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "Date not recorded";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function publicationClearance(status: string) {
  if (status === "confirmed") return "Confirmed";
  if (status === "restricted") return "Restricted use";
  if (status === "pending") return "Review pending";
  return "Not recorded";
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await loadPublicPlayerProfile(id);
  if (!player) notFound();

  const record = player.record as Record<string, unknown>;
  const details = [
    ["Position", player.position],
    ["Current team", player.teams[0]?.name || player.currentTeam || "Not listed"],
    ["Location", player.location || "Not listed"],
    ["Dominant hand", value(record, "dominant_hand") || "Not listed"],
    ["Highest level", value(record, "highest_level") || "Not listed"],
    ["Years played", value(record, "years_played") || "Not listed"],
  ];
  const initials = player.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const completedBattles = player.oneOnOne.filter(
    (battle) => battle.result === "Win" || battle.result === "Loss"
  );
  const wins = completedBattles.filter((battle) => battle.result === "Win").length;
  const losses = completedBattles.filter((battle) => battle.result === "Loss").length;

  return (
    <main
      className="min-h-screen bg-slate-950 bg-cover bg-scroll bg-[position:left_top] text-white md:bg-fixed md:bg-[position:center_top]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,6,23,.79),rgba(2,6,23,.98)),url('/images/one-on-one-bg.png')",
      }}
    >
      <section className="relative overflow-hidden border-b border-white/10 bg-[#07162b]">
        {player.coverImageUrl || player.photoUrl ? (
          <img
            src={player.coverImageUrl || player.photoUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            style={{ objectPosition: player.photoPosition }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07162b] via-[#07162b]/95 to-[#102a4c]/70" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/players"
              className="rounded-xl border border-white/15 bg-black/35 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] text-white backdrop-blur hover:border-orange-400/60"
            >
              ← All players
            </Link>
            <ProfileActions name={player.name} />
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[360px_1fr] lg:items-end">
            <div className="relative aspect-[4/5] max-h-[520px] overflow-hidden rounded-[2rem] border border-white/15 bg-[#102a4c] shadow-2xl shadow-black/40">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={player.name}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: player.photoPosition }}
                />
              ) : (
                <div className="grid h-full place-items-center bg-[radial-gradient(circle,rgba(245,130,32,.28),transparent_58%),#07162b] text-7xl font-black text-orange-300">
                  {initials || "FH"}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />
              {player.jerseyNumber ? (
                <span className="absolute bottom-5 left-5 rounded-xl bg-orange-500 px-4 py-2 text-lg font-black text-black">
                  #{player.jerseyNumber}
                </span>
              ) : null}
            </div>

            <div className="pb-1">
              <div className="flex flex-wrap gap-2">
                <Badge tone="orange">{player.classificationLabel}</Badge>
                <Badge tone={player.verificationStatus === "verified" ? "green" : "neutral"}>
                  {player.verificationStatus === "verified"
                    ? "Verified profile"
                    : "Verification pending"}
                </Badge>
                {player.featured ? <Badge tone="blue">Featured player</Badge> : null}
              </div>

              <p className="mt-5 text-[11px] font-black uppercase tracking-[.18em] text-orange-300">
                {player.nickname ? `“${player.nickname}” · ` : ""}
                {player.position}
              </p>
              <h1 className="mt-2 max-w-4xl text-4xl font-black uppercase leading-[.9] tracking-[-.05em] sm:text-6xl lg:text-7xl">
                {player.name}
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                {player.headline || player.about}
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroMetric label="Games" value={player.career.games} />
                <HeroMetric label="Career points" value={player.career.points} />
                <HeroMetric label="Competitions" value={player.competitions.length} />
                <HeroMetric label="Profile complete" value={`${player.profileCompleteness}%`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-[72px] z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          {[
            ["Overview", "overview"],
            ["Statistics", "statistics"],
            ["Games", "games"],
            ["1v1", "one-on-one"],
            ["Achievements", "achievements"],
            ["Media", "media"],
          ].map(([label, target]) => (
            <a
              key={target}
              href={`#${target}`}
              className="shrink-0 rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-[.12em] text-zinc-400 transition hover:bg-white/[.05] hover:text-orange-300"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="overview" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Verified identity"
          title="Player overview"
          text="A public basketball record connecting identity, team history, performance evidence and media."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#07162b]/90 p-6 sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">About</p>
            <h3 className="mt-2 text-2xl font-black uppercase">The hooper</h3>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300 sm:text-base">
              {player.about}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <ProfileText title="Style of play" value={value(record, "style_of_play")} />
              <ProfileText title="Strengths" value={value(record, "strengths")} />
              <ProfileText title="Development focus" value={value(record, "improvements")} />
              <ProfileText title="Previous teams" value={value(record, "previous_teams")} />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">Profile information</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {details.map(([label, detail]) => (
                  <Info key={label} label={label} value={detail} />
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-6">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">Record governance</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info label="Identity status" value={player.verificationStatus === "verified" ? "Verified" : "Review pending"} />
                <Info label="Publication clearance" value={publicationClearance(player.consentStatus)} />
                <Info label="Public profile" value={player.profileStatus === "published" ? "Published" : player.profileStatus} />
                <Info label="Completeness" value={`${player.profileCompleteness}%`} />
              </div>
            </div>
          </div>
        </div>

        {player.teams.length ? (
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#07162b]/90 p-6 sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-300">Team history</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {player.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-4 transition hover:border-orange-400/50"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#102a4c] text-sm font-black text-orange-300">
                    {team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-cover" /> : team.shortName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-black">{team.name}</span>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.1em] text-zinc-500">{team.status} roster</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section id="statistics" className="border-y border-white/10 bg-[#07162b]/80">
        <div className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Recorded performance"
            title="Career statistics"
            text="Averages are calculated only from game records currently published in FACKTS Hoops."
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <CareerStat label="GP" value={player.career.games} />
            <CareerStat label="PPG" value={player.career.ppg} />
            <CareerStat label="RPG" value={player.career.rpg} />
            <CareerStat label="APG" value={player.career.apg} />
            <CareerStat label="SPG" value={player.career.spg} />
            <CareerStat label="BPG" value={player.career.bpg} />
          </div>

          <div className="mt-7">
            <h3 className="text-xl font-black uppercase">Statistics by competition</h3>
            {player.competitions.length ? (
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="border-b border-white/10 bg-black/30 text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">
                      <tr>
                        <th className="px-5 py-4">Competition</th>
                        <th className="px-4 py-4 text-center">GP</th>
                        <th className="px-4 py-4 text-center">PPG</th>
                        <th className="px-4 py-4 text-center">RPG</th>
                        <th className="px-4 py-4 text-center">APG</th>
                        <th className="px-4 py-4 text-center">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {player.competitions.map((competition) => (
                        <tr key={competition.name} className="border-b border-white/5 last:border-0">
                          <td className="px-5 py-4 font-black">{competition.name}</td>
                          <TableNumber value={competition.games} />
                          <TableNumber value={competition.pointsPerGame} />
                          <TableNumber value={competition.reboundsPerGame} />
                          <TableNumber value={competition.assistsPerGame} />
                          <TableNumber value={competition.totalPoints} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Empty text="Competition statistics will appear after a verified game record is published." />
            )}
          </div>
        </div>
      </section>

      <section id="games" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Game evidence"
          title="Game-by-game record"
          text="Open any match to see the complete score, rosters, box score, officials and media."
        />
        {player.games.length ? (
          <div className="mt-6 grid gap-3">
            {player.games.map((game) => <GameRow key={game.id} game={game} />)}
          </div>
        ) : (
          <Empty text="No published game statistics are attached to this profile yet." />
        )}
      </section>

      <section id="one-on-one" className="border-y border-white/10 bg-[#07162b]/80">
        <div className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="FACKTS Kings"
            title="1v1 record"
            text="Competition and season stay attached to every official or guest matchup as the player relationship changes."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-[.32fr_.68fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-6">
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">Completed record</p>
              <p className="mt-3 text-4xl font-black">{wins}W – {losses}L</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Based only on completed 1v1 results currently recorded.</p>
            </div>
            {player.oneOnOne.length ? (
              <div className="grid gap-3">
                {player.oneOnOne.map((battle) => (
                  <Link
                    key={battle.id}
                    href={battle.href}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/90 p-4 transition hover:border-orange-400/50"
                  >
                    <span>
                      <span className="block font-black uppercase">{battle.title}</span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {battle.competition} · {battle.seasonLabel} · {formatDate(battle.date)} · {battle.venue}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xl font-black tabular-nums">{battle.ownScore ?? "–"} – {battle.opponentScore ?? "–"}</span>
                      <span className={`mt-1 block text-[9px] font-black uppercase tracking-[.12em] ${battle.result === "Win" ? "text-emerald-300" : battle.result === "Loss" ? "text-red-300" : "text-orange-300"}`}>
                        {battle.result} · {battle.verificationStatus === "verified" ? "Verified" : "Pending verification"}{battle.hasMedia ? " · Watch" : ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty text="No 1v1 matchup is attached to this player yet." />
            )}
          </div>
        </div>
      </section>

      <section id="achievements" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Basketball milestones"
          title="Achievements"
          text="Awards and milestones show their verification state so an unconfirmed claim is never presented as verified evidence."
        />
        {player.achievements.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {player.achievements.map((achievement) => (
              <article key={achievement.id} className="rounded-[1.5rem] border border-white/10 bg-[#07162b]/90 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-lg text-black">★</span>
                  <Badge tone={achievement.verificationStatus === "verified" ? "green" : "neutral"}>{achievement.verificationStatus === "verified" ? "Verified" : "Unverified"}</Badge>
                </div>
                <h3 className="mt-5 text-xl font-black uppercase leading-tight">{achievement.title}</h3>
                {achievement.competition ? <p className="mt-2 text-xs font-bold text-orange-300">{achievement.competition}</p> : null}
                {achievement.date ? <p className="mt-2 text-xs text-zinc-500">{formatDate(achievement.date)}</p> : null}
                {achievement.description ? <p className="mt-3 text-sm leading-6 text-zinc-400">{achievement.description}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No public achievements have been added to this profile yet." />
        )}
      </section>

      <section id="media" className="border-t border-white/10 bg-[#07162b]/85">
        <div className="mx-auto max-w-7xl scroll-mt-32 px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Player media"
            title="Highlights, interviews and stories"
            text="Approved social and video links play inside the profile whenever the source platform permits embedding."
          />
          <div className="mt-6">
            <GameMedia
              items={player.media}
              emptyTitle="Player media coming soon"
              emptyText="Approved highlights, interviews and player stories will appear here after publication."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function GameRow({ game }: { game: PublicPlayerGameLog }) {
  const content = (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge tone="orange">{game.competition}</Badge>
          {game.playerOfGame ? <Badge tone="blue">Player of game</Badge> : null}
        </div>
        <h3 className="mt-3 text-lg font-black uppercase sm:text-xl">{game.title}</h3>
        <p className="mt-2 text-xs text-zinc-500">{formatDate(game.date)} · {game.venue}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <SmallStat label="PTS" value={game.points} />
        <SmallStat label="REB" value={game.rebounds} />
        <SmallStat label="AST" value={game.assists} />
        <SmallStat label="+/-" value={game.plusMinus} />
      </div>
    </div>
  );

  return game.gameId ? (
    <Link href={`/games/${game.gameId}`} className="rounded-[1.4rem] border border-white/10 bg-slate-950/90 p-5 transition hover:border-orange-400/50">{content}</Link>
  ) : (
    <article className="rounded-[1.4rem] border border-white/10 bg-slate-950/90 p-5">{content}</article>
  );
}

function SectionHeading({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{kicker}</p>
      <h2 className="mt-2 text-3xl font-black uppercase tracking-[-.025em] sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "orange" | "green" | "blue" | "neutral" }) {
  const classes = tone === "orange" ? "border-orange-400/30 bg-orange-500/10 text-orange-200" : tone === "green" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : tone === "blue" ? "border-blue-400/30 bg-blue-500/10 text-blue-200" : "border-white/10 bg-white/5 text-zinc-300";
  return <span className={`rounded-md border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.11em] ${classes}`}>{children}</span>;
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur"><p className="text-[8px] font-black uppercase tracking-[.13em] text-zinc-500">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></div>;
}

function CareerStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-orange-400/20 bg-slate-950/90 p-5 text-center"><p className="text-[9px] font-black uppercase tracking-[.15em] text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black tabular-nums text-orange-300">{value}</p></div>;
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-[3.5rem] rounded-xl border border-white/10 bg-black/35 p-2 text-center"><p className="text-[7px] font-black uppercase text-zinc-600">{label}</p><p className="mt-1 text-sm font-black tabular-nums text-orange-300">{value}</p></div>;
}

function TableNumber({ value }: { value: string | number }) {
  return <td className="px-4 py-4 text-center font-black tabular-nums text-zinc-200">{value}</td>;
}

function Info({ label, value: infoValue }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/30 p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-zinc-600">{label}</p><p className="mt-1.5 text-sm font-bold text-zinc-200">{infoValue}</p></div>;
}

function ProfileText({ title, value: profileValue }: { title: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-[8px] font-black uppercase tracking-[.13em] text-orange-300">{title}</p><p className="mt-2 text-sm leading-6 text-zinc-400">{profileValue || "Not added yet."}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/75 px-6 py-10 text-center text-sm text-zinc-500">{text}</div>;
}
