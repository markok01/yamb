import { cn } from "@/lib/ui/cn";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: "accent" | "warm" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

const glowMap = {
  accent: "y-glow-accent",
  warm: "y-glow-warm",
  none: "",
};

const padMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function GlassPanel({
  children,
  className,
  glow = "none",
  padding = "md",
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "y-glass rounded-2xl border transition-all duration-200 ease-out",
        glowMap[glow],
        padMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
