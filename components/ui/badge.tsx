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
    "bg-[color-mix(in_srgb,var(--y-success)_12%,transparent)] text-[var(--y-success)] border border-[color-mix(in_srgb,var(--y-success)_22%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--y-warning)_12%,transparent)] text-[var(--y-warning)] border border-[color-mix(in_srgb,var(--y-warning)_22%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--y-danger)_12%,transparent)] text-[var(--y-danger)] border border-[color-mix(in_srgb,var(--y-danger)_22%,transparent)]",
  live:
    "bg-[color-mix(in_srgb,var(--y-success)_12%,transparent)] text-[var(--y-success)] border border-[color-mix(in_srgb,var(--y-success)_22%,transparent)]",
};

export function Badge({ children, variant = "default", className, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        pulse && "y-badge-pulse",
        className
      )}
    >
      {variant === "live" && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--y-success)]"
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
