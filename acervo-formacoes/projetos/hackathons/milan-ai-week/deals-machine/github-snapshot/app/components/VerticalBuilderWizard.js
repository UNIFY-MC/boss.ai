// VerticalBuilderWizard — Feature D demo moment.
//
// Salesperson describes (1) what they sell, (2) who they sell to,
// (3) geographic focus, (4) company size. The agent reasons through
// ICP → signal sources → expert persona → voice → self-critique, streaming
// each step to activity_log. Operator can then chat-refine the result
// before saving.

"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeActivityForRun } from "@/app/lib/realtime";

const TYPE_EMOJI = {
  agent_step: "▸",
  info: "·",
  error: "❌",
  vertical_built: "🛠️",
};

const TEMPLATES = [
  {
    id: "b2b-saas",
    label: "B2B SaaS",
    what: "Cloud-based SaaS product sold via annual subscription, $20k–$80k ACV.",
    who: "VP of Engineering or CTO at fast-growing SaaS companies (Series B–D) with engineering teams of 30+.",
    countries: ["United States", "United Kingdom"],
    sizes: ["50-200", "200-1000"],
    revenue: ["$10M-$50M", "$50M-$250M"],
  },
  {
    id: "pro-services",
    label: "Professional services",
    what: "Boutique consulting engagement, $50k–$250k project size.",
    who: "Managing Partner or Practice Lead at mid-market law/accounting/consulting firms.",
    countries: ["United States"],
    sizes: ["50-200", "200-1000"],
    revenue: ["$10M-$50M", "$50M-$250M"],
  },
  {
    id: "industrial",
    label: "Industrial / manufacturing",
    what: "Industrial automation hardware + service contract, $100k–$500k deal size.",
    who: "Plant Manager or Director of Operations at mid-market manufacturers.",
    countries: ["United States", "Germany"],
    sizes: ["200-1000", "1000-5000"],
    revenue: ["$50M-$250M", "$250M-$1B"],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    what: "Clinical workflow software for hospitals, $80k–$300k ACV.",
    who: "Chief Medical Information Officer or VP of Clinical Operations at regional health systems.",
    countries: ["United States"],
    sizes: ["1000-5000", "5000+"],
    revenue: ["$250M-$1B", "$1B+"],
  },
  {
    id: "cybersec",
    label: "Cybersecurity",
    what: "Endpoint security platform sold via annual subscription, $50k–$200k ACV.",
    who: "CISO or Director of Security at mid-market companies in regulated industries.",
    countries: ["United States", "United Kingdom"],
    sizes: ["200-1000", "1000-5000"],
    revenue: ["$50M-$250M", "$250M-$1B"],
  },
  {
    id: "custom",
    label: "Start blank",
    what: "",
    who: "",
    countries: [],
    sizes: [],
    revenue: [],
  },
];

const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Nordics",
  "Canada",
  "Australia",
  "Global",
];

const SIZE_OPTIONS = ["1-10", "10-50", "50-200", "200-1000", "1000-5000", "5000+"];

const REVENUE_OPTIONS = [
  "<$1M",
  "$1M-$10M",
  "$10M-$50M",
  "$50M-$250M",
  "$250M-$1B",
  "$1B+",
];

