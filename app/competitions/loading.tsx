export default function CompetitionsLoading() {
  return (
    <main className="fackts-public-bg min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="h-5 w-44 animate-pulse rounded-full bg-orange-500/20" />
        <div className="mt-6 h-16 max-w-3xl animate-pulse rounded-2xl bg-white/8 sm:h-28" />
        <div className="mt-5 h-5 max-w-2xl animate-pulse rounded-full bg-white/8" />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[0, 1].map((item) => <div key={item} className="aspect-[16/9] animate-pulse rounded-[1.7rem] border border-white/10 bg-slate-900/80" />)}
        </div>
      </div>
    </main>
  );
}
