"use client";
// One-time setup: verify the operator's cell as a Twilio outgoing caller ID.
//
// Flow:
//   1. Operator enters their cell as +E.164
//   2. POST /api/caller-id/verify — worker calls Twilio's validation endpoint
//      and returns a 6-digit code we display
//   3. Twilio places an automated call to the cell. Voice says the code.
//      Operator enters the code via DTMF on the same call.
//   4. Poll GET /api/caller-id/verify/status until verified=true
//   5. Done — future Call clicks will use this cell as the caller ID

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_TICKS = 60;

export default function CallerIDVerificationModal({ onClose, onVerified }) {
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState("input"); // input | starting | waiting | verified | error
  const [code, setCode] = useState(null);
  const [pollTick, setPollTick] = useState(0);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setError(null);
    if (!/^\+\d{8,15}$/.test(phone)) {
      setError("Phone must be in +E.164 format, e.g. +15551234567");
      return;
    }
    setPhase("starting");
    try {
      const res = await fetch("/api/caller-id/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      if (data.already_verified) {
        setPhase("verified");
        setTimeout(() => onVerified?.(phone), 1200);
        return;
      }
      setCode(data.validation_code);
      setPhase("waiting");
    } catch (err) {
      setError(err.message);
      setPhase("input");
    }
  };

  useEffect(() => {
    if (phase !== "waiting") return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/caller-id/verify/status?phone=${encodeURIComponent(phone)}`
        );
        const data = await res.json();
        if (data?.verified) {
          setPhase("verified");
          setTimeout(() => onVerified?.(phone), 1500);
          return;
        }
      } catch {
        // ignore intermittent network errors
      }
      setPollTick((t) => t + 1);
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, phone, onVerified]);

  useEffect(() => {
    if (pollTick >= POLL_MAX_TICKS) {
      setPhase("input");
      setError("Verification timed out. Try again — Twilio will call you.");
      setPollTick(0);
    }
  }, [pollTick]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-on-surface/45 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={phase === "starting" || phase === "waiting" ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel rounded-2xl editorial-shadow-lg w-full max-w-md p-6 animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="eyebrow text-on-surface-variant/70 mb-1">Twilio</div>
            <h2 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
              Verify your cell
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
            aria-label="close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {phase === "input" && (
          <>
            <p className="font-label text-[13px] text-on-surface-variant leading-relaxed mb-4">
              Deals Machine routes cold calls through Twilio so they get recorded and the brain
              learns from them. Verify your cell once so it shows as the caller ID on outgoing
              calls — leads see your real number, not the platform's.
            </p>

            <label className="eyebrow text-on-surface-variant block mb-1.5">
              Phone (E.164)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.trim())}
              placeholder="+15551234567"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline/15 rounded-xl font-mono text-base tracking-wider text-on-surface focus:outline-none focus:border-on-surface/40 transition-colors"
            />

            {error && (
              <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-3.5 py-2.5 mt-3 text-sm font-label flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-outline/10">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high font-label text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!phone}
                className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all inline-flex items-center gap-2"
              >
                Verify number
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {phase === "starting" && <CenteredState icon="ring_volume" title="Asking Twilio to call your cell…" />}

        {phase === "waiting" && (
          <>
            <div className="rounded-2xl bg-surface-container-high p-5 text-center">
              <div className="eyebrow text-on-surface-variant mb-2">
                When Twilio calls you, enter this code via the keypad
              </div>
              <div className="font-mono font-extrabold text-4xl text-on-surface tracking-[0.4em] mt-1 tabular-nums">
                {code}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Spinner />
              <span className="font-label text-[12.5px] text-on-surface-variant">
                Waiting for Twilio to confirm — your phone should ring in ~10 seconds.
              </span>
            </div>
            {error && (
              <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-3.5 py-2.5 mt-3 text-sm font-label">
                ⚠ {error}
              </div>
            )}
          </>
        )}

        {phase === "verified" && (
          <div className="text-center py-6 animate-fade-up">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-tertiary-container mb-3">
              <span
                className="material-symbols-outlined text-tertiary text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div className="font-headline font-extrabold text-on-surface tracking-tight mb-1">
              Verified
            </div>
            <p className="font-label text-[13px] text-on-surface-variant max-w-sm mx-auto">
              <span className="font-mono font-medium text-on-surface">{phone}</span> is now your caller ID. Future calls show this number to your leads.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CenteredState({ icon, title }) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high mb-3 relative">
        <span
          className="material-symbols-outlined text-on-surface text-[28px] animate-pulse"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        <span className="absolute -inset-1 rounded-2xl border-2 border-on-surface/10 animate-pulse" />
      </div>
      <div className="font-headline font-bold text-on-surface tracking-tight">{title}</div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-on-surface"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
