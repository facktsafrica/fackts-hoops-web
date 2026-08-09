export default function PlayerProfileLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-11 w-36 rounded-xl bg-white/10" />
        <div className="mt-8 grid gap-7 lg:grid-cols-[360px_1fr] lg:items-end">
          <div className="aspect-[4/5] rounded-[2rem] bg-white/10" />
          <div>
            <div className="h-5 w-48 rounded bg-orange-400/20" />
            <div className="mt-5 h-16 max-w-3xl rounded bg-white/10" />
            <div className="mt-5 h-20 max-w-2xl rounded bg-white/5" />
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-20 rounded-2xl bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