export default function VerticalBuilderWizard({ onClose, onSaved, existingVertical }) {
  // When an existingVertical is passed, we skip the input phase and jump
  // straight into review with the saved config seeded as `preview`. Saving
  // updates the existing row instead of creating a new one.
  const isRefineMode = !!existingVertical;

  // Structured input
  const [whatSold, setWhatSold] = useState("");
  const [whoSoldTo, setWhoSoldTo] = useState("");
  const [countries, setCountries] = useState([]);
  const [companySizes, setCompanySizes] = useState([]);
  const [revenueRanges, setRevenueRanges] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [warningStates, setWarningStates] = useState({}); // warningText → 'applied' | 'dismissed' | 'pending_apply'
  // Persistent record of every consideration the operator has acted on across
  // refinements. Sent to the agent so it doesn't re-raise resolved concerns.
  const [resolvedConsiderations, setResolvedConsiderations] = useState([]); // [{text, action}]

  const [phase, setPhase] = useState(isRefineMode ? "review" : "input");
  const [preview, setPreview] = useState(
    isRefineMode
      ? {
          // Build a `GeneratedVertical`-shaped object from the saved DB row.
          slug: existingVertical.slug,
          display_name: existingVertical.display_name,
          config: existingVertical.config ?? {},
          rationale: existingVertical.config?.rationale ?? "",
          warnings: [],
        }
      : null,
  );
  const [error, setError] = useState(null);
  const [runId, setRunId] = useState(null);
  const [reasoningRows, setReasoningRows] = useState([]);

  // Refinement state
  const [refinementMsg, setRefinementMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // [{role, text}] — legacy, kept for compat but no longer rendered
  const [clarification, setClarification] = useState(null); // string | null — latest agent clarification question
  const [changedFields, setChangedFields] = useState([]); // JSON paths
  const [changesSummary, setChangesSummary] = useState(null);

  const unsubRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => () => {
    if (unsubRef.current) unsubRef.current();
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // Clear diff highlights after a few seconds
  useEffect(() => {
    if (changedFields.length === 0) return;
    const t = setTimeout(() => setChangedFields([]), 6000);
    return () => clearTimeout(t);
  }, [changedFields]);

  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setWhatSold(tpl.what);
    setWhoSoldTo(tpl.who);
    setCountries(tpl.countries);
    setCompanySizes(tpl.sizes);
    setRevenueRanges(tpl.revenue ?? []);
  };

  const toggleChip = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canGenerate =
    whatSold.trim().length >= 8 && whoSoldTo.trim().length >= 8 && countries.length > 0 && companySizes.length > 0;

  const subscribeToRun = (newRunId) => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeActivityForRun(newRunId, (row) => {
      setReasoningRows((prev) => {
        if (prev.some((r) => r.id === row.id)) return prev;
        return [...prev, row];
      });
    });
  };

  // Poll /api/run-status/:id every 2.5s until the run is complete/failed.
  // Resolves with the result_json or rejects with the error message.
  const pollRunStatus = (runId) => {
    return new Promise((resolve, reject) => {
      if (pollRef.current) clearInterval(pollRef.current);
      const started = Date.now();
      pollRef.current = setInterval(async () => {
        // Hard cap at 4 minutes — should never get there
        if (Date.now() - started > 240_000) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          reject(new Error("Generation timed out (4 min)"));
          return;
        }
        try {
          const res = await fetch(`/api/run-status/${runId}?t=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          });
          if (!res.ok) return; // keep polling on transient errors
          const data = await res.json();
          if (data.status === "complete") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            resolve(data.result_json);
          } else if (data.status === "failed") {
            clearInterval(pollRef.current);
            pollRef.current = null;
            reject(new Error(data.error_message || "Generation failed"));
          }
        } catch {
          // network blip — keep polling
        }
      }, 2500);
    });
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("Fill in what you sell, who you sell to, and pick at least one country + company size.");
      return;
    }
    setError(null);
    setReasoningRows([]);

    const newRunId = crypto.randomUUID();
    setRunId(newRunId);
    subscribeToRun(newRunId);

    setPhase("generating");
    try {
      // Kick off async generation — worker returns 202 immediately.
      const res = await fetch("/api/generate-vertical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what_sold: whatSold.trim(),
          who_sold_to: whoSoldTo.trim(),
          countries,
          company_sizes: companySizes,
          revenue_ranges: revenueRanges,
          run_id: newRunId,
          save: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).message || text; } catch {}
        throw new Error(msg || "generation failed");
      }
      // Poll until result_json appears
      const result = await pollRunStatus(newRunId);
      if (!result || !result.generated) {
        throw new Error("Generation finished but returned no result");
      }
      setPreview(result.generated);
      setChatHistory([]);
      setPhase("review");
    } catch (err) {
      console.error("[VerticalBuilder] generate failed:", err);
      setError(err.message);
      setPhase("input");
    }
  };

  const handleRefine = async (overrideMsg) => {
    const msg = ((typeof overrideMsg === "string" ? overrideMsg : refinementMsg) || "").trim();
    if (msg.length < 2 || !preview) return;
    setError(null);
    setClarification(null); // user is acting; clear any stale clarification
    setChatHistory((h) => [...h, { role: "user", text: msg }]);
    if (typeof overrideMsg !== "string") setRefinementMsg("");
    setPhase("refining");

    // New run for streaming the refinement reasoning
    const newRunId = crypto.randomUUID();
    setRunId(newRunId);
    setReasoningRows([]);
    subscribeToRun(newRunId);

    try {
      const res = await fetch("/api/refine-vertical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previous_config: preview,
          refinement_message: msg,
          resolved_considerations: resolvedConsiderations,
          run_id: newRunId,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let m = text;
        try { m = JSON.parse(text).message || text; } catch {}
        throw new Error(m || "refinement failed");
      }
      const data = await pollRunStatus(newRunId);
      if (!data?.refinement) throw new Error("Refinement finished but returned no result");
      const r = data.refinement;

      if (r.kind === "clarification") {
        setClarification(r.clarification_question);
        setChatHistory((h) => [...h, { role: "agent", text: r.clarification_question }]);
        setPhase("review");
        return;
      }
      if (r.kind === "updated") {
        setPreview(r.generated);
        setChangedFields(r.changed_fields ?? []);
        setChangesSummary(r.changes_summary ?? null);
        // Note: we intentionally do NOT clear warningStates here. The new
        // warnings list will have different keys (different text) so the map
        // is naturally scoped to the current preview, while resolved
        // considerations carry forward via the resolvedConsiderations array
        // sent to the agent on the next refinement.
        setChatHistory((h) => [
          ...h,
          { role: "agent", text: r.changes_summary ?? "Updated." },
        ]);
        setPhase("review");
        return;
      }
      throw new Error("Unexpected refinement response shape");
    } catch (err) {
      console.error("[VerticalBuilder] refine failed:", err);
      setError(err.message);
      setPhase("review");
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setPhase("saving");
    try {
      const res = await fetch("/api/save-vertical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated: preview,
          ...(isRefineMode ? { update_id: existingVertical.id } : {}),
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: text }; }
      if (!res.ok || !data?.saved) {
        throw new Error(data?.message ?? "save failed");
      }
      setPhase("done");
      onSaved?.(data.saved);
    } catch (err) {
      console.error("[VerticalBuilder] save failed:", err);
      setError(err.message);
      setPhase("review");
    }
  };

  const isChanged = (path) => changedFields.some((p) => p === path || p.startsWith(path + "."));

  // Apply just MARKS the consideration as "pending_apply" — the agent isn't
  // called until the user hits "Apply N selected" so they can queue multiple
  // changes and resolve them in a single refinement.
  const handleQueueConsideration = (text) => {
    setWarningStates((s) => {
      const cur = s[text];
      if (cur === "applied") return s; // already applied, can't change
      // toggle: pending_apply → none, otherwise → pending_apply
      const next = { ...s };
      if (cur === "pending_apply") delete next[text];
      else next[text] = "pending_apply";
      return next;
    });
  };

  const handleDismissConsideration = (text) => {
    setWarningStates((s) => {
      const cur = s[text];
      if (cur === "applied") return s;
      const next = { ...s };
      if (cur === "dismissed") delete next[text];
      else next[text] = "dismissed";
      return next;
    });
    setResolvedConsiderations((prev) => {
      const without = prev.filter((r) => r.text !== text);
      // Toggle off if already dismissed in history
      const wasDismissed = prev.some((r) => r.text === text && r.action === "dismissed");
      return wasDismissed ? without : [...without, { text, action: "dismissed" }];
    });
  };

  // Fires ONE refinement covering every consideration the user queued.
  const handleApplySelected = async () => {
    if (!preview) return;
    const pending = Object.entries(warningStates)
      .filter(([, state]) => state === "pending_apply")
      .map(([text]) => text);
    if (pending.length === 0) return;

    const bullets = pending.map((t, i) => `${i + 1}. ${t}`).join("\n");
    const msg = `Please apply the following ${pending.length} ${pending.length === 1 ? "consideration" : "considerations"} I flagged:\n\n${bullets}\n\nResolve all of them together in this single update. Keep everything else unchanged.`;

    // Optimistically flip the queued ones to "applied" so the UI updates
    // immediately. If the refinement fails, the catch handler in handleRefine
    // will leave them flipped (which is fine — user can re-queue them).
    setWarningStates((s) => {
      const next = { ...s };
      for (const t of pending) if (next[t] === "pending_apply") next[t] = "applied";
      return next;
    });
    // Persist to the cross-refinement history
    setResolvedConsiderations((prev) => {
      const seen = new Set(prev.map((r) => r.text));
      const additions = pending
        .filter((t) => !seen.has(t))
        .map((text) => ({ text, action: "applied" }));
      return [...prev, ...additions];
    });

    await handleRefine(msg);
  };

  const isReview = phase === "review" && preview;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={isReview ? modalReview : modal} onClick={(e) => e.stopPropagation()}>
        <div style={isReview ? headerReview : header}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0a0a0a" }}>Build a new vertical</h2>
          <button onClick={onClose} style={closeBtn} aria-label="close">✕</button>
        </div>

        {phase === "input" && (
          <>
            <p style={lede}>
              Describe your sales target. The agent reasons through ICP, signal sources, expert framing, and voice —
              then you can refine it in plain English before saving.
            </p>

            <div style={{ marginTop: 14 }}>
              <div style={fieldLabel}>Start from a template (optional)</div>
              <div style={chipRow}>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={selectedTemplate === tpl.id ? chipSelected : chip}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={fieldLabel}>What do you sell?</div>
              <textarea
                style={textarea}
                value={whatSold}
                onChange={(e) => setWhatSold(e.target.value)}
                placeholder="e.g. Endpoint cybersecurity software, sold annual subscription, $50k–$200k ACV. Includes 24/7 SOC."
                rows={3}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={fieldLabel}>Who do you sell to?</div>
              <div style={hint}>Be specific with titles and seniority — the agent uses this to source leads.</div>
              <textarea
                style={textarea}
                value={whoSoldTo}
                onChange={(e) => setWhoSoldTo(e.target.value)}
                placeholder="e.g. CISO or Director of Security at mid-market healthcare or financial-services companies in the US."
                rows={3}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={fieldLabel}>Geographic focus</div>
              <div style={chipRow}>
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleChip(countries, setCountries, c)}
                    style={countries.includes(c) ? chipSelected : chip}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={fieldLabel}>Company size (employees)</div>
              <div style={chipRow}>
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleChip(companySizes, setCompanySizes, s)}
                    style={companySizes.includes(s) ? chipSelected : chip}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={fieldLabel}>Annual revenue (optional)</div>
              <div style={hint}>Helps the agent infer titles + seniority correctly. Skip if unsure.</div>
              <div style={chipRow}>
                {REVENUE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleChip(revenueRanges, setRevenueRanges, r)}
                    style={revenueRanges.includes(r) ? chipSelected : chip}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={errorBox}>⚠ {error}</div>}
            <div style={footer}>
              <button onClick={onClose} style={ghostBtn}>Cancel</button>
              <button onClick={handleGenerate} style={primaryBtn} className="vbw-primary-btn" disabled={!canGenerate}>
                Generate vertical →
              </button>
            </div>
          </>
        )}

        {(phase === "generating" || phase === "refining") && (
          <LiveStatus phase={phase} rows={reasoningRows} />
        )}

        {phase === "review" && preview && (
          <ReviewLayout
            preview={preview}
            changesSummary={changesSummary}
            isChanged={isChanged}
            clarification={clarification}
            refinementMsg={refinementMsg}
            setRefinementMsg={setRefinementMsg}
            handleRefine={handleRefine}
            handleSave={handleSave}
            onBack={isRefineMode ? null : () => setPhase("input")}
            error={error}
            warningStates={warningStates}
            onQueueConsideration={handleQueueConsideration}
            onDismissConsideration={handleDismissConsideration}
            onApplySelected={handleApplySelected}
          />
        )}

        {phase === "saving" && (
          <div style={generatingWrap}>
            <div style={spinner} />
            <div style={{ marginTop: 12, color: "#222" }}>Saving "{preview?.display_name}"…</div>
          </div>
        )}

        {phase === "done" && (
          <div style={generatingWrap}>
            <div style={{ fontSize: 36 }}>✓</div>
            <div style={{ marginTop: 8, color: "#0a0a0a", fontWeight: 600 }}>
              Vertical "{preview?.display_name}" created.
            </div>
            <button onClick={onClose} style={{ ...primaryBtn, marginTop: 14 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlighted }) {
  return (
    <div style={{ ...rowStyle, ...(highlighted ? highlightRow : null) }}>
      <div style={rowLabel}>{label}</div>
      <div style={rowValue}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// LiveStatus — single-line animated ticker showing the current
// reasoning step. Replaces the old terminal-style log panel.
// ──────────────────────────────────────────────────────────
function LiveStatus({ phase, rows }) {
  // Find the most recent "Step X/Y" header and detail line.
  let currentStep = 0;
  let totalSteps = 5;
  for (const r of rows) {
    const m = r.message?.match(/Step\s+(\d+)\s*\/\s*(\d+)/i);
    if (m) {
      currentStep = parseInt(m[1], 10);
      totalSteps = parseInt(m[2], 10);
    }
  }
  const latest = rows[rows.length - 1];

  const title =
    phase === "generating" ? "The agent is thinking through your vertical" : "Refining based on your note";
  const subtitle =
    phase === "generating"
      ? "ICP → signal sources → expert persona → voice → self-critique"
      : "Updating only what you asked to change";

  return (
    <div style={liveWrap}>
      <div style={liveHeader}>
        <div style={spinner} />
        <div>
          <div style={liveTitle}>{title}</div>
          <div style={liveSubtitle}>{subtitle}</div>
        </div>
      </div>

      <div style={liveStatusCard}>
        <div style={liveProgressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const n = i + 1;
            const done = n < currentStep;
            const active = n === currentStep;
            return (
              <span
                key={i}
                style={done ? dotDone : active ? dotActive : dotPending}
              />
            );
          })}
          <span style={liveProgressText}>
            {currentStep > 0 ? `Step ${currentStep} of ${totalSteps}` : "Starting up…"}
          </span>
        </div>
        <div style={liveMessageContainer}>
          {latest ? (
            <div key={latest.id} style={liveMessage}>
              {latest.message}
            </div>
          ) : (
            <div style={liveMessageWaiting}>Waiting for the agent…</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ReviewLayout — three-zone layout: header card (fixed) →
// scrollable body with accordion → sticky chat + actions footer.
// ──────────────────────────────────────────────────────────
function ReviewLayout({
  preview,
  changesSummary,
  isChanged,
  clarification,
  refinementMsg,
  setRefinementMsg,
  handleRefine,
  handleSave,
  onBack,
  error,
  warningStates,
  onQueueConsideration,
  onDismissConsideration,
  onApplySelected,
}) {
  const cfg = preview.config ?? {};
  const titles = cfg.icp?.titles ?? [];
  const industries = cfg.icp?.industries ?? [];
  const countries = cfg.icp?.countries ?? [];
  const sources = cfg.signal_source?.sources ?? [];
  const warnings = preview.warnings ?? [];
  const persona = cfg.chain_builder_persona ?? "";

  const [openSection, setOpenSection] = useState("icp"); // accordion: only one open at a time
  const [showRationale, setShowRationale] = useState(false);
  const [showPersona, setShowPersona] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState({});

  const toggleSection = (id) => setOpenSection((cur) => (cur === id ? null : id));
  const toggleWarning = (i) =>
    setExpandedWarnings((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <>
      {/* ─── Scrollable body ──────────────────────────────── */}
      <div style={reviewScroll}>
        {/* Header card */}
        <div style={summaryCard}>
          <div style={summaryName}>{preview.display_name}</div>
          <div style={summaryStats}>
            <Stat n={titles.length} label="titles" />
            <Stat n={countries.length} label="countries" />
            <Stat n={sources.length} label="signal sources" />
            {warnings.length > 0 && (
              <Stat n={warnings.length} label="considerations" warn />
            )}
          </div>
          {preview.short_summary && (
            <div style={summaryLine}>{preview.short_summary}</div>
          )}
          <button
            type="button"
            onClick={() => setShowRationale((s) => !s)}
            style={inlineToggle}
          >
            {showRationale ? "Hide" : "Show"} full reasoning {showRationale ? "▴" : "▾"}
          </button>
          {showRationale && (
            <div style={rationaleQuiet}>{preview.rationale}</div>
          )}
          {changesSummary && (
            <div style={changesInline}>
              <strong>What changed:</strong> {changesSummary}
            </div>
          )}
        </div>

        {/* ICP accordion */}
        <Accordion
          id="icp"
          title="ICP"
          subtitle={`${titles.length} titles · ${countries.length} ${countries.length === 1 ? "country" : "countries"} · size ${cfg.icp?.company_size_range?.[0] ?? "?"}–${cfg.icp?.company_size_range?.[1] ?? "?"}`}
          open={openSection === "icp"}
          onToggle={toggleSection}
          highlighted={isChanged("config.icp")}
        >
          <FieldGroup label="Titles" highlighted={isChanged("config.icp.titles")}>
            <ChipList items={titles} max={6} />
          </FieldGroup>
          <FieldGroup label="Company size" highlighted={isChanged("config.icp.company_size_range")}>
            <span style={plainValue}>
              {cfg.icp?.company_size_range?.[0] ?? "?"}–{cfg.icp?.company_size_range?.[1] ?? "?"} employees
            </span>
          </FieldGroup>
          <FieldGroup label="Countries" highlighted={isChanged("config.icp.countries")}>
            <ChipList items={countries} max={8} />
          </FieldGroup>
          {industries.length > 0 && (
            <FieldGroup label="Industries" highlighted={isChanged("config.icp.industries")}>
              <ChipList items={industries} max={6} />
            </FieldGroup>
          )}
        </Accordion>

        {/* Signal sources accordion */}
        <Accordion
          id="signals"
          title="Signal sources"
          subtitle={`${sources.length} ${sources.length === 1 ? "source" : "sources"}`}
          open={openSection === "signals"}
          onToggle={toggleSection}
          highlighted={isChanged("config.signal_source")}
        >
          <div style={sourceList}>
            {sources.map((s, i) => (
              <SourcePill key={i} source={s} />
            ))}
          </div>
          <FieldGroup
            label="Relevance filter"
            highlighted={isChanged("config.signal_source.relevance_prompt")}
            stack
          >
            <div style={relevancePrompt}>{cfg.signal_source?.relevance_prompt ?? ""}</div>
          </FieldGroup>
        </Accordion>

        {/* Voice + Persona merged */}
        <Accordion
          id="voice"
          title="Voice & persona"
          subtitle={cfg.script_voice?.tone ? truncate(cfg.script_voice.tone, 60) : "—"}
          open={openSection === "voice"}
          onToggle={toggleSection}
          highlighted={isChanged("config.script_voice") || isChanged("config.chain_builder_persona")}
        >
          <FieldGroup label="Tone" highlighted={isChanged("config.script_voice.tone")} stack>
            <div style={plainValue}>{cfg.script_voice?.tone ?? "—"}</div>
          </FieldGroup>
          {(cfg.script_voice?.anchor_phrases?.length ?? 0) > 0 && (
            <FieldGroup
              label="Anchor phrases"
              highlighted={isChanged("config.script_voice.anchor_phrases")}
            >
              <ChipList items={cfg.script_voice.anchor_phrases} max={4} variant="quote" />
            </FieldGroup>
          )}
          {(cfg.script_voice?.forbidden_phrases?.length ?? 0) > 0 && (
            <FieldGroup
              label="Never say"
              highlighted={isChanged("config.script_voice.forbidden_phrases")}
            >
              <ChipList items={cfg.script_voice.forbidden_phrases} max={6} variant="forbidden" />
            </FieldGroup>
          )}
          <FieldGroup
            label="Pricing policy"
            highlighted={isChanged("config.script_voice.pricing_policy")}
          >
            <span style={pricingBadge}>{cfg.script_voice?.pricing_policy ?? "on_request"}</span>
          </FieldGroup>

          <div style={personaWrap}>
            <div style={fieldSubLabel}>Chain-builder persona</div>
            <div style={personaPreview}>
              {showPersona ? persona : firstSentence(persona)}
            </div>
            {persona.length > firstSentence(persona).length && (
              <button
                type="button"
                onClick={() => setShowPersona((s) => !s)}
                style={inlineToggleSm}
              >
                {showPersona ? "Show less" : "Read full persona"} {showPersona ? "▴" : "▾"}
              </button>
            )}
          </div>
        </Accordion>

        {/* Considerations */}
        {warnings.length > 0 && (() => {
          const queuedCount = warnings.filter((w) => warningStates?.[w] === "pending_apply").length;
          const dismissedCount = warnings.filter((w) => warningStates?.[w] === "dismissed").length;
          const appliedCount = warnings.filter((w) => warningStates?.[w] === "applied").length;
          const openCount = warnings.length - queuedCount - dismissedCount - appliedCount;
          const subtitleParts = [];
          if (openCount > 0) subtitleParts.push(`${openCount} open`);
          if (queuedCount > 0) subtitleParts.push(`${queuedCount} queued`);
          if (appliedCount > 0) subtitleParts.push(`${appliedCount} applied`);
          if (dismissedCount > 0) subtitleParts.push(`${dismissedCount} dismissed`);
          return (
            <Accordion
              id="considerations"
              title="Considerations from the agent"
              subtitle={subtitleParts.join(" · ") || `${warnings.length} flagged`}
              open={openSection === "considerations"}
              onToggle={toggleSection}
              badge
            >
              {queuedCount > 0 && (
                <div style={considerationsToolbar}>
                  <span style={considerationsToolbarText}>
                    {queuedCount} {queuedCount === 1 ? "consideration" : "considerations"} ready to apply
                  </span>
                  <button
                    type="button"
                    onClick={onApplySelected}
                    style={considerationsApplyAllBtn}
                  >
                    Apply {queuedCount} selected →
                  </button>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {warnings.map((w, i) => (
                  <ConsiderationCard
                    key={i}
                    text={w}
                    expanded={!!expandedWarnings[i]}
                    onToggle={() => toggleWarning(i)}
                    state={warningStates?.[w]}
                    onQueue={() => onQueueConsideration?.(w)}
                    onDismiss={() => onDismissConsideration?.(w)}
                  />
                ))}
              </div>
            </Accordion>
          );
        })()}

        {error && <div style={errorBox}>⚠ {error}</div>}
      </div>

      {/* ─── Sticky bottom: chat + actions ───────────────── */}
      <div style={stickyDock}>
        {clarification && (
          <div style={clarificationBanner}>
            <span style={clarificationIcon}>?</span>
            <span><strong>The agent needs clarification:</strong> {clarification}</span>
          </div>
        )}
        <div style={chatRow}>
          <input
            style={chatInput}
            value={refinementMsg}
            onChange={(e) => setRefinementMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && refinementMsg.trim().length >= 2) handleRefine();
            }}
            placeholder="Refine in plain English — e.g. tighten size to 200-500, drop 'compliance officer'…"
          />
          <button
            onClick={handleRefine}
            style={ghostBtn}
            disabled={refinementMsg.trim().length < 2}
          >
            Refine
          </button>
        </div>
        <div style={actionRow}>
          {onBack ? (
            <button onClick={onBack} style={ghostBtnSm}>← Edit input</button>
          ) : (
            <span />
          )}
          <button onClick={handleSave} style={primaryBtn} className="vbw-primary-btn">Save vertical →</button>
        </div>
      </div>
    </>
  );
}

function Stat({ n, label, warn }) {
  return (
    <div style={warn ? statChipWarn : statChip}>
      <span style={statNum}>{n}</span>
      <span style={statLbl}>{label}</span>
    </div>
  );
}

function Accordion({ id, title, subtitle, open, onToggle, highlighted, badge, children }) {
  return (
    <div style={{ ...accordionWrap, ...(highlighted ? highlightWrap : null) }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        style={accordionHeader}
        className="vbw-accordion-header"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={accordionTitle}>{title}</span>
          {subtitle && <span style={accordionSubtitle}>· {subtitle}</span>}
          {badge && <span style={considerationBadge}>{subtitle?.split(" ")[0]}</span>}
        </span>
        <span style={{ fontSize: 12, color: "#444" }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && <div style={accordionBody}>{children}</div>}
    </div>
  );
}

function FieldGroup({ label, highlighted, stack, children }) {
  return (
    <div style={{ ...fieldGroup, ...(stack ? { flexDirection: "column", alignItems: "flex-start" } : null), ...(highlighted ? highlightRow : null) }}>
      <div style={fieldGroupLabel}>{label}</div>
      <div style={{ flex: 1, marginTop: stack ? 4 : 0 }}>{children}</div>
    </div>
  );
}

function ChipList({ items, max = 5, variant }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, max);
  const remaining = items.length - max;
  const baseStyle =
    variant === "quote" ? chipQuote : variant === "forbidden" ? chipForbidden : chipNeutral;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {visible.map((v, i) => (
        <span key={i} style={baseStyle}>
          {variant === "quote" ? `"${v}"` : v}
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button type="button" onClick={() => setExpanded(true)} style={chipMore}>
          +{remaining} more
        </button>
      )}
    </div>
  );
}

function SourcePill({ source }) {
  if (!source) return null;
  const name = source.name ?? "Source";
  // hide internal env var details; show a friendly summary instead
  const hasApi = !!source.api_key_env;
  const query =
    source.filters?.q ??
    (Array.isArray(source.filters?.categories) ? source.filters.categories.join(", ") : null);
  const url = source.url;
  let domain = "";
  if (url) {
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  }
  return (
    <div style={sourcePill}>
      <div style={sourcePillTop}>
        <span style={sourcePillName}>{name}</span>
        {hasApi && <span style={sourcePillBadge}>API</span>}
        {!hasApi && domain && <span style={sourcePillDomain}>{domain}</span>}
      </div>
      {query && <div style={sourcePillQuery}>"{query}"</div>}
    </div>
  );
}

function ConsiderationCard({ text, expanded, onToggle, state, onQueue, onDismiss }) {
  // Parse "HEADLINE: body…" pattern; fall back to whole text as headline if no colon.
  const colonIdx = text.indexOf(":");
  let headline, body;
  if (colonIdx > -1 && colonIdx < 80) {
    headline = text.slice(0, colonIdx).trim();
    body = text.slice(colonIdx + 1).trim();
  } else {
    headline = text.length > 80 ? text.slice(0, 80) + "…" : text;
    body = text.length > 80 ? text : "";
  }

  const queued = state === "pending_apply";
  const applied = state === "applied";
  const dismissed = state === "dismissed";

  const caretColor =
    applied ? "#1b5e3c" : dismissed ? "#666" : queued ? "#1f1612" : "#5a4f3d";

  return (
    <div style={considerationCard(expanded, state)}>
      <div
        onClick={onToggle}
        style={{ ...considerationHead, cursor: "pointer" }}
        role="button"
      >
        <span style={{ fontSize: 11, color: caretColor }}>{expanded ? "▴" : "▾"}</span>
        <span style={considerationHeadline}>{headline}</span>
        {applied && <span style={considerationStateApplied}>✓ Applied</span>}
        {queued && <span style={considerationStateQueued}>● Queued to apply</span>}
        {dismissed && <span style={considerationStateDismissed}>Dismissed</span>}
      </div>
      {expanded && body && <div style={considerationBody}>{body}</div>}
      {!applied && (
        <div style={considerationActions}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQueue?.(); }}
            style={queued ? considerationApplyBtnActive : considerationApplyBtn}
          >
            {queued ? "✓ Selected" : "✓ Apply"}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
            style={dismissed ? considerationDismissBtnActive : considerationDismissBtn}
          >
            {dismissed ? "↩ Undo dismiss" : "✕ Dismiss"}
          </button>
        </div>
      )}
    </div>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

function firstSentence(s) {
  if (!s) return "";
  const match = s.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : s.slice(0, 140).trim() + (s.length > 140 ? "…" : "");
}

// ────────── styles ──────────
const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(10, 10, 14, 0.55)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};
const modal = {
  background: "#fff",
  borderRadius: 12,
  width: "min(720px, 92vw)",
  maxHeight: "92vh",
  overflowY: "auto",
  padding: 24,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  color: "#0a0a0a",
};
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 };
const closeBtn = { border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#333" };
const lede = { color: "#222", lineHeight: 1.55, fontSize: 14 };
const fieldLabel = { fontSize: 12, fontWeight: 700, color: "#0a0a0a", textTransform: "uppercase", letterSpacing: 0.8 };
const hint = { fontSize: 12, color: "#444", marginTop: 2, marginBottom: 4 };
const textarea = {
  width: "100%",
  padding: 12,
  border: "1px solid #b4b4b8",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  marginTop: 6,
  color: "#0a0a0a",
  boxSizing: "border-box",
};
const chipRow = { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 };
const chip = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #b4b4b8",
  background: "#fff",
  color: "#222",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
};
const chipSelected = {
  ...chip,
  background: "#1f1612",
  color: "#fff",
  borderColor: "#1f1612",
  fontWeight: 600,
};
const footer = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };
const ghostBtn = {
  padding: "10px 14px",
  background: "transparent",
  border: "1px solid #b4b4b8",
  borderRadius: 8,
  cursor: "pointer",
  color: "#0a0a0a",
};
const primaryBtn = {
  padding: "10px 18px",
  background: "linear-gradient(180deg, #3a2c1f 0%, #1f1612 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 2px 4px rgba(31, 22, 18, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
  transition: "transform 80ms ease, box-shadow 120ms ease",
};
const generatingWrap = { textAlign: "center", padding: "32px 12px", color: "#222" };
const generatingHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 4px 14px",
};
const streamingPanel = {
  background: "#0f0f12",
  color: "#dadada",
  borderRadius: 8,
  border: "1px solid #232328",
  padding: "10px 14px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12.5,
  maxHeight: 280,
  overflowY: "auto",
  marginTop: 4,
};
const streamRow = (type) => ({
  padding: "3px 4px",
  borderLeft: type === "error" ? "2px solid #c84a4a" : "2px solid transparent",
  paddingLeft: 10,
  lineHeight: 1.5,
});
const streamEmoji = { marginRight: 6 };

const spinner = {
  display: "inline-block",
  width: 28,
  height: 28,
  border: "3px solid #d4d4d8",
  borderTop: "3px solid #1f1612",
  borderRadius: "50%",
  animation: "vbw-spin 0.8s linear infinite",
};
const rationaleBox = {
  padding: 14,
  background: "#e9d49a",
  borderRadius: 8,
  marginBottom: 6,
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "#1f1c0a",
  fontWeight: 500,
};
const changesBox = {
  padding: 10,
  background: "#fff7d6",
  border: "1px solid #f0d04a",
  borderRadius: 6,
  marginTop: 10,
  fontSize: 13,
  color: "#3a2c00",
};
const sectionTitle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "#333",
  fontWeight: 700,
};
const rowStyle = {
  display: "flex",
  gap: 12,
  padding: "6px 0",
  borderBottom: "1px solid #e4e4e7",
  fontSize: 13,
};
const rowLabel = { minWidth: 130, color: "#333", fontWeight: 500 };
const rowValue = { flex: 1, color: "#0a0a0a" };
const highlightWrap = {
  paddingLeft: 10,
  borderLeft: "3px solid #e9d49a",
  background: "rgba(251, 255, 132, 0.18)",
  borderRadius: 4,
  transition: "all 300ms ease-out",
};
const highlightRow = {
  background: "rgba(251, 255, 132, 0.25)",
  borderLeft: "3px solid #f0d04a",
  paddingLeft: 8,
};
const chatBox = {
  marginTop: 8,
  padding: 10,
  background: "#f7f7f8",
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  fontSize: 13,
  maxHeight: 200,
  overflowY: "auto",
};
const chatUser = { padding: "4px 0", color: "#0a0a0a" };
const chatAgent = { padding: "4px 0", color: "#1f1612" };
const chatInput = {
  flex: 1,
  padding: "10px 12px",
  border: "1px solid #b4b4b8",
  borderRadius: 8,
  fontSize: 13,
  color: "#0a0a0a",
  fontFamily: "inherit",
  outline: "none",
};
const errorBox = {
  padding: 10,
  background: "#fee",
  border: "1px solid #fcc",
  borderRadius: 6,
  marginTop: 10,
  fontSize: 13,
  color: "#b00",
};
const warningBox = {
  padding: 10,
  background: "#fff8e1",
  border: "1px solid #ffc02d",
  borderRadius: 6,
  marginTop: 14,
  fontSize: 13,
  color: "#5b3f00",
};

// ────────── Review-phase styles ──────────
const modalReview = {
  background: "#fff",
  borderRadius: 16,
  width: "min(780px, 94vw)",
  height: "min(880px, 92vh)",
  display: "flex",
  flexDirection: "column",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: 14,
  color: "#0a0a0a",
  overflow: "hidden",
  boxShadow: "0 30px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
};
const headerReview = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px 14px",
  borderBottom: "1px solid #ececef",
  flexShrink: 0,
  background: "linear-gradient(180deg, #fafafb 0%, #fff 100%)",
};
const reviewScroll = {
  flex: 1,
  overflowY: "auto",
  padding: "18px 22px 8px",
};
const stickyDock = {
  borderTop: "1px solid #ececef",
  padding: "12px 22px 14px",
  background: "#fafafb",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const summaryCard = {
  padding: "16px 18px",
  background: "linear-gradient(135deg, #fdfdfe 0%, #f7f8fb 100%)",
  border: "1px solid #e4e4e7",
  borderLeft: "4px solid #1f1612",
  borderRadius: 10,
  marginBottom: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
};
const summaryName = {
  fontSize: 19,
  fontWeight: 700,
  color: "#0a0a0a",
  marginBottom: 10,
  letterSpacing: -0.3,
};
const summaryStats = { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 };
const statChip = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
  padding: "4px 10px",
  background: "#fff",
  border: "1px solid #e4e4e7",
  borderRadius: 999,
  fontSize: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
};
const statChipWarn = {
  ...statChip,
  background: "#fff4d6",
  borderColor: "#f0d04a",
  color: "#5b3f00",
};
const statNum = { fontWeight: 700, color: "#1f1612", fontSize: 13 };
const statLbl = { color: "#555", fontSize: 11.5, fontWeight: 500 };
const summaryLine = { fontSize: 13.5, lineHeight: 1.5, color: "#222", marginBottom: 6 };
const inlineToggle = {
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: 12,
  color: "#1f1612",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 4,
};
const inlineToggleSm = {
  ...inlineToggle,
  fontSize: 11.5,
  marginTop: 6,
};
const rationaleQuiet = {
  marginTop: 8,
  padding: "10px 12px",
  background: "#f7f7f8",
  borderRadius: 6,
  fontSize: 13,
  lineHeight: 1.55,
  color: "#333",
};
const changesInline = {
  marginTop: 10,
  padding: "8px 10px",
  background: "#fff7d6",
  border: "1px solid #f0d04a",
  borderRadius: 6,
  fontSize: 12.5,
  color: "#3a2c00",
};

const accordionWrap = {
  border: "1px solid #e4e4e7",
  borderRadius: 10,
  marginBottom: 8,
  background: "#fff",
  overflow: "hidden",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};
const accordionHeader = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  transition: "background-color 120ms ease",
};
const accordionTitle = { fontSize: 14, fontWeight: 600, color: "#0a0a0a", letterSpacing: -0.1 };
const accordionSubtitle = { fontSize: 12, color: "#666", fontWeight: 400 };
const accordionBody = {
  padding: "8px 16px 16px",
  borderTop: "1px solid #f1f1f4",
  animation: "vbw-fade 200ms ease-out",
};
const considerationBadge = {
  display: "none", // hidden when subtitle already shows count
};

const fieldGroup = {
  display: "flex",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #f1f1f4",
  fontSize: 13,
  alignItems: "center",
};
const fieldGroupLabel = {
  minWidth: 110,
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "#555",
  fontWeight: 600,
};
const fieldSubLabel = {
  fontSize: 11.5,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "#555",
  fontWeight: 600,
  marginBottom: 4,
};
const plainValue = { color: "#0a0a0a", fontSize: 13 };

const chipNeutral = {
  display: "inline-block",
  padding: "3px 9px",
  background: "#f1f1f4",
  borderRadius: 6,
  fontSize: 12,
  color: "#222",
};
const chipQuote = {
  ...chipNeutral,
  background: "#eef3ff",
  color: "#1f1612",
  fontStyle: "italic",
};
const chipForbidden = {
  ...chipNeutral,
  background: "#fdecec",
  color: "#a02020",
  textDecoration: "line-through",
};
const chipMore = {
  display: "inline-block",
  padding: "3px 9px",
  background: "transparent",
  border: "1px dashed #b4b4b8",
  borderRadius: 6,
  fontSize: 11.5,
  color: "#555",
  cursor: "pointer",
  fontFamily: "inherit",
};

const sourceList = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 };
const sourcePill = {
  padding: "8px 10px",
  background: "#f7f7f8",
  border: "1px solid #ececef",
  borderRadius: 6,
};
const sourcePillTop = { display: "flex", alignItems: "center", gap: 8 };
const sourcePillName = { fontSize: 13, fontWeight: 600, color: "#0a0a0a" };
const sourcePillBadge = {
  fontSize: 10,
  padding: "1px 6px",
  background: "#1f1612",
  color: "#fff",
  borderRadius: 999,
  fontWeight: 600,
  letterSpacing: 0.5,
};
const sourcePillDomain = { fontSize: 11.5, color: "#555", fontFamily: "ui-monospace, monospace" };
const sourcePillQuery = { marginTop: 3, fontSize: 11.5, color: "#444", fontStyle: "italic" };
const relevancePrompt = {
  marginTop: 4,
  padding: "8px 10px",
  background: "#f7f7f8",
  borderRadius: 6,
  fontSize: 12.5,
  color: "#333",
  lineHeight: 1.5,
  fontStyle: "italic",
};

const personaWrap = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid #f1f1f4",
};
const personaPreview = {
  fontSize: 13,
  color: "#222",
  lineHeight: 1.55,
  background: "#f7f7f8",
  padding: "10px 12px",
  borderRadius: 6,
};
const pricingBadge = {
  display: "inline-block",
  padding: "2px 9px",
  background: "#f1f1f4",
  borderRadius: 6,
  fontSize: 12,
  color: "#0a0a0a",
  fontFamily: "ui-monospace, monospace",
};

const considerationCard = (expanded, state) => {
  if (state === "applied") {
    return {
      width: "100%",
      textAlign: "left",
      background: "#e7f5ec",
      border: "1px solid #b9dec8",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "inherit",
      fontSize: 12.5,
      opacity: 0.95,
    };
  }
  if (state === "pending_apply") {
    return {
      width: "100%",
      textAlign: "left",
      background: "#eef3ff",
      border: "1px solid #1f1612",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "inherit",
      fontSize: 12.5,
    };
  }
  if (state === "dismissed") {
    return {
      width: "100%",
      textAlign: "left",
      background: "#f4f4f5",
      border: "1px solid #e4e4e7",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "inherit",
      fontSize: 12.5,
      opacity: 0.6,
    };
  }
  return {
    width: "100%",
    textAlign: "left",
    background: expanded ? "#fff7d6" : "#fffbed",
    border: "1px solid #f0d04a",
    borderRadius: 6,
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 12.5,
  };
};
const considerationHead = { display: "flex", alignItems: "flex-start", gap: 6 };
const considerationHeadline = { fontWeight: 700, color: "#3a2c00", flex: 1 };
const considerationBody = {
  marginTop: 6,
  paddingTop: 6,
  borderTop: "1px solid #f0d04a",
  color: "#3a2c00",
  lineHeight: 1.5,
  fontWeight: 400,
};
const considerationActions = {
  display: "flex",
  gap: 6,
  marginTop: 8,
  paddingTop: 6,
  borderTop: "1px dashed #e4d28a",
};
const considerationApplyBtn = {
  padding: "5px 12px",
  background: "#1f1612",
  color: "#fff",
  border: "none",
  borderRadius: 5,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const considerationDismissBtn = {
  padding: "5px 12px",
  background: "transparent",
  color: "#555",
  border: "1px solid #d4d4d8",
  borderRadius: 5,
  fontSize: 11.5,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};
const considerationStateApplied = {
  fontSize: 11,
  color: "#1b5e3c",
  fontWeight: 700,
  padding: "2px 7px",
  background: "#d4ead9",
  borderRadius: 999,
};
const considerationStateQueued = {
  fontSize: 11,
  color: "#1f1612",
  fontWeight: 700,
  padding: "2px 7px",
  background: "#dde6ff",
  borderRadius: 999,
};
const considerationStateDismissed = {
  fontSize: 11,
  color: "#777",
  fontWeight: 600,
  padding: "2px 7px",
  background: "#e4e4e7",
  borderRadius: 999,
};
const considerationApplyBtnActive = {
  padding: "5px 12px",
  background: "#1f1612",
  color: "#fff",
  border: "1px solid #1f1612",
  borderRadius: 5,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
const considerationDismissBtnActive = {
  padding: "5px 12px",
  background: "#555",
  color: "#fff",
  border: "1px solid #555",
  borderRadius: 5,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const considerationsToolbar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  marginBottom: 8,
  background: "#eef3ff",
  border: "1px solid #1f1612",
  borderRadius: 6,
};
const considerationsToolbarText = {
  fontSize: 12.5,
  color: "#1f1612",
  fontWeight: 600,
};
const considerationsApplyAllBtn = {
  padding: "7px 14px",
  background: "#1f1612",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ────────── LiveStatus (animated single-line reasoning) ──────────
const liveWrap = { padding: "8px 4px" };
const liveHeader = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "8px 4px 18px",
};
const liveTitle = { fontWeight: 600, color: "#0a0a0a", fontSize: 14.5, letterSpacing: -0.1 };
const liveSubtitle = { fontSize: 12, color: "#555", marginTop: 2 };
const liveStatusCard = {
  background: "linear-gradient(135deg, #fdfdfe 0%, #f7f8fb 100%)",
  border: "1px solid #e4e4e7",
  borderRadius: 12,
  padding: "20px 22px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  minHeight: 110,
};
const liveProgressRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 16,
};
const dotPending = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#e4e4e7",
  transition: "background 200ms ease, transform 200ms ease",
};
const dotActive = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#1f1612",
  boxShadow: "0 0 0 4px rgba(31, 22, 18, 0.15)",
  transform: "scale(1)",
  animation: "vbw-pulse 1.6s ease-in-out infinite",
};
const dotDone = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#1f1612",
  opacity: 0.55,
};
const liveProgressText = {
  marginLeft: 8,
  fontSize: 12,
  color: "#555",
  fontWeight: 500,
  letterSpacing: 0.2,
};
const liveMessageContainer = {
  minHeight: 44,
  display: "flex",
  alignItems: "center",
};
const liveMessage = {
  fontSize: 15,
  lineHeight: 1.5,
  color: "#0a0a0a",
  fontWeight: 500,
  animation: "vbw-message-in 280ms ease-out",
};
const liveMessageWaiting = {
  fontSize: 13.5,
  color: "#888",
  fontStyle: "italic",
};

// ────────── Clarification banner ──────────
const clarificationBanner = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "10px 12px",
  background: "#eef3ff",
  border: "1px solid #b8c8f5",
  borderRadius: 8,
  fontSize: 13,
  color: "#0a0a0a",
  lineHeight: 1.45,
};
const clarificationIcon = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  borderRadius: 999,
  background: "#1f1612",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const chatHistoryBox = {
  padding: "8px 10px",
  background: "#fff",
  border: "1px solid #ececef",
  borderRadius: 6,
  fontSize: 12.5,
  maxHeight: 120,
  overflowY: "auto",
};
const chatRow = { display: "flex", gap: 6 };
const actionRow = { display: "flex", justifyContent: "space-between", gap: 8 };
const ghostBtnSm = {
  padding: "8px 12px",
  background: "transparent",
  border: "1px solid #d4d4d8",
  borderRadius: 8,
  cursor: "pointer",
  color: "#444",
  fontSize: 12.5,
};
