// Hackathon submission landing page at /pitch.
//
// Reachable from the lablab.ai submission. Reads end-to-end in ~90s.
// Order: Axes strip → Hero → Problem → Loop → Demo → Moat → Sponsors → Close.

import Image from "next/image";

export const metadata = {
  title: "Deals Machine — Sales agent that builds itself",
  description:
    "Autonomous B2B cold-call agent. Describe your customer in one sentence; the agent sources leads, drafts the playbook, coaches you live on the call, and learns from every outcome.",
};

const LIVE_URL = "https://deals-machine.vercel.app";
const REPO_URL = "https://github.com/kyletdow47/deals-machine";
// Replaced once the assets land. Until then both fall back to the live app.
const DEMO_VIDEO_URL = LIVE_URL;
const PITCH_DECK_URL = LIVE_URL;

const AXES = [
  "Intelligent Reasoning",
  "Agentic Workflows",
  "Enterprise Utility",
  "Multimodal Intelligence",
];

export default function PitchPage() {
  return (
    <main className="min-h-screen antialiased pitch-dark">
      <Hero />
      <Problem />
      <Loop />
      <Coaching />
      <Moat />
      <Sponsors />
      <Close />
      <PageStyles />
    </main>
  );
}


/* ────────────────────────────── 1. Hero ────────────────────────────── */
//
// Logo dominates the right column. Text wraps around it on the left.
// Headline is two lines, no orphans, gold-shimmered second line.

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0d0a 0%, #050505 40%, #000000 70%, #000000 100%)" }}>
      <div
        className="absolute -top-32 -left-40 w-[720px] h-[720px] rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(212,180,117,0.18), rgba(212,180,117,0) 70%)",
        }}
      />
      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-16 md:pt-20 pb-6 md:pb-8 relative">
        {/* Tag row */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="eyebrow text-on-surface-variant/80">
            Milan AI Agent Olympics · 2026
          </div>
          <span className="text-on-surface-variant/30">·</span>
          <div className="font-headline font-extrabold text-sm text-on-surface tracking-tight">
            Deals Machine
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left — text */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <h1
              className="display-1 text-on-surface leading-[0.95] tracking-[-0.025em]"
              style={{ fontSize: "clamp(2.75rem, 6.5vw, 5rem)" }}
            >
              <span className="gold-text block">Builds itself.</span>
              <span className="block mt-1 md:mt-2">Cold-call agent.</span>
            </h1>

            <p className="font-label text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed mt-8">
              Most cold-call tools help you call more. Deals Machine helps you
              call better because it learns from every call you make.
            </p>

            <p className="font-label text-[15px] md:text-base text-on-surface-variant/85 max-w-xl leading-relaxed mt-3">
              Sources sharper leads from real-world signals. Writes a script
              customized to each lead. Coaches you live on the call. Banks every
              insight so the next call is better than the last.
            </p>

            <div className="flex items-center gap-3 mt-9">
              <a
                href={LIVE_URL}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-2xl font-headline font-bold text-[15px] border border-outline/25 text-on-surface bg-surface-container-lowest hover:bg-surface-container-high hover:-translate-y-px transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[20px]">
                  open_in_new
                </span>
                Open the live app
              </a>
              <a
                href={PITCH_DECK_URL}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-2xl font-headline font-bold text-[15px] border border-outline/25 text-on-surface bg-surface-container-lowest hover:bg-surface-container-high hover:-translate-y-px transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[20px]">
                  slideshow
                </span>
                View the pitch deck
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl font-label font-semibold text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">
                  code
                </span>
                GitHub
              </a>
            </div>

            <div className="font-label text-xs text-on-surface-variant/80 mt-8 flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-70 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
                </span>
                Live in production
              </span>
              <span>·</span>
              <span>MIT licensed</span>
            </div>
          </div>

          {/* Right — oversized logo */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src="/brand-logo.gif"
                alt="Deals Machine"
                width={630}
                height={630}
                className="relative w-[360px] h-[360px] md:w-[510px] md:h-[510px] lg:w-[600px] lg:h-[600px] object-contain"
              />
            </div>
          </div>
        </div>

        {/* Axes inline */}
        <div className="flex items-center gap-4 md:gap-7 flex-wrap justify-center mt-10 md:mt-14">
          {AXES.map((a, i) => (
            <span
              key={a}
              className="inline-flex items-center gap-2.5 font-headline font-bold text-[14px] md:text-[16px] tracking-tight text-on-surface-variant/70"
            >
              <span className="w-2 h-2 rounded-full bg-gold-dot" />
              {a}
              {i < AXES.length - 1 && (
                <span className="text-on-surface-variant/20 ml-1.5 hidden md:inline">·</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Gradient transition to body */}
      <div className="h-24 md:h-36" style={{ background: "linear-gradient(to bottom, #000000, #111110)" }} />
    </section>
  );
}

/* ─────────────────────────── 2. Problem ─────────────────────────── */
//
// Three big text statements. No cards. Broken-phone SVG backdrop in
// the bleed area. The header is rebalanced so nothing orphans.

function Problem() {
  const beats = [
    {
      kicker: "01",
      head: "Setup is the moat.",
      body:
        "Spinning up a new vertical takes weeks. ICP research, signal hunting, expert framing, script writing — before you ever dial the first number.",
    },
    {
      kicker: "02",
      head: "The script goes stale by Tuesday.",
      body:
        "Reps write playbooks on Monday. The objections heard on Wednesday never make it back into the script. The next caller starts from zero.",
    },
    {
      kicker: "03",
      head: "The call itself is solo.",
      body:
        "Reps wing it live. No real-time feedback. No memory of what landed for someone exactly like this prospect last quarter.",
    },
  ];

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* 3D icon backdrop */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-end">
        <img src="/problem-icon.png" alt="" className="w-[300px] md:w-[420px] lg:w-[500px] mr-4 md:mr-8 lg:mr-12 opacity-[0.25]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 relative">
        <div className="font-headline font-extrabold text-[13px] md:text-[15px] uppercase tracking-[0.15em] text-on-surface-variant mb-5">The problem</div>
        <h2
          className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[0.98] max-w-[18ch]"
          style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.25rem)" }}
        >
          Cold-call sales is broken{" "}
          <span className="gold-text">in three places.</span>
        </h2>

        <div className="mt-10 md:mt-14 space-y-4 md:space-y-5">
          {beats.map((b) => {
            return (
              <div
                key={b.kicker}
                className="relative rounded-3xl px-6 md:px-10 py-8 md:py-10"
              >
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="font-mono tabular-nums text-on-surface-variant/35 font-bold text-[19px] md:text-[20px] tracking-wider shrink-0 mt-1">
                    {b.kicker}
                  </div>
                  <div>
                    <h3
                      className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[1.02]"
                      style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)" }}
                    >
                      {b.head}
                    </h3>
                    <p className="font-label text-base md:text-lg text-on-surface-variant leading-relaxed max-w-[60ch] mt-3">
                      {b.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/* ─────────────────────── 3. How it works ─────────────────────── */
//
// Asymmetric, alternating left/right. Each step has a small custom
// "graphic" panel (a stylized mock of the artifact that step produces),
// not a static icon.

function Loop() {
  const steps = [
    {
      kicker: "01",
      label: "Build a vertical",
      body:
        "Describe what you sell and who you sell to. The agent drafts the ICP, picks the signal sources, writes the voice — and comes back with its own considerations. Regulatory risks. Title lists that skew wrong. The agent pushes back on its own output.",
      graphic: <VerticalCardMock />,
    },
    {
      kicker: "02",
      label: "Source signals + leads",
      body:
        "Scrapes RSS, Reddit, Hacker News, and live web search. Scores events for buyer urgency, builds consequence chains, pulls contacts from Apollo. Each lead tagged with the signal that surfaced it.",
      graphic: <SignalFeedMock />,
    },
    {
      kicker: "03",
      label: "Compose a playbook",
      body:
        "Five opener variants — each keyed to a real signal like a funding round, a hiring spree, a competitor moving. Angles, an objection cheat-sheet, voicemail. The playbook auto-regenerates as the brain learns.",
      graphic: <PlaybookMock />,
    },
    {
      kicker: "04",
      label: "Coach the call live",
      body:
        "Twilio rings your cell first — that's how people who call all day actually work. Speechmatics transcribes in real time. Haiku 4.5 drops coaching cards into the cockpit every few seconds.",
      graphic: <CoachWaveformMock />,
    },
    {
      kicker: "05",
      label: "Learn → regenerate",
      body:
        "Tag the outcome — the brain entries that fed the playbook get their weights bumped (60-day half-life). Thirty seconds later the playbook regenerates. The next call uses a better script.",
      graphic: <BrainWeightMock />,
    },
  ];

  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="max-w-5xl mb-16 md:mb-24">
          <div className="font-headline font-extrabold text-[13px] md:text-[15px] uppercase tracking-[0.15em] text-on-surface-variant mb-5">How it works</div>
          <h2
            className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[1.0]"
            style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.25rem)" }}
          >
            <span className="block">One paragraph in.</span>
            <span className="block gold-text">A self-improving engine&nbsp;out.</span>
          </h2>
          <p className="font-label text-base md:text-lg text-on-surface-variant max-w-2xl mt-4 leading-relaxed">
            Five steps. The fifth closes back to the first — the moat.
          </p>
        </div>

        <ol className="space-y-24 md:space-y-32">
          {steps.map((s, i) => {
            const reverse = i % 2 === 1;
            const tilt = "";
            return (
              <li
                key={s.label}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-14 items-center ${
                  reverse ? "lg:[&>div:first-child]:order-2" : ""
                }`}
              >
                {/* Graphic side */}
                <div className="lg:col-span-7">
                  <div className={`relative ${tilt} loop-graphic-hover`}>
                    {s.graphic}
                  </div>
                </div>

                {/* Text side */}
                <div className="lg:col-span-5">
                  <div className="font-mono tabular-nums text-on-surface-variant/40 font-bold text-[14px] mb-3 tracking-wider">
                    {s.kicker}
                  </div>
                  <h3
                    className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[1.05]"
                    style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}
                  >
                    {s.label}
                  </h3>
                  <p className="font-label text-[15px] md:text-base text-on-surface-variant leading-relaxed mt-3">
                    {s.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* — How it works: small mocked artifacts — */

function VerticalCardMock() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 max-w-[520px]">
      <div className="eyebrow text-on-surface-variant/70 mb-2">Vertical preview</div>
      <div className="font-headline font-extrabold text-on-surface text-xl tracking-tight">
        Cybersecurity · Mid-market CISO
      </div>
      <div className="font-label text-[12.5px] text-on-surface-variant mt-1">
        slug · cybersec-cisos-us
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["CISO", "VP Security", "200–2000 emp", "United States", "5 sources"].map(
          (t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label text-[11.5px] font-medium"
            >
              {t}
            </span>
          )
        )}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="font-label text-[11px] uppercase tracking-wider font-bold text-amber-800 mb-1">
          Agent consideration
        </div>
        <div className="font-label text-[13px] text-on-surface leading-snug">
          PCI/SOC 2 named accounts skew the title list — recommending "Director, Security Operations" be added.
        </div>
      </div>
    </div>
  );
}

function SignalFeedMock() {
  const rows = [
    { tag: "Funding", title: "Series B · $42M led by Sequoia", source: "TechCrunch · 2h ago", heat: "high" },
    { tag: "Hiring", title: "Posted 4 SecOps roles this week", source: "LinkedIn · 6h ago", heat: "mid" },
    { tag: "Breach", title: "Disclosed phishing incident on Q4 call", source: "8-K · 1d ago", heat: "high" },
  ];
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 max-w-[560px]">
      <div className="flex items-center justify-between mb-4">
        <div className="eyebrow text-on-surface-variant/70">Live signal feed</div>
        <div className="font-label text-[11px] text-tertiary inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary" />
          </span>
          streaming
        </div>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li
            key={r.title}
            className="flex items-center gap-3 rounded-xl bg-surface-container-low/80 border border-outline/10 px-3.5 py-3 signal-row-pop"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span
              className={`shrink-0 px-2 py-0.5 rounded-md font-label text-[10.5px] font-bold uppercase tracking-wide ${
                r.heat === "high"
                  ? "bg-error-container text-on-error-container"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {r.tag}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-headline font-bold text-on-surface text-[13.5px] truncate">
                {r.title}
              </div>
              <div className="font-label text-[11.5px] text-on-surface-variant/70 truncate">
                {r.source}
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">
              chevron_right
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaybookMock() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 max-w-[560px]">
      <div className="eyebrow text-on-surface-variant/70 mb-3">Playbook · openers</div>
      <div className="space-y-2.5">
        {[
          { signal: "Funding round", text: "Saw the Sequoia round — usually that means a 90-day window before SecOps headcount catches up. What's the pressure on your side right now?" },
          { signal: "Recent breach", text: "I read the 8-K — most teams are getting board pressure to add a layer before Q1 audit. Is that on your plate this month?" },
          { signal: "Hiring spree", text: "You're hiring 4 SecOps in 60 days — the gap between hire date and productive date is usually where teams get burned. What's your bridge plan?" },
        ].map((o, i) => (
          <div
            key={i}
            className="rounded-xl border border-outline/12 px-3.5 py-3 bg-surface-container-low/60"
          >
            <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-gold-dot mb-1">
              {o.signal}
            </div>
            <div className="font-label text-[13.5px] text-on-surface leading-snug">
              "{o.text}"
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 font-label text-[11.5px] text-on-surface-variant/70">
        + objection cheat-sheet · voicemail · close cues
      </div>
    </div>
  );
}

function CoachWaveformMock() {
  return (
    <div className="bg-on-surface text-background rounded-2xl editorial-shadow p-6 max-w-[560px] overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2 font-label text-[10.5px] uppercase tracking-wider font-bold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
          </span>
          Live · Coach
        </div>
        <div className="font-mono tabular-nums text-[11px] opacity-60">02:14</div>
      </div>
      {/* Waveform bars */}
      <div className="flex items-center gap-[3px] h-12 mb-4">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-gold-dot waveform-bar"
            style={{
              animationDelay: `${i * 40}ms`,
              height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
            }}
          />
        ))}
      </div>
      <div className="rounded-lg bg-white/10 px-3 py-2 font-label text-[13px] leading-snug mb-2.5">
        "We don't really have budget for another tool right now…"
      </div>
      <div className="rounded-lg bg-gold-dot/20 border border-gold-dot/40 px-3 py-2.5">
        <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-gold-dot mb-1">
          Coach · reframe
        </div>
        <div className="font-label text-[13px] leading-snug">
          Ask: "Is the budget the blocker, or the timing of when you'd see ROI? Most teams in your size find one offsets the other in Q1."
        </div>
      </div>
    </div>
  );
}

function BrainWeightMock() {
  const rows = [
    { label: "ROI-on-Q1 reframe", before: 62, after: 84, delta: "+22" },
    { label: "Funding-round opener", before: 48, after: 71, delta: "+23" },
    { label: "Compliance angle", before: 55, after: 33, delta: "−22" },
  ];
  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 max-w-[560px]">
      <div className="flex items-center justify-between mb-4">
        <div className="eyebrow text-on-surface-variant/70">Brain · weights updated</div>
        <div className="font-label text-[11px] text-on-surface-variant inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">history</span>
          30s after hang-up
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const up = r.delta.startsWith("+");
          return (
            <div key={r.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="font-headline font-bold text-on-surface tracking-tight">
                  {r.label}
                </span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    up ? "text-tertiary" : "text-error"
                  }`}
                >
                  {r.delta}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-on-surface-variant/30"
                  style={{ width: `${r.before}%` }}
                />
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    up ? "bg-tertiary" : "bg-error"
                  } brain-bar-fill`}
                  style={{ width: `${r.after}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 font-label text-[11.5px] text-on-surface-variant/70">
        Playbook regenerates · 60-day half-life · per-section credit
      </div>
    </div>
  );
}

/* ─────────────────── 4. Demo moment — React graphics ─────────────────── */
//
// Animated cockpit mock instead of a placeholder. Renders three columns
// of the live coaching surface so judges can see what they're about to
// watch in the video.

function Coaching() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="mb-12 md:mb-16">
          <div className="font-headline font-extrabold text-[13px] md:text-[15px] uppercase tracking-[0.15em] text-on-surface-variant mb-5">Live coaching</div>
          <h2
            className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[1.0]"
            style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.25rem)" }}
          >
            You see the card{" "}
            <span className="gold-text">before the prospect finishes the&nbsp;sentence.</span>
          </h2>
          <p className="font-label text-base md:text-lg text-on-surface-variant max-w-3xl mt-4 leading-relaxed">
            Twilio rings your cell phone first — because that's how people who
            cold-call all day actually work. While you talk, Speechmatics
            transcribes the call live and Claude Haiku 4.5 drops coaching cards
            into your cockpit every five seconds.
          </p>
        </div>

        <AnimatedCockpit />

        <div className="mt-6 font-label text-[12px] text-on-surface-variant/80 text-center">
          Audio path: <span className="font-mono">mulaw / 8 kHz</span> · auth via
          on-demand JWT · cards delivered through Supabase Realtime in under 2 s
          end-to-end.
        </div>
      </div>
    </section>
  );
}

function AnimatedCockpit() {
  return (
    <div className="relative bg-surface-container-lowest rounded-3xl editorial-shadow-lg p-4 md:p-6 overflow-hidden gold-rim">
      {/* Top bar — looks like cockpit chrome */}
      <div className="flex items-center justify-between mb-4 px-2 md:px-3">
        <div className="flex items-center gap-2 font-label text-[10.5px] uppercase tracking-wider text-on-surface-variant">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
          </span>
          <span className="font-bold">LIVE CALL · 02:14</span>
        </div>
        <div className="flex items-center gap-2">
          {["bg-error/70", "bg-amber-500/70", "bg-tertiary/70"].map((c, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Phone column */}
        <div className="md:col-span-3 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden" style={{ background: "#0a0a0a" }}>
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(212,180,117,0.4), rgba(212,180,117,0) 70%)",
            }}
          />
          <div className="relative">
            <div className="phone-ring-ripple absolute inset-0 rounded-full" />
            <div className="phone-ring-ripple absolute inset-0 rounded-full" style={{ animationDelay: "1s" }} />
            <div className="w-20 h-20 rounded-full bg-gold-dot/20 border border-gold-dot/40 flex items-center justify-center relative">
              <span
                className="material-symbols-outlined text-gold-dot text-[34px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                call
              </span>
            </div>
          </div>
          <div className="font-label text-[11px] uppercase tracking-wider text-white/60 mt-4 font-bold">
            Your cell · ringing
          </div>
          <div className="font-headline font-bold text-white text-sm mt-1">
            Sarah Chen · CISO
          </div>
          <div className="font-label text-[11px] text-white/50 mt-0.5">
            Northwind Health
          </div>
        </div>

        {/* Transcript column */}
        <div className="md:col-span-5 rounded-2xl bg-surface-container-low/70 p-5 min-h-[260px]">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow text-on-surface-variant/70">Live transcript</div>
            <span className="font-label text-[10.5px] text-on-surface-variant/60 font-mono">
              speechmatics · mulaw 8 kHz
            </span>
          </div>
          <div className="space-y-2.5">
            <TranscriptLine speaker="agent" text="Hey Sarah — saw the Series B news. Congrats." step={1} />
            <TranscriptLine speaker="lead" text="Thanks. What's this about?" step={2} />
            <TranscriptLine speaker="agent" text="Quick one — most teams hit a SecOps gap 90 days post-raise. Is that landing for you?" step={4} />
            <TranscriptLine speaker="lead" text="Honestly we don't really have budget for another tool right now…" step={6} highlight />
          </div>
        </div>

        {/* Coach cards column */}
        <div className="md:col-span-4 rounded-2xl bg-surface-container-low/70 p-5 min-h-[260px]">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow text-on-surface-variant/70">Coach</div>
            <span className="font-label text-[10.5px] text-on-surface-variant/60 font-mono">
              haiku 4.5
            </span>
          </div>
          <div className="space-y-2.5">
            <CoachCardAnim
              step={3}
              tone="amber"
              label="Objection · budget"
              body="Reframe: ask if it's the budget or the timing of ROI."
            />
            <CoachCardAnim
              step={5}
              tone="emerald"
              label="Brain · prior win"
              body="Last Q1 a Series-B CISO closed on a 'ROI-in-90' frame."
            />
            <CoachCardAnim
              step={7}
              tone="rose"
              label="Watch · pace"
              body="You're at 38 wpm faster than the prospect. Slow down."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscriptLine({ speaker, text, step, highlight }) {
  const isAgent = speaker === "agent";
  const totalSteps = 8;
  const stepDur = 12.5; // percent per step
  const start = step * stepDur;
  const fadeIn = start + stepDur * 0.6;
  const resetStart = 95;
  return (
    <div
      className={`flex gap-2.5 ${isAgent ? "" : "flex-row-reverse"}`}
      style={{
        opacity: 0,
        animation: `cockpit-step ${totalSteps * 1.5}s ease infinite`,
        animationDelay: `${step * 1.5}s`,
      }}
    >
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-label text-[10.5px] font-bold ${
          isAgent
            ? "bg-on-surface text-background"
            : "bg-gold-dot/30 text-on-surface"
        }`}
      >
        {isAgent ? "YOU" : "SC"}
      </div>
      <div
        className={`px-3 py-2 rounded-xl max-w-[80%] font-label text-[13px] leading-snug ${
          isAgent
            ? "bg-surface-container-high text-on-surface"
            : highlight
              ? "bg-amber-500/15 border border-amber-500/40 text-on-surface"
              : "bg-surface-container-high text-on-surface"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function CoachCardAnim({ step, tone, label, body }) {
  const palette = {
    amber: "bg-amber-500/12 border-amber-500/35",
    rose: "bg-error-container/60 border-error/30",
    emerald: "bg-tertiary-container/60 border-tertiary/30",
  };
  const labelColor = {
    amber: "text-amber-800",
    rose: "text-on-error-container",
    emerald: "text-on-tertiary-container",
  };
  const totalSteps = 8;
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${palette[tone]}`}
      style={{
        opacity: 0,
        animation: `cockpit-step ${totalSteps * 1.5}s ease infinite`,
        animationDelay: `${step * 1.5}s`,
      }}
    >
      <div
        className={`font-label text-[10.5px] uppercase tracking-wider font-bold mb-1 ${labelColor[tone]}`}
      >
        {label}
      </div>
      <div className="font-label text-[13px] text-on-surface leading-snug">
        {body}
      </div>
    </div>
  );
}

/* ─────────────────────────── 5. The moat ─────────────────────────── */
//
// Header beefed up. Center is now a live-loop diagram instead of a card
// strip; supporting facts inline-embedded with the loop, not separated.

function Moat() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 md:px-8 relative">
        <div className="mb-12 md:mb-16">
          <div className="font-headline font-extrabold text-[13px] md:text-[15px] uppercase tracking-[0.15em] text-on-surface-variant mb-5">The moat</div>
          <h2
            className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[0.95]"
            style={{ fontSize: "clamp(2.5rem, 6.5vw, 5rem)" }}
          >
            Every call rewrites{" "}
            <span className="gold-text">the next&nbsp;call.</span>
          </h2>
          <p className="font-label text-base md:text-lg text-on-surface-variant max-w-3xl mt-5 leading-relaxed">
            Other AI sales tools are still tools you have to drive. Deals
            Machine drives itself. The brain credits the right rows, what
            landed gets weighted up, what flopped drops out. Thirty seconds
            after you hang up, the playbook has rewritten itself.
          </p>
        </div>

        <LoopDiagram />
      </div>
    </section>
  );
}

function LoopDiagram() {
  const nodes = [
    { icon: "phone_disabled", label: "Call ends", angle: 270 },
    { icon: "checklist", label: "Outcome tagged", angle: 0 },
    { icon: "scale", label: "Brain weights bumped", angle: 90 },
    { icon: "auto_awesome", label: "Playbook regenerates", angle: 180 },
  ];

  const facts = [
    {
      title: "Recency-decayed scoring",
      body: "60-day half-life. What worked yesterday outweighs what worked last quarter.",
    },
    {
      title: "Per-section credit",
      body: "Every playbook section knows which brain entries fed it. Outcomes credit the right rows.",
    },
    {
      title: "Synonym-tolerant ingest",
      body: "Sonnet drift gets normalized (customer_intent → commitment_made). Loop never breaks on a typo.",
    },
  ];

  const radius = 38; // percent
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      {/* Loop circle */}
      <div className="lg:col-span-7">
        <div className="relative w-full aspect-square max-w-[540px] mx-auto">
          {/* Ring */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="loop-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(212,180,117,0.6)" />
                <stop offset="50%" stopColor="rgba(212,180,117,0.15)" />
                <stop offset="100%" stopColor="rgba(212,180,117,0.6)" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#loop-grad)"
              strokeWidth="0.6"
              strokeDasharray="0.5 2"
              className="loop-rotate"
              style={{ transformOrigin: "50% 50%" }}
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgba(212,180,117,0.18)"
              strokeWidth="0.4"
            />
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="eyebrow text-on-surface-variant/70 mb-1">
                Closed loop
              </div>
              <div className="font-headline font-extrabold text-on-surface tracking-tight text-2xl md:text-3xl leading-tight">
                30-second
                <br />
                <span className="gold-text">turnaround.</span>
              </div>
              <div className="font-label text-[11.5px] text-on-surface-variant/70 mt-2 max-w-[20ch] mx-auto leading-snug">
                Playbook rewrites itself before the operator finishes writing notes.
              </div>
            </div>
          </div>

          {/* Nodes positioned around the circle */}
          {nodes.map((n, i) => {
            const rad = (n.angle * Math.PI) / 180;
            const x = 50 + radius * Math.cos(rad);
            const y = 50 + radius * Math.sin(rad);
            return (
              <div
                key={n.label}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl metallic-silk flex items-center justify-center text-on-primary shadow-lg loop-node-glow"
                    style={{ animationDelay: `${i * 1.5}s` }}
                  >
                    <span
                      className="material-symbols-outlined text-[22px] md:text-[26px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {n.icon}
                    </span>
                  </div>
                  <div className="mt-2 font-headline font-bold text-on-surface text-[12px] md:text-[13px] tracking-tight text-center max-w-[12ch]">
                    {n.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supporting facts, embedded right of the loop */}
      <div className="lg:col-span-5 space-y-7">
        {facts.map((f, i) => (
          <div key={f.title} className="flex gap-5">
            <div className="font-mono tabular-nums text-on-surface-variant/30 font-bold text-xl shrink-0 mt-1">
              0{i + 1}
            </div>
            <div>
              <div className="font-headline font-extrabold text-on-surface text-lg md:text-xl tracking-tight">
                {f.title}
              </div>
              <p className="font-label text-[16px] md:text-[17px] text-on-surface-variant leading-relaxed mt-1.5">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── 6. Sponsors ─────────────────────────── */
//
// Logo monograms take the visual lead, body copy bumped one size. The
// hackathon-axes ticker has been promoted to the top of the page, so
// this section stays focused on the sponsor wins.

const SPONSORS = [
  {
    name: "Vultr",
    tagline: "Cloud compute",
    logo: "/logo-vultr.svg",
    logoBg: "#1a1a1a",
    logoH: 28,
    body:
      "Fastify worker on Ubuntu 24.04, Caddy reverse proxy with auto-WSS for Twilio Media Streams. Every reasoning step, Apollo call, and Speechmatics job runs here.",
  },
  {
    name: "Speechmatics",
    tagline: "Transcription · live + post-call",
    logo: "/logo-speechmatics.svg",
    logoBg: "#1a1a1a",
    logoH: 22,
    body:
      "Async batch (enhanced + speaker diarization) for the post-call scorecard. Real-time WSS (mulaw 8 kHz, JWT minted on demand) drives the live coaching cards.",
  },
  {
    name: "Veea",
    tagline: "Lobster Trap · edge security",
    logo: "/logo-veea.svg",
    logoBg: "#1a1a1a",
    logoH: 26,
    body:
      "Standalone container with layered defense: 11 regex patterns instant, then Claude Haiku classifier. Drops onto a Veea edge gateway via a single env-var swap.",
  },
  {
    name: "Anthropic",
    tagline: "Claude across the stack",
    logo: "/logo-anthropic.svg",
    logoBg: "#1a1a1a",
    logoH: 22,
    body:
      "Sonnet 4.6 for reasoning + playbook + post-call scoring. Haiku 4.5 where latency matters — the live coach loop and the Lobster Trap classifier.",
  },
];

function Sponsors() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="mb-14 md:mb-20">
          <div className="font-headline font-extrabold text-[13px] md:text-[15px] uppercase tracking-[0.15em] text-on-surface-variant mb-5">Sponsor tracks</div>
          <h2
            className="font-headline font-extrabold text-on-surface tracking-[-0.02em] leading-[0.95]"
            style={{ fontSize: "clamp(2.5rem, 6.5vw, 5rem)" }}
          >
            <span className="block">Built for four tracks.</span>
            <span className="block gold-text">One specific line&nbsp;each.</span>
          </h2>
          <p className="font-label text-base md:text-lg text-on-surface-variant max-w-3xl mt-5 leading-relaxed">
            No buzzwords. Each row names the actual implementation you'll find in the&nbsp;repo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {SPONSORS.map((s) => (
            <div
              key={s.name}
              className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6 md:p-7 flex flex-col gap-5 hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl shrink-0 flex items-center justify-center gold-rim-soft p-3"
                  style={{ background: s.logoBg }}
                >
                  <img
                    src={s.logo}
                    alt={s.name}
                    style={{ height: s.logoH }}
                    className="w-auto object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-headline font-extrabold text-on-surface text-2xl md:text-[28px] tracking-tight leading-none">
                    {s.name}
                  </div>
                  <div className="font-label text-[12.5px] uppercase tracking-wider text-on-surface-variant/80 font-bold mt-2">
                    {s.tagline}
                  </div>
                </div>
              </div>
              <p className="font-label text-[15px] md:text-base text-on-surface-variant leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 7. Close ─────────────────────────── */

function Close() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div
        className="absolute -bottom-40 -left-40 w-[640px] h-[640px] rounded-full opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(212,180,117,0.35), rgba(212,180,117,0) 70%)",
        }}
      />
      <div className="max-w-5xl mx-auto px-6 md:px-8 relative">
        <div className="bg-surface-container-lowest rounded-3xl editorial-shadow-lg p-8 md:p-12 gold-rim">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3">
              <div className="eyebrow text-on-surface-variant mb-3">In closing</div>
              <h2 className="font-headline font-extrabold text-on-surface tracking-tight text-3xl md:text-4xl leading-tight mb-4">
                The agent doesn't just make your AI better.{" "}
                <span className="gold-text">It makes you a better cold caller.</span>
              </h2>
              <p className="font-label text-[15px] text-on-surface-variant leading-relaxed max-w-xl mb-2">
                Built for solo founders, agency owners, insurance brokers,
                real-estate agents, solar, roofing — anybody who calls from
                their cell phone, every day, for a living.
              </p>
              <p className="font-label text-[15px] text-on-surface-variant leading-relaxed max-w-xl">
                Same engine, any B2B vertical. Built in five days. Open source.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <LinkRow icon="play_circle" label="Demo video" href={DEMO_VIDEO_URL} primary />
              <LinkRow icon="open_in_new" label="Live app" href={LIVE_URL} />
              <LinkRow icon="slideshow" label="Pitch deck" href={PITCH_DECK_URL} />
              <LinkRow icon="code" label="GitHub" href={REPO_URL} />
              <LinkRow icon="mail" label="kyle@view1studio.com" href="mailto:kyle@view1studio.com" />
              <div className="pt-3 mt-3 border-t border-outline/10 font-label text-[11.5px] text-on-surface-variant/70 leading-relaxed">
                Built by Kyle Dow · View1 Studio · Pair-programmed with Claude.
                MIT licensed.
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 font-label text-[11px] uppercase tracking-wider text-on-surface-variant/60">
          Milan AI Agent Olympics · 2026-05-19 · Fiera Milano
        </div>
      </div>
    </section>
  );
}

function LinkRow({ icon, label, href, primary }) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        primary
          ? "gold-shimmer gleam-hover text-on-primary shadow-lg hover:-translate-y-px"
          : "bg-surface-container-lowest border border-outline/15 text-on-surface hover:bg-surface-container hover:-translate-y-px"
      }`}
    >
      <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
      <span className="font-headline font-bold text-[13.5px] tracking-tight truncate flex-1">
        {label}
      </span>
      <span className="material-symbols-outlined text-[16px] opacity-50 shrink-0">
        arrow_forward
      </span>
    </a>
  );
}

/* ─────────────────────────── Page-local styles ─────────────────────────── */

function PageStyles() {
  return (
    <style>{`
      /* ── Dark theme for pitch page ── */
      .pitch-dark {
        --color-background: #111110;
        --color-surface: #111110;
        --color-surface-container-lowest: #171715;
        --color-surface-container-low: #1e1e1a;
        --color-surface-container: #262620;
        --color-surface-container-high: #2e2e28;
        --color-surface-container-highest: #383830;
        --color-surface-variant: #2e2e28;
        --color-on-surface: #f5f0e8;
        --color-on-surface-variant: #9a917f;
        --color-on-background: #f5f0e8;
        --color-outline: #4a4538;
        --color-outline-variant: #333025;
        --color-on-primary: #f5f0e8;
        --color-primary: #d4b475;
        --color-error: #ef4444;
        --color-error-container: #3b1111;
        --color-on-error-container: #fca5a5;
        --color-tertiary: #34d399;
        --color-tertiary-container: #0d3b2a;
        --color-on-tertiary-container: #a7f3d0;
        background-color: #111110;
        color: #f5f0e8;
      }
      .pitch-dark ::selection { background: #d4b475; color: #0a0a0a; }

      .gold-text {
        background: linear-gradient(115deg, #b89968 5%, #d4b475 35%, #f5d99a 50%, #d4b475 65%, #b89968 95%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        background-size: 200% 100%;
        background-position: 0% 50%;
        animation: gold-text-shift 8s ease-in-out infinite;
      }
      .bg-gold-dot { background: #d4b475; }
      .text-gold-dot { color: #d4b475; }
      .border-gold-dot { border-color: #d4b475; }
      .gold-rim-soft {
        box-shadow: inset 0 0 0 1px rgba(212,180,117,0.18);
      }
      @keyframes gold-text-shift {
        0%, 100% { background-position: 0% 50%; }
        50%      { background-position: 100% 50%; }
      }

      /* Hero logo gentle float */
      @keyframes hero-logo-float {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50%      { transform: translateY(-8px) rotate(-0.5deg); }
      }
      .hero-logo-float { animation: hero-logo-float 7s ease-in-out infinite; }

      /* Loop graphic micro-tilt on hover */
      .loop-graphic-hover { transition: transform 400ms ease; }
      .loop-graphic-hover:hover { transform: rotate(0deg) translateY(-4px); }

      /* Signal feed row pop-in */
      @keyframes signal-row-pop {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .signal-row-pop {
        opacity: 0;
        animation: signal-row-pop 600ms ease forwards;
      }

      /* Waveform bars */
      @keyframes waveform-flicker {
        0%, 100% { transform: scaleY(1); opacity: 0.85; }
        50%      { transform: scaleY(0.4); opacity: 1; }
      }
      .waveform-bar {
        transform-origin: center;
        animation: waveform-flicker 900ms ease-in-out infinite;
        min-height: 4px;
      }

      /* Brain weight bar fill */
      @keyframes brain-bar-fill {
        0% { width: 0%; }
      }
      .brain-bar-fill { animation: brain-bar-fill 900ms cubic-bezier(0.22,1,0.36,1); }

      /* Cockpit step — fade in, hold, fade out, loop */
      @keyframes cockpit-step {
        0%   { opacity: 0; transform: translateY(10px); }
        8%   { opacity: 1; transform: translateY(0); }
        75%  { opacity: 1; transform: translateY(0); }
        88%  { opacity: 0; transform: translateY(-4px); }
        100% { opacity: 0; transform: translateY(10px); }
      }

      /* Loop diagram */
      @keyframes loop-rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loop-rotate { animation: loop-rotate 40s linear infinite; }

      /* Sequential glow — each node lights up gold in workflow order */
      @keyframes loop-node-glow {
        0%, 100% { box-shadow: 0 4px 12px rgba(31,22,18,0.25); }
        12%      { box-shadow: 0 0 20px 6px rgba(212,180,117,0.6), 0 4px 12px rgba(31,22,18,0.25); transform: translateY(-3px) scale(1.08); }
        25%      { box-shadow: 0 4px 12px rgba(31,22,18,0.25); transform: translateY(0) scale(1); }
      }
      .loop-node-glow { animation: loop-node-glow 6s ease-in-out infinite; }

      /* Phone ringing ripple */
      @keyframes phone-ring-ripple {
        0%   { transform: scale(1); opacity: 0.55; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      .phone-ring-ripple {
        border: 1px solid rgba(212,180,117,0.55);
        animation: phone-ring-ripple 2s ease-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .gold-text,
        .hero-logo-float,
        .signal-row-pop,
        .waveform-bar,
        .brain-bar-fill,
        .loop-rotate,
        .loop-node-glow,
        .phone-ring-ripple {
          animation: none !important;
        }
      }
    `}</style>
  );
}
