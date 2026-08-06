export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/lib/auth/server";
import ReportActions, { type PdfReportData } from "./ReportActions";

type EventRow={event_id:string;slug:string;title:string;summary:string|null;start_date:string|null;end_date:string|null;venue:string|null;location:string|null;event_type:string|null;age_category:string|null;status:string;is_public:boolean};
type RecordRow={id:string;record_type:string;title:string;subtitle:string|null;details:string|null;division:string|null;team_name:string|null;opponent_name:string|null;score_for:number|null;score_against:number|null;status:string;is_public:boolean;metadata?:Record<string,unknown>|null};

async function loadReport(key:string){
  const db=createSupabaseAdminClient(), decoded=decodeURIComponent(key).trim();
  let result=await db.from("event_case_studies").select("*").or(`slug.eq.${decoded},event_id.eq.${decoded}`).eq("status","published").eq("is_public",true).maybeSingle();
  let event=result.data as EventRow|null;
  if(!event){const access=await getAdminAccess();if(!access.user||!access.profile)return null;result=await access.supabase.from("event_case_studies").select("*").or(`slug.eq.${decoded},event_id.eq.${decoded}`).maybeSingle();event=result.data as EventRow|null;}
  if(!event)return null;
  let query=db.from("event_records").select("*").eq("event_id",event.event_id);
  if(event.status==="published"&&event.is_public)query=query.eq("is_public",true).in("status",["verified","published"]);
  const {data}=await query.order("sort_order").order("created_at");
  return {event,records:(data||[]) as RecordRow[]};
}

