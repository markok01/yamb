import { cn } from "@/lib/ui/cn";

interface IconProps {
  className?: string;
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6.2 2.5a5.5 5.5 0 1 0 6.3 8.3A4.5 4.5 0 1 1 6.2 2.5z" />
    </svg>
  );
}
