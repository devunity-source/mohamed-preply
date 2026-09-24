"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

/** Short-lived confirmations ("Marked done · Undo"), announced to screen readers. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = ++nextId.current;
    // One at a time: a new confirmation replaces the previous one.
    setToasts([{ ...t, id }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-4 print:hidden"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);
  const onDone = () => dismiss(toast.id);

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center gap-3 rounded-md bg-ink py-2.5 pr-2 pl-4 text-sm text-paper shadow-lg"
    >
      <Check size={15} strokeWidth={3} className="text-accent" aria-hidden />
      <span>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDone();
          }}
          className="rounded-md px-2 py-1 font-medium text-accent hover:bg-paper/10"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDone} aria-label="Dismiss" className="rounded-md p-1 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
