import { cn } from "@/lib/ui/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--y-accent)] text-white hover:brightness-[1.06] active:brightness-[0.96] shadow-[var(--y-shadow-sm)]",
  secondary:
    "y-surface-elevated text-[var(--y-text)] hover:bg-[var(--y-surface-hover)] border border-[var(--y-border)] shadow-[var(--y-shadow-sm)]",
  ghost:
    "text-[var(--y-text-muted)] hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]",
  danger:
    "bg-[color-mix(in_srgb,var(--y-danger)_12%,transparent)] text-[var(--y-danger)] border border-[color-mix(in_srgb,var(--y-danger)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--y-danger)_18%,transparent)]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-[10px]",
  lg: "px-5 py-2.5 text-[15px] rounded-[10px]",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
