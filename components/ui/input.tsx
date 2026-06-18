import { cn } from "@/lib/ui/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--y-text-muted)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "y-input w-full rounded-xl px-4 py-3 text-[var(--y-text)] transition-all duration-200",
          "placeholder:text-[var(--y-text-muted)]/60",
          "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--y-accent)_35%,transparent)]",
          className
        )}
        {...props}
      />
      {hint && <p className="text-xs text-[var(--y-text-muted)]">{hint}</p>}
    </div>
  );
}
