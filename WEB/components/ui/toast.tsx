"use client";

import { cn } from "@/utils/cn";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id" | "exiting">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Icons ───────────────────────────────────────────────────────────────────

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error:   <XCircle className="size-5 text-red-500" />,
  warning: <TriangleAlert className="size-5 text-amber-500" />,
  info:    <Info className="size-5 text-blue-500" />,
};

const borders: Record<ToastVariant, string> = {
  success: "border-l-emerald-500",
  error:   "border-l-red-500",
  warning: "border-l-amber-500",
  info:    "border-l-blue-500",
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full max-w-sm items-start gap-3 rounded-2xl border border-stone-100 border-l-4 bg-white p-4 shadow-[var(--shadow-lg)]",
        borders[toast.variant],
        toast.exiting ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <div className="shrink-0 pt-0.5">{icons[toast.variant]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-stone-500">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const toast = useCallback(
    (opts: Omit<Toast, "id" | "exiting">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...opts, id }]);
      const timer = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "success" }),
    [toast],
  );

  const error = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "error" }),
    [toast],
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "warning" }),
    [toast],
  );

  const info = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: "info" }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast portal */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-4"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
