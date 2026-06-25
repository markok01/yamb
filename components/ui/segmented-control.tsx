import { cn } from "@/lib/ui/cn";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-[var(--y-surface-hover)] p-0.5",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
              active
                ? "bg-[var(--y-surface-elevated)] text-[var(--y-text)] shadow-[var(--y-shadow-sm)]"
                : "text-[var(--y-text-muted)] hover:text-[var(--y-text)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
