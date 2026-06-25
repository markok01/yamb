"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JambLogo } from "@/components/brand/jamb-logo";
import { useLogout } from "@/hooks/use-auth-queries";
import { useSessionStore } from "@/stores/session-store";
import { useThemeStore } from "@/stores/theme-store";
import { Badge } from "@/components/ui/badge";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/ui/cn";

const NAV = [
  { href: "/lobby", label: "Hol" },
  { href: "/history", label: "Istorija" },
  { href: "/settings", label: "Profil" },
  { href: "/league", label: "Lige" },
];

export function AppHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);
  const logout = useLogout();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="y-header sticky top-0 z-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <Link href="/lobby" className="group y-logo" aria-label="Jamb">
            <JambLogo size="md" />
          </Link>
          {title && (
            <span className="hidden text-[13px] font-medium text-[var(--y-text-muted)] sm:inline">
              / {title}
            </span>
          )}
          <nav className="hidden gap-0.5 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                    active
                      ? "y-nav-active"
                      : "text-[var(--y-text-muted)] hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="live">Na mreži</Badge>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--y-border)] text-[var(--y-text-muted)] transition-colors hover:bg-[var(--y-surface-hover)] hover:text-[var(--y-text)]"
            aria-label="Promeni temu"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {user ? (
            <div className="flex items-center gap-2.5">
              <Link href="/settings" className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--y-border-strong)]"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--y-accent-soft)] text-xs font-medium text-[var(--y-accent)]"
                  >
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-[13px] font-medium text-[var(--y-text)] sm:inline">
                  {user.displayName}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="text-xs text-[var(--y-text-muted)] transition hover:text-[var(--y-danger)]"
              >
                Odjava
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--y-text-muted)] hover:text-[var(--y-text)]"
              >
                Prijava
              </Link>
              <Link
                href="/register"
                className="y-brand-gradient rounded-lg px-3 py-1.5 text-[13px] font-medium"
              >
                Registracija
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