function dates(start:string|null,end:string|null){if(!start)return "Date to be confirmed";const f=(v:string)=>new Intl.DateTimeFormat("en-KE",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${v}T12:00:00`));return end&&end!==start?`${f(start)} – ${f(end)}`:f(start)}
function winner(row:RecordRow){if(row.score_for==null||row.score_against==null||row.score_for===row.score_against)return null;return row.score_for>row.score_against?row.team_name:row.opponent_name}

export default async function EventReportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params, loaded=await loadReport(id);if(!loaded)notFound();
  const {event,records}=loaded, teams=records.filter(r=>r.record_type==="team"), results=records.filter(r=>r.record_type==="result"), awards=records.filter(r=>r.record_type==="award"), partners=records.filter(r=>r.record_type==="partner"), people=records.filter(r=>r.record_type==="person"), media=records.filter(r=>r.record_type==="media"), gallery=records.filter(r=>r.record_type==="gallery");
  const finals=results.filter(r=>{const round=String(r.metadata?.round||r.division||"").toLowerCase();return round.includes("final")&&!round.includes("semi")});
  const generatedOn=new Intl.DateTimeFormat("en-KE",{dateStyle:"long"}).format(new Date());
  const reportData:PdfReportData={
    title:event.title,
    summary:event.summary||"Official basketball event summary and verified results.",
    format:event.event_type||"Basketball",
    category:event.age_category||"Open",
    date:dates(event.start_date,event.end_date),
    venue:[event.venue,event.location].filter(Boolean).join(", ")||"To be confirmed",
    metrics:[{value:String(teams.length),label:"Teams / entrants"},{value:String(results.length),label:"Games recorded"},{value:String(awards.length),label:"Awards"},{value:String(media.length+gallery.length),label:"Media items"}],
    finals:finals.map(r=>({division:r.division||"Championship final",winner:winner(r)||r.title,score:`${r.team_name||r.title} ${r.score_for??"-"} - ${r.score_against??"-"} ${r.opponent_name||"TBC"}`})),
    results:results.map(r=>({stage:String(r.metadata?.round||r.division||"Game"),match:`${r.team_name||r.title} vs ${r.opponent_name||"TBC"}`,score:`${r.score_for??"-"} - ${r.score_against??"-"}`})),
    awards:awards.map(r=>({title:r.title,recipient:r.subtitle||r.team_name||"Recipient to be confirmed",division:r.division||""})),
    teams:teams.map(r=>r.title),
    partners:partners.map(r=>({title:r.title,detail:r.subtitle||r.division||r.details||""})),
    people:people.map(r=>`${r.title}${r.subtitle?` - ${r.subtitle}`:""}`),
    mediaSummary:`${media.length} published media item${media.length===1?"":"s"} and ${gallery.length} approved photograph${gallery.length===1?"":"s"} are attached to this event archive.`,
    generatedOn,
  };
  return <main className="min-h-screen bg-slate-200 px-3 py-5 text-slate-950 sm:px-6 sm:py-10 print:bg-white print:p-0">
    <style>{`@page{size:A4;margin:12mm}@media print{.report-actions,.report-back{display:none!important}.report-sheet{max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.report-section{break-inside:avoid}.report-table{font-size:9px!important}body{background:white!important}}`}</style>
    <div className="report-back mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3"><Link href={`/events/${event.slug||event.event_id}`} className="text-xs font-black uppercase text-blue-950">← Back to event</Link><ReportActions eventTitle={event.title} reportData={reportData}/></div>
    <article className="report-sheet mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl">
      <header className="border-b-[6px] border-orange-500 bg-[#071b3a] px-6 py-8 text-white sm:px-10"><p className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300">FACKTS Hoops · Official Event Report</p><h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">{event.title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">{event.summary||"Official basketball event summary and verified results."}</p></header>
      <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4"><Fact label="Format" value={event.event_type||"Basketball"}/><Fact label="Category" value={event.age_category||"Open"}/><Fact label="Date" value={dates(event.start_date,event.end_date)}/><Fact label="Venue" value={[event.venue,event.location].filter(Boolean).join(", ")||"To be confirmed"}/></div>
      <div className="space-y-8 px-6 py-8 sm:px-10">
        <section className="report-section"><Heading number="01" title="Event at a glance"/><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={String(teams.length)} label="Teams / entrants"/><Metric value={String(results.length)} label="Games recorded"/><Metric value={String(awards.length)} label="Awards"/><Metric value={String(media.length+gallery.length)} label="Media items"/></div></section>
        {finals.length?<section className="report-section"><Heading number="02" title="Champions and finals"/><div className="mt-4 grid gap-3 sm:grid-cols-2">{finals.map(r=><div key={r.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-orange-700">{r.division||"Championship final"}</p><h3 className="mt-2 text-xl font-black uppercase text-[#071b3a]">{winner(r)||r.title}</h3><p className="mt-2 text-sm font-bold">{r.team_name} {r.score_for??"–"} – {r.score_against??"–"} {r.opponent_name}</p></div>)}</div></section>:null}
        {results.length?<section><Heading number="03" title="Verified results"/><div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><table className="report-table w-full text-left text-xs"><thead className="bg-[#071b3a] text-white"><tr><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Match</th><th className="px-3 py-2 text-right">Score</th></tr></thead><tbody>{results.map(r=><tr key={r.id} className="border-t border-slate-200"><td className="px-3 py-2 font-bold">{String(r.metadata?.round||r.division||"Game")}</td><td className="px-3 py-2">{r.team_name||r.title} vs {r.opponent_name||"TBC"}</td><td className="whitespace-nowrap px-3 py-2 text-right font-black">{r.score_for??"–"} – {r.score_against??"–"}</td></tr>)}</tbody></table></div></section>:null}
        {awards.length?<section className="report-section"><Heading number="04" title="Awards and recognition"/><div className="mt-4 grid gap-2 sm:grid-cols-2">{awards.map(r=><div key={r.id} className="rounded-lg border border-slate-200 p-3"><p className="text-[9px] font-black uppercase text-orange-700">{r.title}</p><p className="mt-1 font-black text-[#071b3a]">{r.subtitle||r.team_name||"Recipient to be confirmed"}</p>{r.division?<p className="mt-1 text-xs text-slate-500">{r.division}</p>:null}</div>)}</div></section>:null}
        {teams.length?<section className="report-section"><Heading number="05" title="Participating teams"/><p className="mt-3 text-sm leading-7 text-slate-700">{teams.map(r=>r.title).join(" · ")}</p></section>:null}
        {partners.length?<section className="report-section"><Heading number="06" title="Partners"/><div className="mt-3 grid gap-2 sm:grid-cols-2">{partners.map(r=><div key={r.id} className="rounded-lg bg-slate-50 p-3"><p className="font-black text-[#071b3a]">{r.title}</p><p className="mt-1 text-xs text-slate-600">{r.subtitle||r.division||r.details}</p></div>)}</div></section>:null}
        {people.length?<section className="report-section"><Heading number="07" title="Officials and contributors"/><p className="mt-3 text-sm leading-7 text-slate-700">{people.map(r=>`${r.title}${r.subtitle?` — ${r.subtitle}`:""}`).join(" · ")}</p></section>:null}
        <section className="report-section"><Heading number="08" title="Media record"/><p className="mt-3 text-sm text-slate-700">{media.length} published media item{media.length===1?"":"s"} and {gallery.length} approved photograph{gallery.length===1?"":"s"} are attached to this event archive.</p></section>
      </div>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 text-[9px] font-bold uppercase text-slate-500 sm:px-10"><span>Generated from the FACKTS Hoops Event Archive</span><span>{generatedOn}</span></footer>
    </article>
  </main>;
}

function Fact({label,value}:{label:string;value:string}){return <div className="border-r border-t border-slate-200 p-4"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-[#071b3a] sm:text-sm">{value}</p></div>}
function Metric({value,label}:{value:string;label:string}){return <div className="rounded-xl bg-[#071b3a] p-4 text-white"><p className="text-3xl font-black text-orange-400">{value}</p><p className="mt-1 text-[8px] font-black uppercase text-slate-300">{label}</p></div>}
function Heading({number,title}:{number:string;title:string}){return <div className="flex items-center gap-3 border-b border-slate-200 pb-2"><span className="text-xs font-black text-orange-600">{number}</span><h2 className="text-lg font-black uppercase text-[#071b3a]">{title}</h2></div>}
