"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={16} className="text-neon-green" />,
  error: <AlertCircle size={16} className="text-neon-red" />,
  warning: <AlertTriangle size={16} className="text-neon-yellow" />,
  info: <Info size={16} className="text-neon-cyan" />,
};

const borders: Record<ToastType, string> = {
  success: "border-neon-green/30",
  error: "border-neon-red/30",
  warning: "border-neon-yellow/30",
  info: "border-neon-cyan/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 3500);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-bg-card border ${borders[t.type]} shadow-lg shadow-black/30 max-w-sm ${t.exiting ? "toast-exit" : "toast-enter"}`}
          >
            {icons[t.type]}
            <p className="text-sm text-text-primary flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-muted/40 hover:text-text-secondary transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
