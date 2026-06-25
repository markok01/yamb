import { cn } from "@/lib/ui/cn";

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--y-accent)_40%,transparent)]",
        checked ? "bg-[var(--y-accent)]" : "bg-[var(--y-border-strong)]",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[1.35rem]" : "translate-x-1"
        )}
      />
    </button>
  );
}
