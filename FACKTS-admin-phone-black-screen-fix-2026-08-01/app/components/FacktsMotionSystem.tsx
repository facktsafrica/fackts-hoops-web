"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = [
  "main > section",
  "main article",
  "main li",
  "main tbody > tr",
  "main [class*='rounded-2xl']",
  "main [class*='rounded-3xl']",
].join(",");

const NUMBER_SELECTOR = [
  "[data-count-up]",
  "main .text-2xl",
  "main .text-3xl",
  "main .text-4xl",
  "main .text-5xl",
  "main .text-6xl",
].join(",");

const pureNumber = /^(-?)(\d{1,6})(\.\d+)?(%|\+)?$/;

function animateNumber(element: HTMLElement) {
  if (element.dataset.counted === "true" || element.children.length > 0) return;

  const original = element.textContent?.trim() ?? "";
  const match = original.replace(/,/g, "").match(pureNumber);
  if (!match) return;

  const target = Number(`${match[1]}${match[2]}${match[3] ?? ""}`);
  if (!Number.isFinite(target) || Math.abs(target) > 100000) return;

  element.dataset.counted = "true";
  const decimals = match[3]?.length ? match[3].length - 1 : 0;
  const suffix = match[4] ?? "";
  const duration = Math.min(1250, Math.max(500, Math.abs(target) * 28));
  const startedAt = performance.now();

  const render = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = `${value.toFixed(decimals)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(render);
    } else {
      element.textContent = original;
    }
  };

  requestAnimationFrame(render);
}

export default function FacktsMotionSystem() {
  const pathname = usePathname();

  useEffect(() => {
    // Admin pages must remain immediately usable on every device. Some mobile
    // browsers delay or skip IntersectionObserver callbacks on long forms,
    // which previously left the admin content at opacity: 0 (a black page).
    if (pathname.startsWith("/admin")) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const revealed = new WeakSet<Element>();
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("fackts-motion-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 }
    );

    const numberObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateNumber(entry.target as HTMLElement);
          numberObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    const scan = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element, index) => {
        if (revealed.has(element) || element.closest("[data-no-motion]")) return;
        revealed.add(element);
        element.classList.add("fackts-motion-item");
        element.style.setProperty("--fackts-delay", `${Math.min(index % 8, 7) * 45}ms`);
        revealObserver.observe(element);
      });

      root.querySelectorAll<HTMLElement>(NUMBER_SELECTOR).forEach((element) => {
        if (!element.closest("[data-no-count-up]")) numberObserver.observe(element);
      });
    };

    scan();
    let scanFrame: number | null = null;
    const pendingRoots = new Set<ParentNode>();

    const scheduleScan = (root: ParentNode) => {
      pendingRoots.add(root);
      if (scanFrame !== null) return;

      scanFrame = requestAnimationFrame(() => {
        pendingRoots.forEach((pendingRoot) => scan(pendingRoot));
        pendingRoots.clear();
        scanFrame = null;
      });
    };

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scheduleScan(node);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      if (scanFrame !== null) cancelAnimationFrame(scanFrame);
      revealObserver.disconnect();
      numberObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
