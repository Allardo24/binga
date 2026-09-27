export type Item = { id: string; text: string };
export type Award = { kind: string; points: number; step: number };
export type Standing = {
  id: string;
  name: string;
  score: number;
  rank: number;
  awards: Award[];
};
export type Game = {
  id: string;
  title: string;
  description: string;
  status: "lobby" | "live" | "finished";
  items: Item[];
  calls: string[];
  players: number;
  revision: number;
  rules: {
    line_base: number;
    line_bonus: number;
    full_base: number;
    full_bonus: number;
  };
  standings: Standing[];
  me: { id: string; name: string; card: string[] } | null;
  account: Account | null;
  is_host: boolean;
};
export type Account = { id: string; username: string };
export type AccountDashboard = {
  account: Account;
  total_score: number;
  rank: number;
  games_played: number;
  games_hosted: number;
  total_accounts: number;
  history: Array<{
    id: string;
    title: string;
    status: Game["status"];
    score: number;
    rank: number | null;
    played_as: string;
  }>;
  leaderboard: Array<{
    username: string;
    total_score: number;
    rank: number;
    games_played: number;
  }>;
};
export const sessionKey = "binga-session";
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    gameId?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const session = localStorage.getItem(sessionKey);
  if (session) headers.Authorization = `Bearer ${session}`;
  if (options.gameId) {
    const token = localStorage.getItem(`binga-player-${options.gameId}`);
    if (token) headers["x-player-token"] = token;
  }
  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Dat ging niet goed. Probeer opnieuw.");
  return data as T;
}
