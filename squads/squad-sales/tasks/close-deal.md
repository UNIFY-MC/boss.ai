# Task: Close Deal

**Task ID:** close-deal
**Purpose:** Fechar deal qualificado usando Sandler Submarine System + Challenger tension quando necessário
**Agent:** david-sandler (primary — Sandler Submarine System), challenger-sale (secondary — Constructive Tension se prospect travar)
**Mode:** Interactive
**Execution Type:** Agent

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deal_context | string | Yes | Contexto completo do deal (prospect, valor, estágio, histórico de interações) |
| qualification_report | object | Yes | Relatório de qualificação gerado pela task qualify-prospect |
| pain_level | integer (1-10) | Yes | Nível de dor identificado (Thermometer scale — mínimo 7 para close) |
| budget_confirmed | boolean | Yes | Budget range confirmado pelo prospect |
| decision_process | string | Yes | Processo decisório mapeado (quem decide, etapas, veto power) |
| timeline | string | Yes | Timeline declarada pelo prospect para decisão |

## Pre-Conditions

- Task `qualify-prospect` completada com resultado positivo (score A, B ou C)
- Pain identificada em Level 3 (Personal) — prospect conectou o problema ao impacto pessoal na carreira, reputação ou stress
- Budget range confirmado — prospect declarou faixa de investimento compatível
- Decision maker identificado e com acesso direto (não apenas influenciador)

## Niche Context Notes

O closing adapta-se ao nicho:
- **infoproduto_low_ticket:** Closing é a PÁGINA DE VENDAS, não uma call. Sandler Submarine não se aplica. Foco: copy com urgência + escassez + prova social. Redirecionar para copy squad se necessário
- **infoproduto_high_ticket:** Closing é uma call 1-a-1 (30-60min). Sandler Pain Funnel + Up-Front Contract são centrais. Constructive Tension se prospect travar
- **saas_smb:** Closing padrão. Sandler Submarine completo. Demo → Proposta → Follow-up → Close
- **saas_enterprise:** Closing complexo (múltiplas reuniões, legal review, procurement). Sandler Decision mapping + Challenger consensus mobilization
- **services_consulting:** Closing consultivo. Proposta como diagnóstico, não como catálogo. Sandler Up-Front Contract é essencial
- **ecommerce_dtc:** Closing é checkout optimization, não call. Redirecionar para copy/design squad

**VETO:** Não aplicar Sandler Submarine completo (7 compartimentos) para infoproduto low-ticket ou ecommerce. É overkill que não se aplica ao modelo de venda.

---

## Steps

### Step 1: Pre-Close Checklist (david-sandler)
- elicit: true
- Verificar se todos os 7 compartimentos do Sandler Submarine estão completos:
  1. **Bonding & Rapport** — Relação de confiança estabelecida? Prospect se sente confortável sendo honesto?
  2. **Up-Front Contract** — Expectativas claras em cada interação anterior? Agendas mutuamente acordadas?
  3. **Pain** — Dor identificada em 3 níveis (técnico, impacto no negócio, pessoal)? Thermometer >= 7?
  4. **Budget** — Prospect revelou budget range? Entende o investimento necessário? Sem "sticker shock"?
  5. **Decision** — Processo mapeado? Todos os decision makers identificados? Timeline confirmada?
  6. **Fulfillment** — Proposta/apresentação técnica feita? Prospect entende como a solução resolve a dor?
  7. **Post-Sell** — Plano pós-venda discutido? Próximos passos após o "sim" estão claros?
- Para cada compartimento incompleto: PARAR e preencher antes de avançar para o close
- Output: pre_close_audit (7 items, status de cada: complete/incomplete/needs_attention)

### Step 2: Up-Front Contract para a Reunião de Close (david-sandler)
- Montar o script do Up-Front Contract para a conversa de fechamento:
  - **Propósito:** "O objetivo de hoje é tomar uma decisão — sim, não, ou o que precisa mudar para ser sim"
  - **Tempo:** Duração acordada para a reunião
  - **Agenda:** O que será coberto (recap da dor, solução, investimento, decisão)
  - **Outcome:** Resultado esperado ao final — decisão clara, sem "vou pensar"
  - **Permissão para "Não":** Reforçar que "não" é uma resposta perfeitamente aceitável
- Output: ufc_close_script

### Step 3: Pain Recap (david-sandler)
- Reconectar o prospect à dor de Level 3 (pessoal)
- Usar Thermometer 1-10: "Da última vez que conversamos, você mencionou que [dor pessoal]. Numa escala de 1-10, onde você está hoje?"
  - Se Thermometer caiu (< 7): investigar o que mudou — urgência diminuiu? Problema foi mitigado?
  - Se Thermometer subiu ou manteve (>= 7): reforçar e avançar
- Reversal technique: "Você mencionou [consequência pessoal]. O que acontece se nada mudar nos próximos 6 meses?"
- Output: pain_recap (nível atualizado, frases-chave do prospect, urgência confirmada)

### Step 4: Decision Map (david-sandler)
- elicit: true
- Confirmar o processo decisório completo:
  - **Quem decide?** Decision maker com autoridade final identificado e presente?
  - **Quem mais está envolvido?** Influenciadores, gatekeepers, usuários finais
  - **Qual o processo?** Etapas internas (comitê, aprovação finance, legal review)
  - **Qual a timeline?** Data-alvo para decisão. Se vago, pedir data específica
  - **O que acontece se disserem "não"?** (Negative Reverse) — entender as consequências e alternativas do prospect
  - **Há algo que pode impedir a decisão?** Budget freeze, reorganização, prioridades concorrentes
