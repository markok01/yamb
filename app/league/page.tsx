"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeagueCard } from "@/components/league/league-card";
import { useJoinLeague, useUserLeagues } from "@/hooks/use-user-queries";
import { ApiClientError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";

export default function LeaguesPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { data, isLoading } = useUserLeagues(user?.id ?? null);
  const joinLeague = useJoinLeague(user?.id ?? null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await joinLeague.mutateAsync({ inviteCode: inviteCode.trim() });
      router.push(`/league/${result.league.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  return (
    <PageShell title="Lige" maxWidth="6xl">
      <div className="mb-6 flex justify-end">
        <Link href="/league/create">
          <Button>Nova liga</Button>
        </Link>
      </div>
      <GlassPanel className="mb-6" padding="sm">
        <h2 className="mb-3 text-sm font-semibold text-[var(--y-text)]">
          Pridruži se pozivnim kodom
        </h2>
        <form onSubmit={handleJoinByCode} className="flex flex-wrap gap-2">
          <Input
            placeholder="Pozivni kod"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="min-w-[180px] flex-1 font-mono uppercase"
          />
          <Button type="submit" disabled={joinLeague.isPending || !inviteCode.trim()}>
            Pridruži se
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </GlassPanel>

      {isLoading && (
        <p className="text-[var(--y-text-muted)]">Učitavanje liga...</p>
      )}

      {!isLoading && !data?.leagues.length && (
        <GlassPanel>
          <p className="text-center text-[var(--y-text-muted)]">
            Niste u nijednoj ligi. Kreirajte novu ili se pridružite pozivnim kodom.
          </p>
        </GlassPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.leagues.map((league) => (
          <LeagueCard key={league.id} league={league} />
        ))}
      </div>
    </PageShell>
  );
}
