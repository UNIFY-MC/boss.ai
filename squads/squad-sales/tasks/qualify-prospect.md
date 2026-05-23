# Task: Qualify Prospect

**Task ID:** qualify-prospect
**Purpose:** Qualificacao completa de um prospect usando SPIN Selling (Rackham), Gap Selling (Keenan) e Sandler Qualification (Pain, Budget, Decision) para determinar fit e prioridade no pipeline
**Agent:** sales-chief (orquestra), neil-rackham (SPIN discovery), keenan (gap quantification), david-sandler (Pain/Budget/Decision)
**Mode:** Interactive
**Execution Type:** Agent

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prospect_name | string | Yes | Nome do contato principal (first + last name) |
| company | string | Yes | Nome da empresa do prospect |
| deal_size | string | Yes | Valor estimado do deal (ex: "$50k ARR", "R$120k/ano") |
| industry | string | Yes | Setor/industria da empresa (ex: "SaaS B2B", "E-commerce", "Educacao") |
| pain_signals | string | Yes | Sinais de dor observados no outreach ou inbound (ex: "reclamou de churn alto no LinkedIn", "pediu demo apos webinar sobre retencao") |

---

## Pre-Conditions

- Prospect respondeu a pelo menos uma tentativa de outreach (reply, booking, inbound form) -- não qualificar cold leads sem resposta
- Informações básicas do prospect estão disponíveis (nome, empresa, cargo)
- Deal não está marcado como "Lost" ou "Disqualified" no pipeline
- Existe pelo menos um pain signal identificado (mesmo que superficial)

---

## Steps

### Step 0: Niche Context Detection (sales-chief) — MANDATORY FIRST
- **elicit: true**
- Se niche_context não foi recebido do diagnose-deal, perguntar:
  - "O que você vende? (curso, SaaS, consultoria, produto físico, etc.)"
  - "Qual o ticket médio?"
  - "B2B ou B2C?"
- Classificar em niche profile e carregar agents primários/depriorizados
- **Impacto na qualificação por niche:**
  - **infoproduto_low_ticket:** Qualificação é rápida (3 perguntas de dor + urgência). SPIN completo não se aplica. Foco: o prospect tem o problema e pode pagar?
  - **infoproduto_high_ticket:** Qualificação média (Pain Funnel simplificado + Gap). Foco: dor pessoal profunda + capacidade de investimento
  - **saas_smb:** Qualificação padrão (SPIN + Gap + Budget/Decision). Squad opera em modo completo
  - **saas_enterprise:** Qualificação profunda (SPIN completo + stakeholder mapping + consensus). Ciclo longo
  - **services_consulting:** Qualificação consultiva (SPIN + Gap + fit de expertise). Confiança é chave
  - **ecommerce_dtc:** Qualificação não se aplica no formato tradicional — foco em Buyer's Pyramid e education
- **Output:** niche_profile + qualification_depth (light|standard|deep)

### Step 1: Initial Research (sales-chief)
- **elicit: true**
- Coletar e validar com o usuário (escopo adaptado ao niche):
  - Se B2B: Cargo/título, tamanho da empresa, stack atual, eventos trigger, histórico de interação
  - Se B2C high-ticket: Situação pessoal, motivação, tentativas anteriores, capacidade de investimento
  - Se B2C low-ticket: Pain signals, canal de origem, nível de consciência do problema
- Pesquisar contexto da indústria quando relevante (B2B e services)
- **Output:** prospect_research_brief

### Step 2: Discovery (agent conforme niche)
- **elicit: true**
- Se niche = saas_enterprise ou services_consulting → neil-rackham (SPIN completo)
- Se niche = saas_smb ou infoproduto_high_ticket → neil-rackham (SPIN simplificado: 2P + 2I + 1N)
- Se niche = infoproduto_low_ticket ou ecommerce_dtc → SKIP SPIN. Usar 3 perguntas rápidas de dor:
  1. "Qual o maior problema que você enfrenta com [área]?"
  2. "Há quanto tempo isso te incomoda?"
  3. "O que já tentou para resolver?"
- Aplicar a sequência adequada para mapear a realidade do prospect:

**S -- Situation Questions (Mapear o cenario atual)**
- Qual o processo atual que o prospect usa para resolver o problema?
- Quantas pessoas estao envolvidas nesse processo?
- Que ferramentas/sistemas usam hoje?
- Ha quanto tempo operam dessa forma?

**P -- Problem Questions (Identificar dificuldades explicitas)**
- Onde o processo atual falha ou gera frustacao?
- Com que frequencia essas falhas ocorrem?
- Qual a consequencia imediata desses problemas?
- O que ja tentaram fazer para resolver?

**I -- Implication Questions (Amplificar a gravidade)**
- Se esse problema continuar por mais 6-12 meses, qual o impacto financeiro?
- Como isso afeta a moral do time? Turnover? Produtividade?
- Que oportunidades estao sendo perdidas por causa disso?
- Qual o custo de nao agir (cost of inaction)?

