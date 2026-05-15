"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function HomeMediaRedirectFix() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickable = target.closest("a, button, article, div") as HTMLElement | null;
      if (!clickable) return;

      const text = (clickable.innerText || "").toLowerCase();

      const isMediaStorytelling =
        text.includes("media and storytelling") ||
        text.includes("media & storytelling") ||
        text.includes("media storytelling");

      if (!isMediaStorytelling) return;

      event.preventDefault();
      router.push("/media");
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [pathname, router]);

  return null;
}