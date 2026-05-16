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
    const err = new Error(data.error || "Request failed") as any;
    err.data = data;
    throw err;
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

  register: (username: string, password: string) =>
    request<{ token: string; userId: number }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
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
  heal: (method: "cash" | "turns" = "cash") =>
    request<any>("/profile/heal", {
      method: "POST",
      body: JSON.stringify({ method }),
    }),
  avatar: (avatarUrl: string | null) =>
    request<{ avatarUrl: string | null }>("/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatarUrl }),
    }),
};

// Crimes
export const crimes = {
  list: () => request<{ turns: number; crimes: any[]; locked: any[] }>("/crimes"),
  commit: (id: number, times = 1) =>
    request<any>(`/crimes/${id}/commit`, { method: "POST", body: JSON.stringify({ times }) }),
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
  get: () => request<{ bank: number; cash: number; totalNetworth: number; totalInterestEarned: number }>("/bank"),
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
    request<{ requestId: number; status: string }>(`/gangs/${id}/join`, { method: "POST" }),
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
  setBanner: (gangId: number, bannerUrl: string | null) =>
    request<any>(`/gangs/${gangId}/banner`, {
      method: "POST",
      body: JSON.stringify({ bannerUrl }),
    }),
  levelUp: (gangId: number) =>
    request<{ level: number; reputation: number; levelBenefits: any }>(
      `/gangs/${gangId}/levelup`, { method: "POST" }
    ),
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
  // Join requests
  requests: {
    list: (gangId: number) => request<any[]>(`/gangs/${gangId}/requests`),
    accept: (gangId: number, userId: number) =>
      request<any>(`/gangs/${gangId}/requests/${userId}/accept`, { method: "POST" }),
    decline: (gangId: number, userId: number) =>
      request<any>(`/gangs/${gangId}/requests/${userId}/decline`, { method: "POST" }),
  },
  // Ranks
  promote: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/promote/${userId}`, { method: "POST" }),
  demote: (gangId: number, userId: number) =>
    request<any>(`/gangs/${gangId}/demote/${userId}`, { method: "POST" }),
  // Search
  searchUsers: (q: string) => request<any>(`/gangs/search?q=${encodeURIComponent(q)}`),
  // Gang-specific invites
  gangInvites: (gangId: number) => request<any>(`/gangs/${gangId}/invites`),
  // Vault
  deposit: (gangId: number, amount: number) =>
    request<{ vault: number; amount: number }>(`/gangs/${gangId}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  withdraw: (gangId: number, amount: number) =>
    request<{ vault: number; amount: number }>(`/gangs/${gangId}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  payMember: (gangId: number, userId: number, amount: number) =>
    request<{ vault: number; amount: number; targetUsername: string }>(`/gangs/${gangId}/pay/${userId}`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  setAccountant: (gangId: number, hire: boolean) =>
    request<{ success: boolean; hired: boolean }>(`/gangs/${gangId}/accountant`, {
      method: "POST",
      body: JSON.stringify({ hire }),
    }),
  setSalary: (gangId: number, userId: number, amount: number) =>
    request<{ success: boolean; salary: number }>(`/gangs/${gangId}/salary/${userId}`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  // Operations
  operations: (gangId: number) =>
    request<any>(`/gangs/${gangId}/operations`),
  startOperation: (gangId: number, operationDefId: number, memberIds: number[]) =>
    request<any>(`/gangs/${gangId}/operations/start`, {
      method: "POST",
      body: JSON.stringify({ operationDefId, memberIds }),
    }),
  stopOperation: (gangId: number, activeOperationId: number) =>
    request<any>(`/gangs/${gangId}/operations/stop`, {
      method: "POST",
      body: JSON.stringify({ activeOperationId }),
    }),
  levelUpOperation: (gangId: number, activeOperationId: number) =>
    request<any>(`/gangs/${gangId}/operations/levelup`, {
      method: "POST",
      body: JSON.stringify({ activeOperationId }),
    }),
  completeTask: (gangId: number, activeOperationId: number) =>
    request<any>(`/gangs/${gangId}/operations/complete-task`, {
      method: "POST",
      body: JSON.stringify({ activeOperationId }),
    }),
  collectPayout: (gangId: number, activeOperationId: number) =>
    request<{ collected: number; vault: number; paidAt: string }>(`/gangs/${gangId}/operations/collect`, {
      method: "POST",
      body: JSON.stringify({ activeOperationId }),
    }),
  // Arsenal
  arsenal: {
    list: (gangId: number) => request<any>(`/gangs/${gangId}/arsenal`),
    buy: (gangId: number, name: string) =>
      request<any>(`/gangs/${gangId}/arsenal/buy`, { method: "POST", body: JSON.stringify({ name }) }),
    assignTurf: (gangId: number, arsenalId: number, turfId: number) =>
      request<any>(`/gangs/${gangId}/arsenal/${arsenalId}/assign-turf/${turfId}`, { method: "POST" }),
    unassignTurf: (gangId: number, arsenalId: number) =>
      request<any>(`/gangs/${gangId}/arsenal/${arsenalId}/unassign-turf`, { method: "POST" }),
    repair: (gangId: number, arsenalId: number) =>
      request<any>(`/gangs/${gangId}/arsenal/${arsenalId}/repair`, { method: "POST" }),
    equip: (gangId: number, arsenalId: number) =>
      request<any>(`/gangs/${gangId}/arsenal/${arsenalId}/assign`, { method: "POST" }),
    unequip: (gangId: number, arsenalId: number) =>
      request<any>(`/gangs/${gangId}/arsenal/${arsenalId}/unassign`, { method: "POST" }),
  },
  // Leaderboard
  leaderboard: (type: string, limit = 50) =>
    request<any>(`/gangs/leaderboard/${type}?limit=${limit}`),
  // Turf
  turf: {
    list: (gangId: number) => request<any>(`/gangs/${gangId}/turf`),
    overview: (gangId: number) => request<any>(`/gangs/${gangId}/turf/overview`),
    claim: (gangId: number, districtId: number) =>
      request<any>(`/gangs/${gangId}/turf/claim/${districtId}`, { method: "POST" }),
    challenge: (gangId: number, districtId: number) =>
      request<any>(`/gangs/${gangId}/turf/challenge/${districtId}`, { method: "POST" }),
    abandon: (gangId: number, districtId: number) =>
      request<any>(`/gangs/${gangId}/turf/abandon/${districtId}`, { method: "POST" }),
  },
  // Investments
  investments: {
    info: (gangId: number) => request<any>(`/gangs/${gangId}/investments`),
    toggle: (gangId: number) =>
      request<any>(`/gangs/${gangId}/investments/toggle`, { method: "POST" }),
    setShare: (gangId: number, share: number) =>
      request<any>(`/gangs/${gangId}/investments/share`, {
        method: "PUT",
        body: JSON.stringify({ share }),
      }),
    invest: (gangId: number, amount: number) =>
      request<any>(`/gangs/${gangId}/investments/invest`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    withdraw: (gangId: number) =>
      request<any>(`/gangs/${gangId}/investments/withdraw`, { method: "POST" }),
    collect: (gangId: number) =>
      request<any>(`/gangs/${gangId}/investments/collect`, { method: "POST" }),
    my: () => request<any>("/investments"),
    open: () => request<any>("/investments/open"),
  },
  // Attacks
  attack: {
    status: (targetId: number) =>
      request<any>(`/gangs/${targetId}/attack/status`),
    raid: (targetId: number) =>
      request<any>(`/gangs/${targetId}/attack/raid`, { method: "POST" }),
    sabotage: (targetId: number) =>
      request<any>(`/gangs/${targetId}/attack/sabotage`, { method: "POST" }),
    history: (gangId: number) =>
      request<any>(`/gangs/${gangId}/attacks`),
  },
};

export const hoes = {
  list: () => request<any>("/hoes"),
  collect: () =>
    request<any>("/hoes/collect", { method: "POST" }),
  buy: (itemId: number) =>
    request<any>(`/hoes/buy/${itemId}`, { method: "POST" }),
  fire: (inventoryId: number) =>
    request<any>(`/hoes/fire/${inventoryId}`, { method: "POST" }),
};

export const casino = {
  blackjackDeal: (bet: number) =>
    request<any>("/casino/blackjack/deal", {
      method: "POST",
      body: JSON.stringify({ bet }),
    }),
  blackjackAction: (gameId: string, action: "hit" | "stand" | "double") =>
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

// Activity Feed
export const activity = {
  feed: (limit = 50) => request<{ feed: FeedEntry[] }>(`/activity/feed?limit=${limit}`),
};

export interface FeedEntry {
  id: number;
  userId: number;
  username: string;
  type: string;
  message: string;
  metadata: string | null;
  createdAt: string;
}

// Skill Crimes
export const skillCrimes = {
  list: () => request<{ turns: number; crimes: any[]; locked: any[] }>("/skill-crimes"),
  attempt: (id: number, accuracy: number) =>
    request<any>(`/skill-crimes/${id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ accuracy }),
    }),
};

