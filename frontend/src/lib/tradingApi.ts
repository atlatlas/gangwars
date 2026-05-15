const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || "Request failed") as any;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const tradingApi = {
  assets: () => request<any[]>("/trading/assets"),
  asset: (id: number) => request<any>(`/trading/assets/${id}`),
  account: () => request<any>("/trading/account"),

  deposit: (amount: number) =>
    request<any>("/trading/deposit", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  withdraw: (amount: number) =>
    request<any>("/trading/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  placeOrder: (data: {
    assetId: number;
    type: "market" | "limit" | "stop_loss" | "take_profit";
    side: "buy" | "sell";
    quantity: number;
    price?: number;
    stopPrice?: number;
  }) =>
    request<any>("/trading/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  orders: (status?: string) =>
    request<any[]>(`/trading/orders${status ? `?status=${status}` : ""}`),

  cancelOrder: (id: number) =>
    request<any>(`/trading/orders/${id}`, { method: "DELETE" }),

  positions: () => request<any[]>("/trading/positions"),
  fills: () => request<any[]>("/trading/fills"),

  history: (assetId: number, resolution: string) =>
    request<any[]>(`/trading/history/${assetId}/${resolution}`),
};
