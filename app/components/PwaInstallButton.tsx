"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const isIos =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    /safari/i.test(navigator.userAgent) &&
    !/crios|fxios|edgios/i.test(navigator.userAgent);

  const installSupported = !isInstalled && (deferredPrompt !== null || isIos);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIos) {
      setShowIosInstructions(true);
    }
  };

  if (!installSupported) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-4 text-center">
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400"
      >
        Install FACKTS App
      </button>

      {showIosInstructions ? (
        <div className="mt-3 max-w-xl rounded-3xl border border-orange-500/30 bg-slate-950/95 px-5 py-4 text-left text-sm text-slate-200 shadow-lg shadow-black/20">
          <p className="font-bold text-orange-300">Install on iPhone</p>
          <p className="mt-2 text-sm leading-6">
            Open Safari, tap the Share icon, then choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
