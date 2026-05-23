<div align="center">
  <img src="public/brand-logo.png" alt="Deals Machine" width="120" />

  # Deals Machine

  **An autonomous B2B cold-call agent that builds its own job description, sources its own leads, coaches you live while you call them, and writes its own follow-ups.**

  *Hackathon submission · Milan AI Agent Olympics · 2026-05-19*
</div>

---

## What it does

You give it one paragraph — *"I sell cloud cost optimization SaaS to VPs of Engineering at high-burn Series B/C startups."*

It then runs the full autonomous loop:

1. **Builds a vertical.** Claude drafts the ICP, picks 4–5 signal sources (RSS / Reddit / Hacker News), writes a chain-builder persona, and defines the operator's voice. ~60 seconds. The operator can refine via batched accept/dismiss considerations.
2. **Reasons through signals.** Every run scrapes the configured sources *plus* a live web search where the agent picks its own queries from the ICP. Each event is scored for buyer-urgency via a vertical-specific relevance prompt.
3. **Builds consequence chains.** Connects each high-signal event to a specific buyer profile facing urgency in the next 30 days. Always cites the source.
4. **Sources leads via Apollo.io.** Server-side filtering on titles, industries, company size, departments, and competitor exclusions. One contact per company, highest seniority wins.
5. **Composes a runnable playbook.** From the brain (call outcomes, learnings, objections heard) the worker synthesizes: 5 opener variants keyed to lead-context triggers, top angles ranked by recency-decayed weight, an objection cheat-sheet, asks, a voicemail script, and a pre-call brief template.
6. **Coaches the call in real time.** Twilio Media Streams pipes audio to the worker → Speechmatics RT transcribes live → Haiku watches the rolling 30-second window and emits coaching cards (objection detected, confirmation gap, closing cue) to the cockpit via Supabase Realtime.
7. **Scores the call post-hangup.** Speechmatics batch transcribes the recording. Claude Sonnet produces a structured scorecard — *what worked, what to improve, confirmations to apply to the lead, outcome signal* — and writes new brain entries.
8. **Closes the learning loop.** When the operator tags an outcome, the brain entries that fed the playbook sections used on that call get their weights bumped (±0.5 closed_won → −0.2 killed). The playbook auto-regenerates with a 30-second debounce. The next call uses an improved script.
9. **Drafts the follow-up automatically.** Vertical-aware, references what happened on the call. Lands in `email_drafts.status='ready'`.
10. **Sends from the operator's real Gmail.** One-click "Send now" on the leads page. OAuth means it's their actual address, replies thread to their inbox.

The operator stays in the loop for the call and the send. Everything else is autonomous.

---

## Sponsor tracks

### Vultr — cloud compute
The Fastify worker runs on a Vultr Ubuntu 24.04 instance with systemd + Caddy reverse proxy (auto-handles WSS upgrades for Twilio Media Streams). Every reasoning step, Apollo call, Twilio bridge, Speechmatics job, and Lobster Trap classification flows through Vultr.

### Speechmatics — call transcription, both modes
- **Async batch** (`/jobs/`) with speaker diarization + `operating_point: enhanced` produces the high-fidelity post-call transcript that feeds the scorecard and brain extraction.
- **Real-time** (WSS `eu2.rt.speechmatics.com/v2`, mulaw 8 kHz) pipes the live audio stream during the call, surfacing partials to the coach loop within 1–2 seconds. Auth is via a minted-on-demand JWT.

Every call genuinely makes the agent smarter — angles that landed get a `profile_chase` weight bump, objections become recurring lessons.

### Veea — edge security (Lobster Trap)
Every user-generated input (chat, transcripts, uploaded documents) pre-flights through a layered prompt-injection shield before reaching the agent:

1. **Lobster Trap container** ([`lobster-trap/`](./lobster-trap)) — standalone Fastify service exposing `POST /check`. Two-layer detection: 11 regex patterns first (instant, deterministic), then Claude Haiku 4.5 classifier. Ships with Dockerfile + systemd unit + deploy guide.
2. **In-process fallback** — if the container is unreachable, the worker falls back to its own regex + classifier. The shield never blocks the cockpit.

