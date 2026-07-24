"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number | string;
  duration?: number;
  className?: string;
};

function parseValue(value: number | string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { number: value, decimals: Number.isInteger(value) ? 0 : 1 };
  }

  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;

  const number = Number(text);
  if (!Number.isFinite(number)) return null;

  return {
    number,
    decimals: text.includes(".") ? text.split(".")[1].length : 0,
  };
}

export default function AnimatedNumber({
  value,
  duration = 850,
  className,
}: AnimatedNumberProps) {
  const parsed = parseValue(value);
  const [display, setDisplay] = useState(parsed ? 0 : value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const next = parseValue(value);

    if (!next || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const startedAt = performance.now();

    function animate(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = next!.number * eased;

      setDisplay(
        next!.decimals > 0
          ? current.toFixed(next!.decimals)
          : Math.round(current)
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, value]);

  return <span className={className}>{display}</span>;
}
