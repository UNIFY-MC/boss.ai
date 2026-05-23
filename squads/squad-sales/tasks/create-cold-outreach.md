# Task: Create Cold Outreach Sequence
# Squad: squad-sales
# Agents: aaron-ross (primary), jeb-blount, chet-holmes
# Pattern: SL-TP-001

## Task Anatomy

| Field | Value |
|-------|-------|
| **ID** | create-cold-outreach |
| **task_name** | Create Cold Outreach Sequence |
| **status** | active |
| **responsible_executor** | aaron-ross (primary), jeb-blount, chet-holmes |
| **execution_type** | agent |
| **elicit** | true (Steps 1-2) |
| **complexity** | high |
| **estimated_time** | 40-60min |
| **purpose** | Criar sequência completa de cold outreach (email + call + social) |

---

## Objetivo

Construir uma operação completa de cold outreach combinando três frameworks battle-tested:
- **Aaron Ross (Cold Calling 2.0)** -- Referral-first email sequences, pipeline math, SDR playbook
- **Jeb Blount (Fanatical Prospecting)** -- Call scripts, LDA objection handling, prospecting blocks, Golden Hours
- **Chet Holmes (Dream 100)** -- Target selection estratégica, tiered list, persistence calendar

O output é um pacote executável que um SDR pode usar no dia seguinte.

---

## Inputs

```yaml
required:
  - target_icp: string           # Perfil do cliente ideal (cargo, empresa, indústria)
  - industry: string             # Indústria/vertical alvo
  - pain_hypothesis: string      # Hipótese de dor principal (mínimo 1, ideal 3)
  - deal_size_range: string      # Faixa de deal size (ex: "R$50k-200k/ano")

optional:
  - channel_preference: string   # email | call | social | all (default: all)
  - product_service: string      # Produto/serviço sendo vendido
  - competitor_landscape: list    # Concorrentes conhecidos do prospect
  - existing_case_studies: list   # Cases/provas sociais disponíveis
  - current_pipeline_size: number # Tamanho atual do pipeline (para pipeline math)
  - monthly_quota: number        # Meta mensal em revenue (para pipeline math)
  - average_sales_cycle: string  # Ciclo médio de venda (ex: "45 dias")
```

---

## Pre-Conditions

- [ ] ICP definido (mínimo: cargo-alvo, tamanho de empresa, indústria)
- [ ] Pelo menos uma pain hypothesis documentada
- [ ] Deal size range estimado (não precisa ser exato)
- [ ] Niche context identificado (tipo de produto, ticket, B2B/B2C)

**Se pre-conditions não forem atendidas:** Ativar elicitação para coletar dados mínimos antes de prosseguir.

## Niche Adaptation Rules

O outreach muda radicalmente conforme o nicho. Antes de executar qualquer Step, classificar:

| Niche | Outreach Model | Framework Primário | Canal Principal |
|-------|---------------|-------------------|-----------------|
| infoproduto_low_ticket | Education-first funnel | Stadium Pitch (Chet Holmes) | Social + email marketing |
| infoproduto_high_ticket | Application funnel + call | Dream 100 parceiros + call scripts | DM + call + webinar |
| saas_smb | Multi-touch sequence | Cold Calling 2.0 (Aaron Ross) | Email + LinkedIn + call |
| saas_enterprise | Account-based outreach | Cold Calling 2.0 + Dream 100 | Email + referral + event |
| services_consulting | Relationship-first | Dream 100 + thought leadership | LinkedIn + email + referral |
| ecommerce_dtc | Content + ads | Stadium Pitch + Fanatical Prospecting | Social + email + ads |

**VETO:** Não criar cold email sequence para infoproduto low-ticket (não faz sentido prospectar 1-a-1 para R$97). Redirecionar para Stadium Pitch educacional.

---

## Steps

### Step 1: ICP Refinement (aaron-ross)

**Agent:** @aaron-ross | **Elicit:** true

Refinar o ICP usando o framework Predictable Revenue:

1. **Validar ICP recebido** -- Cargo, indústria, tamanho de empresa, geografia
2. **Seeds-Nets-Spears Allocation:**
   - **Seeds** (referrals, word-of-mouth) -- % de esforço alocado
   - **Nets** (inbound marketing, content) -- % de esforço alocado
   - **Spears** (outbound direto, cold outreach) -- % de esforço alocado
3. **Definir Buyer Personas** -- Decision maker, influencer, champion, blocker
4. **Mapear trigger events** -- Eventos que indicam momento de compra (contratação, funding, mudança de cargo, expansão)

