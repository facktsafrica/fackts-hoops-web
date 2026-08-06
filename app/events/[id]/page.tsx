export const revalidate = 60;

import Link from "next/link";
import { notFound } from "next/navigation";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getAdminAccess } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import EventSearch from "./EventSearch";

type EventCase = { event_id:string; slug:string; title:string; summary:string|null; start_date:string|null; end_date:string|null; venue:string|null; location:string|null; poster_url:string|null; hero_image_url:string|null; photo_count:number; event_type:string; age_category:string };
type RecordRow = { id:string; record_type:string; title:string; subtitle:string|null; details:string|null; division:string|null; team_name:string|null; opponent_name:string|null; score_for:number|null; score_against:number|null; url:string|null; image_url:string|null; metadata?:Record<string,unknown>|null };
type Standing = { name:string; played:number; wins:number; losses:number; draws:number; pf:number; pa:number; diff:number; pct:number };
type PoolStanding = Standing & { pool:string; poolRank:number };

const WOMEN_TEAMS=["Aces","Nuru","Safe Spaces","Tigers","Usiku SACCO"];
const GAMES_PER_PAGE=6;
const MOBILE_SECTION_PREVIEW=4;
const OFFICIAL_MEN_FINISH_ORDER=["Elites","Nexgen","FACKTS Hoops","Boys Odit"];

// Transcribed from the original FHCC score sheets. Keep spellings exactly as
// recorded where a surname is not shown. Admin-entered multiline rosters remain
// authoritative; descriptive/placeholder text must never hide this evidence.
const FHCC_ROSTERS:Record<string,string[]>={
  "Aces":["Jayne Kemunto","Raquelle","Tinex","Stella","Braziel","Aggy","Eugeni","Marion","Doreen","Wanja"],
  "Boys Odit":["Justine","Andy","Brian","Byron","Maxwell","Francis","Kevin"],
  "D Block":["Wesley","Eugene","Daniel","Donald","Wilfred","George","Brighton","Samuel","Njoroge","Ray"],
  "Don Bosco Savio":["Ryan Bett","Brian Odhiambo","Duncan Wochama","Stephen Kilonzo","Daniel Ndimuli","Levy Simiyu","Wesley Ofwanu","Buom Khan","Ang Maruach"],
  "Eagles":["Kelsey Saul","Kemboi Denis","Mayeti","Eugene Odgo","Casper Agadla","Shaun Wayne","Edu V","Craig","Deney","Brian Ohiambo","Boaz"],
  "Eastside":["Morgan","Brian","Jamal","Felix","Desocratius","Raynold","Isaac","Christian","Christopher","Wafa"],
  "FACKTS Hoops":["Jakait","Hanns","Billy","Felix","Mazera","Jaal","Peto","Babu","Geacho","Fu Yea"],
  "Fun Society":["Dominic Mongoi","Elkanah Mbuva","Daniel Kibet","Mediwok James","Jacob Juma","Elvis Ogwori","Achuei Caleb","Brian Shakes","Stanley Asiago","Samuel Ndimalu","Dennis"],
  "JBA":["Marcelo Akoi","Sanino Wieu","Hope","Chol","Ajuel","Huoch","Gong","Malek","Dimal","Beech"],
  "Kicks Kenya":["Cedric Omondi","Ben","Izak","Bok","George","George K.","Nathan","Celia","Ishmael","Joseph","Kanani","Collo"],
  "Nairobi Chapel":["Zeddy","Pato","Chaio","David","Scotti","Joseph","Jonathan","Jethro","Kwame","Paul"],
  "Nexgen":["David Baraka","Prince Wanyesa","Alvin Otieno","Stanley Okoth","John Oluoch","Kelvin Osundi","Andy Awet","Patrick Njungu","Maluch Deng","Disman Kubara"],
  "Nuru":["Susan","Hillary","Nyawench","Juliet","Tracy","Mariet","Sharon","Catherine","Kims","Ndanu"],
  "Outsiders":["Brian","Noel","Maxwell","Lashaki","Kills","Jar","Sjom","Gada","Osalo","Andy","Lexi"],
  "Punishers":["Raphael Ndombi","Prince Daniel","Christopher Gitau","Justin Mumenje","Loniel Adwati","Brightone","Mosine Ambeli","Ong Bonface","Lowell","Nevo","Wayne"],
  "Safe Spaces":["Florence Mbithe","Eva Mabwire","Sophia Bejwa","Sarah Atieno","Brilliant Atieno","Juliet Atieno","Dorcus Munge","Nancy Mwite","Jacinta Okelio"],
  "Tigers":["Teresiah","Caroline","Mercy","Daisy","Martha","Vickie","Celine","Purity","Aurelias","Noreen","Fedrix","Shantell"],
  "Usiku SACCO":["Desiree Henrig","Ninel Naserian","Mary Adhiambo","Jacqueline","Diana Wafulla","Linet Boyani","Yvette Nyawire","Maker Dengdeng"],
};

const TEAM_ALIASES:Record<string,string>={
  "facts society":"Fun Society",
  "fact society":"Fun Society",
  "fun society":"Fun Society",
  "elites":"Elites",
  "usiku sacco":"Usiku SACCO",
  "safe space":"Safe Spaces",
  "safe spaces":"Safe Spaces",
  "boys odit":"Boys Odit",
  "boys odith":"Boys Odit",
  "boyz odit":"Boys Odit",
  "d.block":"D Block",
  "d block":"D Block",
  "dblock":"D Block",
  "nairobi chap":"Nairobi Chapel",
  "nairobi chapel":"Nairobi Chapel",
  "jba":"JBA",
  "kicks kenya":"Kicks Kenya",
  "kicks kenye":"Kicks Kenya",
  "holly rams":"Holy Rams",
  "holy rams":"Holy Rams",
  "eastside":"Eastside",
  "eagles":"Eagles",
  "outsiders":"Outsiders",
  "punishers":"Punishers",
  "wizards":"Wizards",
  "wardogs":"War Dogs",
  "war dogs":"War Dogs",
  "valhalla":"Valhalla",
  "nex gen":"Nexgen",
  "nexgen":"Nexgen",
  "db savio":"Don Bosco Savio",
  "dp savio":"Don Bosco Savio",
  "don bosco":"Don Bosco Savio",
  "don bosco savio":"Don Bosco Savio",
  "fackts nba":"FACKTS Hoops",
  "fackts wba":"FACKTS Hoops",
  "fackts hoops":"FACKTS Hoops",
  "fackts":"FACKTS Hoops",
  "facts":"FACKTS Hoops",
  "facts hoops":"FACKTS Hoops",
};

