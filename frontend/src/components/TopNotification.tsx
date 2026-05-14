"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Trophy, Skull, AlertTriangle, Info } from "lucide-react";

export type NotifType = "success" | "error" | "warning" | "info";

interface NotifState {
  id: number;
  message: string;
  type: NotifType;
  exiting?: boolean;
}

interface TopNotificationContextValue {
  notif: NotifState | null;
  showNotification: (message: string, type?: NotifType) => void;
}

const TopNotificationContext = createContext<TopNotificationContextValue>({
  notif: null,
  showNotification: () => {},
});

export const useTopNotification = () => useContext(TopNotificationContext);

const iconMap: Record<NotifType, ReactNode> = {
  success: <Trophy size={14} className="text-emerald-300" />,
  error: <Skull size={14} className="text-red-300" />,
  warning: <AlertTriangle size={14} className="text-amber-300" />,
  info: <Info size={14} className="text-cyan-300" />,
};

const styleMap: Record<NotifType, string> = {
  success: "bg-emerald-500/8 text-emerald-300 border-emerald-500/15",
  error: "bg-red-500/8 text-red-300 border-red-500/15",
  warning: "bg-amber-500/8 text-amber-300 border-amber-500/15",
  info: "bg-cyan-500/8 text-cyan-300 border-cyan-500/15",
};

export function TopNotificationProvider({ children }: { children: ReactNode }) {
  const [notif, setNotif] = useState<NotifState | null>(null);
  const keyRef = useRef(0);

  const showNotification = useCallback((message: string, type: NotifType = "success") => {
    const id = ++keyRef.current;
    setNotif({ id, message, type });
    setTimeout(() => {
      setNotif((prev) => (prev?.id === id ? { ...prev, exiting: true } : prev));
    }, 3000);
    setTimeout(() => {
      setNotif((prev) => (prev?.id !== id ? prev : null));
    }, 3200);
  }, []);

  return (
    <TopNotificationContext.Provider value={{ notif, showNotification }}>
      {children}
      {notif && typeof document !== "undefined" && createPortal(
        <div
          className={`fixed top-0 left-0 right-0 z-[200] h-12 flex items-center justify-center gap-3 px-4 font-mono text-xs tracking-wider backdrop-blur-xl border-b ${
            notif.exiting ? "animate-slide-up-out" : "animate-slide-in"
          } ${styleMap[notif.type]}`}
        >
          {iconMap[notif.type]}
          <span className="font-semibold">{notif.type === "success" ? "Success" : notif.type === "error" ? "Failed" : notif.type === "warning" ? "Warning" : "Info"}</span>
          <span className="opacity-40 mx-0.5">—</span>
          <span className="opacity-70">{notif.message}</span>
        </div>,
        document.body
      )}
    </TopNotificationContext.Provider>
  );
}