**Elicitação obrigatória:**
```
1. Quem é o decision maker final? (cargo exato)
2. Quem influencia a decisão? (champion interno)
3. Qual o tamanho ideal de empresa? (faixa de funcionários ou revenue)
4. Qual a distribuição atual Seeds/Nets/Spears? (ou desejada)
5. Quais trigger events já observaram que indicam timing bom?
```

**Output:** `icp_refined.yaml` com personas, triggers e alocação Seeds-Nets-Spears.

---

### Step 2: Dream 100 Selection (chet-holmes)

**Agent:** @chet-holmes | **Elicit:** true

Aplicar o framework Dream 100 para selecionar alvos estratégicos:

1. **Dream 100 Criteria** -- Definir critérios de seleção (revenue potencial, fit, acessibilidade)
2. **Tiered Target List:**
   - **Tier 1 (Top 10)** -- Whales, maior potencial de revenue, exigem abordagem personalizada
   - **Tier 2 (Top 30)** -- Alto valor, abordagem semi-personalizada
   - **Tier 3 (Top 60)** -- Bom fit, abordagem escalável
3. **Persistence Calendar** -- Frequência de touchpoints por tier:
   - Tier 1: contato a cada 2 semanas (mínimo 12 touches)
   - Tier 2: contato a cada 3 semanas (mínimo 8 touches)
   - Tier 3: contato a cada 4 semanas (mínimo 6 touches)
4. **Best Buyer Strategy** -- Para cada Tier 1, mapear a melhor forma de entrada (evento, referral, educação, social proof)

**Elicitação obrigatória:**
```
1. Já têm uma lista de prospects ou estamos partindo do zero?
2. Qual o critério #1 de priorização? (revenue potencial, fit estratégico, acessibilidade)
3. Têm algum "dream client" específico em mente?
4. Qual o budget disponível para outreach? (afeta táticas de Tier 1)
```

**Output:** `dream_100_list.yaml` com tiers, critérios e persistence calendar.

---

### Step 3: Email Sequence (aaron-ross)

**Agent:** @aaron-ross

Criar sequência de 5 emails seguindo Cold Calling 2.0 (referral-first approach):

| # | Email | Timing | Propósito | Framework |
|---|-------|--------|-----------|-----------|
| 1 | **Referral Email** | Dia 0 | Pedir indicação para a pessoa certa (NÃO vender) | "Quem cuida de [área] na [empresa]?" |
| 2 | **Value Bump** | Dia 3 | Compartilhar insight relevante (education-based) | Chet Holmes education-based selling |
| 3 | **Pain Probe** | Dia 7 | Conectar dor específica ao contexto do prospect | Hipótese de dor + pergunta calibrada |
| 4 | **Social Proof** | Dia 12 | Case study ou resultado de empresa similar | "Empresa X no [setor] conseguiu [resultado]" |
| 5 | **Breakup Email** | Dia 18 | Último contato, tom de despedida (alta taxa de resposta) | "Parece que não é o momento..." |

**Para cada email gerar:**
- Subject line (A/B: versão curta e versão curiosidade)
- Body (máximo 125 palavras -- regra Aaron Ross)
- CTA claro (1 único call-to-action)
- Variáveis de personalização (`{{nome}}`, `{{empresa}}`, `{{trigger}}`)

**Princípios Cold Calling 2.0:**
- NUNCA vender no primeiro email -- sempre buscar referral
- Emails curtos (< 125 palavras)
- 1 CTA por email
- Subject line sem hype, tom de peer-to-peer
- Personalização mínima viável (nome + empresa + trigger)

**Output:** 5 templates de email completos com variáveis.

---

### Step 4: Call Script (jeb-blount)

**Agent:** @jeb-blount

Criar scripts de cold call usando Fanatical Prospecting + Sales EQ:

#### 4.1 Cold Call Script Principal

Estrutura Jeb Blount em 5 blocos:

1. **Opening (3 segundos)** -- Capturar atenção, tom confiante, sem pedir permissão
   - "Oi [nome], aqui é [seu nome] da [empresa]."
2. **Bridge (10 segundos)** -- Conectar ao motivo da ligação
   - Usar trigger event ou referral como ponte
3. **Because (15 segundos)** -- Motivo legítimo para a ligação
   - Conectar à pain hypothesis
4. **Ask (5 segundos)** -- Pedido direto de tempo
   - "Quero 15 minutos para mostrar como [resultado]. Terça ou quarta funciona melhor?"
5. **Handle Objection -- LDA Framework:**
   - **L**edge (concordar): "Entendo totalmente..."
   - **D**isrupt (interromper padrão): "Isso é exatamente por que liguei..."
   - **A**sk (pedir novamente): Repetir o ask com ângulo diferente

#### 4.2 Objeções Mapeadas

Preparar respostas LDA para as 5 objeções mais comuns:
1. "Não tenho tempo agora"
2. "Manda por email"
3. "Já temos solução"
4. "Não tenho budget"
5. "Não sou a pessoa certa"