**N -- Need-Payoff Questions (Conectar a solucao ao valor)**
- Se esse problema fosse resolvido, quanto tempo/dinheiro o prospect economizaria?
- Como a vida do time mudaria no dia-a-dia?
- Que metas do negocio seriam desbloqueadas?
- Qual seria o ROI estimado de uma solucao eficaz?

- **Scoring:** 0-10 em cada dimensao (S, P, I, N). Score >= 7 em P e I indica dor forte.
- **Output:** spin_discovery_map

### Step 3: Gap Quantification (keenan)
- Aplicar framework Gap Selling para traduzir a dor em numeros concretos:

**Current State (onde o prospect esta hoje)**
- Resultado atual: metricas de performance (ex: churn rate 8%, CAC $500, NPS 32)
- Processos atuais: como fazem as coisas (manual, semi-automatizado, com ferramenta X)
- Dor vivida: frustracao, retrabalho, perda de receita, risco operacional
- Impacto emocional: como o problema afeta o prospect pessoalmente (stress, reputacao, job security)

**Future State (onde o prospect quer chegar)**
- Resultado desejado: metricas-alvo (ex: churn rate 3%, CAC $200, NPS 65)
- Processos ideais: como querem que funcione
- Ganhos esperados: receita, eficiencia, satisfacao, competitive advantage
- Impacto emocional: alivio, confianca, reconhecimento

**The Gap (a distancia entre os dois)**
- Gap financeiro: diferenca em receita perdida, custo evitavel, margem nao capturada
- Gap operacional: horas desperdicadas, retrabalho, gargalos
- Gap estrategico: posicao competitiva perdida, market share, velocidade de inovacao
- **Quantificar o gap em valor monetario mensal e anual**

- **Output:** gap_quantification_report

### Step 4: Pain Validation (david-sandler)
- **elicit: true**
- Aplicar o Sandler Pain Funnel para descer ate Level 3 (Technical -> Business Impact -> Personal):

**Level 1 -- Technical Pain (Superficie)**
- O que nao funciona? Qual o sintoma visivel?
- Validar: prospect confirma que o problema existe e afeta operacao

**Level 2 -- Business Impact Pain (Intermediario)**
- Quanto custa esse problema para o negocio?
- Perguntas de aprofundamento:
  - "Quanto voce estimaria que isso custa por mes/trimestre?"
  - "Quantos deals voces perdem por causa disso?"
  - "Se nao resolver em 6 meses, o que acontece?"
- Validar: prospect quantificou ou concordou com quantificacao do impacto

**Level 3 -- Personal Pain (Profundo)**
- Como isso afeta o prospect pessoalmente? (Bonus, promocao, reputacao, stress)
- Perguntas de aprofundamento:
  - "Como isso afeta voce pessoalmente no dia-a-dia?"
  - "Seu chefe sabe que isso esta acontecendo? O que ele/ela pensa?"
  - "Se voce resolvesse isso, como ficaria sua posicao na empresa?"
- Validar: prospect expressou impacto pessoal -- este e o indicador mais forte de que vai comprar

- **Pain Score:** 1-5 (1=sintoma superficial, 5=dor pessoal profunda articulada)
- **Output:** pain_validation_report

### Step 5: Budget & Decision Qualification (david-sandler)
- Aplicar os passos Money e Decision do Sandler Submarine:

**Money Step (Budget/Investment)**
- O prospect tem budget alocado para resolver esse problema?
- Se nao tem budget formal: consegue aprovar internamente? Em quanto tempo?
- Range de investimento que estao preparados para considerar
- Perguntas-chave:
  - "Voces ja investiram em solucoes para isso antes? Quanto?"
  - "Tem budget dedicado para esse tipo de projeto esse ano?"
  - "Se a solucao custasse [range], isso estaria dentro do que podem aprovar?"
- **Budget Score:** 1-5 (1=sem budget, 3=budget possivel mas nao confirmado, 5=budget aprovado e alocado)

**Decision Step (Processo de Decisao)**
- Quem toma a decisao final? (nome e cargo)
- Qual o processo de aprovacao? (decision maker unico, comite, board?)
- Quantas pessoas precisam concordar?
- Qual o timeline de decisao realista?
- Ha campeao interno (champion) que vai defender a compra internamente?
- Perguntas-chave:
  - "Se voce gostar da proposta, qual o proximo passo interno?"
  - "Quem mais precisa estar envolvido na decisao?"
  - "Ja passaram por um processo de compra similar? Como funcionou?"
- **Decision Score:** 1-5 (1=nao sabe quem decide, 3=conhece o processo mas sem acesso ao DM, 5=acesso direto ao decision maker com champion ativo)

