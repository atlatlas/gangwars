"use client";

import { createContext, useContext, ReactNode } from "react";

export interface TopNotif {
  message: string;
  type: "success" | "error";
}

interface TopNotificationContextValue {
  notif: TopNotif | null;
  showNotification: (message: string, type?: "success" | "error") => void;
}

const TopNotificationContext = createContext<TopNotificationContextValue>({
  notif: null,
  showNotification: () => {},
});

export const useTopNotification = () => useContext(TopNotificationContext);

export function TopNotificationContextProvider({ children, value }: { children: ReactNode; value: TopNotificationContextValue }) {
  return (
    <TopNotificationContext.Provider value={value}>
      {children}
    </TopNotificationContext.Provider>
  );
}
