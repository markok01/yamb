"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeagueInfo } from "@/lib/api/types";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useArchiveLeague,
  useDeleteLeague,
  useLeaveLeague,
  useRegenerateInviteCode,
  useUpdateLeague,
} from "@/hooks/use-user-queries";
import { ApiClientError } from "@/lib/api/client";

export function LeagueSettingsTab({
  league,
  userId,
  isOwner,
  isAdmin,
}: {
  league: LeagueInfo;
  userId: string;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const updateLeague = useUpdateLeague(league.id, userId);
  const deleteLeague = useDeleteLeague(league.id, userId);
  const archiveLeague = useArchiveLeague(league.id, userId);
  const leaveLeague = useLeaveLeague(league.id, userId);
  const regenCode = useRegenerateInviteCode(league.id, userId);

  const [name, setName] = useState(league.name);
  const [season, setSeason] = useState(league.season);
  const [description, setDescription] = useState(league.description ?? "");
  const [maxMembers, setMaxMembers] = useState(String(league.maxMembers));
  const [imageUrl, setImageUrl] = useState(league.imageUrl ?? "");
  const [isPublic, setIsPublic] = useState(league.isPublic);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <GlassPanel>
        <p className="text-sm text-[var(--y-text-muted)]">
          Podešavanja su dostupna samo administratorima lige.
        </p>
        {league.isMember && league.myRole !== "OWNER" && league.status !== "ARCHIVED" && (
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => leaveLeague.mutateAsync().then(() => router.push("/league"))}
          >
            Napusti ligu
          </Button>
        )}
      </GlassPanel>
    );
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updateLeague.mutateAsync({
        name,
        season,
        description: description || null,
        maxMembers: parseInt(maxMembers, 10),
        imageUrl: imageUrl || null,
        isPublic,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteLeague.mutateAsync(confirmName);
      router.push("/league");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  const isArchived = league.status === "ARCHIVED";

  return (
    <div className="space-y-4">
      {!isArchived && (
        <GlassPanel>
          <h3 className="mb-4 font-bold text-[var(--y-text)]">Podešavanja lige</h3>
          <form onSubmit={saveSettings} className="space-y-4">
            <Input label="Naziv" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Sezona" value={season} onChange={(e) => setSeason(e.target.value)} />
            <Input
              label="Opis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Maks. članova"
              type="number"
              min={2}
              max={100}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
            <Input
              label="Adresa slike"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-[var(--y-text)]">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Javna liga
            </label>
            <Button type="submit" disabled={updateLeague.isPending}>
              Sačuvaj
            </Button>
          </form>
        </GlassPanel>
      )}

      <GlassPanel padding="sm">
        <h3 className="mb-2 text-sm font-semibold text-[var(--y-text)]">Pozivni kod</h3>
        <p className="font-mono text-lg font-bold tracking-widest text-[var(--y-accent)]">
          {league.inviteCode}
        </p>
        {isOwner && !isArchived && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => regenCode.mutate()}
            disabled={regenCode.isPending}
          >
            Generiši novi kod
          </Button>
        )}
      </GlassPanel>

      {isOwner && !isArchived && (
        <GlassPanel padding="sm">
          <h3 className="mb-2 text-sm font-semibold text-[var(--y-text)]">
            Arhiviraj ligu
          </h3>
          <p className="mb-3 text-xs text-[var(--y-text-muted)]">
            Režim samo za čitanje — istorija i statistika ostaju dostupni.
          </p>
          <Button
            variant="secondary"
            onClick={() => archiveLeague.mutate()}
            disabled={archiveLeague.isPending}
          >
            Arhiviraj
          </Button>
        </GlassPanel>
      )}

      {isOwner && (
        <GlassPanel padding="sm" className="border-red-500/30">
          <h3 className="mb-2 text-sm font-semibold text-red-400">Obriši ligu</h3>
          <p className="mb-3 text-xs text-[var(--y-text-muted)]">
            Da li ste sigurni da želite da obrišete ligu? Unesite naziv lige za potvrdu.
          </p>
          <Input
            placeholder={league.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <Button
            variant="secondary"
            className="mt-3 border-red-500/50 text-red-400"
            onClick={handleDelete}
            disabled={deleteLeague.isPending || confirmName !== league.name}
          >
            Obriši ligu
          </Button>
        </GlassPanel>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