#### 4.3 Voicemail Script

Script de voicemail (máximo 20 segundos):
- Nome + empresa (3 seg)
- Motivo da ligação ligado a resultado (10 seg)
- CTA + número (7 seg)
- Tom: energético mas não desesperado

**Output:** Cold call script + 5 respostas LDA + voicemail script.

---

### Step 5: Social Touches (jeb-blount)

**Agent:** @jeb-blount

Criar sequência de social selling touches (LinkedIn-first):

| # | Touch | Timing | Ação | Objetivo |
|---|-------|--------|------|----------|
| 1 | **Profile View** | Dia -1 | Visitar perfil do prospect | Gerar notificação (curiosidade) |
| 2 | **Connect** | Dia 0 | Enviar convite com nota personalizada (< 300 chars) | Entrar na rede |
| 3 | **Engage** | Dia 2-5 | Curtir/comentar 2-3 posts do prospect | Gerar familiaridade |
| 4 | **Value DM** | Dia 7 | Enviar conteúdo relevante (artigo, dado, insight) | Abrir conversa |
| 5 | **Bridge DM** | Dia 14 | Conectar ao problema/dor, pedir call | Converter para reunião |

**Templates para cada touch:**
- Connection request note (3 versões: referral, conteúdo, trigger)
- Value DM templates (2 versões: insight-based, question-based)
- Bridge DM templates (2 versões: direto, suave)

**Princípio Jeb Blount:** Social touches amplificam -- nunca substituem -- telefone e email. O prospecting fanatical usa TODOS os canais simultaneamente.

**Output:** 5 social touch templates + connection request variations.

---

### Step 6: Prospecting Block Plan (jeb-blount)

**Agent:** @jeb-blount

Criar plano de blocos de prospecting diário:

#### 6.1 Daily Schedule

```
06:00 - 07:00  Preparação (research, personalização de emails)
07:00 - 08:00  GOLDEN HOUR #1 -- Cold calls (decisores antes do dia lotar)
08:00 - 09:00  Email sends (sequência automática + personalizações)
09:00 - 09:30  Social touches (LinkedIn engagement)
09:30 - 12:00  Reuniões e follow-ups
12:00 - 13:00  Almoço + social media engagement passivo
13:00 - 14:00  GOLDEN HOUR #2 -- Cold calls (pós-almoço, segundo pico)
14:00 - 15:00  Follow-up calls + voicemails
15:00 - 16:00  Atualização de CRM + pesquisa para amanhã
16:00 - 17:00  GOLDEN HOUR #3 -- Cold calls (final do dia, tomadores de decisão disponíveis)
17:00 - 17:30  Revisão do dia + planejamento amanhã
```

#### 6.2 Activity Targets (Diários)

| Atividade | Target Mínimo | Target Ideal |
|-----------|---------------|--------------|
| Cold calls | 25 | 50 |
| Emails enviados | 30 | 50 |
| Social touches | 10 | 20 |
| Voicemails | 15 | 25 |
| Conversas reais | 5 | 10 |
| Reuniões agendadas | 1 | 3 |

#### 6.3 Golden Hours Rules (Jeb Blount)

- **Golden Hours são sagradas** -- NENHUMA reunião, email ou task administrativa durante Golden Hours
- **Telefone primeiro** -- Sempre priorizar ligação sobre email/social
- **RBTs (Reflex-Based Turnarounds)** -- Praticar respostas LDA antes de cada bloco
- **30-Day Rule** -- A prospecção que você faz hoje gera resultados em 30 dias

**Output:** Plano diário + activity targets + Golden Hours rules.

---

### Step 7: Pipeline Math (aaron-ross)

**Agent:** @aaron-ross

Calcular a matemática reversa do pipeline (Predictable Revenue model):

#### 7.1 Fórmulas

```
Meta mensal de revenue ÷ Deal size médio = Deals necessários/mês
Deals/mês ÷ Win rate = Oportunidades necessárias/mês
Oportunidades/mês ÷ Conversion rate (lead→opp) = Leads qualificados/mês
Leads/mês ÷ Response rate = Contatos necessários/mês
Contatos/mês ÷ 20 dias úteis = Contatos/dia
```

#### 7.2 Benchmarks (ajustar conforme indústria)

| Métrica | Conservative | Moderate | Aggressive |
|---------|-------------|----------|------------|
| Email response rate | 3% | 7% | 12% |
| Call connect rate | 5% | 10% | 15% |
| Lead-to-opportunity | 10% | 20% | 30% |
| Opportunity-to-close | 15% | 25% | 35% |
| Average sales cycle | 60 dias | 45 dias | 30 dias |

