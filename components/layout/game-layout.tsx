"use client";

import { cn } from "@/lib/ui/cn";

interface GameLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  mobileBottom?: React.ReactNode;
  className?: string;
}

export function GameLayout({
  left,
  center,
  right,
  mobileBottom,
  className,
}: GameLayoutProps) {
  return (
    <div className={cn("y-page-enter", className)}>
      {/* Desktop: 3-column board table */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[240px_1fr_300px] xl:grid-cols-[260px_1fr_320px]">
        <aside className="space-y-4">{left}</aside>
        <main className="min-w-0">{center}</main>
        <aside className="space-y-4">{right}</aside>
      </div>

      {/* Tablet / mobile */}
      <div className="space-y-4 lg:hidden">
        {center}
        {mobileBottom ?? right}
      </div>
    </div>
  );
}
