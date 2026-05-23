"use client";
// Onboarding wizard — for users who don't have a clear ICP yet.
//
// Agent asks one question at a time (max 5), builds a scratchpad of the
// emerging ICP, validates the hypothesis against real web-searched companies,
// then commits 1..N verticals (variations: same buyer, different niches).
//
// Cookie-based session: an anonymous token lives in `dm_onboard_token` and
// pairs with a server-side onboarding_sessions row. If the user closes the
// tab they can come back and pick up where they left off.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { useToast } from "../components/Toast";

const COOKIE_NAME = "dm_onboard_token";
const COOKIE_MAX_AGE_DAYS = 14;

/* ─── Cookie helpers ─────────────────────────────────────────────── */

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function mintToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "tok_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Q1 is fixed — must match worker/src/routes/onboarding.ts Q1_FIXED. We
// render it client-side immediately so the user never sees a blank page
// while the worker is being woken up.
const Q1_FIXED =
  "What do you sell, in one sentence? Tell me like you'd tell a friend — what's the product or service, and who do you think it's for?";

/* ─── Page ───────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [token, setToken] = useState(null);
  // Default to "questions" so we render Q1 instantly. If /start returns a
  // resumable session we switch to "resume"; otherwise we stay here.
  const [phase, setPhase] = useState("questions"); // questions | resume | validate | commit | done
  const [resumedFrom, setResumedFrom] = useState(null);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(5);
  const [question, setQuestion] = useState(Q1_FIXED);
  // True until /start completes — submit stays disabled while we wait. Most
  // users will still be typing when this flips, so they never notice it.
  const [bootstrapping, setBootstrapping] = useState(true);
  const [answer, setAnswer] = useState("");
  const [scratchpad, setScratchpad] = useState({});
  const [history, setHistory] = useState([]);
  const [nichesDetected, setNichesDetected] = useState([]);
  const [validatedCompanies, setValidatedCompanies] = useState(null);
  const [validating, setValidating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [variations, setVariations] = useState([]); // [{ display_name, niche_override }]
  const [stepError, setStepError] = useState(null); // { title, detail }
  const inputRef = useRef(null);
  // Mirror bootstrapping into a ref so submitAnswer can poll it without
  // capturing a stale closure value.
  const bootstrappingRef = useRef(true);
  useEffect(() => {
    bootstrappingRef.current = bootstrapping;
  }, [bootstrapping]);

  // Mint or read the cookie token. We render Q1 instantly and warm up the
  // session in the background — the user starts typing while /start lands.
  // For users with a resumable session, we swap into the resume gate as
  // soon as /start completes (only if they haven't already started typing).
  useEffect(() => {
    let t = getCookie(COOKIE_NAME);
    const hadCookie = !!t;
    if (!t) {
      t = mintToken();
      setCookie(COOKIE_NAME, t, COOKIE_MAX_AGE_DAYS);
    }
    setToken(t);

    // Fire-and-forget so the page paints Q1 first.
    (async () => {
      try {
        let res;
        try {
          res = await fetch("/api/onboard/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookie_token: t }),
          });
        } catch (netErr) {
          setStepError({
            title: "Network error",
            detail: netErr?.message || "Couldn't reach the onboarding service.",
          });
          return;
        }
        let json;
        try {
          json = await res.json();
        } catch {
          json = null;
        }
        if (!res.ok || !json?.ok) {
          const detail = json?.error || `HTTP ${res.status}`;
          const isSchema = /onboarding_sessions|relation|column|does not exist/i.test(detail);
          const isMissing = res.status === 404 || /not found|cannot POST/i.test(detail);
          setStepError({
            title: isSchema
              ? "Database not ready"
              : isMissing
                ? "Onboarding service not deployed"
                : "Couldn't start session",
            detail: isSchema
              ? "Migration 020 (onboarding_sessions) hasn't been applied yet."
              : isMissing
                ? "The worker doesn't have the /onboard/* routes yet — redeploy needed."
                : detail,
          });
          toast.error("Couldn't start session", { detail });
          return;
        }
        const s = json.session;
        // Only show resume gate if they actually have prior answers AND we
        // had a cookie coming in (newly-minted cookies can't be resumed).
        if (
          hadCookie &&
          json.resumed &&
          (s.status === "active" || s.status === "paused") &&
          (s.answers?.length || 0) > 0
        ) {
          setResumedFrom(s);
          setStep(s.current_step ?? 1);
          setScratchpad(s.scratchpad ?? {});
          setHistory(s.answers ?? []);
          setValidatedCompanies(s.validated_companies ?? null);
          setPhase("resume");
        }
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNext = async (t, ans) => {
    setBusy(true);
    setStepError(null);
    try {
      let res;
      try {
        res = await fetch("/api/onboard/next-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie_token: t, answer: ans ?? undefined }),
        });
      } catch (netErr) {
        setStepError({
          title: "Network error",
          detail:
            netErr?.message ||
            "Couldn't reach the onboarding service. Check your connection and try again.",
        });
        return;
      }
      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok || !json?.ok) {
        const detail = json?.error || `HTTP ${res.status}`;
        const isSchema = /onboarding_sessions|relation|column|does not exist/i.test(detail);
        const isMissing = res.status === 404 || /not found|cannot POST/i.test(detail);
        setStepError({
          title: isSchema
            ? "Database not ready"
            : isMissing
              ? "Onboarding service not deployed"
              : "Agent stumbled",
          detail: isSchema
            ? "Migration 020 (onboarding_sessions) hasn't been applied to this Supabase project yet."
            : isMissing
              ? "The worker doesn't have the /onboard/* routes yet — it needs a redeploy."
              : detail,
        });
        toast.error("Couldn't continue", { detail });
        return;
      }
      setStep(json.step);
      setMaxStep(json.max_step);
      setScratchpad(json.scratchpad ?? {});
      setNichesDetected(json.niches_detected ?? []);
      setAnswer("");
      // Append the just-answered Q/A to history when we just submitted one.
      if (ans !== null && ans !== undefined) {
        setHistory((h) => [
          ...h,
          { step: json.step - 1, question, answer: ans, asked_at: new Date().toISOString() },
        ]);
      }
      if (json.done) {
        setPhase("validate");
        setQuestion("");
      } else {
        setQuestion(json.next_question);
        setPhase("questions");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    const trimmed = answer.trim();
    if (!trimmed || busy) return;
    if (!token) {
      setStepError({
        title: "Session not ready",
        detail: "Couldn't mint a session token. Refresh and try again.",
      });
      return;
    }
    if (bootstrapping) {
      // User typed and submitted faster than /start returned. Wait for it
      // (up to 30s) then proceed automatically.
      setBusy(true);
      const start = Date.now();
      while (bootstrappingRef.current && Date.now() - start < 30_000) {
        await new Promise((r) => setTimeout(r, 100));
      }
      setBusy(false);
      if (bootstrappingRef.current) {
        setStepError({
          title: "Service is taking too long to wake up",
          detail:
            "The onboarding worker hasn't responded in 30s. Try again, or check that the worker is deployed and reachable.",
        });
        return;
      }
    }
    await loadNext(token, trimmed);
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/onboard/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie_token: token }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error("Validation failed", { detail: json?.error });
        return;
      }
      setValidatedCompanies(json.companies ?? []);
    } finally {
      setValidating(false);
    }
  };

  const goToCommit = () => {
    // Seed one variation by default; user can add up to 4.
    const baseName =
      scratchpad?.industries?.[0]
        ? `${scratchpad.industries[0]} — ${scratchpad.buyer_titles?.[0] || "Buyer"}`
        : scratchpad?.product?.slice(0, 60) || "My first vertical";
    setVariations([{ display_name: baseName, niche_override: "" }]);
    setPhase("commit");
  };

  const commit = async () => {
    if (busy) return;
    if (variations.some((v) => !v.display_name.trim())) {
      toast.error("Every variation needs a name");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboard/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie_token: token,
          variations: variations.map((v) => ({
            display_name: v.display_name.trim(),
            niche_override: v.niche_override?.trim() || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        toast.error("Commit failed", { detail: json?.error });
        return;
      }
      toast.success(
        json.vertical_ids.length === 1
          ? "Vertical created — start dialing"
          : `${json.vertical_ids.length} verticals created`,
      );
      // Clear cookie so the next visit doesn't try to resume a finished session.
      setCookie(COOKIE_NAME, "", -1);
      router.push("/verticals");
    } finally {
      setBusy(false);
    }
  };

  const pauseAndExit = async () => {
    if (!token) return;
    await fetch("/api/onboard/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie_token: token }),
    });
    toast.success("Saved — come back any time");
    router.push("/verticals");
  };

  const resumeNow = async () => {
    setResumedFrom(null);
    // If they had answered something but never got the next question (edge),
    // request a fresh next-question without an answer.
    await loadNext(token, null);
  };

  const restartFresh = async () => {
    // Mint a new token so the old session stays paused on the server.
    const newToken = mintToken();
    setCookie(COOKIE_NAME, newToken, COOKIE_MAX_AGE_DAYS);
    setToken(newToken);
    setHistory([]);
    setScratchpad({});
    setStep(1);
    setResumedFrom(null);
    await fetch("/api/onboard/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookie_token: newToken }),
    });
    await loadNext(newToken, null);
  };

  const addVariation = () => {
    if (variations.length >= 4) {
      toast.info("4 variations max — refine the rest after you've made some calls");
      return;
    }
    setVariations((v) => [
      ...v,
      {
        display_name: `${variations[0].display_name} — variation ${v.length + 1}`,
        niche_override: "",
      },
    ]);
  };

  const removeVariation = (idx) => {
    setVariations((v) => v.filter((_, i) => i !== idx));
  };

  const updateVariation = (idx, patch) => {
    setVariations((v) => v.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/verticals"
            className="font-label text-xs text-on-surface-variant hover:text-on-surface mb-3 inline-flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Cancel
          </Link>
          <div className="eyebrow text-on-surface-variant/70 mb-1">Onboarding</div>
          <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
            Let's figure out who you sell to
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-1 max-w-xl">
            5 quick questions. Each one is built from your last answer. At the end you'll have a
            real ICP, a starter playbook, and you can split into variations if you sell to
            multiple niches.
          </p>
        </div>

        <ProgressBar phase={phase} step={step} maxStep={maxStep} />

        {phase === "resume" && resumedFrom && (
          <ResumeCard
            resumedFrom={resumedFrom}
            onResume={resumeNow}
            onRestart={restartFresh}
          />
        )}

        {(phase === "questions" || phase === "validate" || phase === "commit") && (
          <>
            {history.length > 0 && (
              <ScratchpadPanel scratchpad={scratchpad} niches={nichesDetected} history={history} />
            )}

            {phase === "questions" && (
              <QuestionCard
                step={step}
                maxStep={maxStep}
                question={question}
                answer={answer}
                onAnswerChange={setAnswer}
                onSubmit={submitAnswer}
                onPause={pauseAndExit}
                inputRef={inputRef}
                busy={busy}
                bootstrapping={bootstrapping}
                error={stepError}
                onDismissError={() => setStepError(null)}
              />
            )}

            {phase === "validate" && (
              <ValidatePanel
                scratchpad={scratchpad}
                companies={validatedCompanies}
                validating={validating}
                onRun={runValidation}
                onContinue={goToCommit}
                onBackToQuestions={async () => {
                  // Back up one step — let user revise the last answer.
                  setHistory((h) => h.slice(0, -1));
                  setStep((s) => Math.max(1, s - 1));
                  setPhase("questions");
                  setQuestion(history[history.length - 1]?.question ?? "");
                  setAnswer("");
                }}
              />
            )}

            {phase === "commit" && (
              <CommitPanel
                variations={variations}
                onAdd={addVariation}
                onRemove={removeVariation}
                onUpdate={updateVariation}
                onCommit={commit}
                onBack={() => setPhase("validate")}
                busy={busy}
                scratchpad={scratchpad}
                nichesDetected={nichesDetected}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────── */

