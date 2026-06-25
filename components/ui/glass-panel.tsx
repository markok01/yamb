import { cn } from "@/lib/ui/cn";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: "accent" | "warm" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

const padMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/** Solid elevated surface — macOS-style card (no backdrop blur). */
export function GlassPanel({
  children,
  className,
  glow: _glow = "none",
  padding = "md",
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "y-glass rounded-xl border shadow-[var(--y-shadow-sm)] transition-colors duration-150",
        padMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
