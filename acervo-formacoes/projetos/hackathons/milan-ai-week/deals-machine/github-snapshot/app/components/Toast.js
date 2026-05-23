"use client";
// Slim toast system — context provider + useToast() hook.
//
// Usage:
//   const toast = useToast();
//   toast.success("Saved");
//   toast.success("Stage changed", { detail: "Qualified" });
//   toast.error("Couldn't reach the worker", { detail: e.message });
//
// Stacks in the bottom-right, auto-dismisses after 3.2s (longer for errors).
// One-line variant by default; pass `detail` for a secondary line.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

const TONE_CLASS = {
  success: "bg-tertiary-container/95 text-on-tertiary-container border-tertiary/30",
  info:    "bg-surface-container-lowest/95 text-on-surface border-outline/20",
  error:   "bg-error-container/95 text-on-error-container border-error/30",
  gold:    "bg-surface-container-lowest/95 text-on-surface gold-rim",
};

const TONE_ICON = {
  success: "check_circle",
  info:    "info",
  error:   "error",
  gold:    "auto_awesome",
};

const DEFAULT_DURATION = 3200;
const ERROR_DURATION = 5500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((tone, message, opts = {}) => {
    const id = ++idRef.current;
    const duration = opts.duration ?? (tone === "error" ? ERROR_DURATION : DEFAULT_DURATION);
    const next = { id, tone, message, detail: opts.detail, duration };
    setToasts((t) => [...t.slice(-4), next]); // keep at most 5
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, opts) => show("success", msg, opts),
    info:    (msg, opts) => show("info", msg, opts),
    error:   (msg, opts) => show("error", msg, opts),
    gold:    (msg, opts) => show("gold", msg, opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail open — return no-op stubs so pages don't crash if mounted outside
    // a provider (e.g. during a partial migration).
    return {
      success: () => {},
      info: () => {},
      error: () => {},
      gold: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  // Don't render the portal during SSR — toasts are client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ t, onDismiss }) {
  const cls = TONE_CLASS[t.tone] || TONE_CLASS.info;
  const icon = TONE_ICON[t.tone] || TONE_ICON.info;
  return (
    <div
      className={`pointer-events-auto min-w-[260px] max-w-sm rounded-2xl border px-4 py-3 backdrop-blur-md editorial-shadow-lg animate-toast-in flex items-start gap-2.5 ${cls}`}
    >
      <span
        className="material-symbols-outlined text-[18px] mt-0.5 shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-headline font-bold text-[13px] tracking-tight leading-snug">
          {t.message}
        </div>
        {t.detail && (
          <div className="font-label text-[11.5px] opacity-80 mt-0.5 leading-snug">
            {t.detail}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}
