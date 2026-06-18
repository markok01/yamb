import Link from "next/link";
import type { LeagueListItem } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { LEAGUE_STATUS_LABEL } from "./league-utils";

interface LeagueCardProps {
  league: LeagueListItem;
}

export function LeagueCard({ league }: LeagueCardProps) {
  const statusVariant =
    league.status === "ACTIVE"
      ? "success"
      : league.status === "ARCHIVED"
        ? "default"
        : "warning";

  return (
    <Link
      href={`/league/${league.id}`}
      className="group block rounded-2xl border border-[var(--y-border)] bg-[var(--y-surface)] p-5 transition hover:border-[color-mix(in_srgb,var(--y-accent)_35%,transparent)] hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant}>
              {LEAGUE_STATUS_LABEL[league.status] ?? league.status}
            </Badge>
            {league.myRole === "OWNER" && (
              <Badge variant="live">Vlasnik</Badge>
            )}
          </div>
          <h3 className="truncate text-lg font-bold text-[var(--y-text)] group-hover:text-[var(--y-accent)]">
            {league.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--y-text-muted)]">
            Sezona {league.season}
          </p>
          {league.description && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--y-text-muted)]">
              {league.description}
            </p>
          )}
        </div>
        {league.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={league.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="y-brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-black">
            {league.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--y-text-muted)]">
        <span>{league.memberCount} članova</span>
        <span>{league.isPublic ? "Javna" : "Privatna"}</span>
      </div>
    </Link>
  );
}
