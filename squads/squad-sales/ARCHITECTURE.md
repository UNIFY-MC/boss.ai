# Architecture — Squad Sales

## Overview

Squad de vendas baseado em elite minds reais com frameworks documentados. Cobre o funil completo de B2B sales.

## Tier System

```
                    ┌─────────────────┐
                    │   sales-chief   │  Orchestrator
                    │  Routing (5D)   │  Diagnóstico + Routing
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Tier 0    │  │  Tier 1    │  │  Tier 2-3  │
     │ Diagnóstico│  │  Masters   │  │ Systematize│
     └────────────┘  └────────────┘  └────────────┘
     neil-rackham     david-sandler   challenger-sale
     (SPIN Selling)   (Submarine)     (Teach-Tailor)
                      keenan          jeb-blount
                      (Gap Selling)   (Fanatical)
                      chris-voss      chet-holmes
                      (Tactical       (Dream 100)
                       Empathy)       aaron-ross
                                      (Predictable
                                       Revenue)
```

## Routing Protocol (6 Dimensões)

O sales-chief roteia baseado em 6 dimensões. **Dimensão 0 (Niche) é obrigatória e sempre primeira** — ela determina quais agents são primários para o contexto.

### Dimensão 0: Niche Context (SEMPRE PRIMEIRO)

| Niche Profile | Ticket | Modelo | Agents Primários | Depriorizados |
|---------------|--------|--------|-----------------|---------------|
| infoproduto_low_ticket | R$47-997 | B2C volume | chet-holmes, jeb-blount | neil-rackham, challenger-sale |
| infoproduto_high_ticket | R$2k-30k | B2C high-touch | david-sandler, keenan, chris-voss | challenger-sale |
| saas_smb | $1k-20k ARR | B2B | keenan, david-sandler, jeb-blount | — |
| saas_enterprise | $50k+ ARR | B2B enterprise | neil-rackham, challenger-sale, chris-voss | chet-holmes |
| services_consulting | $5k-200k | B2B | neil-rackham, david-sandler, keenan | — |
| ecommerce_dtc | R$50-2k | B2C volume | chet-holmes, jeb-blount | neil-rackham, challenger-sale, chris-voss |

### Dimensões 1-5: Situacionais (filtradas pelo niche)

| Dimensão | Indicadores | Agent Primário |
|----------|-------------|----------------|
| **1. Stage** | Onde no funil está | Varia por estágio |
| **2. Complexity** | Transactional vs enterprise | Varia por complexidade |
| **3. Problem Type** | Prospecting, qualifying, closing... | Varia por problema |
| **4. Buyer Profile** | C-level, VP, individual | Varia por buyer |
| **5. Urgency** | Imediato, trimestre, longo prazo | Varia por urgência |

## Data Flow entre Tasks

```
diagnose-deal ──────► qualify-prospect ──────► negotiate-deal ──────► close-deal
     │                      │                       │
     │ deal_context_map     │ qualification_report   │ negotiation_terms
     │ spin_diagnostic      │ gap_analysis           │
     │ risk_classification  │ qualification_score    │
     ▼                      ▼                       ▼
 [Checklist]           [Checklist]              [Close or
 discovery-quality     deal-qualification        Re-qualify]
```

Para prospecting em escala (pipeline separado):

```
create-cold-outreach
     │
     ├─ aaron-ross: ICP + cold email sequences
     ├─ jeb-blount: prospecting plan + scripts
     └─ chet-holmes: Dream 100 selection + Stadium Pitch
```

Para copy, scripts e follow-up (assets de suporte):

```
create-followup-sequence ─── Sequências de follow-up multi-estágio
create-email-sequences ───── Email marketing (nurture, launch, cart, onboarding, upsell)
create-sales-copy ────────── Sales page, VSL, webinar, proposta, landing page
create-sales-scripts ─────── Discovery call, demo, closing, objeções, DMs, triagem
```

## Agent Interaction Patterns

### Handoff Rules

1. **Tier 0 → Tier 1:** Após discovery completa, neil-rackham passa para david-sandler (fechamento) ou keenan (quantificação de gap)
2. **Tier 1 → Tier 1:** chris-voss recebe deals com objeções de qualquer Tier 1 agent
3. **Tier 2 → Tier 1:** challenger-sale escala para david-sandler quando deal está pronto para fechar
4. **Qualquer → Tier 0:** Se discovery está incompleta, qualquer agent retorna para neil-rackham

### Veto Conditions Comuns

| Condição | Ação | Agent Responsável |
|----------|------|-------------------|
| Dor não identificada (SPIN < 5/10) | Bloqueia avanço para close | neil-rackham |
| Gap não quantificado | Bloqueia proposta comercial | keenan |
| Budget não confirmado | Bloqueia apresentação de preço | david-sandler |
| Decision maker ausente | Bloqueia reunião de fechamento | david-sandler |

## Component Inventory

| Tipo | Quantidade | Linhas Totais |
|------|-----------|---------------|
| Agents | 9 (1 orchestrator + 8 specialists) | 14,554 |
| Tasks | 9 | 3,975 |
| Checklists | 2 | 120 |
| Docs | 3 (README, ARCHITECTURE, CHANGELOG) | ~280 |
| Config | 1 | 88 |
| **Total** | **24 files** | **~19,054** |

## Framework Coverage

| Framework | Agent | Cobertura |
|-----------|-------|-----------|
| SPIN Selling | neil-rackham | Completa (4 tipos de pergunta + diagnóstico) |
| Gap Selling | keenan | Completa (Current→Gap→Future State) |
| Sandler Submarine | david-sandler | Completa (7 compartimentos + Pain Funnel) |
| Tactical Empathy | chris-voss | Completa (Mirror, Label, Calibrated Questions) |
| Challenger Sale | challenger-sale | Completa (Teach-Tailor-Take Control) |
| Fanatical Prospecting | jeb-blount | Completa (5 Channels + LDA Framework) |
| Ultimate Sales Machine | chet-holmes | Completa (12 Estratégias + Dream 100) |
| Predictable Revenue | aaron-ross | Completa (Cold Calling 2.0 + SDR Playbook) |
