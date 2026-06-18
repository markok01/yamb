"use client";

import { cn } from "@/lib/ui/cn";

interface ScorecardFocusLayoutProps {
  toolbar?: React.ReactNode;
  scorecard: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Layout fokusiran na punu Yamb tabelu preko ekrana. */
export function ScorecardFocusLayout({
  toolbar,
  scorecard,
  footer,
  className,
}: ScorecardFocusLayoutProps) {
  return (
    <div
      className={cn(
        "y-page-enter flex min-h-[calc(100vh-11rem)] w-full flex-col gap-3 lg:min-h-[calc(100vh-10rem)]",
        className
      )}
    >
      {toolbar && <div className="shrink-0 space-y-3">{toolbar}</div>}
      <div className="flex min-h-0 w-full flex-1 flex-col">{scorecard}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
