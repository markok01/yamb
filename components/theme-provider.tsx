"use client";

import { useLayoutEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  return <>{children}</>;
}
