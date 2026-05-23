#!/usr/bin/env bash
# Seed compelling demo content into Supabase so the /agent page looks alive
# without needing a live agent run. Idempotent-ish — re-running creates dupes
# unless you wipe first (use scripts/seed-demo-wipe.sh).
#
# Usage:
#   ./scripts/seed-demo.sh
#
# Reads SUPABASE_URL + SUPABASE_SERVICE_KEY from worker/.env.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUPABASE_URL=$(grep ^SUPABASE_URL= worker/.env | cut -d= -f2-)
SUPABASE_KEY=$(grep ^SUPABASE_SERVICE_KEY= worker/.env | cut -d= -f2-)

# Hardcoded vertical IDs (from migration 002 seed)
FLYFX_ID="9078da2d-92ea-453d-81a6-a35d73ab38c0"
AISAAS_ID="747104fb-b6de-47d0-a287-e103624ba37f"

post() {
  local table="$1"; shift
  curl -s -X POST -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
       -H "Content-Type: application/json" -H "Prefer: return=representation" \
       "$SUPABASE_URL/rest/v1/$table" -d "$1"
}

echo "==> Seeding FlyFX leads"
post leads "[
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Sarah Lindqvist\",\"title\":\"Head of Air Freight\",\"company\":\"Nordwind Logistics\",\"location\":\"Rotterdam, NL\",\"phone\":\"+31201234567\",\"email\":\"s.lindqvist@nordwind-logistics.com\",\"domain\":\"nordwind-logistics.com\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Hit twice last quarter by Red Sea diversions — expressed urgency around emergency capacity. Quoted but moved away on price.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Marco Bianchi\",\"title\":\"Chartering Manager\",\"company\":\"Adriatic Freight Solutions\",\"location\":\"Milan, IT\",\"phone\":\"+390212345678\",\"email\":\"m.bianchi@adriatic-fs.it\",\"domain\":\"adriatic-fs.it\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Lost a Saudi automotive lane to delays in March. Open to backup brokers but won't talk until they see proof.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Anika Hofstetter\",\"title\":\"Operations Manager Air Freight\",\"company\":\"Rhein-Air Cargo\",\"location\":\"Frankfurt, DE\",\"phone\":\"+496912345678\",\"email\":\"hofstetter@rhein-air.de\",\"domain\":\"rhein-air.de\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Mid-size forwarder, mostly EU lanes. Curious about charter as a service but no urgent demand.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Pierre Lacombe\",\"title\":\"Project Cargo Manager\",\"company\":\"Lyon Heavy Logistics\",\"location\":\"Lyon, FR\",\"phone\":\"+33472345678\",\"email\":\"p.lacombe@lyon-heavy.fr\",\"domain\":\"lyon-heavy.fr\",\"status\":\"called\",\"pain_level\":\"high\",\"memory_summary\":\"Won a wind turbine project mid-March, needed urgent AN-124 capacity. Said our quote was 12% better than DSV — closing.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Olivia Kowalska\",\"title\":\"Air Freight Manager\",\"company\":\"Baltic Wing Express\",\"location\":\"Warsaw, PL\",\"phone\":\"+48221234567\",\"email\":\"o.kowalska@bwexpress.pl\",\"domain\":\"bwexpress.pl\",\"status\":\"follow_up\",\"pain_level\":\"medium\",\"memory_summary\":\"Talking to 2 other charter brokers. Wants pricing transparency upfront — said our deck was clearest.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Daniel Whitaker\",\"title\":\"Head of Air Freight\",\"company\":\"Albion Cargo Network\",\"location\":\"London, UK\",\"phone\":\"+442012345678\",\"email\":\"d.whitaker@albion-cargo.co.uk\",\"domain\":\"albion-cargo.co.uk\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"UK forwarder with strong India lane exposure. Mentioned the recent Mumbai customs slowdown is killing them.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Ines Garcia\",\"title\":\"Sea & Air Freight Manager\",\"company\":\"Iberia Trans Logistica\",\"location\":\"Madrid, ES\",\"phone\":\"+34911234567\",\"email\":\"i.garcia@iberia-trans.es\",\"domain\":\"iberia-trans.es\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Heavy sea-freight book, dipping toes into air for time-critical pharma. Listening mode.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Lukas Müller\",\"title\":\"Chartering Manager\",\"company\":\"Alpine Air Networks\",\"location\":\"Vienna, AT\",\"phone\":\"+431234567890\",\"email\":\"l.mueller@alpine-air.at\",\"domain\":\"alpine-air.at\",\"status\":\"in_hubspot\",\"pain_level\":\"high\",\"memory_summary\":\"Pushed to HubSpot last week — already in pipeline as a B2 deal worth ~€180k.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Femke de Vries\",\"title\":\"Operations Manager Air Freight\",\"company\":\"Holland Air Trade\",\"location\":\"Amsterdam, NL\",\"phone\":\"+31207654321\",\"email\":\"f.devries@hollandairtrade.nl\",\"domain\":\"hollandairtrade.nl\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Mid-sized NL forwarder, growing. Hasn't done charter before but signals open mindset.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Henrik Andersen\",\"title\":\"Head of Air Freight\",\"company\":\"Scandic Wing Logistics\",\"location\":\"Copenhagen, DK\",\"phone\":\"+4533123456\",\"email\":\"h.andersen@scandicwing.dk\",\"domain\":\"scandicwing.dk\",\"status\":\"negative\",\"pain_level\":\"low\",\"memory_summary\":\"Said exclusively works with Hellmann — no interest in switching. Asked us not to call again for 6mo.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Sofia Romano\",\"title\":\"Project Cargo Manager\",\"company\":\"Mediterranean Heavy Air\",\"location\":\"Naples, IT\",\"phone\":\"+390812345678\",\"email\":\"s.romano@medheavyair.it\",\"domain\":\"medheavyair.it\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Just won a renewable energy installation project in Sicily — needs heavy-lift air charter for transformer components.\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"name\":\"Pieter Janssen\",\"title\":\"Air Freight Manager\",\"company\":\"Antwerp Logistics Group\",\"location\":\"Antwerp, BE\",\"phone\":\"+3232345678\",\"email\":\"p.janssen@antlog.be\",\"domain\":\"antlog.be\",\"status\":\"callback\",\"pain_level\":\"medium\",\"memory_summary\":\"Asked us to call back in 2 weeks — was in middle of a tender response when we caught him.\"}
]" | head -c 80; echo "..."

