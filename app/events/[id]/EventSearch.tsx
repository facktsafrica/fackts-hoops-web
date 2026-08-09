"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export default function EventSearch({ initialValue = "" }: { initialValue?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = response.ok ? await response.json() : { results: [] };
        setResults(Array.isArray(body.results) ? body.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    const next = new URLSearchParams(searchParams.toString());
    if (query) next.set("q", query); else next.delete("q");
    next.delete("gamesPage");
    const suffix = next.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname);
  }

  function clear() {
    setValue("");
    setResults([]);
    setLoading(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("q");
    next.delete("gamesPage");
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  const query = value.trim();

  return (
    <section className="relative z-40 mx-auto max-w-7xl px-4 pb-4 pt-5 sm:px-6 sm:pb-8 lg:px-8">
      <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-xl">
        <label htmlFor="event-search" className="sr-only">Search FACKTS Hoops</label>
        <span aria-hidden="true" className="pl-2 text-zinc-500">⌕</span>
        <input
          ref={inputRef}
          id="event-search"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);
            if (nextValue.trim().length < 2) {
              setResults([]);
              setLoading(false);
            }
          }}
          placeholder="Search Hanss, teams, games, 1v1s, events…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
        />
        {value ? (
          <button type="button" onClick={clear} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.05] text-base font-black text-zinc-300" aria-label="Clear search">×</button>
        ) : null}
        <button type="submit" className="shrink-0 rounded-xl bg-orange-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-black">Search</button>
      </form>

      {query.length >= 2 ? (
        <div className="relative z-50 mt-2 max-h-[55vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#020617] p-2 shadow-2xl sm:absolute sm:left-6 sm:right-6 lg:left-8 lg:right-8">
          {results.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-xl px-3 py-2.5 transition hover:bg-white/[.06]" onClick={() => setResults([])}>
              <span className="block text-[9px] font-black uppercase tracking-[.14em] text-orange-300">{item.type}</span>
              <span className="block text-sm font-black text-white">{item.title}</span>
              {item.subtitle ? <span className="block text-xs text-zinc-500">{item.subtitle}</span> : null}
            </Link>
          ))}
          {loading ? <p className="px-3 py-3 text-center text-xs font-bold text-zinc-500">Searching the whole app…</p> : null}
          {!loading && !results.length ? <p className="px-3 py-4 text-center text-xs font-bold text-zinc-500">No app-wide suggestion yet. Press Search to filter this event.</p> : null}
        </div>
      ) : null}

      {initialValue ? <p className="mt-2 px-1 text-xs font-bold text-zinc-400">Showing this event for <span className="text-orange-300">“{initialValue}”</span></p> : null}
    </section>
  );
}