function ProgressBar({ phase, step, maxStep }) {
  const phaseLabel = useMemo(() => {
    if (phase === "loading") return "";
    if (phase === "resume") return "Welcome back";
    if (phase === "questions") return `Question ${Math.min(step, maxStep)} of ${maxStep}`;
    if (phase === "validate") return "Validating against real companies";
    if (phase === "commit") return "Final step — save & start calling";
    if (phase === "done") return "Done";
    return "";
  }, [phase, step, maxStep]);

  const pct = useMemo(() => {
    if (phase === "questions") return Math.min((step - 1) / maxStep, 1) * 70;
    if (phase === "validate") return 85;
    if (phase === "commit") return 95;
    if (phase === "done") return 100;
    return 0;
  }, [phase, step, maxStep]);

  if (phase === "loading" || phase === "resume") return null;
  return (
    <div className="mt-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="eyebrow text-on-surface-variant">{phaseLabel}</div>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Resume card ────────────────────────────────────────────────── */

function ResumeCard({ resumedFrom, onResume, onRestart }) {
  const sp = resumedFrom.scratchpad ?? {};
  const answered = (resumedFrom.answers ?? []).length;
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow p-7 mt-6 animate-fade-up">
      <div className="eyebrow text-on-surface-variant mb-2">Welcome back</div>
      <h2 className="font-headline font-extrabold text-on-surface text-xl tracking-tight mb-2">
        Pick up where you left off?
      </h2>
      <p className="font-label text-sm text-on-surface-variant mb-4 max-w-prose">
        You answered {answered} question{answered === 1 ? "" : "s"} earlier. Here's what we'd
        learned so far:
      </p>
      <div className="rounded-xl bg-surface-container-lowest border border-outline/15 p-4 mb-5 space-y-2">
        {sp.product && <KV label="Product" value={sp.product} />}
        {sp.buyer_titles?.length > 0 && <KV label="Buyer" value={sp.buyer_titles.join(", ")} />}
        {sp.industries?.length > 0 && <KV label="Industries" value={sp.industries.join(", ")} />}
        {sp.pain_point && <KV label="Pain" value={sp.pain_point} />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onResume}
          className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px transition-all inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          Pick up where I left off
        </button>
        <button
          onClick={onRestart}
          className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/25 text-on-surface hover:bg-surface-container-high transition-colors"
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}

/* ─── Scratchpad panel ───────────────────────────────────────────── */

function ScratchpadPanel({ scratchpad, niches, history }) {
  const sp = scratchpad ?? {};
  const hasAny =
    sp.product ||
    sp.buyer_titles?.length ||
    sp.industries?.length ||
    sp.pain_point ||
    sp.trigger_events?.length ||
    sp.value_prop;
  if (!hasAny) return null;
  return (
    <div className="bg-surface-container-low/60 rounded-2xl border border-outline/10 p-5 mb-4 animate-fade-up">
      <div className="eyebrow text-on-surface-variant/70 mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px]">psychology</span>
        What we know so far
      </div>
      <div className="space-y-1.5">
        {sp.product && <KV label="Product" value={sp.product} />}
        {sp.buyer_titles?.length > 0 && (
          <KV label="Buyer" value={sp.buyer_titles.join(" · ")} />
        )}
        {sp.industries?.length > 0 && (
          <KV label="Industries" value={sp.industries.join(", ")} />
        )}
        {sp.company_size && (
          <KV
            label="Size"
            value={`${sp.company_size.min ?? "?"}–${sp.company_size.max ?? "?"} employees`}
          />
        )}
        {sp.geo?.length > 0 && <KV label="Geo" value={sp.geo.join(", ")} />}
        {sp.pain_point && <KV label="Pain" value={sp.pain_point} />}
        {sp.trigger_events?.length > 0 && (
          <KV label="Trigger" value={sp.trigger_events.join(" · ")} />
        )}
        {sp.value_prop && <KV label="Why they buy" value={sp.value_prop} />}
      </div>
      {niches?.length > 1 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50/40 px-3 py-2 font-label text-[12px] text-amber-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] mt-px">call_split</span>
          <div>
            Heads up — you mentioned {niches.length} niches ({niches.join(", ")}). You'll be able
            to split into separate verticals at the end.
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex gap-3 font-label text-[12.5px]">
      <span className="text-on-surface-variant/70 min-w-[80px] uppercase tracking-wider text-[10px] font-bold pt-[2px]">
        {label}
      </span>
      <span className="text-on-surface flex-1 leading-snug">{value}</span>
    </div>
  );
}

/* ─── Question card ──────────────────────────────────────────────── */

function QuestionCard({
  step,
  maxStep,
  question,
  answer,
  onAnswerChange,
  onSubmit,
  onPause,
  inputRef,
  busy,
  bootstrapping,
  error,
  onDismissError,
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow p-7 mt-1 animate-fade-up">
      <div className="eyebrow text-on-surface-variant mb-3">
        Question {Math.min(step, maxStep)} of {maxStep}
      </div>
      <div className="font-headline font-extrabold text-on-surface text-xl leading-snug tracking-tight mb-5">
        {question || "…"}
      </div>
      <textarea
        ref={inputRef}
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type your answer. Be specific — examples beat generalities."
        rows={5}
        className="w-full px-4 py-3 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px] leading-[1.6] resize-y"
      />
      {error && (
        <div className="mt-4 rounded-xl border border-error/40 bg-error-container/60 px-4 py-3 flex items-start gap-3">
          <span
            className="material-symbols-outlined text-error text-[20px] mt-px shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-headline font-bold text-on-error-container text-sm mb-0.5">
              {error.title}
            </div>
            <div className="font-label text-[12.5px] text-on-error-container/90 leading-snug">
              {error.detail}
            </div>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="text-on-error-container/70 hover:text-on-error-container shrink-0"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
        <button
          onClick={onPause}
          className="font-label text-xs text-on-surface-variant hover:text-on-surface transition-colors inline-flex items-center gap-1"
          title="Save and come back later"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          Save & come back later
        </button>
        <div className="flex items-center gap-2">
          <span className="font-label text-[11px] text-on-surface-variant/70 hidden sm:inline">
            ⌘+Enter to submit
          </span>
          <button
            onClick={onSubmit}
            disabled={busy || bootstrapping || !answer.trim()}
            className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
          >
            {busy ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                Thinking…
              </>
            ) : bootstrapping && answer.trim() ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                Connecting…
              </>
            ) : (
              <>
                Next
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Validate panel ─────────────────────────────────────────────── */

function ValidatePanel({ scratchpad, companies, validating, onRun, onContinue, onBackToQuestions }) {
  const hasRun = companies !== null && companies !== undefined;
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow p-7 mt-1 animate-fade-up">
      <div className="eyebrow text-on-surface-variant mb-3">Reality check</div>
      <div className="font-headline font-extrabold text-on-surface text-xl leading-snug tracking-tight mb-2">
        Let's see if real companies fit your ICP
      </div>
      <p className="font-label text-sm text-on-surface-variant mb-5 max-w-prose">
        The agent will search the web for 8 real companies that match. Each one comes with a
        one-line explanation of why it fits. If most of them look wrong, we'll go back and tighten
        the ICP.
      </p>

      {!hasRun && (
        <button
          onClick={onRun}
          disabled={validating}
          className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
        >
          {validating ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
              Searching… (this takes 20–40s)
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              Find 8 real companies
            </>
          )}
        </button>
      )}

      {hasRun && companies && companies.length === 0 && (
        <div className="rounded-xl bg-error-container/40 border border-error/20 px-4 py-3 font-label text-sm text-on-error-container mb-4">
          The agent couldn't find solid matches. Either the ICP is too narrow or web search hit a
          dead end. Try going back and broadening the geography or industry.
        </div>
      )}

      {hasRun && companies && companies.length > 0 && (
        <div className="space-y-2 mb-4">
          {companies.map((c, i) => (
            <div
              key={i}
              className="rounded-xl border border-outline/15 bg-surface-container-lowest p-3.5"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="font-headline font-bold text-on-surface text-[14px]">
                  {c.company}
                </div>
                {c.domain && (
                  <a
                    href={c.domain.startsWith("http") ? c.domain : `https://${c.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-label text-[11.5px] text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1"
                  >
                    {c.domain.replace(/^https?:\/\//, "")}
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                )}
              </div>
              <div className="font-label text-[12.5px] text-on-surface-variant leading-snug">
                {c.why_fits}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={onContinue}
          disabled={!hasRun && !validating}
          className="px-5 py-2.5 rounded-xl font-headline font-bold text-sm border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors inline-flex items-center gap-2"
        >
          Looks right — continue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
        {hasRun && (
          <button
            onClick={onRun}
            disabled={validating}
            className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/25 text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Try again
          </button>
        )}
        <button
          onClick={onBackToQuestions}
          className="ml-auto px-3 py-2.5 rounded-xl font-label text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Tighten the ICP
        </button>
      </div>
    </div>
  );
}

/* ─── Commit panel — variations ──────────────────────────────────── */

function CommitPanel({
  variations,
  onAdd,
  onRemove,
  onUpdate,
  onCommit,
  onBack,
  busy,
  scratchpad,
  nichesDetected,
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow p-7 mt-1 animate-fade-up">
      <div className="eyebrow text-on-surface-variant mb-3">Save & start calling</div>
      <div className="font-headline font-extrabold text-on-surface text-xl leading-snug tracking-tight mb-2">
        Create your vertical{variations.length > 1 ? "s" : ""}
      </div>
      <p className="font-label text-sm text-on-surface-variant mb-4 max-w-prose">
        Same buyer, same pain. If you sell to multiple niches, add variations — each one becomes
        its own vertical with its own scripts.
      </p>

      {nichesDetected?.length > 1 && variations.length === 1 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50/40 px-4 py-3 mb-4 font-label text-[12.5px] text-amber-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] mt-px">tips_and_updates</span>
          <div>
            You mentioned multiple niches: <strong>{nichesDetected.join(", ")}</strong>. Click "Add
            variation" to split them into separate verticals.
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {variations.map((v, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-outline/15 bg-surface-container-lowest p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="eyebrow text-on-surface-variant">
                {idx === 0 ? "Primary vertical" : `Variation ${idx + 1}`}
              </div>
              {variations.length > 1 && (
                <button
                  onClick={() => onRemove(idx)}
                  className="text-on-surface-variant hover:text-error w-7 h-7 rounded-full hover:bg-error-container/30 inline-flex items-center justify-center transition-colors"
                  aria-label="Remove variation"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="eyebrow text-on-surface-variant mb-1.5 block">Name</label>
                <input
                  value={v.display_name}
                  onChange={(e) => onUpdate(idx, { display_name: e.target.value })}
                  placeholder="Freight forwarders, mid-market"
                  className="w-full px-3.5 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13.5px]"
                />
              </div>
              {idx > 0 && (
                <div>
                  <label className="eyebrow text-on-surface-variant mb-1.5 block">
                    What's different about this niche?
                  </label>
                  <textarea
                    value={v.niche_override}
                    onChange={(e) => onUpdate(idx, { niche_override: e.target.value })}
                    placeholder="E.g. these are e-commerce 3PLs instead of traditional freight forwarders — same role, different industry context."
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13.5px] resize-y"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={onAdd}
          disabled={variations.length >= 4}
          className="px-3.5 py-2 rounded-lg font-label text-sm font-semibold border border-dashed border-outline/30 text-on-surface-variant hover:text-on-surface hover:border-on-surface/40 transition-colors disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add variation
          <span className="text-[10px] text-on-surface-variant/60">
            ({variations.length}/4)
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-outline/10 flex-wrap">
        <button
          onClick={onBack}
          className="px-3 py-2.5 rounded-xl font-label text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <button
          onClick={onCommit}
          disabled={busy}
          className="metallic-silk gleam-hover text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
        >
          {busy ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              {variations.length === 1
                ? "Save & start calling"
                : `Save ${variations.length} verticals & start calling`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