echo "==> Seeding AI/SaaS leads"
post leads "[
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Jordan Sloane\",\"title\":\"CEO\",\"company\":\"Driftstream\",\"location\":\"San Francisco, US\",\"phone\":\"+14155551234\",\"email\":\"jordan@driftstream.ai\",\"domain\":\"driftstream.ai\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Just closed Series A ($14M). Looking for sales tooling that doesn't require enterprise sales motion.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Maya Iyer\",\"title\":\"Founder\",\"company\":\"Polaris Labs\",\"location\":\"London, UK\",\"phone\":\"+442012348888\",\"email\":\"maya@polarislabs.dev\",\"domain\":\"polarislabs.dev\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Solo founder + 3 engineers. Asked specifically about agent orchestration patterns and how we handle prompt injection.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Tom Albright\",\"title\":\"CTO\",\"company\":\"Cascade Compute\",\"location\":\"Berlin, DE\",\"phone\":\"+493022334455\",\"email\":\"tom@cascade-compute.com\",\"domain\":\"cascade-compute.com\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Infra-focused, skeptical of GPT wrappers. Engaged on the security middleware angle.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Rachel Fernandez\",\"title\":\"Head of Growth\",\"company\":\"Northstack\",\"location\":\"Dublin, IE\",\"phone\":\"+35314445678\",\"email\":\"rachel@northstack.io\",\"domain\":\"northstack.io\",\"status\":\"called\",\"pain_level\":\"high\",\"memory_summary\":\"Sales-led B2B SaaS at $4M ARR. Said their SDR team is the bottleneck. Booked a follow-up demo.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"David Park\",\"title\":\"Co-Founder\",\"company\":\"Inkwell\",\"location\":\"New York, US\",\"phone\":\"+12125557777\",\"email\":\"dp@inkwell.so\",\"domain\":\"inkwell.so\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"AI writing tool. Curious about how we handle hallucination in lead-research.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Hannah Reyes\",\"title\":\"VP Sales\",\"company\":\"Orbit AI\",\"location\":\"Austin, US\",\"phone\":\"+15125559876\",\"email\":\"h.reyes@orbit-ai.com\",\"domain\":\"orbit-ai.com\",\"status\":\"follow_up\",\"pain_level\":\"high\",\"memory_summary\":\"Big Apollo user. Said her team would pay just for the chain-builder if we strip everything else.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Eduardo Silva\",\"title\":\"CEO\",\"company\":\"Lumiflow\",\"location\":\"Lisbon, PT\",\"phone\":\"+351210123456\",\"email\":\"eduardo@lumiflow.ai\",\"domain\":\"lumiflow.ai\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Mid-stage Portuguese AI startup. Recent layoff at competitor opened a hiring window for them.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Aisha Khan\",\"title\":\"Founder\",\"company\":\"Tessera AI\",\"location\":\"Toronto, CA\",\"phone\":\"+14165550000\",\"email\":\"aisha@tessera.ai\",\"domain\":\"tessera.ai\",\"status\":\"in_hubspot\",\"pain_level\":\"high\",\"memory_summary\":\"Pushed to HubSpot last Tuesday — closing on a $40k pilot. Wanted Brain transparency before signing.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Liam O'Connor\",\"title\":\"Head of Product\",\"company\":\"Northrun\",\"location\":\"Edinburgh, UK\",\"phone\":\"+441312345678\",\"email\":\"liam@northrun.co\",\"domain\":\"northrun.co\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"Product-led growth focus. Said sales team is 1 person — every minute saved matters.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Nora Bachmann\",\"title\":\"Co-Founder\",\"company\":\"Verdigris Labs\",\"location\":\"Munich, DE\",\"phone\":\"+498912345678\",\"email\":\"nora@verdigrislabs.de\",\"domain\":\"verdigrislabs.de\",\"status\":\"new\",\"pain_level\":\"high\",\"memory_summary\":\"Just shipped a hardware AI device. Trying to figure out enterprise outbound — fits us perfectly.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Carlos Méndez\",\"title\":\"CEO\",\"company\":\"Sundial Compute\",\"location\":\"Barcelona, ES\",\"phone\":\"+34931234567\",\"email\":\"carlos@sundial-compute.com\",\"domain\":\"sundial-compute.com\",\"status\":\"new\",\"pain_level\":\"medium\",\"memory_summary\":\"GPU-cloud reseller. Open to outbound automation but worried about brand-safety on cold reach.\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"name\":\"Priya Sharma\",\"title\":\"Founder\",\"company\":\"Mosaic Intent\",\"location\":\"Bangalore, IN\",\"phone\":\"+918012345678\",\"email\":\"priya@mosaicintent.com\",\"domain\":\"mosaicintent.com\",\"status\":\"negative\",\"pain_level\":\"low\",\"memory_summary\":\"Said no interest — building outbound in-house. Politely closed the door.\"}
]" | head -c 80; echo "..."

