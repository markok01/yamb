import { cn } from "@/lib/ui/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "live";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--y-surface-hover)] text-[var(--y-text-muted)]",
  success:
    "bg-[var(--y-accent-soft)] text-[var(--y-accent)] border border-[color-mix(in_srgb,var(--y-accent)_30%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--y-warning)_15%,transparent)] text-[var(--y-warning)] border border-[color-mix(in_srgb,var(--y-warning)_30%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--y-danger)_15%,transparent)] text-[var(--y-danger)] border border-[color-mix(in_srgb,var(--y-danger)_30%,transparent)]",
  live:
    "bg-[var(--y-accent-soft)] text-[var(--y-accent)] border border-[color-mix(in_srgb,var(--y-accent)_40%,transparent)]",
};

export function Badge({ children, variant = "default", className, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        pulse && "y-badge-pulse",
        className
      )}
    >
      {variant === "live" && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--y-accent)" }}
        />
      )}
      {children}
    </span>
  );
}
