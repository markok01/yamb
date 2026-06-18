"use client";

import { useAuthMe } from "@/hooks/use-auth-queries";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useAuthMe();
  return <>{children}</>;
}