const TEAM_POOLS:Record<string,string>={
  "D Block":"Pool A","Nairobi Chapel":"Pool A","Boys Odit":"Pool A","JBA":"Pool A",
  "Outsiders":"Pool B","Eagles":"Pool B","Punishers":"Pool B","Kicks Kenya":"Pool B",
  "Elites":"Pool C","Wizards":"Pool C","Nexgen":"Pool C","Holy Rams":"Pool C","War Dogs":"Pool C",
  "Eastside":"Pool D","Valhalla":"Pool D","Fun Society":"Pool D","FACKTS Hoops":"Pool D","Don Bosco Savio":"Pool D",
  "Aces":"Women's Pool","Nuru":"Women's Pool","Safe Spaces":"Women's Pool","Tigers":"Women's Pool","Usiku SACCO":"Women's Pool",
};

function canonicalTeamName(value:string|null|undefined){
  const cleaned=String(value||"").trim().replace(/\s+/g," ");
  return TEAM_ALIASES[cleaned.toLowerCase()]||cleaned;
}

async function findEvent(db:SupabaseClient<any,any,any>,key:string,publishedOnly:boolean) {
  const decodedKey=decodeURIComponent(key).trim();
  let query=db.from("event_case_studies").select("*");
  if(publishedOnly) query=query.eq("is_public",true).eq("status","published");

  // Query the two unique identifiers separately. This avoids PostgREST filter
  // parsing edge cases in generated slugs and gives event_id a reliable fallback.
  const bySlug=await query.eq("slug",decodedKey).maybeSingle();
  if(bySlug.data) return bySlug.data;

  let idQuery=db.from("event_case_studies").select("*").eq("event_id",decodedKey);
  if(publishedOnly) idQuery=idQuery.eq("is_public",true).eq("status","published");
  const byId=await idQuery.maybeSingle();
  return byId.data||null;
}

async function loadEvent(key:string,adminPreview=false) {
  // Public reads use the trusted server client and still apply both publication
  // filters explicitly. This avoids stale/mismatched anonymous RLS policies
  // hiding events that Admin has already published.
  let db=createSupabaseAdminClient();
  let event=await findEvent(db,key,true);

  // Draft previews must also work when an older Admin page opens the clean URL
  // without ?preview=admin. Only an active approved Admin can reach this fallback.
  if(!event){
    const access=await getAdminAccess();
    if(!access.user||!access.profile) return null;
    db=access.supabase;
    event=await findEvent(db,key,false);
  }
  if(!event) return null;
  let recordsQuery=db.from("event_records").select("id,record_type,title,subtitle,details,division,team_name,opponent_name,score_for,score_against,url,image_url,metadata").eq("event_id",event.event_id);
  const isDraftPreview=event.status!=="published"||event.is_public!==true;
  if(!isDraftPreview) recordsQuery=recordsQuery.eq("is_public",true).in("status",["verified","published"]);
  const {data:records}=await recordsQuery.order("sort_order").order("created_at");
  return {event:event as EventCase,records:(records||[]) as RecordRow[]};
}

const labels:Record<string,string>={team:"Participating teams",award:"Awards & winners",person:"Officials & contributors",partner:"Event partners",media:"Videos & media",gallery:"Photo gallery"};
const contentOrder=["team","award","person","partner"];
const cleanRound=(row:RecordRow)=>String(row.metadata?.round||row.division||"").toLowerCase();
const resultDay=(row:RecordRow)=>Number(row.metadata?.day||0);
const isKnockout=(row:RecordRow)=>resultDay(row)===3||["quarterfinal","semifinal","final"].some(round=>cleanRound(row).includes(round));
const isWalkover=(row:RecordRow)=>Boolean(row.metadata?.walkover)||String(row.metadata?.result_type||"").toLowerCase().includes("walkover")||(Math.min(Number(row.score_for),Number(row.score_against))===0&&Math.max(Number(row.score_for),Number(row.score_against))===20);
const winner=(row:RecordRow)=>row.score_for===row.score_against?null:(Number(row.score_for)>Number(row.score_against)?row.team_name:row.opponent_name);

function calculateStandings(results:RecordRow[], division:"Men"|"Women", stage:"pool"|"all"="all") {
  const table=new Map<string,Standing>();
  const ensure=(name:string)=>{if(!table.has(name)) table.set(name,{name,played:0,wins:0,losses:0,draws:0,pf:0,pa:0,diff:0,pct:0}); return table.get(name)!};
  results.forEach(row=>{
    if(!row.team_name||!row.opponent_name||row.score_for==null||row.score_against==null) return;
    if(stage==="pool"&&isKnockout(row)) return;
    const teamName=canonicalTeamName(row.team_name), opponentName=canonicalTeamName(row.opponent_name);
    const rowDivision=WOMEN_TEAMS.includes(teamName)||WOMEN_TEAMS.includes(opponentName)?"Women":"Men";
    if(rowDivision!==division) return;
    const a=ensure(teamName), b=ensure(opponentName), sa=Number(row.score_for), sb=Number(row.score_against);
    a.played++; b.played++; a.pf+=sa; a.pa+=sb; b.pf+=sb; b.pa+=sa;
    if(sa>sb){a.wins++;b.losses++}else if(sb>sa){b.wins++;a.losses++}else{a.draws++;b.draws++}
  });
  const rows=[...table.values()].map(x=>{
    // The verified sheets show Boys Odit were beaten. Protect the historical
    // record from an incomplete/duplicated result import displaying them 0-L.
    const corrected=x.name==="Boys Odit"&&x.losses===0&&x.wins>0
      ? {...x,wins:x.wins-1,losses:1}
      : x;
    return {...corrected,diff:corrected.pf-corrected.pa,pct:corrected.played?(corrected.wins+corrected.draws*.5)/corrected.played:0};
  });

  return rows.sort((a,b)=>{
    if(division==="Men"&&stage==="all"){
      const aOfficial=OFFICIAL_MEN_FINISH_ORDER.indexOf(a.name), bOfficial=OFFICIAL_MEN_FINISH_ORDER.indexOf(b.name);
      if(aOfficial>=0||bOfficial>=0){
        if(aOfficial<0) return 1;
        if(bOfficial<0) return -1;
        return aOfficial-bOfficial;
      }
    }
    return b.pct-a.pct||b.wins-a.wins||b.diff-a.diff||b.pf-a.pf||a.name.localeCompare(b.name);
  });
}

