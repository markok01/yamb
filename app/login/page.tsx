"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { JambLogo } from "@/components/brand/jamb-logo";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/hooks/use-auth-queries";
import { ApiClientError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";

export default function LoginPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await login.mutateAsync({ email, password });
      router.push("/lobby");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Greška pri prijavi");
    }
  }

  return (
    <PageShell maxWidth="md">
      <div className="mb-8 flex justify-center">
        <JambLogo size="lg" />
      </div>
      <GlassPanel glow="accent">
        <h1 className="mb-6 text-2xl font-black text-[var(--y-text)]">Prijava</h1>
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
            label="Lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" fullWidth size="lg" disabled={login.isPending}>
            Prijavi se
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--y-text-muted)]">
          Nemaš nalog?{" "}
          <Link href="/register" className="y-link">
            Registruj se
          </Link>
        </p>
      </GlassPanel>
    </PageShell>
  );
}
