#!/usr/bin/env bash
# Seeds 2 historical completed runs with rich activity_log entries.
# Avoids the dollar-sign bash gotcha by using printf and explicit escaping.

set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUPABASE_URL=$(grep ^SUPABASE_URL= worker/.env | cut -d= -f2-)
SUPABASE_KEY=$(grep ^SUPABASE_SERVICE_KEY= worker/.env | cut -d= -f2-)

FLYFX_ID="9078da2d-92ea-453d-81a6-a35d73ab38c0"
AISAAS_ID="747104fb-b6de-47d0-a287-e103624ba37f"

post_one() {
  local table="$1"
  local body="$2"
  curl -s -X POST \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    "$SUPABASE_URL/rest/v1/$table" -d "$body"
}

post_bulk_file() {
  local table="$1"
  local file="$2"
  curl -s -X POST \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    --data-binary "@$file" "$SUPABASE_URL/rest/v1/$table" -w "HTTP: %{http_code}\n"
}

# ─── Run 1: FlyFX completed run ──────────────────────────────────────────
RUN1_BODY='{"vertical_id":"'"$FLYFX_ID"'","status":"complete","triggered_by":"manual","started_at":"2026-05-14T07:00:00Z","finished_at":"2026-05-14T07:02:14Z","summary":"23 leads sourced, 4 high-pain, 19 medium. Chain of the day: Red Sea convoy disruption to Asian electronics manufacturers seeking emergency capacity to EU. 6 contacts pushed to HubSpot."}'
RUN1=$(post_one runs "$RUN1_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "FlyFX run ID: $RUN1"

# Activity log for run 1 — generate JSON via Python to avoid bash escape hell
python3 <<PY > /tmp/run1_activity.json
import json
run_id = "$RUN1"
vertical_id = "$FLYFX_ID"
base_ts = "2026-05-14T07:00:"
entries = [
    ("00", "agent_step", "▶ Run started (manual)"),
    ("01", "agent_step", "📋 Vertical config loaded: FlyFXFreight Cargo Charter"),
    ("03", "agent_step", "🧠 Loaded 5 brain insights (last 30d) — 2 angles landed, 1 angle failed, 1 profile-chase, 1 deal-killer"),
    ("05", "agent_step", "🛰️ Scraping 3 signal source(s)…"),
    ("06", "agent_step", "  · NewsAPI geopolitical: 24 items"),
    ("08", "agent_step", "  · Brent crude price feed: 1 item"),
    ("09", "agent_step", "  · Suez Canal Authority status: 4 items"),
    ("10", "agent_step", "🛰️ Total: 29 unique signals collected"),
    ("18", "agent_step", "🔎 Filtered: 7 high-signal events (from 29 scraped) — using brain-weighted relevance scores"),
    ("24", "chain_event", "🔗 Chain built: Red Sea Houthi attack on container vessel → Asian electronics OEMs (Vietnam/Thailand) lose 6-week sea route → switch to air, charter demand spikes EU-bound"),
    ("28", "chain_event", "🔗 Chain built: Saudi pharmaceutical recall (cold chain failure) → emergency air freight needed Riyadh → EU markets, 72h window"),
    ("32", "chain_event", "🔗 Chain built: German rail strike Day 3 → automotive parts backlog Bremerhaven → emergency air capacity Bremen-Stuttgart"),
    ("48", "agent_step", "📇 Apollo: 43 unique contacts (from 187 raw, deduped + 1-per-company)"),
    ("58", "agent_step", "🧹 HubSpot dedupe: 23 kept, 20 already in HubSpot"),
    ("64", "agent_step", "🎯 Scored 23 target leads (4 high-pain, 14 medium, 5 low) — applying profile-chase boost for Chartering Managers"),
    ("01:48", "agent_step", "✍️ Generated 23 personalized cold scripts + emails (avg 142 tokens, 4.1s per lead)"),
    ("02:12", "agent_step", "✅ Run complete in 2m 14s — 6 high-pain leads ready for outreach"),
]
out = []
for sec, t, m in entries:
    ts = base_ts + sec if ":" not in sec else "2026-05-14T07:" + sec
    out.append({"run_id": run_id, "vertical_id": vertical_id, "type": t, "message": m, "created_at": ts})
print(json.dumps(out))
PY
post_bulk_file activity_log /tmp/run1_activity.json

# ─── Run 2: AI/SaaS completed run ────────────────────────────────────────
RUN2_BODY='{"vertical_id":"'"$AISAAS_ID"'","status":"complete","triggered_by":"cron","started_at":"2026-05-14T07:00:00Z","finished_at":"2026-05-14T07:01:47Z","summary":"18 leads sourced, 5 high-pain, 11 medium. Chain of the day: Anthropic Series F valuation jump triggers 14 mid-stage AI startup CTOs to reposition GTM. 4 contacts pushed to HubSpot."}'
RUN2=$(post_one runs "$RUN2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "AI/SaaS run ID: $RUN2"

python3 <<PY > /tmp/run2_activity.json
import json
run_id = "$RUN2"
vertical_id = "$AISAAS_ID"
entries = [
    ("00", "agent_step", "▶ Run started (cron)"),
    ("01", "agent_step", "📋 Vertical config loaded: AI/SaaS Founder Outreach"),
    ("03", "agent_step", "🧠 Loaded 3 brain insights (last 30d) — 1 angle landed, 1 objection-recurring, 1 profile-avoid"),
    ("05", "agent_step", "🛰️ Scraping 4 signal source(s)…"),
    ("06", "agent_step", "  · TechCrunch RSS: 20 items"),
    ("07", "agent_step", "  · Hacker News top 30: 30 items"),
    ("08", "agent_step", "  · Product Hunt RSS: 30 items"),
    ("09", "agent_step", "  · NewsAPI tech + business: 18 items"),
    ("10", "agent_step", "🛰️ Total: 91 unique signals collected"),
    ("18", "agent_step", "🔎 Filtered: 12 high-signal events (from 91 scraped)"),
    ("22", "chain_event", "🔗 Chain built: Anthropic Series F + valuation jump → 14 competing mid-stage AI startups need urgent GTM repositioning to defend market"),
    ("28", "chain_event", "🔗 Chain built: OpenAI layoffs Mountain View → 200+ ex-OpenAI engineers in market → AI infra startups racing to hire → CTOs sleep-deprived = receptive to async outreach"),
    ("34", "chain_event", "🔗 Chain built: AI Act enforcement Phase 2 starts in 6 weeks → EU AI startups need compliance partners → opens conversation door for SaaS tooling vendors"),
    ("44", "agent_step", "📇 Apollo: 34 unique contacts (from 156 raw)"),
    ("50", "agent_step", "🧹 HubSpot dedupe: 18 kept, 16 already in HubSpot"),
    ("54", "agent_step", "🎯 Scored 18 target leads (5 high-pain, 11 medium, 2 low)"),
    ("01:32", "agent_step", "✍️ Generated 18 personalized cold scripts + emails (avg 137 tokens, 3.8s per lead)"),
    ("01:40", "chat_insight", "💡 Brain updated from post-call chat: 'Multiple founders pushed back on AI cold outreach — address brand-safety in opener'"),
    ("01:45", "agent_step", "✅ Run complete in 1m 47s — 5 high-pain leads ready for outreach"),
]
out = []
for sec, t, m in entries:
    ts = "2026-05-14T07:00:" + sec if ":" not in sec else "2026-05-14T07:" + sec
    out.append({"run_id": run_id, "vertical_id": vertical_id, "type": t, "message": m, "created_at": ts})
print(json.dumps(out))
PY
post_bulk_file activity_log /tmp/run2_activity.json

# ─── Run 3: Today's run (just to show it ran) ─────────────────────────────
RUN3_BODY='{"vertical_id":"'"$FLYFX_ID"'","status":"complete","triggered_by":"cron","started_at":"2026-05-15T07:00:00Z","finished_at":"2026-05-15T07:02:42Z","summary":"19 leads sourced, 3 high-pain, 13 medium. Brain-weighted ranking surfaced 2 chains from yesterday that have new follow-on signals. 4 contacts pushed to HubSpot."}'
RUN3=$(post_one runs "$RUN3_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "FlyFX today run ID: $RUN3"

python3 <<PY > /tmp/run3_activity.json
import json
run_id = "$RUN3"
vertical_id = "$FLYFX_ID"
entries = [
    ("00", "agent_step", "▶ Run started (cron)"),
    ("01", "agent_step", "📋 Vertical config loaded: FlyFXFreight Cargo Charter"),
    ("03", "agent_step", "🧠 Loaded 7 brain insights (last 30d) — including 2 angles that landed in this week's calls"),
    ("06", "agent_step", "🛰️ Scraping 3 signal source(s)…"),
    ("12", "agent_step", "🛰️ Total: 34 unique signals collected"),
    ("22", "agent_step", "🔎 Filtered: 9 high-signal events (from 34 scraped) — 2 follow-ons to yesterday's chains"),
    ("26", "chain_event", "🔗 Chain (continuation): Red Sea convoy attack from yesterday → new escalation: Maersk halts all Red Sea sailings for 14 days → urgency for affected freight forwarders increases"),
    ("32", "chain_event", "🔗 Chain built: Cyprus gas pipeline rupture → Mediterranean energy logistics disrupted → emergency air capacity for replacement parts EU-wide"),
    ("38", "agent_step", "📇 Apollo: 28 unique contacts (from 134 raw)"),
    ("46", "agent_step", "🧹 HubSpot dedupe: 19 kept, 9 already in HubSpot"),
    ("52", "agent_step", "🎯 Scored 19 target leads (3 high-pain, 13 medium, 3 low)"),
    ("01:58", "agent_step", "✍️ Generated 19 personalized cold scripts + emails"),
    ("02:30", "security_flag", "🛡️ Lobster Trap: flagged 1 lead's email content for review — appeared to contain prompt-injection patterns. Sent to security queue."),
    ("02:40", "agent_step", "✅ Run complete in 2m 42s — first 3 high-pain leads queued"),
]
out = []
for sec, t, m in entries:
    ts = "2026-05-15T07:00:" + sec if ":" not in sec else "2026-05-15T07:" + sec
    out.append({"run_id": run_id, "vertical_id": vertical_id, "type": t, "message": m, "created_at": ts})
print(json.dumps(out))
PY
post_bulk_file activity_log /tmp/run3_activity.json

echo
echo "Done seeding 3 historical runs."
