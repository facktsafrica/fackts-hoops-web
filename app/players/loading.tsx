export default function PlayersDirectoryLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-48 rounded bg-orange-400/20" />
        <div className="mt-5 h-16 max-w-3xl rounded bg-white/10" />
        <div className="mt-5 h-20 max-w-2xl rounded bg-white/5" />
        <div className="mt-10 h-24 rounded-[1.5rem] bg-white/10" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-80 rounded-[1.5rem] bg-white/10" />
          ))}
        </div>
      </div>
    </main>
  );
}
