import { cn } from "@/lib/ui/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-[var(--y-text-muted)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "y-input w-full rounded-[10px] px-3 py-2.5 text-[15px] text-[var(--y-text)] transition-all duration-150",
          "placeholder:text-[var(--y-text-muted)]/70",
          "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--y-accent)_35%,transparent)]",
          error && "border-[var(--y-danger)]",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[var(--y-text-muted)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--y-danger)]">{error}</p>}
    </div>
  );
}
