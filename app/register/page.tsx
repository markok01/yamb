"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/use-auth-queries";
import { ApiClientError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";

export default function RegisterPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isGuest) {
      router.replace("/lobby");
    }
  }, [user, router]);

  if (user && !user.isGuest) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({ email, password, displayName });
      router.push("/lobby");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Greška pri registraciji"
      );
    }
  }

  return (
    <PageShell maxWidth="md">
      <GlassPanel glow="accent">
        <h1 className="mb-6 text-2xl font-black text-[var(--y-text)]">Registracija</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Imejl adresa"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="marko@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="Ime za prikaz"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Marko"
            required
          />
          <Input
            label="Lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={register.isPending}>
            Kreiraj nalog
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--y-text-muted)]">
          Već imaš nalog?{" "}
          <Link href="/login" className="y-link">
            Prijavi se
          </Link>
        </p>
      </GlassPanel>
    </PageShell>
  );
}
