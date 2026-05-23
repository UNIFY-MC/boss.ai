# Task: Diagnose Deal

**Task ID:** diagnose-deal
**Purpose:** Diagnostico completo de um deal para identificar gaps, riscos e proximos passos
**Agent:** sales-chief (orquestra), neil-rackham (discovery), keenan (gap analysis)
**Mode:** Interactive
**Execution Type:** Agent

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deal_context | string | Yes | Descrição do deal atual (prospect, valor, estágio) |
| niche_context | string | Yes | Tipo de produto/serviço, ticket médio, B2B/B2C, volume |
| pain_identified | string | No | Dores já identificadas |
| stakeholders | string | No | Decision makers envolvidos |
| competitor_info | string | No | Informações sobre concorrentes |

## Pre-Conditions

- Deal existe no pipeline (pelo menos um contato feito)
- Informações básicas do prospect disponíveis

## Steps

### Step 0: Niche Context Detection (sales-chief) — MANDATORY FIRST
- elicit: true
- Perguntar: "O que você vende, para quem, e qual o ticket médio?"
- Classificar em niche profile:
  - infoproduto_low_ticket (R$47-997, B2C, volume alto)
  - infoproduto_high_ticket (R$2k-30k, B2C high-touch)
  - saas_smb ($1k-20k ARR, B2B)
  - saas_enterprise ($50k+ ARR, B2B enterprise)
  - services_consulting ($5k-200k, B2B)
  - ecommerce_dtc (R$50-2k, B2C volume)
- Carregar primary/secondary/deprioritized agents para o nicho
- Output: niche_profile (tipo, agents prioritários, adaptações)
- VETO: Não avançar sem niche detectado — routing sem contexto de nicho é ineficaz

### Step 1: Coleta de Contexto (sales-chief)
- elicit: true
- Perguntar: qual o deal, valor estimado, estágio atual, há quanto tempo está no pipeline
- Output: deal_context_map

### Step 2: Discovery Diagnostic (agent conforme niche)
- Se niche = saas_enterprise ou services_consulting → neil-rackham (SPIN completo)
- Se niche = saas_smb ou infoproduto_high_ticket → neil-rackham (SPIN simplificado, 2-3 perguntas)
- Se niche = infoproduto_low_ticket ou ecommerce_dtc → SKIP SPIN (usar Stadium Pitch diagnostic via chet-holmes)
- Para nichos com SPIN: Verificar Situation, Problems, Implications, Need-Payoff
- Para nichos sem SPIN: Verificar Buyer's Pyramid position, education level, urgency triggers
- Scoring: 0-10 em cada dimensão relevante
- Output: discovery_diagnostic_score

### Step 3: Gap Analysis (keenan)
- Mapear Current State do prospect
- Mapear Future State desejado
- Quantificar o Gap (impacto financeiro, operacional, pessoal)
- Verificar se gap esta claro e quantificado
- Output: gap_analysis_report

### Step 4: Risk Assessment (sales-chief)
- Identificar: champion exists? decision maker engaged? budget confirmed? timeline real?
- Classificar deal: Green (>70% chance), Yellow (40-70%), Red (<40%)
- Output: risk_classification

### Step 5: Recommendation (sales-chief)
- Based on Steps 2-4, recomendar proximo passo:
  - Se SPIN score baixo -> "Voltar para discovery com neil-rackham"
  - Se Gap nao quantificado -> "Executar gap-analysis com keenan"
  - Se negociacao travada -> "Usar tactical empathy com chris-voss"
  - Se tudo pronto -> "Fechar com david-sandler"
- Output: next_step_recommendation

## Veto Conditions

- VETO se deal nao tem contato direto com prospect (apenas dados secundarios)
- VETO se nao ha informacao minima (nome da empresa + problema)
- VETO se deal ja foi perdido (diagnostico post-mortem usa task separada)

## Output

```yaml
deal_diagnosis:
  deal_name: "{prospect} - {valor}"
  niche_context:
    profile: "infoproduto_low_ticket|infoproduto_high_ticket|saas_smb|saas_enterprise|services_consulting|ecommerce_dtc"
    ticket_medio: "R$X / $X ARR"
    model: "B2B|B2C"
    primary_agents: ["agent1", "agent2"]
    deprioritized: ["agent3"]
    adaptations_applied: ["..."]
  discovery_score:
    method: "SPIN|SPIN_simplified|Stadium_Pitch_diagnostic"
    dimensions:
      - name: "X"
        score: X/10
    total: X/40
  gap_analysis:
    current_state: "..."
    future_state: "..."
    gap_quantified: "$X/month"
  risk:
    classification: "Green|Yellow|Red"
    champion: true|false
    decision_maker: true|false
    budget_confirmed: true|false
    timeline: "Q1|Q2|..."
  recommendation:
    next_step: "..."
    agent: "..."
    niche_adaptation: "..."
    urgency: "high|medium|low"
```

## Completion Criteria

- [ ] Niche context detectado e classificado (Step 0)
- [ ] Discovery diagnostic score calculado (método conforme niche)
- [ ] Gap quantificado em termos financeiros
- [ ] Risk classification definida (Green/Yellow/Red)
- [ ] Próximo passo recomendado com agent específico + adaptações de niche
- [ ] Output formatado conforme template
