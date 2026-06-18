import { cn } from "@/lib/ui/cn";
import { GlassPanel } from "./glass-panel";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "secondary" | "warm";
  className?: string;
}

const accentMap = {
  primary: "y-accent-text",
  secondary: "y-accent-secondary-text",
  warm: "text-[var(--y-warning)]",
};

export function StatCard({
  label,
  value,
  sub,
  accent = "primary",
  className,
}: StatCardProps) {
  return (
    <GlassPanel padding="sm" className={cn("text-center", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-black tabular-nums", accentMap[accent])}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--y-text-muted)]">{sub}</p>}
    </GlassPanel>
  );
}
