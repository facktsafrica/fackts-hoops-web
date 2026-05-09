/* =========================================================
   FACKTS HOOPS MOTION PACK
   Global cinematic motion layer
   ========================================================= */

html {
  scroll-behavior: smooth;
}

main {
  animation: facktsPageRise 420ms ease-out both;
}

@keyframes facktsPageRise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================================================
   FACKTS LIVE TICKER
   Broadcast-style movement strip
   ========================================================= */

.fackts-ticker-track {
  animation: facktsTickerMove 45s linear infinite;
  padding-left: 1rem;
}

.fackts-ticker-track:hover {
  animation-play-state: paused;
}

@keyframes facktsTickerMove {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-33.333%);
  }
}

/* =========================================================
   BUTTONS, CARDS & IMAGE MOTION
   ========================================================= */

a.rounded-2xl,
button.rounded-2xl,
a.rounded-3xl,
article.rounded-3xl {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

a.rounded-2xl:hover,
button.rounded-2xl:hover {
  transform: translateY(-1px);
}

a.rounded-3xl:hover,
article.rounded-3xl:hover {
  transform: translateY(-3px);
}

a.bg-orange-500,
button.bg-orange-500 {
  box-shadow: 0 10px 28px rgba(249, 115, 22, 0.14);
}

a.bg-orange-500:hover,
button.bg-orange-500:hover {
  box-shadow:
    0 14px 35px rgba(249, 115, 22, 0.22),
    0 0 18px rgba(249, 115, 22, 0.18);
}

article img,
a img {
  transition:
    transform 520ms ease,
    opacity 320ms ease,
    filter 320ms ease;
}

article:hover img,
a:hover img {
  filter: saturate(1.08) contrast(1.04);
}

/* =========================================================
   MEDIA STORIES VIDEO OPENING
   ========================================================= */

#media-stories iframe {
  animation: facktsVideoOpen 260ms ease-out both;
}

@keyframes facktsVideoOpen {
  from {
    opacity: 0;
    transform: scale(0.985);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* =========================================================
   FORM FOCUS POLISH
   ========================================================= */

input:focus,
select:focus,
textarea:focus {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
}

/* =========================================================
   ACCESSIBILITY
   ========================================================= */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}

/* =========================================================
   MOBILE TUNING
   ========================================================= */

@media (max-width: 768px) {
  main {
    animation-duration: 300ms;
  }

  .fackts-ticker-track {
    animation-duration: 38s;
  }

  a.rounded-3xl:hover,
  article.rounded-3xl:hover {
    transform: translateY(-2px);
  }
}