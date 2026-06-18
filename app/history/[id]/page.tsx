"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useGameHistoryDetail } from "@/hooks/use-user-queries";
import { useSessionStore } from "@/stores/session-store";
import { cn } from "@/lib/ui/cn";
import { diceModeLabel } from "@/lib/ui/labels";

const RESULT_LABELS = { win: "Pobeda", loss: "Poraz", draw: "Nerešeno" } as const;

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("sr-RS");
}

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { data, isLoading, isError } = useGameHistoryDetail(
    params.id,
    user?.id ?? null
  );

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <PageShell title="Detalj partije" maxWidth="2xl">
      <Link href="/history" className="y-link text-sm">
        ← Nazad na istoriju
      </Link>

      {isLoading && <p className="text-[var(--y-text-muted)]">Učitavanje...</p>}
      {isError && (
        <p style={{ color: "var(--y-danger)" }}>
          Partija nije pronađena ili nemate pristup.
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          <GlassPanel glow="accent">
            <h1 className="font-mono text-2xl font-bold text-[var(--y-text)]">
              {data.game.roomCode}
            </h1>
            <p className="mt-2 text-sm text-[var(--y-text-muted)]">
              {formatDate(data.game.finishedAt)} · {diceModeLabel(data.game.diceMode)}
            </p>
            <p className="mt-3 text-sm text-[var(--y-text-muted)]">
              Rezultat:{" "}
              <strong className="text-[var(--y-text)]">
                {RESULT_LABELS[data.myResult]}
              </strong>
            </p>
          </GlassPanel>

          <GlassPanel padding="none">
            <h2 className="border-b border-[var(--y-border)] px-6 py-4 font-semibold text-[var(--y-text)]">
              Rang lista
            </h2>
            <ul className="divide-y divide-[var(--y-border)]">
              {[...data.players]
                .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
                .map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background: "var(--y-surface-hover)",
                          color: "var(--y-text-muted)",
                        }}
                      >
                        {p.placement}
                      </span>
                      <span
                        className={cn(
                          p.userId === user.id ? "y-accent-text font-semibold" : "text-[var(--y-text)]"
                        )}
                      >
                        {p.displayName}
                        {p.userId === user.id && " (ti)"}
                      </span>
                    </div>
                    <span className="text-xl font-bold tabular-nums text-[var(--y-text)]">
                      {p.finalScore ?? "—"}
                    </span>
                  </li>
                ))}
            </ul>
          </GlassPanel>

          <Link href={`/game/${data.game.id}`} className="y-link text-sm font-medium">
            Otvori partiju →
          </Link>
        </div>
      )}
    </PageShell>
  );
}
