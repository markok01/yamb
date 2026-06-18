"use client";

import { useState } from "react";
import type { LeagueInfo, LeagueNotification } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { formatDate, LEAGUE_STATUS_LABEL } from "./league-utils";

export function LeagueOverviewTab({
  league,
  notifications,
}: {
  league: LeagueInfo;
  notifications?: LeagueNotification[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassPanel className="lg:col-span-2">
        <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">O ligi</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Sezona
            </dt>
            <dd className="mt-1 font-semibold text-[var(--y-text)]">{league.season}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Status
            </dt>
            <dd className="mt-1">
              <Badge variant={league.status === "ACTIVE" ? "success" : "default"}>
                {LEAGUE_STATUS_LABEL[league.status]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Kreirana
            </dt>
            <dd className="mt-1 text-[var(--y-text)]">{formatDate(league.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Administrator
            </dt>
            <dd className="mt-1 text-[var(--y-text)]">{league.ownerName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Članovi
            </dt>
            <dd className="mt-1 text-[var(--y-text)]">
              {league.memberCount} / {league.maxMembers}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-[var(--y-text-muted)]">
              Vidljivost
            </dt>
            <dd className="mt-1 text-[var(--y-text)]">
              {league.isPublic ? "Javna liga" : "Privatna liga"}
            </dd>
          </div>
        </dl>
        {league.description && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--y-text-muted)]">
            {league.description}
          </p>
        )}
        {league.status === "ARCHIVED" && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Liga je arhivirana — samo pregled, bez novih mečeva.
          </p>
        )}
      </GlassPanel>

      <GlassPanel padding="sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--y-text-muted)]">
          Obaveštenja
        </h3>
        {!notifications?.length ? (
          <p className="text-sm text-[var(--y-text-muted)]">Nema obaveštenja.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="rounded-lg bg-[var(--y-surface-hover)] px-3 py-2 text-sm"
              >
                <p className="text-[var(--y-text)]">{n.message}</p>
                <p className="mt-1 text-[10px] text-[var(--y-text-muted)]">
                  {formatDate(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
