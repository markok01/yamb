"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import {
  useDeleteAccount,
  useUpdateProfile,
  useUserHistory,
  useUserStatsDetail,
} from "@/hooks/use-user-queries";
import { ApiClientError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";
import { useGamePreferencesStore } from "@/stores/game-preferences-store";

export default function SettingsPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  const { data: statsData, isLoading: statsLoading } = useUserStatsDetail(
    user?.id ?? null
  );
  const { data: historyData } = useUserHistory(user?.id ?? null);
  const updateProfile = useUpdateProfile(user?.id ?? null);
  const deleteAccount = useDeleteAccount(user?.id ?? null);
  const clearUser = useSessionStore((s) => s.clearUser);
  const virtualPlayHints = useGamePreferencesStore((s) => s.virtualPlayHints);
  const setVirtualPlayHints = useGamePreferencesStore(
    (s) => s.setVirtualPlayHints
  );

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  if (!user) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const result = await updateProfile.mutateAsync({
        displayName,
        avatarUrl: avatarUrl.trim() || null,
      });
      setUser(result.user);
      setMessage("Profil sačuvan.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  const stats = statsData?.stats;
  const jambTotal = statsData?.jambCombinationsTotal ?? 0;
  const winRate = statsData?.winRate ?? 0;
  const isGuest = !!user.isGuest;
  const deleteConfirmLabel = isGuest ? user.displayName : user.username;

  async function handleDeleteAccount() {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync(confirmDelete);
      clearUser();
      router.replace("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  return (
    <PageShell
      title="Profil & statistika"
      subtitle="Podešavanja naloga i pregled učinka"
      maxWidth="4xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <GlassPanel glow="accent">
            <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">Profil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input label="Imejl" value={user.username} readOnly />
              <Input
                label="Ime za prikaz"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                label="URL avatara"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
              {message && <p className="text-sm y-accent-text">{message}</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={updateProfile.isPending}>
                Sačuvaj
              </Button>
            </form>
          </GlassPanel>

          <GlassPanel>
            <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">Igra</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--y-border)] accent-[var(--y-accent)]"
                checked={virtualPlayHints}
                onChange={(e) => setVirtualPlayHints(e.target.checked)}
              />
              <span>
                <span className="block font-medium text-[var(--y-text)]">
                  Pomaganje u virtuelnim kockicama
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--y-text-muted)]">
                  Istaknuta polja i sistemski rezultat za svako
                  polje. Isključi ako želiš da igraš bez pomoći.
                </span>
              </span>
            </label>
          </GlassPanel>

          <GlassPanel>
            <h2 className="mb-4 text-lg font-bold text-[var(--y-text)]">
              Protivnici (međusobno)
            </h2>
            {!historyData?.opponents?.length ? (
              <p className="text-sm text-[var(--y-text-muted)]">
                Još nema odigranih mečeva.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--y-text-muted)]">
                      <th className="pb-2">Igrač</th>
                      <th className="pb-2">Mečevi</th>
                      <th className="pb-2">P/I/N</th>
                      <th className="pb-2">Prosek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.opponents.map((o) => (
                      <tr
                        key={o.opponentId}
                        className="border-t border-[var(--y-border)]"
                      >
                        <td className="py-3 font-medium text-[var(--y-text)]">
                          {o.displayName}
                        </td>
                        <td className="py-3 tabular-nums">{o.matchesPlayed}</td>
                        <td className="py-3 tabular-nums text-[var(--y-text-muted)]">
                          {o.wins}/{o.losses}/{o.draws}
                        </td>
                        <td className="py-3 tabular-nums y-accent-text">
                          {o.averageMyScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>

          <GlassPanel padding="sm" className="border-red-500/30">
            <h2 className="mb-2 text-lg font-bold text-red-400">Obriši nalog</h2>
            <p className="mb-4 text-sm leading-relaxed text-[var(--y-text-muted)]">
              Trajno briše tvoj nalog, statistiku, lige koje si kreirao i partije u
              kojima si učestvovao. Ova radnja se ne može poništiti — moraćeš da
              napraviš novi nalog.
            </p>
            <Input
              label={
                isGuest
                  ? "Upiši ime za prikaz za potvrdu"
                  : "Upiši imejl za potvrdu"
              }
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={deleteConfirmLabel}
            />
            {deleteError && (
              <p className="mt-3 text-sm text-red-400">{deleteError}</p>
            )}
            <Button
              variant="secondary"
              className="mt-4 border-red-500/50 text-red-400"
              disabled={
                deleteAccount.isPending || confirmDelete !== deleteConfirmLabel
              }
              onClick={handleDeleteAccount}
            >
              {deleteAccount.isPending ? "Brisanje…" : "Obriši nalog trajno"}
            </Button>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          {statsLoading && (
            <p className="text-[var(--y-text-muted)]">Učitavanje...</p>
          )}
          {stats && (
            <>
              <StatCard label="Partije" value={stats.gamesPlayed} accent="secondary" />
              <StatCard label="Pobede" value={stats.gamesWon} accent="primary" />
              <StatCard label="% pobeda" value={`${winRate}%`} />
              <StatCard label="Prosek" value={stats.averageScore} accent="warm" />
              <StatCard label="Najbolji" value={stats.bestScore ?? "—"} accent="primary" />
              <StatCard label="Jamb kombinacije" value={jambTotal} />
            </>
          )}
          <Link href="/stats">
            <Button variant="secondary" fullWidth size="sm">
              Detaljna statistika →
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
