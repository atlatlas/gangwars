const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

// Auth
export const auth = {
  login: (login: string, password: string) =>
    request<{ token: string; userId: number }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<{ token: string; userId: number }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),

  me: () => request<any>("/auth/me"),
};

// Profile
export const profile = {
  get: () => request<any>("/profile"),
  assignStats: (stats: Record<string, number>) =>
    request<any>("/profile/assign-stats", {
      method: "POST",
      body: JSON.stringify(stats),
    }),
  heal: () => request<any>("/profile/heal", { method: "POST" }),
  avatar: (avatarUrl: string | null) =>
    request<{ avatarUrl: string | null }>("/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatarUrl }),
    }),
};

// Crimes
export const crimes = {
  list: () => request<{ turns: number; crimes: any[]; locked: any[] }>("/crimes"),
  commit: (id: number) =>
    request<any>(`/crimes/${id}/commit`, { method: "POST" }),
};

// PvP
export const pvp = {
  search: (q: string) =>
    request<{ players: { id: number; username: string; level: number }[] }>(
      `/pvp/search?q=${encodeURIComponent(q)}`
    ),
  intel: (id: number) => request<any>(`/pvp/players/${id}`),
  attack: (id: number, type: string) =>
    request<any>(`/pvp/players/${id}/attack`, {
      method: "POST",
      body: JSON.stringify({ type }),
    }),
};

// Market
export const market = {
  list: () => request<any>("/market"),
  inventory: () => request<any>("/market/inventory"),
  buy: (itemId: number, quantity = 1) =>
    request<any>(`/market/buy/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
  sell: (inventoryId: number, quantity = 1) =>
    request<any>(`/market/sell/${inventoryId}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
  equip: (inventoryId: number) =>
    request<any>(`/market/equip/${inventoryId}`, {
      method: "POST",
    }),
};

// Leaderboard
export const leaderboard = {
  get: (type: string, limit = 50) =>
    request<any>(`/leaderboard/${type}?limit=${limit}`),
};

// Gangs
// Bank
export const bank = {
  get: () => request<{ bank: number; cash: number; totalNetworth: number }>("/bank"),
  deposit: (amount: number) =>
    request<any>("/bank/deposit", { method: "POST", body: JSON.stringify({ amount }) }),
  withdraw: (amount: number) =>
    request<any>("/bank/withdraw", { method: "POST", body: JSON.stringify({ amount }) }),
};

// Profile extensions
export const profileExt = {
  warfare: () => request<{ thug: number; dealer: number; pimp: number; highest: number }>("/profile/warfare"),
  chooseSpecialization: (spec: "enforcer" | "dealer" | "hacker") =>
    request<{ specialization: string }>("/profile/choose-specialization", {
      method: "POST",
      body: JSON.stringify({ specialization: spec }),
    }),
};

// Skills
export const skills = {
  list: () => request<{ turns: number; skills: any[] }>("/skills"),
  train: (id: number) =>
    request<any>(`/skills/${id}/train`, { method: "POST" }),
};

// Drug Market
export const drugMarket = {
  get: () => request<any>("/market/drugs"),
  buy: (itemId: number, quantity: number) =>
    request<any>(`/market/drugs/buy/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
  sell: (inventoryId: number, quantity: number) =>
    request<any>(`/market/drugs/sell/${inventoryId}`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
  collect: () =>
    request<any>("/market/drugs/collect", { method: "POST" }),
  history: (itemId: number) =>
    request<any>(`/market/drugs/history/${itemId}`),
};

export const gangs = {
  list: () => request<any>("/gangs"),
  create: (data: { name: string; tag: string; description?: string }) =>
    request<any>("/gangs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: number) => request<any>(`/gangs/${id}`),
  join: (id: number) =>
    request<any>(`/gangs/${id}/join`, { method: "POST" }),
  leave: (id: number) =>
    request<any>(`/gangs/${id}/leave`, { method: "POST" }),
  kick: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/kick/${userId}`, { method: "POST" }),
  transfer: (gangId: number, targetUserId: number) =>
    request<any>(`/gangs/${gangId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ userId: targetUserId }),
    }),
  disband: (id: number) =>
    request<any>(`/gangs/${id}/disband`, { method: "POST" }),
  // Invites
  myInvites: () => request<any>("/gangs/invites"),
  invite: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/invite/${userId}`, { method: "POST" }),
  acceptInvite: (inviteId: number) =>
    request<any>(`/gangs/invite/${inviteId}/accept`, { method: "POST" }),
  declineInvite: (inviteId: number) =>
    request<any>(`/gangs/invite/${inviteId}/decline`, { method: "POST" }),
  cancelInvite: (gangId: number, inviteId: number) =>
    request<any>(`/gangs/${gangId}/invite/${inviteId}`, { method: "DELETE" }),
  // Ranks
  promote: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/promote/${userId}`, { method: "POST" }),
  demote: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/demote/${userId}`, { method: "POST" }),
  // Search
  searchUsers: (q: string) => request<any>(`/gangs/search?q=${encodeURIComponent(q)}`),
  // Gang-specific invites
  gangInvites: (gangId: number) => request<any>(`/gangs/${gangId}/invites`),
};

export const hoes = {
  list: () => request<any>("/hoes"),
  collect: () =>
    request<any>("/hoes/collect", { method: "POST" }),
  buy: (itemId: number) =>
    request<any>(`/hoes/buy/${itemId}`, { method: "POST" }),
};

export const casino = {
  blackjackDeal: (bet: number) =>
    request<any>("/casino/blackjack/deal", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  blackjackAction: (gameId: string, action: "hit" | "stand") =>
    request<any>("/casino/blackjack/action", {
      method: "POST",
      body: JSON.stringify({ gameId, action }),
    }),
  slotsSpin: (bet: number) =>
    request<any>("/casino/slots/spin", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  rtbDeal: (bet: number) =>
    request<any>("/casino/ride-the-bus/deal", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  rtbAction: (gameId: string, guess: string) =>
    request<any>("/casino/ride-the-bus/action", {
      method: "POST",
      body: JSON.stringify({ gameId, guess }),
    }),
};
