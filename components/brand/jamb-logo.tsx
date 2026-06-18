import { cn } from "@/lib/ui/cn";

const sizes = {
  sm: 28,
  md: 32,
  lg: 40,
} as const;

export type JambLogoSize = keyof typeof sizes;

interface JambLogoProps {
  size?: JambLogoSize;
  className?: string;
}

/** Jednostavna kockica — zaobljen kvadrat i tačka. */
export function JambLogo({ size = "md", className }: JambLogoProps) {
  const markSize = sizes[size];

  return (
    <span className={cn("y-logo inline-flex items-center justify-center", className)}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="y-logo-mark shrink-0"
      >
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="7"
          stroke="currentColor"
          strokeWidth="1.75"
          className="text-[var(--y-accent)]"
        />
        <circle cx="16" cy="16" r="3.25" fill="var(--y-accent)" />
      </svg>
    </span>
  );
}
