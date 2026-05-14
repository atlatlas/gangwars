"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Trophy, Skull, AlertTriangle, Info, X } from "lucide-react";

export type NotifType = "success" | "error" | "warning" | "info";

interface NotifState {
  id: number;
  message: string;
  type: NotifType;
  exiting?: boolean;
  confirm?: { onConfirm: () => void; onCancel?: () => void };
}

interface TopNotificationContextValue {
  notif: NotifState | null;
  showNotification: (message: string, type?: NotifType) => void;
  showConfirm: (message: string, type: NotifType, onConfirm: () => void, onCancel?: () => void) => void;
  dismissNotif: () => void;
}

const TopNotificationContext = createContext<TopNotificationContextValue>({
  notif: null,
  showNotification: () => {},
  showConfirm: () => {},
  dismissNotif: () => {},
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const dismissNotif = useCallback(() => {
    clearTimer();
    setNotif(null);
  }, []);

  const showNotification = useCallback((message: string, type: NotifType = "success") => {
    clearTimer();
    const id = ++keyRef.current;
    setNotif({ id, message, type });
    timerRef.current = setTimeout(() => {
      setNotif((prev) => (prev?.id === id ? { ...prev, exiting: true } : prev));
    }, 3000);
    setTimeout(() => {
      setNotif((prev) => (prev?.id !== id ? prev : null));
    }, 3200);
  }, []);

  const showConfirm = useCallback((message: string, type: NotifType, onConfirm: () => void, onCancel?: () => void) => {
    clearTimer();
    const id = ++keyRef.current;
    setNotif({ id, message, type, confirm: { onConfirm, onCancel } });
  }, []);

  return (
    <TopNotificationContext.Provider value={{ notif, showNotification, showConfirm, dismissNotif }}>
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

          {notif.confirm ? (
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => { const cb = notif.confirm?.onConfirm; dismissNotif(); cb?.(); }}
                className="px-2.5 py-1 rounded-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => { const cb = notif.confirm?.onCancel; dismissNotif(); cb?.(); }}
                className="px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 text-white/50 hover:text-white/70 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={dismissNotif} className="ml-2 opacity-30 hover:opacity-60 transition-all">
              <X size={12} />
            </button>
          )}
        </div>,
        document.body
      )}
    </TopNotificationContext.Provider>
  );
}
