"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useCreateLeague } from "@/hooks/use-user-queries";
import { ApiClientError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";

export default function CreateLeaguePage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const createLeague = useCreateLeague(user?.id ?? null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await createLeague.mutateAsync({
        name,
        season,
        description: description || undefined,
      });
      router.push(`/league/${result.league.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška");
    }
  }

  return (
    <PageShell title="Nova liga" maxWidth="md">
      <GlassPanel glow="accent">
        <h1 className="mb-6 text-2xl font-bold text-[var(--y-text)]">Kreiraj ligu</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Naziv lige"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Sezona"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            required
          />
          <Input
            label="Opis (opciono)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && (
            <p className="text-sm" style={{ color: "var(--y-danger)" }}>
              {error}
            </p>
          )}
          <Button type="submit" fullWidth size="lg" disabled={createLeague.isPending}>
            Kreiraj
          </Button>
        </form>
      </GlassPanel>
    </PageShell>
  );
}