#### 7.3 Calcular para 3 cenários

Gerar pipeline math completo para cenários Conservative, Moderate e Aggressive com:
- Total de atividades diárias necessárias (calls + emails + social)
- Número de SDRs necessários (se atividades > capacidade de 1 pessoa)
- Tempo estimado para atingir pipeline saudável (3x da meta)
- Breakeven point do investimento em SDR

**Output:** Pipeline math com 3 cenários + recomendação de headcount.

---

## Veto Conditions

```yaml
veto_conditions:
  - "Sem ICP definido (nem cargo, nem indústria, nem tamanho) = NÃO INICIAR"
  - "Sem pain hypothesis (nenhuma hipótese de dor) = NÃO INICIAR"
  - "Target list < 10 prospects identificáveis = BLOQUEAR Step 2 até expandir lista"
  - "Deal size não estimado = BLOQUEAR Step 7 (pipeline math impossível sem deal size)"
  - "Email com mais de 125 palavras = REESCREVER (regra Cold Calling 2.0)"
  - "Call script sem LDA para as 5 objeções top = INCOMPLETO"
```

---

## Output

O output final é um `outreach_package` consolidado:

```yaml
outreach_package:
  metadata:
    task_id: create-cold-outreach
    created_at: "{{date}}"
    icp: "{{target_icp}}"
    industry: "{{industry}}"
    channels: "{{channel_preference}}"

  icp_refined:
    personas: []              # Decision maker, influencer, champion, blocker
    trigger_events: []        # Eventos que indicam timing
    seeds_nets_spears: {}     # Alocação % por tipo

  dream_100:
    tier_1: []                # Top 10 targets + entry strategy
    tier_2: []                # Top 30 targets
    tier_3: []                # Top 60 targets
    persistence_calendar: {}  # Frequência por tier

  email_sequence:
    email_1_referral: {}      # Subject A/B, body, CTA, variáveis
    email_2_value_bump: {}
    email_3_pain_probe: {}
    email_4_social_proof: {}
    email_5_breakup: {}

  call_scripts:
    cold_call_main: {}        # Script 5-blocos Jeb Blount
    lda_objections:           # 5 objeções com respostas LDA
      - objection: ""
        ledge: ""
        disrupt: ""
        ask: ""
    voicemail: {}             # Script 20 segundos

  social_sequence:
    touch_1_profile_view: {}
    touch_2_connect: {}
    touch_3_engage: {}
    touch_4_value_dm: {}
    touch_5_bridge_dm: {}

  prospecting_plan:
    daily_schedule: {}        # Blocos horários com Golden Hours
    activity_targets: {}      # Targets diários por atividade
    golden_hours_rules: []    # Regras invioláveis

  pipeline_math:
    conservative: {}          # Cenário conservador
    moderate: {}              # Cenário moderado
    aggressive: {}            # Cenário agressivo
    headcount_recommendation: ""
    time_to_pipeline: ""
```

**Formato de entrega:** Markdown estruturado com seções colapsáveis, pronto para copiar/colar em CRM ou playbook.

---

## Completion Criteria

- [ ] ICP refinado com personas e trigger events definidos
- [ ] Dream 100 list com 3 tiers e persistence calendar
- [ ] 5 emails completos com subject A/B, body (< 125 palavras), CTA e variáveis
- [ ] Cold call script com 5 blocos + respostas LDA para 5 objeções
- [ ] Voicemail script (< 20 segundos)
- [ ] Social touch sequence com 5 touches e templates
- [ ] Prospecting block plan com Golden Hours e activity targets
- [ ] Pipeline math com 3 cenários e recomendação de headcount
- [ ] Todas as veto conditions verificadas e passando

---

## Error Handling

| Erro | Ação |
|------|------|
| ICP vago demais | Ativar elicitação no Step 1 antes de prosseguir |
| Indústria desconhecida | Pesquisar benchmarks via web search, ajustar pipeline math |
| Sem case studies disponíveis | Substituir Email 4 por insight de mercado ou dado estatístico |
| Channel preference = single channel | Gerar apenas os steps relevantes, avisar que multichannel performa 3x melhor |
| Pipeline math irreal (> 100 calls/dia) | Recomendar headcount adicional, não reduzir targets |

---

## Handoff

| Direção | Agent/Squad | Condição |
|---------|-------------|----------|
| **From** | sales-chief *prospect | Diagnóstico indica necessidade de outbound |
| **To** | neil-rackham *spin-discovery | Quando reunião é agendada via outreach |
| **To** | keenan *gap-analysis | Para aprofundar dor após primeira conversa |
| **To** | jeb-blount *pipeline-audit | Após 30 dias para revisar métricas vs targets |

---

*Task: create-cold-outreach v1.0.0 -- squad-sales*
