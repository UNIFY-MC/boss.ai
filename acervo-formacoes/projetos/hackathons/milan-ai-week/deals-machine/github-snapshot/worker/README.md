# Deals Machine — Worker

The agent that runs on Vultr. Hosts the pipeline orchestrator, transcript
ingestion, vertical-builder, chat, and HubSpot push. Cockpit (Vercel)
proxies all external work here.

**Reference:** `AI Week Italia/05-SYSTEM-ARCHITECTURE.md`, `AI Week Italia/spec.md`.

## Local dev

```bash
cd worker
cp .env.example .env   # fill in secrets
npm install
npm run dev            # tsx watch on PORT (default 3000)
```

Hit `http://localhost:3000/health` — should return `status: ok`.

All other routes require `x-worker-secret: $WORKER_PROXY_SECRET` (matches Vercel cockpit).

## Build for production

```bash
npm run build  # tsc → dist/
npm start      # node dist/index.js
```

## Deploy to Vultr

See `scripts/vultr/` for the bootstrap, install, and deploy scripts.

Target host: `worker.kyletdow.com` (199.247.20.213, Frankfurt, Ubuntu 24.04).

```bash
# One-time, from local:
scp scripts/vultr/bootstrap.sh root@199.247.20.213:/root/
ssh root@199.247.20.213 'bash /root/bootstrap.sh'

# Recurring deploys (after first):
ssh root@199.247.20.213 'cd /opt/deals-machine && git pull && cd worker && npm ci && npm run build && systemctl restart deals-machine-worker'
```

## Endpoints

| Method | Path                  | Purpose                                          |
|--------|-----------------------|--------------------------------------------------|
| GET    | /health               | Public uptime + Supabase ping                    |
| POST   | /run                  | Trigger full daily pipeline for a vertical       |
| POST   | /generate-vertical    | Feature D — build a VerticalConfig from text     |
| POST   | /ingest-transcript    | Feature B — transcript → Brain (text or audio)   |
| POST   | /chat                 | Brain interrogation, streaming                   |
| POST   | /hubspot/push         | Push N leads to HubSpot                          |

## What's wired today (May 14 evening)

- Fastify boot + health endpoint
- Supabase service-role client
- Activity log helper (the streaming-reasoning surface)
- Shared-secret auth guard on all non-/health routes
- Route stubs returning 501 for not-yet-implemented endpoints
- TypeScript path alias to `@verticals` (../packages/verticals)

## What lands when

| Day | What ships |
|-----|------------|
| Fri May 15 | Pipeline orchestrator + steps (port from Lead-Gen-Tool-main), `/run` real, `/hubspot/push` real, streaming reasoning visible in cockpit |
| Sat May 16 | `/generate-vertical` real, `/ingest-transcript` text path real, Brain read in pipeline, AI/SaaS vertical seeded |
| Sun May 17 | Lobster Trap integration (or regex fallback), Speechmatics audio path (or Whisper fallback), cron timer, security demo case |
