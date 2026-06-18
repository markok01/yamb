export function formatDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min.`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} č ${m} min.` : `${h} č`;
}

export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function rankMedal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export const LEAGUE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktivna",
  FINISHED: "Završena",
  ARCHIVED: "Arhivirana",
};

export type LeagueTab =
  | "overview"
  | "standings"
  | "members"
  | "history"
  | "statistics"
  | "settings";

export const LEAGUE_TABS: { id: LeagueTab; label: string }[] = [
  { id: "overview", label: "Pregled" },
  { id: "standings", label: "Tabela" },
  { id: "members", label: "Članovi" },
  { id: "history", label: "Istorija" },
  { id: "statistics", label: "Statistika" },
  { id: "settings", label: "Podešavanja" },
];
