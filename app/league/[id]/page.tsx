"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { LeagueDashboard } from "@/components/league/league-dashboard";
import { useLeague } from "@/hooks/use-user-queries";
import { useSessionStore } from "@/stores/session-store";

export default function LeaguePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const leagueId = params.id;
  const { data: leagueData, isLoading, isError } = useLeague(leagueId, user?.id ?? null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <PageShell maxWidth="6xl">
      {isLoading && (
        <p className="text-[var(--y-text-muted)]">Učitavanje lige...</p>
      )}
      {isError && (
        <p className="text-red-400">Liga nije pronađena ili nemate pristup.</p>
      )}
      {leagueData?.league && (
        <LeagueDashboard league={leagueData.league} userId={user.id} />
      )}
    </PageShell>
  );
}
