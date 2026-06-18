"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";

interface AnimatedScoreProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedScore({ value, className, duration = 600 }: AnimatedScoreProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (display === value) return;
    const start = display;
    const diff = value - start;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, display, duration]);

  return (
    <span className={cn("tabular-nums y-score-pop", className)}>{display}</span>
  );
}