- **Output:** budget_decision_report

### Step 6: Qualification Verdict (sales-chief)
- Consolidar scores de todos os steps em rubrica final:

**Scoring Rubric:**

| Dimensao | Peso | Source | Score |
|----------|------|--------|-------|
| SPIN Discovery Depth | 20% | Step 2 (media de S,P,I,N normalizada para 1-5) | X/5 |
| Gap Quantified | 25% | Step 3 (gap monetizado e validado) | X/5 |
| Pain Level | 25% | Step 4 (Sandler Pain depth) | X/5 |
| Budget Confirmed | 15% | Step 5 (Money step) | X/5 |
| Decision Access | 15% | Step 5 (Decision step) | X/5 |

**Weighted Score = sum(dimensao_score * peso)**

**Verdict Classification:**

| Grade | Weighted Score | Significado | Acao Recomendada |
|-------|---------------|-------------|------------------|
| **A -- Hot** | >= 4.0 | Prospect altamente qualificado, dor profunda, budget e DM acessiveis | Priorizar. Agendar proposta/demo imediatamente. Alocar senior closer. |
| **B -- Warm** | 3.0 - 3.9 | Prospect qualificado com gaps enderecaveis | Nutrir. Resolver gaps especificos (ex: conseguir acesso ao DM, confirmar budget). Follow-up em 1-2 semanas. |
| **C -- Cool** | 2.0 - 2.9 | Prospect parcialmente qualificado, faltam elementos criticos | Mover para nurture. Educate via conteudo. Re-qualificar em 30-60 dias. |
| **D -- Dead** | < 2.0 | Prospect desqualificado -- sem dor, sem budget, ou sem acesso a decisao | Desqualificar. Arquivar no CRM com motivo. Nao investir mais tempo. |

- **Output:** qualification_verdict

---

## Veto Conditions

- **VETO** se nao ha informacao minima do prospect (nome + empresa) -- nao ha base para qualificar
- **VETO** se prospect ja foi formalmente desqualificado neste ciclo -- usar task de requalificacao
- **VETO** se nenhuma dor foi encontrada apos Step 2 (SPIN Discovery) -- sem dor nao ha deal
  - Nesse caso: registrar motivo, mover para nurture, sugerir re-engagement em 60-90 dias
- **VETO** se prospect nao respondeu a nenhum outreach -- qualificacao requer conversa bilateral

---

## Output

```yaml
qualification_report:
  metadata:
    task_id: qualify-prospect
    date: "{ISO-8601}"
    agents_involved:
      - sales-chief
      - neil-rackham
      - keenan
      - david-sandler

  prospect:
    name: "{prospect_name}"
    company: "{company}"
    title: "{cargo}"
    industry: "{industry}"
    deal_size: "{deal_size}"

  scores:
    spin_discovery:
      situation: X/10
      problem: X/10
      implication: X/10
      need_payoff: X/10
      normalized: X/5
      weight: 20%
    gap_quantification:
      current_state_mapped: true|false
      future_state_mapped: true|false
      gap_monetized: "$X/month | $X/year"
      score: X/5
      weight: 25%
    pain_level:
      level_1_technical: true|false
      level_2_business: true|false
      level_3_personal: true|false
      deepest_pain: "descricao da dor mais profunda encontrada"
      score: X/5
      weight: 25%
    budget:
      has_budget: true|false
      budget_range: "$X - $Y"
      approval_timeline: "X weeks"
      score: X/5
      weight: 15%
    decision:
      decision_maker: "{nome, cargo}"
      process: "solo|committee|board"
      champion_exists: true|false
      timeline: "X weeks to decision"
      score: X/5
      weight: 15%

  verdict:
    weighted_score: X.X/5.0
    grade: "A|B|C|D"
    classification: "Hot|Warm|Cool|Dead"
    recommended_action: "descricao do proximo passo"
    recommended_agent: "agent name for next action"
    follow_up_date: "{ISO-8601 or null}"

  gaps_to_close:
    - dimension: "..."
      current: X/5
      needed: X/5
      action: "descricao do que fazer para fechar o gap"

  notes: "observacoes adicionais do sales-chief"
```

---

## Completion Criteria

- [ ] Research do prospect completo (empresa, cargo, industria, triggers)
- [ ] SPIN Discovery executado nas 4 dimensoes com scoring
- [ ] Gap quantificado em valor monetario (mensal e anual)
- [ ] Pain validado ate Level 3 (Personal) ou justificativa documentada de porque nao chegou la
- [ ] Budget investigado com range e timeline de aprovacao
- [ ] Decision process mapeado (quem decide, como, em quanto tempo)
- [ ] Weighted score calculado com pesos corretos
- [ ] Verdict (A/B/C/D) definido com acao recomendada especifica
- [ ] Output formatado conforme template YAML
- [ ] Gaps identificados com acoes concretas para cada um
