"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { auth as authApi, profile as profileApi } from "./api";
import { User } from "@/types";

export interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await profileApi.get();
      setUser(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = () =>
      authApi.me()
        .then(setUser)
        .catch(() => localStorage.removeItem("token"));

    fetchUser().finally(() => setLoading(false));

    // Refresh user data every 30s to keep turns/regen accurate
    const interval = setInterval(fetchUser, 30000);
    // Also refresh on tab focus (user switching back to the game)
    const onFocus = () => fetchUser();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