In production this container migrates to a Veea edge gateway via a single env-var swap (`LOBSTER_TRAP_URL`). The API surface is identical.

### Anthropic — Claude across the stack
- **Sonnet 4.6** — vertical generation, chain reasoning, script/playbook composition, post-call enrichment.
- **Haiku 4.5** — Lobster Trap classifier, live coach loop (latency-critical 5-second cadence over rolling transcript windows).

---

## Architecture

```
┌──────────────────────┐                       ┌──────────────────────────┐
│  Next.js cockpit     │   /api/* proxies      │  Fastify worker          │
│  (Vercel)            │ ────────────────────▶ │  (Vultr · Caddy · systemd) │
│                      │                       │                          │
│  /                   │   Realtime WebSocket  │  ┌────────────────────┐  │
│  /verticals          │ ◀───────────────────▶ │  │ Pipeline (10 steps)│  │
│  /pipeline           │                       │  │  signals → chains  │  │
│  /intelligence       │                       │  │  → leads → script  │  │
│  /leads              │                       │  └────────────────────┘  │
│  /knowledge          │                       │                          │
│  /analytics          │                       │  ┌────────────────────┐  │
│  /settings           │                       │  │ Playbook generator │  │
└─────────┬────────────┘                       │  │ + outcome → weight │  │
          │                                    │  └────────────────────┘  │
          │ Gmail OAuth                        │                          │
          │ (gmail.send)                       │  ┌────────────────────┐  │
          ▼                                    │  │ Live coaching      │  │
   Operator's Gmail                            │  │  Twilio Media      │  │
                                               │  │  Streams → SM RT   │  │
                                               │  │  → Haiku → events  │  │
                                               │  └────────────────────┘  │
                                               └──────────┬───────────────┘
                                                          │
                                            ┌─────────────▼────────────┐
                                            │  Lobster Trap container  │
                                            │  (127.0.0.1:8080 internal)│
                                            └──────────────────────────┘

  ─── Supabase Postgres + Realtime (verticals, runs, leads, accounts,
      brain_entries, email_drafts, transcripts, calls, live_coaching_events,
      activity_log, operator_credentials) ───
```

The Vercel layer is thin — UI, Realtime subscriptions, lightweight proxies, and Gmail OAuth. The worker does all the heavy compute.

---

## Stack

| Layer | Tech |
|---|---|
| Cockpit | Next.js 14 App Router · Tailwind v4 · Supabase JS · React Server Components |
| Worker | Node 20 · Fastify · TypeScript · Anthropic SDK · zod · `ws` |
| Models | Claude Sonnet 4.6 · Claude Haiku 4.5 |
| Database | Supabase Postgres + Realtime |
| Calls | Twilio Voice REST API (bridge-call pattern) + Twilio Media Streams (WSS) |
| Transcription | Speechmatics batch (post-call) · Speechmatics RT (live) · Whisper fallback |
| Email | Gmail API (OAuth) · Resend fallback |
| Lead sourcing | Apollo.io `/mixed_people/api_search` |
| CRM | Internal (accounts + pipeline_stage on leads) + optional HubSpot push |
| Security | Veea Lobster Trap (regex + Haiku layered detection) |
| Signals | RSS · Reddit JSON · Hacker News API · Claude web_search tool |

---

## Repo layout