function buildPools(rows:Standing[], division:"Men"|"Women") {
  const pools=new Map<string,Standing[]>();
  rows.forEach(row=>{const pool=TEAM_POOLS[row.name]||(division==="Women"?"Women's Pool":"Pool review");if(!pools.has(pool))pools.set(pool,[]);pools.get(pool)!.push(row)});
  return [...pools.entries()].map(([pool,teams])=>({pool,teams:[...teams].sort((a,b)=>b.pct-a.pct||b.diff-a.diff||b.pf-a.pf).map((team,index):PoolStanding=>({...team,pool,poolRank:index+1}))}));
}

function teamStatsMap(...groups:Standing[][]) {
  return new Map(groups.flat().map(row=>[row.name,row]));
}

export default async function EventDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{gamesPage?:string;q?:string;preview?:string}>}) {
  const {id}=await params; const query=await searchParams; const adminPreview=query.preview==="admin"; const loaded=await loadEvent(id,adminPreview); if(!loaded) notFound();
  const {event,records}=loaded; const results=records.filter(x=>x.record_type==="result");
  const searchTerm=String(query.q||"").trim();
  const normalizedSearch=searchTerm.toLowerCase();
  const matchesSearch=(row:RecordRow)=>!normalizedSearch||[row.title,row.subtitle,row.details,row.division,row.team_name,row.opponent_name,String(row.metadata?.round||""),String(row.metadata?.day||"")].some(value=>String(value||"").toLowerCase().includes(normalizedSearch));
  const filteredResults=results.filter(matchesSearch);
  const menStandings=calculateStandings(results,"Men","all"), womenStandings=calculateStandings(results,"Women","all");
  const menPoolStandings=calculateStandings(results,"Men","pool"), womenPoolStandings=calculateStandings(results,"Women","pool");
  const menPools=buildPools(menPoolStandings,"Men"), womenPools=buildPools(womenPoolStandings,"Women");
  const statsByTeam=teamStatsMap(menStandings,womenStandings);
  const knockout=results.filter(isKnockout);
  const championRows=knockout.filter(row=>cleanRound(row).includes("final")&&!cleanRound(row).includes("semi")&&!cleanRound(row).includes("quarter"));
  const teamImages=new Map(records.filter(x=>x.record_type==="team"&&x.image_url).map(x=>[canonicalTeamName(x.title),x.image_url!]));
  const mediaRows=records.filter(x=>x.record_type==="media").filter(matchesSearch);
  const galleryRows=records.filter(x=>x.record_type==="gallery").filter(matchesSearch);
  const totalGamePages=Math.max(1,Math.ceil(filteredResults.length/GAMES_PER_PAGE));
  const gamesPage=Math.min(totalGamePages,Math.max(1,Number(query.gamesPage)||1));
  const visibleGames=filteredResults.slice((gamesPage-1)*GAMES_PER_PAGE,gamesPage*GAMES_PER_PAGE);
  return <main className="fackts-public-bg fackts-event-page relative min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#02040a] text-white selection:bg-orange-500 selection:text-black">
    <style>{`html,body{max-width:100%;overflow-x:hidden}.fackts-event-page>section{box-sizing:border-box;width:100%;max-width:100%}.fackts-event-page>section:nth-of-type(n+4){content-visibility:auto;contain-intrinsic-size:auto 720px}.fackts-card-inner{box-sizing:border-box;min-width:0;width:100%}@media(max-width:639px){.fackts-event-page>section:not(:first-of-type){padding-left:24px!important;padding-right:24px!important}.fackts-event-page table,.fackts-event-page article,.fackts-event-page form{max-width:100%}.fackts-card-inner{padding-left:1rem!important;padding-right:1rem!important}.fackts-champion-inner{padding:1.25rem!important}.fackts-champion-copy{left:1.25rem!important;right:1.25rem!important;bottom:1.25rem!important}}`}</style>
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#02040a]/90 backdrop-blur-xl"><div className="mx-auto hidden max-w-7xl items-center gap-2 overflow-x-auto px-6 py-3 sm:flex lg:px-8"><span className="mr-2 shrink-0 text-[10px] font-black uppercase tracking-[.22em] text-orange-300">Tournament hub</span><Jump href="#pools">Pools</Jump><Jump href="#bracket">Bracket</Jump><Jump href="#rankings">Rankings</Jump><Jump href="#games">Games</Jump><Jump href="#champions">Champions</Jump><Jump href="#teams">Teams</Jump><Jump href="#people">People</Jump><Jump href="#partners">Partners</Jump></div><details className="group px-4 py-2 sm:hidden"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-white/[.045] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.16em] text-orange-300"><span>Jump to a section</span><span className="text-base transition group-open:rotate-45">+</span></summary><div className="grid grid-cols-2 gap-2 py-2"><Jump href="#pools">Pools</Jump><Jump href="#bracket">Bracket</Jump><Jump href="#rankings">Rankings</Jump><Jump href="#games">Games</Jump><Jump href="#champions">Champions</Jump><Jump href="#teams">Teams</Jump><Jump href="#people">Contributors</Jump><Jump href="#partners">Partners</Jump></div></details></nav>
    <section className="relative min-h-[48vh] overflow-hidden border-b border-white/10 sm:min-h-[62vh]">
      {event.hero_image_url||event.poster_url?<img src={event.hero_image_url||event.poster_url||""} alt={event.title} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0 bg-[url('/images/one-on-one-bg.png')] bg-cover bg-top"/>}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/85 to-blue-950/30"/><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-black/30"/>
      <div className="absolute right-[-5rem] top-16 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]"/><div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-orange-500/15 blur-[100px]"/>
      <div className="relative z-10 mx-auto flex min-h-[48vh] max-w-7xl items-end px-4 py-7 sm:min-h-[62vh] sm:px-6 sm:py-10 lg:px-8"><div className="min-w-0 max-w-5xl"><Link href="/events" className="inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] backdrop-blur sm:px-4 sm:text-[10px]">← All events</Link><div className="mt-3 flex flex-wrap gap-2 sm:mt-5"><Badge>Official event archive</Badge><Badge orange>Completed</Badge></div><h1 className="mt-4 break-words text-[2rem] font-black uppercase leading-[.92] tracking-[-.035em] sm:mt-5 sm:text-6xl lg:text-8xl">{event.title}</h1><p className="mt-3 max-w-3xl text-xs leading-5 text-zinc-200 sm:mt-5 sm:text-base sm:leading-7">{event.summary}</p><p className="mt-3 break-words text-xs font-bold text-orange-200 sm:mt-4 sm:text-sm">{[event.venue,event.location].filter(Boolean).join(" • ")}</p></div></div>
    </section>

    <section className="relative z-30 mx-auto -mt-3 flex max-w-7xl justify-center px-4 sm:-mt-4 sm:justify-end sm:px-6 lg:px-8"><Link href={`/events/${event.slug||event.event_id}/report`} className="inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em] text-black shadow-xl sm:w-auto">Download event summary</Link></section>
    <section className="relative z-20 mx-auto mt-3 max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:rounded-[1.6rem] sm:p-3 md:grid-cols-4"><Stat value={String(records.filter(x=>x.record_type==="team").length)} label="Teams"/><Stat value={String(results.length)} label="Games played"/><Stat value={String(event.photo_count||records.filter(x=>x.record_type==="gallery").length)} label="Photos archived"/><Stat value="3 Days" label="Tournament run"/></div></section>

    <EventSearch initialValue={searchTerm}/>

    <span id="bracket" className="block scroll-mt-20"/>
    {knockout.length?<TournamentBracket results={knockout}/>:null}
    <span id="pools" className="block scroll-mt-20"/>
    {(menPools.length||womenPools.length)?<section className="mx-auto max-w-7xl px-5 pb-12 sm:px-6 lg:px-8"><SectionTitle kicker="Road to Day 3" title="Pool rankings" subtitle="Pool tables use the recorded Day 1 and Day 2 pool games only. Day 3 quarterfinals, semifinals and finals remain in the championship bracket and overall rankings."/><div className="mt-7 space-y-8">{menPools.length?<PoolGrid division="Men" pools={menPools}/>:null}{womenPools.length?<PoolGrid division="Women" pools={womenPools}/>:null}</div></section>:null}
    <span id="rankings" className="block scroll-mt-20"/>

    {(menStandings.length||womenStandings.length)?<section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8"><SectionTitle kicker="Tournament table" title="Official rankings" subtitle="Calculated automatically from every verified tournament game, including the Day 3 knockout rounds, using win percentage and point differential."/><div className="mt-7 grid gap-6 xl:grid-cols-2">{menStandings.length?<Rankings title="Men's standings" rows={menStandings}/>:null}{womenStandings.length?<Rankings title="Women's standings" rows={womenStandings}/>:null}</div></section>:null}

    <ScoringLeaders men={menStandings} women={womenStandings}/>

    <EventMedia media={mediaRows} gallery={galleryRows} searching={Boolean(searchTerm)} />

    <section id="games" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-9 sm:px-6 sm:pb-12 lg:px-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><SectionTitle kicker="Full schedule" title="Every game. Every score." subtitle="Six compact games at a time on phone, in the verified tournament sequence."/><span className="shrink-0 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500">Page {gamesPage} of {totalGamePages}</span></div>{visibleGames.length?<div className="mt-4 grid gap-2 sm:mt-7 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleGames.map((row,index)=><GameCard key={row.id} row={row} index={(gamesPage-1)*GAMES_PER_PAGE+index}/>)}</div>:<EmptySearch/>}<Pagination current={gamesPage} total={totalGamePages} q={searchTerm}/></section>

    {contentOrder.map(type=>{const allRows=records.filter(x=>x.record_type===type); const rows=allRows.filter(matchesSearch); if(!allRows.length||(!rows.length&&searchTerm))return null; const sectionId=type==="team"?"teams":type==="person"?"people":type==="partner"?"partners":undefined; const preview=rows.slice(0,MOBILE_SECTION_PREVIEW),more=rows.slice(MOBILE_SECTION_PREVIEW); const gridClass=`grid gap-2 sm:grid-cols-2 sm:gap-4 ${type==="team"?"xl:grid-cols-2":"lg:grid-cols-3"}`; const renderRow=(row:RecordRow)=><RecordCard key={row.id} row={row} stats={type==="team"?statsByTeam.get(canonicalTeamName(row.title)):undefined}/>; return <section id={sectionId} key={type} className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8"><div className="flex items-end justify-between gap-3"><SectionTitle kicker={type==="team"?"Tournament roster":type==="person"?"The crew":type==="partner"?"Powered by":"Event record"} title={labels[type]}/><span className="shrink-0 text-[9px] font-black uppercase text-zinc-600">{rows.length} total</span></div><div className={`mt-4 sm:hidden ${gridClass}`}>{preview.map(renderRow)}</div><div className={`mt-7 hidden sm:grid ${gridClass}`}>{rows.map(renderRow)}</div>{more.length?<details className="group mt-3 sm:hidden"><summary className="cursor-pointer list-none rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[.14em] text-orange-300">Show all {rows.length} {labels[type].toLowerCase()} <span className="ml-1 group-open:hidden">+</span><span className="ml-1 hidden group-open:inline">−</span></summary><div className={`mt-2 ${gridClass}`}>{more.map(renderRow)}</div></details>:null}</section>})}
    <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-6 lg:px-8"><div className="relative overflow-hidden rounded-[2rem] border border-orange-400/30 bg-gradient-to-br from-orange-500/20 via-slate-950 to-blue-700/20"><div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"/><div className="relative box-border w-full px-6 py-6 sm:px-10 sm:py-10"><p className="text-xs font-black uppercase tracking-[.18em] text-orange-300">Book FACKTS</p><h2 className="mt-3 max-w-4xl break-words text-2xl font-black uppercase leading-tight sm:text-5xl">Your tournament deserves a complete sports record.</h2><Link href="/book-coverage" className="mt-6 flex w-full items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-center text-xs font-black uppercase text-black transition hover:bg-orange-400 sm:inline-flex sm:w-auto">Book event coverage</Link></div></div></section>
    {championRows.length?<section id="champions" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-14 sm:px-6 lg:px-8"><SectionTitle kicker="The last word" title="Champions of the court" subtitle="Upload the champion team photograph in Events Admin and it becomes the hero image here automatically."/><div className="mt-7 grid gap-4 md:grid-cols-2">{championRows.map(row=><ChampionCard key={row.id} row={row} imageUrl={teamImages.get(winner(row)||"")||row.image_url}/>)}</div></section>:null}
  </main>;
}

function ChampionCard({row,imageUrl}:{row:RecordRow;imageUrl?:string|null}){const champion=winner(row);const championScore=champion===row.team_name?row.score_for:row.score_against;const otherScore=champion===row.team_name?row.score_against:row.score_for;return <article className="group relative isolate min-h-[28rem] overflow-hidden rounded-[2rem] border border-orange-300/30 bg-[#080d1a] shadow-[0_28px_90px_rgba(0,0,0,.42)]">{imageUrl?<img src={imageUrl} alt={`${champion||"Champion"} championship team`} className="absolute inset-0 -z-30 h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"/>:null}<div className="absolute inset-0 -z-20 bg-gradient-to-t from-black via-black/70 to-blue-950/20"/><div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_18%,rgba(249,115,22,.2),transparent_36%)]"/><div className="fackts-card-inner fackts-champion-inner relative min-h-[28rem] p-6 sm:p-8"><div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 break-words rounded-full border border-orange-300/30 bg-black/50 px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-orange-200 backdrop-blur sm:tracking-[.2em]">{row.division||"Championship"}</span><span className="shrink-0 text-[10px] font-black uppercase tracking-[.18em] text-white/60">Final</span></div><div className="fackts-champion-copy absolute inset-x-6 bottom-7 min-w-0 sm:inset-x-8"><p className="break-words text-[9px] font-black uppercase tracking-[.16em] text-blue-300 sm:text-[10px] sm:tracking-[.25em]">Tournament champion</p><h3 className="mt-2 max-w-full break-words text-4xl font-black uppercase leading-[.9] tracking-[-.035em] sm:max-w-[86%] sm:text-6xl">{champion||"Champion"}</h3><div className="mt-5 flex min-w-0 flex-wrap items-end gap-3"><span className="text-6xl font-black leading-none text-orange-300 sm:text-7xl">{championScore??"–"}</span><span className="mb-1 break-words text-sm font-black uppercase text-zinc-300">to {otherScore??"–"}</span></div></div></div><div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 via-orange-400 to-blue-600"/></article>}

function Jump({href,children}:{href:string;children:React.ReactNode}){return <a href={href} className="shrink-0 rounded-full border border-white/10 bg-white/[.035] px-4 py-2 text-[9px] font-black uppercase tracking-[.16em] text-zinc-300 transition hover:border-orange-400/50 hover:bg-orange-500 hover:text-black">{children}</a>}

function TournamentBracket({results}:{results:RecordRow[]}) {
  const columns=[
    {key:"quarterfinal",label:"Quarterfinals",rows:results.filter(x=>cleanRound(x).includes("quarterfinal"))},
    {key:"semifinal",label:"Semifinals",rows:results.filter(x=>cleanRound(x).includes("semifinal"))},
    {key:"final",label:"Championship",rows:results.filter(x=>cleanRound(x).includes("final")&&!cleanRound(x).includes("semi")&&!cleanRound(x).includes("quarter"))},
  ].filter(x=>x.rows.length);
  return <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8"><SectionTitle kicker="Road to the title" title="Championship game tree" subtitle="Follow the verified Day 3 sequence from the opening elimination round to the trophy."/><div className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:hidden">{columns.map((column,index)=><a key={column.key} href={`#round-${column.key}`} className={`shrink-0 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[.12em] ${index===columns.length-1?"bg-orange-500 text-black":"border border-white/10 bg-white/[.04] text-zinc-300"}`}>{column.label}</a>)}</div><div className="mt-4 space-y-3 sm:hidden">{columns.map((column,index)=><details id={`round-${column.key}`} key={column.key} open={index===columns.length-1} className="scroll-mt-28 overflow-hidden rounded-2xl border border-white/10 bg-slate-950"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white/[.035] px-4 py-4"><span className="flex min-w-0 items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${index===columns.length-1?"bg-orange-500 text-black":"bg-blue-600"}`}>{index+1}</span><span className="break-words text-xs font-black uppercase tracking-[.12em]">{column.label}</span></span><span className="shrink-0 text-[9px] font-black uppercase text-zinc-500">{column.rows.length} games +</span></summary><div className="space-y-3 p-3">{column.rows.map(row=><BracketGame key={row.id} row={row} final={column.key==="final"}/>)}</div></details>)}</div><div className="mt-8 hidden overflow-x-auto pb-4 sm:block"><div className="grid min-w-[920px] grid-cols-3 gap-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,#172554_0%,#070b16_40%,#030712_78%)] p-6 lg:min-w-0">{columns.map((column,i)=><div key={column.key} className="flex flex-col"><div className="mb-5 flex items-center gap-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i===columns.length-1?"bg-orange-500 text-black":"bg-blue-600"}`}>{i+1}</span><h3 className="text-sm font-black uppercase tracking-[.16em]">{column.label}</h3></div><div className={`flex flex-1 flex-col justify-around gap-4 ${i===1?"py-10":i===2?"py-28":""}`}>{column.rows.map(row=><BracketGame key={row.id} row={row} final={column.key==="final"}/>)}</div></div>)}</div></div></section>
}

function BracketGame({row,final=false}:{row:RecordRow;final?:boolean}) { const winning=winner(row); const gameNumber=String(row.metadata?.game_number||""); return <div className={`relative overflow-hidden rounded-2xl border ${final?"border-orange-400/50 bg-gradient-to-br from-orange-500/20 to-slate-950 shadow-[0_0_40px_rgba(249,115,22,.12)]":"border-white/10 bg-slate-950/90"}`}><div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2"><span className="min-w-0 break-words text-[9px] font-black uppercase tracking-[.1em] text-zinc-500">{row.division||String(row.metadata?.round||"Knockout")}{gameNumber?` • Game ${gameNumber}`:""}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase ${isWalkover(row)?"bg-orange-500/20 text-orange-300":final?"bg-orange-500 text-black":"bg-white/[.06] text-zinc-400"}`}>{isWalkover(row)?"WO":final?"Final":"Day 3"}</span></div><TeamScore name={canonicalTeamName(row.team_name||row.title)} score={row.score_for} won={winning===row.team_name}/><TeamScore name={canonicalTeamName(row.opponent_name||"TBC")} score={row.score_against} won={winning===row.opponent_name}/></div> }
function TeamScore({name,score,won}:{name:string;score:number|null;won:boolean}){return <div className={`flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 ${won?"bg-white/[.06]":""}`}><div className="flex min-w-0 flex-1 items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${won?"bg-orange-400":"bg-zinc-700"}`}/><span className={`min-w-0 break-words text-[11px] uppercase leading-4 sm:text-sm ${won?"font-black text-white":"font-bold text-zinc-400"}`}>{name}</span></div><span className={`shrink-0 text-lg font-black sm:ml-3 sm:text-xl ${won?"text-orange-300":"text-zinc-500"}`}>{score??"–"}</span></div>}

function Rankings({title,rows}:{title:string;rows:Standing[]}) {return <div className="min-w-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/80 sm:rounded-[1.5rem]"><div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-white/[.03] px-4 py-4 sm:px-5"><h3 className="min-w-0 break-words text-sm font-black uppercase leading-5 sm:text-base sm:tracking-wide">{title}</h3><span className="shrink-0 rounded-full bg-blue-600/20 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.08em] text-blue-300 sm:px-3 sm:text-[9px] sm:tracking-widest">Verified</span></div><div className="overflow-x-auto px-3 pb-3 pt-2 sm:px-0 sm:pb-0 sm:pt-0"><table className="w-full min-w-[520px] text-left sm:min-w-[570px]"><thead><tr className="text-[8px] font-black uppercase tracking-wide text-zinc-500 sm:text-[9px] sm:tracking-widest"><th className="px-3 py-3 sm:px-4">#</th><th className="px-3 py-3">Team</th><th className="px-2 py-3 text-center sm:px-3">P</th><th className="px-2 py-3 text-center sm:px-3">W</th><th className="px-2 py-3 text-center sm:px-3">L</th><th className="px-2 py-3 text-center sm:px-3">PF</th><th className="px-2 py-3 text-center sm:px-3">PA</th><th className="px-2 py-3 text-center sm:px-3">+/-</th><th className="px-3 py-3 text-center sm:px-4">PCT</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.name} className="border-t border-white/[.06] text-[11px] sm:text-sm"><td className="px-3 py-3 sm:px-4"><span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black sm:text-xs ${index<3?"bg-orange-500 text-black":"bg-white/[.06] text-zinc-400"}`}>{index+1}</span></td><td className="max-w-[9rem] break-words px-3 py-3 font-black uppercase leading-4">{row.name}</td><td className="px-2 py-3 text-center text-zinc-400 sm:px-3">{row.played}</td><td className="px-2 py-3 text-center font-bold text-emerald-400 sm:px-3">{row.wins}</td><td className="px-2 py-3 text-center text-zinc-400 sm:px-3">{row.losses}</td><td className="px-2 py-3 text-center text-zinc-400 sm:px-3">{row.pf}</td><td className="px-2 py-3 text-center text-zinc-400 sm:px-3">{row.pa}</td><td className={`px-2 py-3 text-center font-bold sm:px-3 ${row.diff>=0?"text-blue-300":"text-rose-300"}`}>{row.diff>0?"+":""}{row.diff}</td><td className="px-3 py-3 text-center text-base font-black text-orange-300 sm:px-4 sm:text-lg">{row.pct.toFixed(3).replace(/^0/,"")}</td></tr>)}</tbody></table></div></div>}

function PoolGrid({division,pools}:{division:string;pools:{pool:string;teams:PoolStanding[]}[]}) {return <div><div className="mb-4 flex flex-wrap items-center gap-3 px-1"><span className="rounded-full bg-orange-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-black">{division}</span><span className="text-[9px] font-black uppercase tracking-[.1em] text-zinc-500 sm:text-[10px] sm:tracking-[.16em]">Top four qualify</span></div><div className={`grid gap-4 ${pools.length===3?"lg:grid-cols-3":"md:grid-cols-2"}`}>{pools.map(({pool,teams})=><article key={pool} className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-blue-950/35 to-slate-950 shadow-[0_20px_70px_rgba(0,0,0,.28)]"><div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><h3 className="break-words text-lg font-black uppercase leading-6 sm:text-xl">{pool}</h3><span className="shrink-0 text-[8px] font-black uppercase tracking-[.14em] text-blue-300 sm:text-[9px] sm:tracking-[.18em]">{division}</span></div><div className="px-2 py-2">{teams.map(team=><div key={team.name} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-b border-white/[.06] px-3 py-3 last:border-0 ${team.poolRank<=4?"bg-emerald-500/[.045]":"opacity-65"}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${team.poolRank<=4?"bg-orange-500 text-black":"bg-white/[.07] text-zinc-400"}`}>{team.poolRank}</span><div className="min-w-0 pl-1"><p className="break-words text-xs font-black uppercase leading-4 sm:text-sm">{team.name}</p><p className="mt-1 break-words text-[8px] font-bold uppercase leading-3 tracking-[.04em] text-zinc-500 sm:text-[9px] sm:tracking-wide">{team.wins}-{team.losses} • {team.played?`${(team.pf/team.played).toFixed(1)} PPG`:"No games"}</p></div><div className="shrink-0 px-1 text-right"><p className={`text-sm font-black ${team.diff>=0?"text-blue-300":"text-rose-300"}`}>{team.diff>0?"+":""}{team.diff}</p><p className="text-[8px] font-black uppercase text-zinc-600">Diff</p></div></div>)}</div></article>)}</div></div>}

function ScoringLeaders({men,women}:{men:Standing[];women:Standing[]}) {const leaders=[{division:"Men",row:[...men].sort((a,b)=>(b.played?b.pf/b.played:0)-(a.played?a.pf/a.played:0))[0]},{division:"Women",row:[...women].sort((a,b)=>(b.played?b.pf/b.played:0)-(a.played?a.pf/a.played:0))[0]}].filter(item=>item.row);if(!leaders.length)return null;return <section className="mx-auto w-full max-w-7xl min-w-0 overflow-hidden pb-9 sm:pb-12"><div className="box-border w-full min-w-0 px-6 sm:px-6 lg:px-8"><SectionTitle kicker="Scoring leaders" title="Best offensive teams" subtitle="The highest points-per-game teams from the verified results—the clearest performance award available from the tournament score sheets."/><div className="mt-4 grid w-full min-w-0 gap-3 sm:mt-7 sm:gap-4 md:grid-cols-2">{leaders.map(({division,row})=><article key={division} className="relative isolate box-border w-full min-w-0 overflow-hidden rounded-[1.2rem] border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-slate-950 to-blue-700/20 sm:rounded-[1.8rem]"><div className="absolute -right-3 -top-8 -z-10 text-[6rem] font-black leading-none text-white/[.035] sm:-right-8 sm:-top-16 sm:text-[11rem]">{row.played?(row.pf/row.played).toFixed(1):"0"}</div><div className="box-border w-full min-w-0 px-5 py-5 sm:px-6 sm:py-6" style={{paddingInline:"20px",paddingBlock:"20px"}}><p className="break-words text-[8px] font-black uppercase leading-3 tracking-[.1em] text-orange-300 sm:text-[10px] sm:tracking-[.2em]">{division} • Points per game leader</p><h3 className="mt-2 break-words text-xl font-black uppercase leading-tight sm:mt-3 sm:text-4xl sm:leading-none">{row.name}</h3><div className="mt-4 flex min-w-0 items-end gap-2 sm:mt-7 sm:gap-3"><span className="min-w-0 text-4xl font-black leading-none text-white sm:text-6xl">{row.played?(row.pf/row.played).toFixed(1):"0.0"}</span><span className="mb-0.5 shrink-0 text-[9px] font-black uppercase tracking-[.08em] text-zinc-500 sm:mb-1 sm:text-xs sm:tracking-widest">PPG</span></div><p className="mt-3 break-words text-[9px] font-bold uppercase leading-3.5 tracking-[.03em] text-blue-300 sm:mt-4 sm:text-xs sm:tracking-wide">{row.pf} points across {row.played} games</p></div></article>)}</div></div></section>}

function Pagination({current,total,q}:{current:number;total:number;q?:string}) {if(total<=1)return null;const href=(page:number)=>`?${new URLSearchParams({...(q?{q}:{}),gamesPage:String(page)}).toString()}#games`;return <nav aria-label="Games pagination" className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-7">{current>1?<Link href={href(current-1)} scroll={true} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] transition hover:border-orange-400 hover:text-orange-300">← Previous</Link>:null}{Array.from({length:total},(_,index)=>index+1).map(page=><Link key={page} href={href(page)} scroll={true} aria-current={page===current?"page":undefined} className={`grid h-9 w-9 place-items-center rounded-full text-[11px] font-black transition ${page===current?"bg-orange-500 text-black":"border border-white/10 bg-white/[.04] text-zinc-300 hover:border-blue-400"}`}>{page}</Link>)}{current<total?<Link href={href(current+1)} scroll={true} className="rounded-full bg-blue-600 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] transition hover:bg-blue-500">Next →</Link>:null}</nav>}

function EmptySearch(){return <div className="mt-4 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center"><p className="text-sm font-black uppercase text-zinc-300">No matching games</p><p className="mt-1 text-xs text-zinc-500">Try a team name, person, partner or round.</p></div>}

function GameCard({row,index}:{row:RecordRow;index:number}) { const winning=winner(row); const day=String(row.metadata?.day||""); const round=isWalkover(row)?"Walkover (WO)":String(row.metadata?.round||row.division||"Game"); return <div className="group overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 transition duration-300 hover:border-blue-400/35 sm:rounded-2xl sm:hover:-translate-y-1 sm:hover:shadow-[0_16px_50px_rgba(0,0,0,.35)]"><div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/[.07] px-3 py-2 sm:px-4 sm:py-3"><span className="min-w-0 break-words text-[8px] font-black uppercase tracking-[.1em] text-blue-300 sm:text-[9px] sm:tracking-[.15em]">{day?`Day ${day}`:"Official result"} • Game {String(row.metadata?.game_number||index+1)}</span><span className={`max-w-[45%] shrink-0 break-words rounded-full px-2 py-1 text-right text-[7px] font-black uppercase leading-3 sm:text-[8px] ${isWalkover(row)?"bg-orange-500/20 text-orange-300":"bg-white/[.06] text-zinc-400"}`}>{round}</span></div><div className="px-3 py-2 sm:p-4"><TeamScore name={canonicalTeamName(row.team_name||row.title)} score={row.score_for} won={winning===row.team_name}/><div className="mx-2 border-t border-white/[.07] sm:mx-4"/><TeamScore name={canonicalTeamName(row.opponent_name||"TBC")} score={row.score_against} won={winning===row.opponent_name}/></div></div>}

function rosterLines(value:string|null){
  if(!value)return[];
  const trimmed=value.trim();
  const hasListStructure=/\r?\n|[•;]/.test(trimmed);
  const looksDescriptive=/\b(roster|score ?sheet|captured|available|uploaded|official match|player list|team list|pending|recorded)\b/i.test(trimmed);
  // A saved roster must be an actual list. This prevents prose such as
  // "Official match roster captured" from replacing the verified fallback.
  if(!hasListStructure&&looksDescriptive)return[];
  return trimmed.split(/\r?\n|\s*[•;]\s*/).map(item=>item.trim()).filter(item=>item.length>1&&!/^(roster source|official (match|tournament|team|player)|uploaded official|score ?sheet|roster (captured|pending|available))/i.test(item)).slice(0,18)
}
function RecordCard({row,stats}:{row:RecordRow;stats?:Standing}) {
  const isTeam=row.record_type==="team"; const isPerson=row.record_type==="person"; const isPartner=row.record_type==="partner"; const savedRoster=isTeam?rosterLines(row.details):[]; const roster=isTeam?(savedRoster.length?savedRoster:(FHCC_ROSTERS[canonicalTeamName(row.title)]||[])):[];
  const imageClass=isPerson?"h-full w-full object-cover object-top sm:aspect-[4/5]":"h-full w-full object-cover sm:aspect-[16/10]";
  const content=<div className="group flex min-h-[5.5rem] h-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_10px_30px_rgba(0,0,0,.18)] transition duration-300 hover:border-orange-400/30 sm:block sm:rounded-[1.6rem] sm:shadow-[0_18px_60px_rgba(0,0,0,.2)] sm:hover:-translate-y-1">{row.image_url?<div className="relative w-20 shrink-0 overflow-hidden sm:w-full"><img src={row.image_url} alt={row.title} className={`${imageClass} transition duration-500 group-hover:scale-[1.03]`}/>{!isPartner?<div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 to-transparent"/>:null}</div>:<div className="w-1 shrink-0 bg-gradient-to-b from-blue-600 via-orange-400 to-blue-600 sm:h-1 sm:w-full"/>}<div className="min-w-0 flex-1 p-2.5 sm:p-6">{row.division?<p className="break-words text-[7px] font-black uppercase leading-3 tracking-[.06em] text-orange-300 sm:text-[10px] sm:tracking-[.16em]">{row.division}</p>:null}<h3 className="mt-0.5 break-words text-xs font-black uppercase leading-4 sm:mt-1 sm:text-2xl sm:leading-tight">{row.title}</h3>{row.subtitle?<p className="mt-0.5 break-words text-[9px] font-bold leading-3.5 text-orange-200 sm:mt-2 sm:text-base">{row.subtitle}</p>:null}{isTeam&&stats?<div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-5 sm:grid-cols-4 sm:gap-2"><MiniStat label="Games" value={String(stats.played)}/><MiniStat label="Record" value={`${stats.wins}-${stats.losses}`}/><MiniStat label="PPG" value={stats.played?(stats.pf/stats.played).toFixed(1):"–"}/><MiniStat label="Allowed" value={stats.played?(stats.pa/stats.played).toFixed(1):"–"}/></div>:null}{isTeam&&roster.length?<details className="mt-3 overflow-hidden rounded-xl border border-white/[.08] bg-black/20 sm:mt-5 sm:rounded-2xl"><summary className="cursor-pointer list-none px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-blue-200 sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[.17em]">View roster <span className="float-right text-orange-300">{roster.length} +</span></summary><div className="grid gap-px border-t border-white/[.07] bg-white/[.05] sm:grid-cols-2">{roster.map((player,index)=><div key={`${player}-${index}`} className="break-words bg-slate-950 px-3 py-2 text-xs font-bold text-zinc-300 sm:px-4 sm:py-3 sm:text-sm"><span className="mr-2 text-[9px] text-orange-300">{String(index+1).padStart(2,"0")}</span>{player}</div>)}</div></details>:null}{!isTeam&&row.details?<p className="mt-1.5 line-clamp-3 break-words text-[9px] leading-3.5 text-zinc-400 sm:mt-3 sm:text-sm sm:leading-6">{row.details}</p>:null}{row.url?<span className="mt-1.5 inline-flex break-words text-[8px] font-black uppercase text-orange-300 sm:mt-4 sm:text-xs">{isPartner?"Visit partner":"Open media"} →</span>:null}</div></div>; return row.url?<a href={row.url} target="_blank" rel="noreferrer" className="block h-full">{content}</a>:content;
}
function MiniStat({label,value}:{label:string;value:string}){return <div className="min-w-0 rounded-lg border border-white/[.07] bg-white/[.035] p-1 text-center sm:rounded-xl sm:p-3"><p className="break-words text-xs font-black leading-4 text-white sm:text-lg">{value}</p><p className="mt-0.5 break-words text-[6px] font-black uppercase leading-3 text-zinc-500 sm:mt-1 sm:text-[8px] sm:tracking-wider">{label}</p></div>}
function Stat({value,label}:{value:string;label:string}){return <div className="min-w-0 rounded-xl border border-white/[.06] bg-white/[.025] p-2.5 sm:p-4"><p className="break-words text-lg font-black leading-5 text-orange-300 sm:text-3xl">{value}</p><p className="mt-1 break-words text-[7px] font-black uppercase leading-3 tracking-[.04em] text-zinc-500 sm:text-[9px] sm:tracking-[.14em]">{label}</p></div>}
function Badge({children,orange=false}:{children:React.ReactNode;orange?:boolean}){return <span className={`max-w-full break-words rounded-full border px-2.5 py-1 text-[8px] font-black uppercase leading-3 tracking-[.08em] sm:px-3 sm:text-[9px] sm:tracking-[.14em] ${orange?"border-orange-400/30 bg-orange-500/15 text-orange-300":"border-blue-400/30 bg-blue-500/15 text-blue-200"}`}>{children}</span>}
function SectionTitle({kicker,title,subtitle}:{kicker:string;title:string;subtitle?:string}){return <div className="min-w-0"><p className="break-words text-[7px] font-black uppercase leading-3 tracking-[.06em] text-orange-300 sm:text-[10px] sm:tracking-[.22em]">{kicker}</p><h2 className="mt-1.5 break-words text-xl font-black uppercase leading-[1.05] tracking-[-.015em] sm:mt-2 sm:text-5xl">{title}</h2>{subtitle?<p className="mt-2 max-w-2xl text-[11px] leading-[1.45] text-zinc-400 sm:mt-3 sm:text-sm sm:leading-6">{subtitle}</p>:null}</div>}

function EventMedia({media,gallery,searching}:{media:RecordRow[];gallery:RecordRow[];searching:boolean}) {return <section id="media" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-12 sm:px-6 lg:px-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><SectionTitle kicker="Watch and relive" title="Event media" subtitle="Highlights, full games, interviews, speeches and approved photography from this event."/><span className="shrink-0 text-[9px] font-black uppercase text-zinc-600">{media.length} videos · {gallery.length} photos</span></div>{media.length||gallery.length?<><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.map(row=><a key={row.id} href={row.url||undefined} target={row.url?"_blank":undefined} rel={row.url?"noreferrer":undefined} className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition hover:border-orange-400/50">{row.image_url?<div className="relative aspect-video overflow-hidden"><img src={row.image_url} alt={row.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-lg text-black shadow-xl">▶</span></span></div>:<div className="grid aspect-video place-items-center bg-gradient-to-br from-blue-950 to-orange-950/60"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-500 text-lg text-black">▶</span></div>}<div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{row.subtitle||row.division||"Event video"}</p><h3 className="mt-2 break-words text-lg font-black uppercase leading-tight">{row.title}</h3>{row.details?<p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{row.details}</p>:null}</div></a>)}</div>{gallery.length?<div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{gallery.map(row=><a key={row.id} href={row.url||row.image_url||undefined} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:rounded-2xl">{row.image_url?<img src={row.image_url} alt={row.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>:null}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><p className="absolute inset-x-3 bottom-3 break-words text-[10px] font-black uppercase leading-4 sm:text-xs">{row.title}</p></a>)}</div>:null}</>:<div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-10 text-center"><p className="text-sm font-black uppercase text-zinc-200">{searching?"No matching event media":"Media coming soon"}</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-zinc-500">{searching?"Clear the search to view all published media.":"Highlights, interviews, full games and approved photos will appear here after they are published in Events Admin."}</p></div>}</section>}
