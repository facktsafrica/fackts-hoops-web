"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageSpecificMobileTuning() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/one-on-one") {
      const timer = window.setTimeout(() => {
        const candidates = Array.from(
          document.querySelectorAll("main article, main div.rounded-3xl")
        ) as HTMLElement[];

        candidates.forEach((element) => {
          const text = element.innerText || "";

          const looksLikeOneVOneLeaderboardCard =
            text.includes("WINS") &&
            text.includes("PLAYED") &&
            text.includes("POINTS");

          if (looksLikeOneVOneLeaderboardCard) {
            element.classList.add("fackts-1v1-leader-row");
          }
        });
      }, 300);

      return () => window.clearTimeout(timer);
    }

    if (pathname === "/") {
      const timer = window.setTimeout(() => {
        const links = Array.from(
          document.querySelectorAll('main a[href^="/players/"], main a[href^="/games/"]')
        ) as HTMLAnchorElement[];

        links.forEach((link) => {
          if (link.closest("#media-stories")) return;

          const wrapper =
            (link.closest("article") as HTMLElement | null) ??
            (link as HTMLElement);

          wrapper.classList.add("fackts-home-compact-card");

          if (link.getAttribute("href")?.startsWith("/players/")) {
            wrapper.classList.add("fackts-home-player-card");
          }

          if (link.getAttribute("href")?.startsWith("/games/")) {
            wrapper.classList.add("fackts-home-game-card");
          }
        });
      }, 300);

      return () => window.clearTimeout(timer);
    }
  }, [pathname]);

  const isOneOnOne = pathname === "/one-on-one";
  const isHome = pathname === "/";

  if (!isOneOnOne && !isHome) {
    return null;
  }

  return (
    <style jsx global>{`
      @media (max-width: 768px) {
        body,
        main {
          overflow-x: hidden;
        }

        main a:hover,
        main article:hover {
          transform: none !important;
        }

        ${
          isHome
            ? `
        /* =====================================================
           HOME MOBILE COMPACT PLAYER + GAME CARDS ONLY
           Media stories are excluded.
           ===================================================== */

        main > section {
          padding-top: 1.1rem !important;
          padding-bottom: 1.1rem !important;
        }

        main section {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }

        main .grid {
          gap: 0.8rem !important;
        }

        main h1 {
          font-size: 2.15rem !important;
          line-height: 1.05 !important;
        }

        main h2 {
          font-size: 1.35rem !important;
          line-height: 1.12 !important;
        }

        main p {
          font-size: 0.88rem !important;
          line-height: 1.5 !important;
        }

        main .py-24,
        main .py-20,
        main .py-16,
        main .py-12,
        main .py-10,
        main .py-8 {
          padding-top: 1.35rem !important;
          padding-bottom: 1.35rem !important;
        }

        main .p-8 {
          padding: 1rem !important;
        }

        main .p-6 {
          padding: 0.9rem !important;
        }

        main .p-5 {
          padding: 0.8rem !important;
        }

        main .p-4 {
          padding: 0.75rem !important;
        }

        .fackts-home-compact-card {
          display: grid !important;
          grid-template-columns: 4.8rem minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 0.75rem !important;
          padding: 0.7rem !important;
          min-height: auto !important;
          border-radius: 1.15rem !important;
          overflow: hidden !important;
        }

        .fackts-home-compact-card > a {
          display: contents !important;
        }

        .fackts-home-compact-card img {
          width: 4.8rem !important;
          height: 4.8rem !important;
          min-width: 4.8rem !important;
          max-width: 4.8rem !important;
          min-height: 4.8rem !important;
          max-height: 4.8rem !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }

        .fackts-home-compact-card div:has(> img) {
          width: 4.8rem !important;
          height: 4.8rem !important;
          min-width: 4.8rem !important;
          max-width: 4.8rem !important;
          min-height: 4.8rem !important;
          max-height: 4.8rem !important;
          overflow: hidden !important;
          border-radius: 1rem !important;
          padding: 0 !important;
        }

        .fackts-home-compact-card .h-96,
        .fackts-home-compact-card .h-80,
        .fackts-home-compact-card .h-72,
        .fackts-home-compact-card .h-64,
        .fackts-home-compact-card .h-56,
        .fackts-home-compact-card .h-48,
        .fackts-home-compact-card .h-44,
        .fackts-home-compact-card .h-40 {
          height: 4.8rem !important;
          width: 4.8rem !important;
          min-width: 4.8rem !important;
          max-width: 4.8rem !important;
          border-radius: 1rem !important;
        }

        .fackts-home-compact-card h2,
        .fackts-home-compact-card h3,
        .fackts-home-compact-card .text-4xl,
        .fackts-home-compact-card .text-3xl,
        .fackts-home-compact-card .text-2xl,
        .fackts-home-compact-card .text-xl {
          font-size: 0.95rem !important;
          line-height: 1.1 !important;
          margin: 0 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .fackts-home-compact-card p,
        .fackts-home-compact-card .text-sm,
        .fackts-home-compact-card .text-xs {
          font-size: 0.72rem !important;
          line-height: 1.3 !important;
          margin-top: 0.15rem !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
        }

        .fackts-home-compact-card span {
          font-size: 0.62rem !important;
        }

        .fackts-home-compact-card .grid {
          gap: 0.35rem !important;
        }

        .fackts-home-compact-card .rounded-3xl,
        .fackts-home-compact-card .rounded-2xl {
          border-radius: 0.9rem !important;
        }

        .fackts-home-compact-card .p-6,
        .fackts-home-compact-card .p-5,
        .fackts-home-compact-card .p-4 {
          padding: 0.45rem !important;
        }

        #media-stories .fackts-home-compact-card {
          display: block !important;
          padding: initial !important;
        }
        `
            : ""
        }

        ${
          isOneOnOne
            ? `
        /* =====================================================
           1V1 MOBILE LEADERBOARD ROW MODE
           ===================================================== */

        main > section {
          padding-top: 1rem !important;
          padding-bottom: 1rem !important;
        }

        main section {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }

        main .grid {
          gap: 0.75rem !important;
        }

        main h1 {
          font-size: 2rem !important;
          line-height: 1.08 !important;
        }

        main h2 {
          font-size: 1.25rem !important;
          line-height: 1.15 !important;
        }

        main p {
          font-size: 0.86rem !important;
          line-height: 1.45 !important;
        }

        .fackts-1v1-leader-row {
          display: grid !important;
          grid-template-columns: 2.25rem 3.25rem minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 0.65rem !important;
          padding: 0.65rem 0.75rem !important;
          border-radius: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
          border-top: 0 !important;
          border-bottom: 1px solid rgba(51, 65, 85, 0.8) !important;
          background: rgba(15, 23, 42, 0.92) !important;
          box-shadow: none !important;
          min-height: 4.7rem !important;
        }

        .fackts-1v1-leader-row img {
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          max-width: 3rem !important;
          border-radius: 0.8rem !important;
          object-fit: cover !important;
        }

        .fackts-1v1-leader-row .rounded-full:first-child,
        .fackts-1v1-leader-row > div:first-child {
          width: 2rem !important;
          height: 2rem !important;
          min-width: 2rem !important;
          max-width: 2rem !important;
          border-radius: 0.75rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          font-size: 0.8rem !important;
          font-weight: 900 !important;
        }

        .fackts-1v1-leader-row .text-4xl,
        .fackts-1v1-leader-row .text-3xl,
        .fackts-1v1-leader-row .text-2xl,
        .fackts-1v1-leader-row .text-xl,
        .fackts-1v1-leader-row h3,
        .fackts-1v1-leader-row h4 {
          font-size: 0.9rem !important;
          line-height: 1.12 !important;
          margin: 0 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .fackts-1v1-leader-row p,
        .fackts-1v1-leader-row .text-sm,
        .fackts-1v1-leader-row .text-xs {
          font-size: 0.68rem !important;
          line-height: 1.25 !important;
          margin: 0 !important;
          color: rgb(148, 163, 184) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .fackts-1v1-leader-row .grid {
          display: flex !important;
          justify-content: flex-end !important;
          gap: 0.35rem !important;
        }

        .fackts-1v1-leader-row .grid > div {
          min-width: 3rem !important;
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          text-align: right !important;
        }

        .fackts-1v1-leader-row .grid > div div:first-child {
          display: none !important;
        }

        .fackts-1v1-leader-row .grid > div div:last-child,
        .fackts-1v1-leader-row .font-black {
          font-size: 1rem !important;
          line-height: 1 !important;
        }

        .fackts-1v1-leader-row .grid > div:last-child div:last-child {
          color: rgb(251, 191, 36) !important;
          font-size: 1.25rem !important;
        }
        `
            : ""
        }
      }
    `}</style>
  );
}