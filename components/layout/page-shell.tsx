"use client";

import { AppHeader } from "./app-header";
import { cn } from "@/lib/ui/cn";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";
  className?: string;
}

const maxMap = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

export function PageShell({
  children,
  title,
  subtitle,
  maxWidth = "4xl",
  className,
}: PageShellProps) {
  return (
    <div className="y-app-bg flex min-h-full flex-col">
      <AppHeader title={title} />
      <main
        className={cn(
          "y-page-enter mx-auto w-full flex-1 px-4 py-8",
          maxMap[maxWidth],
          className
        )}
      >
        {(title || subtitle) && (
          <header className="mb-8">
            {title && (
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--y-text)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1.5 text-[15px] text-[var(--y-text-muted)]">{subtitle}</p>
            )}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
