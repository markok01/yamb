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
    "text-white shadow-md hover:opacity-95 [background:linear-gradient(135deg,color-mix(in_srgb,var(--y-accent)_82%,white),color-mix(in_srgb,var(--y-accent-secondary)_78%,white))] [box-shadow:0_6px_20px_-10px_var(--y-accent-glow)]",
  secondary:
    "y-surface-elevated text-[var(--y-text)] hover:bg-[var(--y-surface-hover)] border border-[var(--y-border)]",
  ghost: "text-[var(--y-text-muted)] hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]",
  danger:
    "bg-[color-mix(in_srgb,var(--y-danger)_15%,transparent)] text-[var(--y-danger)] border border-[color-mix(in_srgb,var(--y-danger)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--y-danger)_25%,transparent)]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
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
        "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
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