// Feedback
export interface FeedbackData {
  id: number;
  userId: number;
  type: "suggestion" | "bug";
  title: string;
  description: string;
  votes: number;
  status: string;
  createdAt: string;
  username: string;
}

export interface FeedbackCommentData {
  id: number;
  feedbackId: number;
  userId: number;
  content: string;
  createdAt: string;
  username: string;
  votes: number;
  userVoted: boolean;
}

export const feedback = {
  list: () => request<FeedbackData[]>("/feedback"),
  create: (data: { type: string; title: string; description: string }) =>
    request<FeedbackData>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  vote: (id: number, up: boolean) =>
    request<any>(`/feedback/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ up }),
    }),
  delete: (id: number) =>
    request<{ success: boolean }>(`/feedback/${id}`, {
      method: "DELETE",
    }),
  comments: {
    list: (feedbackId: number) =>
      request<FeedbackCommentData[]>(`/feedback/${feedbackId}/comments`),
    create: (feedbackId: number, content: string) =>
      request<FeedbackCommentData>(`/feedback/${feedbackId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    vote: (commentId: number) =>
      request<{ success: boolean; voted: boolean; votes: number }>(`/feedback/comments/${commentId}/vote`, {
        method: "POST",
      }),
    delete: (commentId: number) =>
      request<{ success: boolean }>(`/feedback/comments/${commentId}`, {
        method: "DELETE",
      }),
  },
};