```
.
├── app/                          # Next.js cockpit
│   ├── api/                      # API routes (auth/google, email, generate-playbook,
│   │                             #   enrich-call, apply-outcome, ...)
│   ├── components/               # AppShell, Sidebar, TopNav, CoachPanel, ScriptCard,
│   │                             #   PipelineLeadModal, CallReviewModal, ...
│   ├── lib/                      # Supabase client, hooks, helpers
│   ├── pipeline/                 # /pipeline kanban
│   ├── verticals/                # /verticals + /verticals/[slug]
│   ├── intelligence/             # /intelligence (agent cockpit)
│   ├── leads/                    # /leads (call console)
│   ├── knowledge/                # /knowledge (the brain)
│   ├── analytics/                # /analytics
│   ├── settings/                 # /settings
│   ├── icon.png                  # Favicon (auto-detected by Next.js App Router)
│   ├── globals.css               # Design tokens + chrome-gold polish utilities
│   └── layout.js
├── worker/                       # Fastify agent host
│   ├── src/
│   │   ├── pipeline/             # 10-step run orchestrator + steps
│   │   ├── signals/              # rss / reddit / hackernews / web-search
│   │   ├── brain/                # extract / ingest / draft-email
│   │   ├── playbook/             # generate.ts · enrich-call.ts
│   │   ├── coaching/             # twilio-stream.ts · speechmatics-rt.ts · coach-loop.ts
│   │   ├── apollo/               # Apollo client
│   │   ├── audio/                # Speechmatics batch + Whisper
│   │   ├── telephony/            # Twilio
│   │   ├── llm/                  # Claude client + Lobster Trap wrapper
│   │   ├── routes/               # Fastify HTTP + WSS routes
│   │   ├── vertical-builder/     # Multi-step vertical generation
│   │   └── lib/                  # env + supabase + activity log
│   └── README.md
├── lobster-trap/                 # Standalone Veea Lobster Trap container
│   ├── src/server.js             # Fastify · /check + /health
│   ├── Dockerfile
│   ├── lobster-trap.service      # systemd unit
│   └── DEPLOY.md
├── packages/verticals/           # Shared VerticalConfig types + seed defaults
├── public/
│   └── brand-logo.png            # Sidebar mark
├── supabase/migrations/          # 001 → 018
└── README.md                     # this file
```

---

## Data model highlights

- **`verticals.config.playbook`** — jsonb column holding the composed playbook (opener variants, angles, objections, asks, voicemail, pre-call brief template). Regenerated on demand or auto-debounced when new brain entries land.
- **`brain_entries.playbook_credit`** — string indicating which playbook section this entry feeds. Used by `apply-outcome` to bump weights on the right entries after each call outcome.
- **`calls.playbook_snapshot`** — jsonb. Frozen copy of the playbook used at call time, so outcome attribution survives playbook regeneration.
- **`calls.enrichment`** + **`calls.outcome_signal`** — post-call scorecard from `/enrich-call`.
- **`live_coaching_events`** — every coaching card fired during a live call, tied to `call_id`. Cockpit subscribes via Supabase Realtime.
- **`accounts`** + **`leads.pipeline_stage`** — internal CRM: hybrid contact + account model, 7-stage pipeline kanban on `/pipeline`.

Migrations are at `supabase/migrations/001_..._sql` through `018_playbook_and_coaching.sql`.

---

## Run it locally

```bash
# 1. Cockpit
cp .env.local.example .env.local            # fill SUPABASE_* + WORKER_PROXY_SECRET
npm install
npm run dev                                  # → http://localhost:3000

# 2. Worker (separate terminal)
cd worker
cp .env.example .env                         # fill all the keys
npm install
npm run dev                                  # → http://localhost:3000 (different port via PORT=)

# 3. Lobster Trap (optional but recommended)
cd lobster-trap
cp .env.example .env
npm install
npm run dev                                  # → http://localhost:8080
```

Run all 18 migrations in your Supabase SQL editor in order.

---

## Demo flow

If you're a judge: build a vertical (any industry — try *"B2B financial compliance software, sold to CFOs at Series B+ SaaS"*), then on `/intelligence`, click **Run agent**. Watch the live reasoning panel narrate the agent's pipeline.

Open `/verticals/<slug>` and hit **Compose playbook** — the worker synthesizes a script from the brain.

Open `/leads`, pick a row, hit **Call**. The Coach panel opens and starts firing cards as the conversation progresses.

Hang up. Hit **Review last call** — the scorecard shows what worked, what to improve, plus a confirmation checklist. Save it. The lead moves itself through the pipeline based on the outcome signal.

Open `/pipeline`. The card is in its new column.

Open `/knowledge`. The brain has new entries from the call.

Click **Regenerate** on the vertical playbook. The script just absorbed what you learned. The next call uses it.

---

## Co-development

Built by Kyle Dow with significant pair-programming via Claude (Claude Code in-IDE, plus Claude in Chrome for QA/setup). Co-development with AI is the whole point of this hackathon — the artifact is honest about how it was built.

---

## License

MIT. See [LICENSE](./LICENSE).