echo
echo "==> Seeding brain_entries (showing the agent has learned)"
post brain_entries "[
  {\"vertical_id\":\"$FLYFX_ID\",\"type\":\"angle_landed\",\"content\":\"The 'we work only with forwarders, never end-clients' positioning consistently builds trust in the first 60s of cold calls\",\"weight\":2.5,\"source\":\"transcript\",\"evidence_quote\":\"Marco: 'OK that actually matters to me — I lost a customer last year to a broker who went around me.'\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"type\":\"angle_failed\",\"content\":\"Leading with price tends to backfire — forwarders read it as commoditizing the relationship\",\"weight\":1.8,\"source\":\"transcript\",\"evidence_quote\":\"Anika: 'Everyone's cheap. I need someone who picks up at 2am.'\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"type\":\"profile_chase\",\"content\":\"Chartering Managers at 50-200 employee forwarders are the sweet spot — they own the budget AND the carrier relationships, can decide in one call\",\"weight\":3.0,\"source\":\"chat\"},
  {\"vertical_id\":\"$FLYFX_ID\",\"type\":\"deal_killer\",\"content\":\"Anyone who says 'we have exclusive carrier contracts' — these never convert\",\"weight\":2.0,\"source\":\"manual\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"type\":\"angle_landed\",\"content\":\"Founders responded strongly to the 'every minute on SDR ops is a minute not building product' frame\",\"weight\":2.2,\"source\":\"transcript\",\"evidence_quote\":\"Rachel: 'Yeah that's exactly the problem — my CTO keeps getting pulled into pipeline reviews.'\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"type\":\"objection_recurring\",\"content\":\"Multiple founders pushed back on 'AI cold outreach' — concerns about deliverability and brand safety. Address proactively in the opener\",\"weight\":1.9,\"source\":\"transcript\",\"evidence_quote\":\"Carlos: 'I don't want my company name showing up in some Reddit thread about spam.'\"},
  {\"vertical_id\":\"$AISAAS_ID\",\"type\":\"profile_avoid\",\"content\":\"Companies under 5 employees aren't ready — they don't have sales process to plug into yet\",\"weight\":1.5,\"source\":\"manual\"}
]" | head -c 80; echo "..."

echo
echo "==> Seeding historical 'completed' runs with rich activity_log"

# FlyFX run 1
RUN1=$(post runs "{\"vertical_id\":\"$FLYFX_ID\",\"status\":\"complete\",\"triggered_by\":\"manual\",\"started_at\":\"2026-05-14T07:00:00Z\",\"finished_at\":\"2026-05-14T07:02:14Z\",\"summary\":\"23 leads sourced, 4 high-pain, 19 medium. Chain of the day: Red Sea convoy disruption → Asian electronics manufacturers seeking emergency capacity to EU. 6 contacts pushed to HubSpot.\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "  FlyFX run: $RUN1"
post activity_log "[
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"▶ Run started (manual)\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"📋 Vertical config loaded: FlyFXFreight Cargo Charter\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🧠 Loaded 5 brain insights (last 30d) — 2 angles landed, 1 angle failed, 1 profile-chase, 1 deal-killer\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🛰️ Scraping 3 signal source(s)…\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"  · NewsAPI geopolitical: 24 items\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"  · Brent crude price feed: 1 item\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"  · Suez Canal Authority status: 4 items\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🛰️ Total: 29 unique signals collected\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🔎 Filtered: 7 high-signal events (from 29 scraped)\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: Red Sea Houthi attack on container vessel → Asian electronics OEMs (Vietnam/Thailand) lose 6-week sea route → switch to air, charter demand spikes EU-bound\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: Saudi pharmaceutical recall (cold chain failure) → emergency air freight needed Riyadh → EU markets, 72h window\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: German rail strike Day 3 → automotive parts backlog Bremerhaven → emergency air capacity Bremen-Stuttgart\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"📇 Apollo: 43 unique contacts (from 187 raw)\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🧹 HubSpot dedupe: 23 kept, 20 already in HubSpot\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"🎯 Scored 23 target leads (4 high-pain, 14 medium, 5 low)\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"✍️ Generated 23 personalized cold scripts + emails (avg 142 tokens, 4.1s per lead)\"},
  {\"run_id\":\"$RUN1\",\"vertical_id\":\"$FLYFX_ID\",\"type\":\"agent_step\",\"message\":\"✅ Run complete in 2m 14s\"}
]" | head -c 60; echo "..."

# AI-SaaS run 1
RUN2=$(post runs "{\"vertical_id\":\"$AISAAS_ID\",\"status\":\"complete\",\"triggered_by\":\"cron\",\"started_at\":\"2026-05-14T07:00:00Z\",\"finished_at\":\"2026-05-14T07:01:47Z\",\"summary\":\"18 leads sourced, 5 high-pain, 11 medium. Chain of the day: Anthropic Series F → 14 mid-stage AI startup CTOs reposition GTM. 4 contacts pushed to HubSpot.\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "  AI-SaaS run: $RUN2"
post activity_log "[
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"▶ Run started (cron)\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"📋 Vertical config loaded: AI/SaaS Founder Outreach\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🧠 Loaded 3 brain insights (last 30d) — 1 angle landed, 1 objection-recurring, 1 profile-avoid\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🛰️ Scraping 4 signal source(s)…\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"  · TechCrunch RSS: 20 items\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"  · Hacker News top 30: 30 items\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"  · Product Hunt RSS: 30 items\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"  · NewsAPI tech + business: 18 items\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🛰️ Total: 91 unique signals collected\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🔎 Filtered: 12 high-signal events (from 91 scraped)\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: Anthropic Series F + valuation jump → 14 competing mid-stage AI startups need urgent GTM repositioning to defend market\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: OpenAI layoffs Mountain View → 200+ ex-OpenAI engineers in market → AI infra startups racing to hire → CTOs sleep-deprived = receptive to async outreach\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"chain_event\",\"message\":\"🔗 Chain built: AI Act enforcement Phase 2 starts in 6 weeks → EU AI startups need compliance partners → opens conversation door for SaaS tooling vendors\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"📇 Apollo: 34 unique contacts (from 156 raw)\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🧹 HubSpot dedupe: 18 kept, 16 already in HubSpot\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"🎯 Scored 18 target leads (5 high-pain, 11 medium, 2 low)\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"✍️ Generated 18 personalized cold scripts + emails (avg 137 tokens, 3.8s per lead)\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"chat_insight\",\"message\":\"💡 Brain updated from post-call chat: 'Multiple founders pushed back on AI cold outreach — address brand-safety in opener'\"},
  {\"run_id\":\"$RUN2\",\"vertical_id\":\"$AISAAS_ID\",\"type\":\"agent_step\",\"message\":\"✅ Run complete in 1m 47s\"}
]" | head -c 60; echo "..."

echo
echo "==> Done. Demo content seeded."
echo "  - 12 FlyFX leads (mix of statuses + pain levels)"
echo "  - 12 AI/SaaS leads"
echo "  - 7 brain_entries"
echo "  - 2 historical completed runs with rich activity logs"