- Output: decision_map (stakeholder list, processo, timeline firme, bloqueadores identificados)

### Step 5: Constructive Tension (challenger-sale)
- Ativar APENAS se prospect estiver travando (stalling, "vou pensar", adiando decisão)
- Técnicas:
  - **Reframe:** Apresentar uma perspectiva que o prospect não considerou — mudar o frame de "custo da solução" para "custo da inação"
  - **Cost-of-Delay Calculation:** Quantificar em R$/mês o custo de não resolver o problema agora
    - Fórmula: (impacto mensal do gap) x (meses de atraso) = custo total de delay
  - **Teach-Tailor-Take Control:** Ensinar algo novo sobre o problema, personalizar para a realidade do prospect, direcionar para ação
- Output: tension_application (reframe usado, cost-of-delay calculado, reação do prospect)

### Step 6: The Close (david-sandler)
- Pedir a decisão diretamente — sem manipulação, sem tricks:
  - "Baseado em tudo que discutimos, o que você gostaria de fazer?"
- Se objeção final surgir → aplicar Negative Reverse Selling:
  - Prospect diz "está caro" → "Você provavelmente tem razão, talvez não faça sentido. O que aconteceria se vocês não resolvessem esse problema?"
  - Prospect diz "preciso pensar" → "Geralmente quando alguém diz que precisa pensar, significa que algo não está certo. O que está te incomodando?"
  - Prospect diz "preciso falar com X" → "Entendo perfeitamente. O que você vai recomendar para X?"
- Confirmar commitment:
  - Decisão verbal clara (sim/não/condições)
  - Se sim: próximos passos concretos com datas
  - Se não: entender os motivos reais (sem insistência — respeitar a decisão)
  - Se condicional: definir exatamente o que precisa acontecer e quando
- Output: close_result (decisão, condições, objeções tratadas, próximos passos)

### Step 7: Post-Sell (david-sandler)
- Inocular contra buyer's remorse IMEDIATAMENTE após o "sim":
  - "Nos próximos dias, pode aparecer uma voz na sua cabeça dizendo 'será que fiz a escolha certa?' — isso é normal. Quando acontecer, lembre que [reconectar à dor pessoal e ao resultado desejado]"
- Confirmar próximos passos concretos:
  - Quem faz o quê, até quando
  - Contrato/proposta formal — prazo para envio e assinatura
  - Kick-off/onboarding — data e participantes
  - Ponto de contato primário pós-venda
- Thank-you message personalizada (reforçar a decisão, não o produto)
- Output: post_sell_plan (inoculação feita, próximos passos com datas, handoff definido)

---

## Veto Conditions

- **VETO** se pain não está em Level 3 (pessoal) — prospect não conectou o problema ao impacto na carreira/reputação/stress
- **VETO** se budget não está confirmado — prospect não declarou faixa de investimento ou disse "não sei"
- **VETO** se não há acesso ao decision maker — apenas influenciadores na mesa, quem decide está ausente
- **VETO** se qualification score é D (desqualificado) — deal não atende critérios mínimos de qualificação
- **VETO** se task qualify-prospect não foi completada — não pular etapas do Submarine

---

## Output

```yaml
close_execution:
  deal_name: "{prospect} - {valor}"
  date: "YYYY-MM-DD"

  pre_close_audit:
    bonding_rapport: "complete|incomplete|needs_attention"
    up_front_contract: "complete|incomplete|needs_attention"
    pain: "complete|incomplete|needs_attention"
    budget: "complete|incomplete|needs_attention"
    decision: "complete|incomplete|needs_attention"
    fulfillment: "complete|incomplete|needs_attention"
    post_sell: "complete|incomplete|needs_attention"
    submarine_ready: true|false

  ufc_close_script:
    purpose: "..."
    time: "X min"
    agenda: ["recap dor", "solução", "investimento", "decisão"]
    outcome: "decisão clara"
    permission_to_no: true

  pain_recap:
    level_3_pain: "..."
    thermometer_before: X/10
    thermometer_now: X/10
    urgency: "high|medium|low"
    key_phrases: ["...", "..."]

  decision_map:
    decision_maker: "{nome} - {cargo}"
    influencers: ["...", "..."]
    process: "..."
    timeline: "YYYY-MM-DD"
    blockers: ["...", "..."]
    what_if_no: "..."

  tension_applied: true|false
  tension_details:
    reframe: "..."
    cost_of_delay: "R$ X/mês x Y meses = R$ Z"
    prospect_reaction: "..."

  close_result:
    decision: "yes|no|conditional"
    conditions: ["...", "..."]
    objections_handled:
      - objection: "..."
        technique: "negative_reverse"
        resolution: "..."
    next_steps: ["...", "..."]

  post_sell_plan:
    remorse_inoculation: "..."
    contract_deadline: "YYYY-MM-DD"
    kickoff_date: "YYYY-MM-DD"
    primary_contact: "{nome}"
    handoff_notes: "..."
```

---

## Completion Criteria

- [ ] Pre-Close Checklist: todos os 7 compartimentos do Submarine verificados
- [ ] Up-Front Contract para reunião de close montado e aprovado
- [ ] Pain Recap: Thermometer atualizado e urgência confirmada (>= 7)
- [ ] Decision Map: processo completo com timeline firme e bloqueadores mapeados
- [ ] Constructive Tension aplicada (se necessário) com cost-of-delay calculado
- [ ] Close executado: decisão clara obtida (sim/não/condicional)
- [ ] Post-Sell: inoculação contra buyer's remorse feita e próximos passos definidos com datas
- [ ] Output formatado conforme template YAML
