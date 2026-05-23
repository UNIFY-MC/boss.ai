# Task: Create Follow-Up Sequence
# Squad: squad-sales
# Agents: david-sandler, jeb-blount, chet-holmes, chris-voss, neil-rackham, keenan, aaron-ross, challenger-sale
# Pattern: SL-TP-006

## Task Anatomy

| Field | Value |
|-------|-------|
| **ID** | create-followup-sequence |
| **task_name** | Create Follow-Up Sequence |
| **status** | active |
| **responsible_executor** | sales-chief (orchestrator), david-sandler, jeb-blount, chet-holmes, chris-voss, neil-rackham, keenan, aaron-ross, challenger-sale |
| **execution_type** | agent |
| **elicit** | true (Steps 0-1) |
| **complexity** | high |
| **estimated_time** | 60-90min |
| **purpose** | Criar sequência completa de follow-up para cada estágio do funil de vendas, do pós-discovery até pós-close, adaptada ao niche e com templates prontos para uso |

---

## Inputs

```yaml
required:
  - deal_stage: string              # Estágio atual: post-discovery | post-demo | post-proposal | nurture | went-dark | post-close | launch
  - prospect_name: string           # Nome do contato principal
  - company_or_audience: string     # Empresa (B2B) ou audiência/lista (B2C)
  - product_service: string         # O que está sendo vendido

optional:
  - niche_context: string           # Niche profile (se já classificado em task anterior)
  - deal_size: string               # Valor do deal ou ticket (ex: "R$497", "$50k ARR")
  - pain_identified: string         # Dor principal descoberta na qualificação
  - gap_quantified: string          # Gap financeiro identificado (output de qualify-prospect)
  - decision_maker: string          # Nome e cargo do decisor
  - champion: string                # Nome do champion interno (B2B)
  - demo_date: string               # Data da demo/apresentação (para timing)
  - proposal_sent_date: string      # Data de envio da proposta
  - last_contact_date: string       # Última interação (para went-dark)
  - competitor_mentioned: string    # Concorrente que o prospect mencionou
  - objections_raised: list         # Objeções levantadas durante o processo
  - case_studies: list              # Cases relevantes disponíveis
  - launch_date: string             # Data do lançamento (apenas para infoproduto)
  - nurture_content_library: list   # Conteúdos educacionais disponíveis para nurture
  - trigger_events: list            # Eventos que sinalizam prontidão para comprar
```

---

## Niche Adaptation Rules

O follow-up muda radicalmente conforme o niche. Antes de executar qualquer Step, classificar:

| Niche | Follow-Up Model | Canal Primário | Tom | Cadência | Follow-Up Pessoal? |
|-------|----------------|----------------|-----|----------|---------------------|
| infoproduto_low_ticket | Automação pura (email sequences) | Email + WhatsApp broadcast | Direto, storytelling | Rápida (24h entre toques) | NAO -- apenas automação, zero 1-on-1 |
| infoproduto_high_ticket | Consultivo + Relacional | WhatsApp/DM pessoal + Email + Call | Empático, autoridade | Média (48-72h entre toques) | SIM -- follow-up pessoal via WhatsApp/DM |
| saas_smb | Multi-channel value-driven | Email + LinkedIn + Call | Profissional, conciso | Média (48h-5 dias) | SIM -- multi-canal com cadências aaron-ross |
| saas_enterprise | Account-based personalizado | Email + LinkedIn + Call + Video | Executivo, data-driven | Lenta (3-7 dias entre toques) | SIM -- personalizado, multi-stakeholder |
| services_consulting | Relationship + Thought-leadership | LinkedIn + Email + Call + Referral | Consultivo, expertise | Média-lenta (3-5 dias) | SIM -- profundamente pessoal |
| ecommerce_dtc | Automação pós-compra | Email + Retargeting + SMS | Amigável, útil | Rápida (24-48h) | NAO -- automação, sem follow-up pessoal |

**VETO:** Não criar follow-up pessoal 1-on-1 para infoproduto_low_ticket ou ecommerce_dtc. Redirecionar para automação.

---

## Pre-Conditions

- Prospect passou por pelo menos uma interação significativa (discovery, demo, proposta ou compra)
- Existe pelo menos uma dor ou interesse identificado -- não fazer follow-up genérico sem contexto
- Deal não está marcado como "Lost/Disqualified" (exceto went-dark, que tenta re-engajar)
- Para post-proposal: qualificação (qualify-prospect) deve ter sido executada com score mínimo B
- Para launch: aplica-se SOMENTE a niches infoproduto_low_ticket e infoproduto_high_ticket
- Para nurture: prospect deve ter demonstrado interesse mas sinalizado "agora não"

---

## Steps

### Step 0: Niche Context Detection (sales-chief) -- MANDATORY FIRST

- **elicit: true**
- Se niche_context não foi recebido de task anterior (qualify-prospect ou diagnose-deal), perguntar:
  - "O que você vende? (curso online, SaaS, consultoria, produto físico, etc.)"
  - "Qual o ticket médio?"
  - "Vende para empresas (B2B) ou consumidor final (B2C)?"
- Classificar no niche profile correspondente
- Carregar regras de adaptação da tabela acima
- **Output:** niche_profile + follow_up_model + language + tone + cadence

### Step 1: Map Follow-Up Triggers (sales-chief)

- **elicit: true**
- Identificar qual sequência ativar baseado no deal_stage informado:

| Trigger | Sequência | Agentes Primários | Framework Chave | Prioridade |
|---------|-----------|-------------------|-----------------|------------|
| post-discovery | Step 2 | neil-rackham + keenan | SPIN recap + Gap reinforcement | Alta -- manter momentum |
| post-demo | Step 3 | keenan + david-sandler + challenger-sale | Gap anchoring + Negative Reverse + Commercial Insight | Crítica -- janela de decisão aberta |
| post-proposal | Step 4 | david-sandler + chris-voss | Up-Front Contract + Tactical Empathy + No-oriented | Crítica -- deal em risco a cada dia |
| nurture | Step 5 | chet-holmes + challenger-sale + aaron-ross | Stadium Pitch + Teaching + Systematic Cadences | Média -- ciclo longo de 90 dias |
| went-dark | Step 6 | chris-voss + jeb-blount + david-sandler | Labels + Fanatical Persistence + Reverse Psychology | Média -- recuperação requer paciência |
| post-close | Step 7 | chet-holmes + david-sandler | Client Bonding + Post-Sell | Média -- nurture de longo prazo |
| launch | Step 8 | jeb-blount + chet-holmes | Fanatical Urgency + Stadium Pitch | Alta -- janela temporal limitada |

- Se deal_stage não foi informado, perguntar: "Em que momento você está com esse prospect?"
- Validar que o trigger é coerente com o niche (ex: launch só para infoproduto)
- **Output:** active_sequence + assigned_agents + timing_rules

---

### Step 2: Post-Discovery Follow-Up (neil-rackham + keenan)

**Objetivo:** Manter o momentum após a primeira conversa de discovery, reforçar as dores descobertas e garantir a próxima reunião.

**Framework:** SPIN Selling (Need-Payoff reinforcement) + Gap Selling (gap quantification recap)

**Sequência: 3 emails | Timing: 24h, 72h, 7 dias**

---

**Email 2.1 -- Recap de Discovery (24h após discovery)**
Agent: neil-rackham (SPIN recap)

> **Subject (saas_enterprise):** Following up on our conversation -- key findings
>
> Hi {prospect_name},
>
> Thank you for your time yesterday. I wanted to recap the key points we discussed to make sure we are aligned.
>
> **What I heard:**
> - Your team currently spends {X hours/week} on {process} using {current tool} (Situation)
> - The main friction points are {problem_1} and {problem_2} (Problem)
> - If this continues for another {timeframe}, the projected cost is {gap_quantified} in {lost revenue / wasted resources / missed opportunities} (Implication)
>
> **What this means:**
> The gap between where you are and where you want to be is approximately {gap_value} per {month/quarter}. That is not a small number, and based on what you shared, it is getting worse, not better.
>
> I have a few ideas on how we could close that gap, and I would like to walk you through them. Would {date_option_1} or {date_option_2} work for a 30-minute session?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Sobre a nossa conversa -- o que ficou claro pra mim
>
> {prospect_name}, tudo bem?
>
> Queria te agradecer pela conversa de ontem. Fiquei pensando no que você me contou e quero compartilhar o que mais chamou minha atenção.
>
> O que eu entendi da sua situação:
> - Você já tentou {tentativa_anterior} e não teve o resultado que esperava
> - O principal problema hoje é {dor_principal}, e isso está te custando {impacto_pessoal}
> - Se nada mudar nos próximos {prazo}, a tendência é {consequência}
>
> Eu já vi essa situação muitas vezes. E a boa notícia é que existe um caminho claro para sair dela. Quero te mostrar como na nossa próxima conversa.
>
> Posso te ligar {dia_1} ou {dia_2} às {horário}?
>
> Abraço,
> {sender_name}

---

**Email 2.2 -- Aprofundar Implicações (72h após discovery)**
Agent: keenan (Gap amplification)

> **Subject (saas_enterprise):** The cost of waiting -- a quick analysis
>
> Hi {prospect_name},
>
> I have been thinking about the numbers we discussed. Let me share a rough calculation:
>
> **Current state:** {current_metric} resulting in {current_outcome}
> **Desired state:** {target_metric} which would deliver {target_outcome}
> **The gap:** {gap_value} per {period} -- that is {annualized_gap} over the next 12 months
>
> Here is what concerns me: every {week/month} that passes without addressing this, you are not just staying flat -- you are falling further behind because {market_pressure / competitor_movement / team_attrition}.
>
> I have attached a brief case study from {similar_company} who faced the same gap. They closed it in {timeframe} and saw {result}.
>
> Worth a 20-minute call to explore whether those results are achievable for {company}?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** O preço de esperar mais um pouco
>
> {prospect_name},
>
> Fiquei refletindo sobre o que você me contou. Quero ser honesto com você.
>
> Hoje você está em um lugar onde {situação_atual}. E o seu objetivo é {estado_desejado}. A distância entre os dois é {gap_descrição}.
>
> Mas aqui está o que muita gente não percebe: cada mês que passa sem resolver isso, você não está no zero -- você está indo pra trás. Porque {razão_urgência}.
>
> Conheço {nome_case} que estava numa situação parecida. Em {prazo}, conseguiu {resultado}.
>
> Quero te mostrar como isso pode funcionar pra você. Ainda faz sentido a gente conversar?
>
> Abraço,
> {sender_name}

---

**Email 2.3 -- Bridge para próxima reunião (7 dias após discovery)**
Agent: neil-rackham (Need-Payoff bridge)

> **Subject (saas_enterprise):** Quick question about {company}'s {quarter} priorities
>
> Hi {prospect_name},
>
> I wanted to circle back before the week ends. Last time we spoke, you mentioned that {need_payoff_statement} -- solving {problem} would unlock {benefit} for your team.
>
> I have put together a brief overview of how we have helped teams in {industry} achieve exactly that. It is not a pitch -- it is a 15-minute walkthrough of what the first 90 days would look like.
>
> If {problem} is still a priority for {quarter}, I would love to show you. If priorities have shifted, completely understand -- just let me know and I will adjust.
>
> What works for you?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Uma última coisa antes do fim de semana
>
> {prospect_name},
>
> Na nossa conversa você mencionou que se resolvesse {problema}, você finalmente conseguiria {benefício}. Isso ficou comigo.
>
> Preparei um material curto mostrando como outros alunos na mesma situação conseguiram {resultado_concreto} em {prazo}. Não é propaganda -- é um passo a passo real.
>
> Se {problema} ainda é prioridade pra você, quero te mostrar. Se mudou alguma coisa, sem problema nenhum -- me conta e a gente ajusta.
>
> O que faz sentido pra você?
>
> Abraço,
> {sender_name}

**Adaptação por niche:**
- **infoproduto_low_ticket:** Substituir sequência por nurture automatizado (3 conteúdos de valor via email/WhatsApp que educam sobre o problema e levam à página de vendas)
- **saas_smb:** Usar versão enterprise com linguagem mais direta e ciclo mais curto (48h, 4 dias, 6 dias)
- **ecommerce_dtc:** Post-discovery não se aplica -- pular para Step 7 (pós-compra)

---

### Step 3: Post-Demo/Post-Presentation Follow-Up (keenan + david-sandler + challenger-sale)

**Objetivo:** Capitalizar o momentum da demo, ancorar o valor demonstrado, resolver objeções não ditas, entregar commercial insight e avançar o compromisso.

**Framework:** Gap Selling (value anchoring) + Sandler Submarine (Negative Reverse Selling) + Challenger Sale (Teach-Tailor-Take Control)

**Sequência: 5 touchpoints | Timing: mesmo dia, 48h, 5 dias, 8 dias, 12 dias**

---

**Email 3.1 -- Recap de Valor + Gap (mesmo dia, até 2h após demo)**
Agent: keenan (value anchoring)

> **Subject (saas_enterprise):** Recap: how {product} closes your {gap_value} gap
>
> Hi {prospect_name},
>
> Thank you for joining the demo today. I want to make sure the value is crystal clear, so here is a quick summary tied to the specific gaps we identified:
>
> | Your Challenge | What You Saw Today | Expected Impact |
> |---|---|---|
> | {problem_1} | {feature_1} | {outcome_1} |
> | {problem_2} | {feature_2} | {outcome_2} |
> | {problem_3} | {feature_3} | {outcome_3} |
>
> **Bottom line:** Based on your current {gap_metric}, implementing this would recover approximately {gap_value} in the first {timeframe}.
>
> I have attached the recording and a one-page summary for anyone on your team who could not attend.
>
> What questions came up after we hung up?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Resumo do que você viu hoje -- e o que muda pra você
>
> {prospect_name},
>
> Obrigado por ter assistido à apresentação. Quero garantir que ficou claro o que você viu e como se aplica à sua situação.
>
> Sua situação atual: {situação_atual}
> O que você viu funcionando: {demonstração_chave}
> O que muda pra você: {resultado_esperado}
>
> O {nome_case} estava exatamente onde você está. Depois de {prazo}, ele {resultado_concreto}.
>
> Quero ouvir o que você está pensando. Pode me mandar uma mensagem quando puder?
>
> Abraço,
> {sender_name}

---

**Email 3.2 -- Endereçar preocupações não ditas (48h após demo)**
Agent: david-sandler (negative reverse selling)

> **Subject (saas_enterprise):** Honest question about your evaluation
>
> Hi {prospect_name},
>
> At this point in the process, most teams I work with have a few concerns they have not voiced yet. Things like:
>
> - "This looks good, but will my team actually adopt it?"
> - "The ROI makes sense on paper, but what if our situation is different?"
> - "I liked the demo, but I am not sure I can get budget approved"
>
> Any of those sound familiar? Or is there something else on your mind?
>
> I would rather surface concerns now than have them quietly derail the process later. If this is not the right fit, that is perfectly fine to say -- I would rather know now so neither of us wastes time.
>
> What is your honest take?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Posso ser sincero com você?
>
> {prospect_name},
>
> Depois de apresentações como a de anteontem, a maioria das pessoas pensa uma dessas coisas:
>
> - "Gostei, mas será que funciona pra mim?"
> - "Faz sentido, mas agora não é o melhor momento"
> - "O valor é claro, mas o investimento me preocupa"
>
> Alguma dessas passou pela sua cabeça? Ou tem outra coisa?
>
> Prefiro que você me fale agora do que a gente perder o contato por algo que poderia ser resolvido em 5 minutos de conversa.
>
> E se depois de conversar você decidir que não faz sentido, tudo bem. Prefiro um "não" honesto do que um "vou pensar" que não leva a lugar nenhum.
>
> Me conta?
>
> Abraço,
> {sender_name}

---

**Email 3.3 -- Commercial Insight (5 dias após demo)**
Agent: challenger-sale (Teach -- entregar insight que reframe o problema)

> **Subject (saas_enterprise):** A trend your competitors are already acting on
>
> Hi {prospect_name},
>
> I want to share something that goes beyond our demo conversation. We have been tracking a pattern across {industry}:
>
> **The insight:** {industry_trend_or_data_point} is changing how companies handle {problem_area}. Companies that adapted early are seeing {metric_improvement}. Companies that waited are now paying {cost_of_delay}.
>
> Here is what this means for {company} specifically:
> - Your current approach of {current_approach} was best practice in {past_year}
> - The market has shifted toward {new_approach} because {reason}
> - The window to adapt without disruption closes in approximately {timeframe}
>
> This is not about our product -- it is about your competitive position. {product} happens to address this, but the insight stands regardless.
>
> Want me to walk you through the full analysis? I built a brief for {company} specifically.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Uma tendência que muda tudo sobre {área}
>
> {prospect_name},
>
> Quero compartilhar algo que vai além da nossa apresentação. Tenho acompanhado um padrão no mercado:
>
> **O insight:** {tendência_ou_dado} está mudando como as pessoas abordam {área_problema}. Quem se adaptou cedo está vendo {resultado_positivo}. Quem esperou está pagando {custo_de_esperar}.
>
> O que isso significa pra você:
> - A abordagem que você usa hoje ({abordagem_atual}) funcionava em {ano_passado}
> - O mercado migrou para {nova_abordagem} porque {razão}
> - A janela para se adaptar sem atrito está se fechando
>
> Isso não é sobre o meu produto -- é sobre a sua posição. Quer que eu te mostre a análise completa?
>
> Abraço,
> {sender_name}

---

**Email 3.4 -- Champion Enablement (8 dias após demo)**
Agent: keenan (gap-to-result bridge) + challenger-sale (Tailor para stakeholders)

> **Subject (saas_enterprise):** Materials for your internal review -- tailored to each stakeholder
>
> Hi {prospect_name},
>
> I know you likely need to build consensus internally. To make that easier, I prepared materials tailored to each stakeholder's perspective:
>
> **For {decision_maker} (executive sponsor):**
> - One-page ROI summary: {gap_value} gap → {projected_recovery} in {timeframe}
> - Risk of inaction analysis
>
> **For {technical_lead} (implementation owner):**
> - Technical integration overview
> - Timeline and resource requirements
>
> **For {finance_contact} (budget holder):**
> - TCO comparison: current state vs. proposed
> - Payback period analysis
>
> Feel free to forward these directly or I can present to the group. Whatever makes the internal conversation easier.
>
> How would you prefer to handle it?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Preparei algo pra te ajudar na decisão
>
> {prospect_name},
>
> Sei que decisões assim precisam de clareza. Preparei um material especial pra você:
>
> - Comparativo: onde você está vs. onde vai estar em {prazo}
> - Depoimento de {nome_case} em situação parecida com a sua
> - Análise de custo: {preço} vs. o custo de continuar com {problema} por mais {período}
>
> Não precisa decidir agora. Mas quero que você tenha tudo em mãos quando estiver pronto/a.
>
> Posso te enviar por WhatsApp ou prefere email?
>
> Abraço,
> {sender_name}

---

**Email 3.5 -- Advance Commitment (12 dias após demo)**
Agent: david-sandler (Up-Front Contract)

> **Subject (saas_enterprise):** Where do we stand?
>
> Hi {prospect_name},
>
> I want to be respectful of your time, so let me be direct.
>
> When we last spoke, you mentioned that solving {problem} was a {quarter} priority and that the impact of {gap_value} was significant enough to act on. We also agreed that the next step would be {agreed_next_step}.
>
> I want to make sure we are still aligned. Here is what I propose:
>
> 1. **If this is still a priority:** Let us schedule {next_step} for this week. I will prepare {deliverable} in advance.
> 2. **If priorities have changed:** Completely understand. Just let me know and I will follow up at a better time.
> 3. **If you have decided to go a different direction:** That is okay too. I would just appreciate knowing so I can close out my notes.
>
> Which of the three fits where you are right now?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Quero respeitar o seu tempo
>
> {prospect_name},
>
> Vou ser direto porque respeito o seu tempo.
>
> Na nossa conversa, você disse que resolver {problema} era prioridade e que o impacto de {gap_descrição} era grande demais pra ignorar. Combinamos que o próximo passo seria {próximo_passo}.
>
> Quero entender onde estamos:
>
> 1. Se ainda é prioridade -- vamos marcar {próximo_passo} essa semana.
> 2. Se o momento mudou -- sem problema, me diz e a gente retoma quando fizer sentido.
> 3. Se você decidiu seguir outro caminho -- tudo bem também, só me avisa pra eu atualizar aqui.
>
> Qual das três?
>
> Abraço,
> {sender_name}

**Adaptação por niche:**
- **infoproduto_low_ticket:** Substituir por sequência de 3 emails com depoimentos + CTA para página de vendas (não há "demo" nesse contexto)
- **saas_smb:** Comprimir timing para mesmo dia, 48h, 4 dias, 7 dias, 10 dias
- **ecommerce_dtc:** Não se aplica -- pular para Step 7
- **services_consulting:** Incluir touchpoint de call entre emails 3.2 e 3.3 (relacionamento é mais forte por voz)

---

### Step 4: Post-Proposal Follow-Up (david-sandler + chris-voss)

**Objetivo:** Manter controle do processo após envio da proposta, resolver o "vou pensar", criar urgência real e fechar ou obter decisão clara.

**Framework:** Sandler Submarine (Up-Front Contract, Reversing, Post-Sell) + Chris Voss (Tactical Empathy, Labels, Mirrors, No-oriented questions)

**Sequência: 6 touchpoints | Timing: dia 1, 3, 7, 14, 21, 30**

---

**Email 4.1 -- Confirmar recebimento + Up-Front Contract (dia 1 após proposta)**
Agent: david-sandler (Up-Front Contract)

> **Subject (saas_enterprise):** Proposal follow-up -- next steps and timeline
>
> Hi {prospect_name},
>
> I wanted to confirm you received the proposal I sent yesterday. Before we move forward, I think it is important to align on what happens next so there are no surprises on either side.
>
> Here is what I suggest as our Up-Front Agreement:
>
> - **You review** the proposal and share it with {stakeholders} by {date_review}
> - **We schedule** a 20-minute call on {date_call} to discuss questions, concerns, or modifications
> - **At the end of that call**, we agree on one of three outcomes: move forward, adjust the proposal, or part ways as friends
>
> Does that timeline work? If not, what would be more realistic?
>
> I would rather have an honest "no" than a lingering "maybe." Both of us deserve clarity.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Proposta enviada -- como vamos fazer
>
> {prospect_name},
>
> Quero confirmar que você recebeu a proposta. E quero combinar uma coisa antes de mais nada.
>
> Minha sugestão de como funciona daqui pra frente:
>
> - Você analisa a proposta até {data_revisão}
> - A gente faz uma ligação de 15 minutos em {data_call} pra tirar dúvidas
> - No final dessa ligação, você me diz uma de três coisas: "vamos fechar", "preciso ajustar algo" ou "não é pra mim agora"
>
> Qualquer uma das três é válida. Prefiro um "não" honesto do que um "vou pensar" que fica no ar.
>
> Esse prazo funciona pra você?
>
> Abraço,
> {sender_name}

---

**Email 4.2 -- Resolver o "vou pensar" (dia 3 após proposta)**
Agent: david-sandler (Reversing)

> **Subject (saas_enterprise):** Quick thought on your evaluation process
>
> Hi {prospect_name},
>
> By now you have had a few days with the proposal. In my experience, this is the point where one of three things is happening:
>
> 1. You have questions but have not had time to ask them
> 2. Something in the proposal does not quite fit and you are not sure how to bring it up
> 3. Other priorities took over and this slipped down the list
>
> All three are completely normal. The worst outcome for both of us is silence -- because it usually means something is off but fixable.
>
> If there is a concern, I would rather hear it now. Most of the time, what looks like a dealbreaker is actually a 5-minute conversation. And if after that conversation you decide it is not the right fit, I will respect that completely.
>
> What is really going on?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** O que está passando pela sua cabeça?
>
> {prospect_name},
>
> Já faz uns dias que enviei a proposta. Pela minha experiência, nesse ponto uma de três coisas está acontecendo:
>
> 1. Você tem dúvidas mas não teve tempo de perguntar
> 2. Algo não encaixou direito e você não sabe como falar
> 3. Outras coisas tomaram prioridade e isso ficou pra depois
>
> As três são normais. O pior cenário é o silêncio -- porque quase sempre significa que tem algo errado mas resolvível.
>
> Se tem alguma preocupação, prefiro ouvir agora. Na maioria das vezes, o que parece um impedimento é na verdade uma conversa de 5 minutos.
>
> Me conta o que está acontecendo de verdade?
>
> Abraço,
> {sender_name}

---

**Email 4.3 -- Tactical Empathy (dia 7 após proposta)**
Agent: chris-voss (Labeling + Mirroring)

> **Subject (saas_enterprise):** It seems like the timing might not be right
>
> Hi {prospect_name},
>
> It seems like there might be some hesitation on your end, and I completely understand that.
>
> If I had to guess, it sounds like you saw the value during our conversations, but something shifted between then and now. Maybe internal priorities changed. Maybe the budget conversation was harder than expected. Maybe someone on the team pushed back.
>
> Whatever it is, it seems like this decision is weighing on you more than it should.
>
> I have found that the biggest risk in situations like this is not making the wrong decision -- it is making no decision and letting the {gap_value} gap continue to grow while the proposal sits in someone's inbox.
>
> Would it help to have a 10-minute call just to clear the air? No pitch, no pressure. Just two people figuring out if there is still a path forward.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Parece que alguma coisa mudou
>
> {prospect_name},
>
> Parece que tem alguma hesitação da sua parte, e eu entendo completamente.
>
> Se eu tivesse que adivinhar, parece que você viu valor nas nossas conversas, mas algo mudou entre aquele momento e agora. Talvez o momento não seja o que parecia. Talvez o investimento pesou mais do que esperava. Talvez alguém te disse que não vale a pena.
>
> Seja o que for, parece que essa decisão está pesando mais do que deveria.
>
> O que eu vejo com frequência é que o maior risco não é tomar a decisão errada -- é não tomar decisão nenhuma e deixar {consequência_gap} continuar acontecendo enquanto a proposta fica parada.
>
> Uma ligação de 10 minutos ajudaria a esclarecer? Sem pitch, sem pressão. Só pra entender se tem um caminho.
>
> Abraço,
> {sender_name}

---

**Email 4.4 -- Deadline Anchor (dia 14 após proposta)**
Agent: david-sandler (Monkey's Paw close)

> **Subject (saas_enterprise):** Proposal validity and a transparent update
>
> Hi {prospect_name},
>
> I want to give you a transparent update on our side.
>
> The proposal I sent is based on {pricing_condition} which is valid through {deadline_date}. After that, {what_changes} -- not because of artificial urgency, but because {legitimate_reason}.
>
> Additionally, our implementation calendar for {quarter} is filling up. If we start by {ideal_start_date}, we can have you live by {go_live_date}. If we push past that, the next available slot is {later_date}.
>
> I am not trying to rush your decision. I just want to make sure you have complete information so you can make the best choice for {company}.
>
> Can we schedule 15 minutes this week to either move forward or formally close this out?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Preciso te falar sobre a proposta
>
> {prospect_name},
>
> Quero ser transparente sobre uma coisa.
>
> A proposta que te enviei tem condições que são válidas até {data_validade}. Depois disso, {o_que_muda} -- não por pressão artificial, mas porque {razão_real}.
>
> Além disso, as vagas para a próxima turma estão preenchendo. Se você entrar até {data_ideal}, você começa com {benefício_timing}. Se passar disso, a próxima oportunidade é {data_posterior}.
>
> Não quero te apressar. Só quero que você tenha toda a informação pra tomar a melhor decisão pra você.
>
> Dá pra gente conversar essa semana?
>
> Abraço,
> {sender_name}

---

**Email 4.5 -- No-Oriented Question (dia 21 após proposta)**
Agent: chris-voss (No-oriented question -- técnica assinatura Voss)

> **Subject (saas_enterprise):** Have you decided not to move forward?
>
> Hi {prospect_name},
>
> I have not heard back, so I want to ask directly:
>
> Have you decided not to move forward with this?
>
> If so, no hard feelings. I will close your file and wish you the best. If something else is going on -- timing, budget, internal politics -- I am happy to work with whatever reality looks like.
>
> A simple "yes, we passed" or "no, still considering" would help me know where things stand.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Você decidiu não avançar?
>
> {prospect_name},
>
> Não tive retorno, então quero perguntar diretamente:
>
> Você decidiu não seguir em frente com isso?
>
> Se sim, sem ressentimento. Encerro o acompanhamento e te desejo tudo de bom. Se tem outra coisa acontecendo -- timing, dinheiro, dúvida -- estou disposto a trabalhar com o que for.
>
> Um simples "sim, passei" ou "não, ainda estou pensando" já me ajuda.
>
> Abraço,
> {sender_name}

---

**Email 4.6 -- Last Stand (dia 30 após proposta)**
Agent: chris-voss + david-sandler (loss framing + Sandler "going away")

> **Subject (saas_enterprise):** Should I close your file?
>
> Hi {prospect_name},
>
> I have reached out a few times and I have not heard back, so I want to ask a direct question:
>
> Have you decided not to move forward with this?
>
> If so, no hard feelings at all. I will close your file on my end and wish you the best in tackling {problem}. If circumstances change in the future, my door is always open.
>
> If something else is going on -- timing, budget, internal politics -- I am happy to work with whatever reality looks like on your end. But I cannot help if I do not know what is happening.
>
> Either way, I would appreciate a quick reply so we both have closure.
>
> Respectfully,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Posso encerrar aqui?
>
> {prospect_name},
>
> Te mandei algumas mensagens e não tive retorno, então quero te fazer uma pergunta direta:
>
> Você desistiu de resolver {problema}?
>
> Se sim, sem ressentimento nenhum. Vou encerrar o seu acompanhamento aqui e te desejo tudo de bom. Se a situação mudar no futuro, estou por aqui.
>
> Se tem outra coisa acontecendo -- timing, dinheiro, dúvida -- estou disposto a trabalhar com o que for. Mas não consigo ajudar se não sei o que está acontecendo.
>
> De qualquer forma, uma resposta rápida ajudaria os dois a terem clareza.
>
> Abraço,
> {sender_name}

**Adaptação por niche:**
- **infoproduto_low_ticket:** Proposta não se aplica -- nesse niche o "close" é na página de vendas. Substituir por sequência de carrinho abandonado (3 emails: lembrete, prova social, urgência)
- **saas_smb:** Comprimir prazos para 1, 3, 5, 10, 14, 21 dias
- **services_consulting:** Incluir touchpoint de call entre emails 4.2 e 4.3 (relacionamento é mais forte por voz)
- **ecommerce_dtc:** Não se aplica

---

### Step 5: Nurture Sequence (chet-holmes + challenger-sale + aaron-ross)

**Objetivo:** Manter relacionamento ativo com prospects que demonstraram interesse mas sinalizaram "agora não". Educar, reforçar o gap periodicamente e monitorar trigger events até que estejam prontos para comprar.

**Framework:** Chet Holmes (Stadium Pitch -- educar antes de vender, Strategy 11 -- persistência) + Challenger Sale (Teach -- commercial insights) + Aaron Ross (Systematic Cadences -- 30-Day Rule, disciplina de pipeline)

**Ciclo: 90 dias | 6 touchpoints a cada 2 semanas | Multi-canal**

---

**Touchpoint 5.1 -- Conteúdo Educacional #1 (dia 1 de nurture)**
Agent: chet-holmes (Stadium Pitch -- entrega de dados impactantes)

> **Subject (saas_enterprise):** Research: 3 data points that explain why {problem_area} is getting worse
>
> Hi {prospect_name},
>
> I came across some data I thought you would find relevant, given our previous conversations about {problem}:
>
> - {data_point_1}: {explanation}
> - {data_point_2}: {explanation}
> - {data_point_3}: {explanation}
>
> The takeaway: {provocative_conclusion}. This is not about us -- it is about the market you are operating in.
>
> I wrote a short analysis on what companies in {industry} are doing about it. Want me to send it over?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** 3 dados que explicam por que {problema} está piorando
>
> {prospect_name},
>
> Encontrei uns dados que achei que iam te interessar, dado o que conversamos sobre {problema}:
>
> - {dado_1}: {explicação}
> - {dado_2}: {explicação}
> - {dado_3}: {explicação}
>
> A conclusão: {conclusão_provocativa}. Não estou vendendo nada -- estou compartilhando o que o mercado está dizendo.
>
> Escrevi uma análise curta sobre o que as pessoas que estão resolvendo isso estão fazendo de diferente. Quer que eu te mande?
>
> Abraço,
> {sender_name}

---

**Touchpoint 5.2 -- Commercial Insight (dia 14)**
Agent: challenger-sale (Teach -- reframe do problema)

> **Subject (saas_enterprise):** What most companies get wrong about {problem_area}
>
> Hi {prospect_name},
>
> Most companies approach {problem_area} by {common_approach}. It makes intuitive sense, but the data shows it actually makes things worse because {counterintuitive_reason}.
>
> The companies seeing the best results are doing something different: {alternative_approach}. The shift is subtle but the impact is significant -- {metric_improvement} on average.
>
> I am not sure if this applies to {company}'s situation, but given what you shared about {their_specific_context}, it might be worth exploring.
>
> Food for thought. No reply needed unless it sparks something.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** O que a maioria erra sobre {área_problema}
>
> {prospect_name},
>
> A maioria das pessoas tenta resolver {área_problema} fazendo {abordagem_comum}. Faz sentido intuitivo, mas os dados mostram que na verdade piora as coisas porque {razão_contraintuitiva}.
>
> Quem está tendo os melhores resultados faz diferente: {abordagem_alternativa}. A mudança é sutil mas o impacto é significativo.
>
> Não sei se se aplica à sua situação, mas dado o que você me contou sobre {contexto_específico}, pode valer explorar.
>
> Só pra reflexão. Não precisa responder.
>
> Abraço,
> {sender_name}

---

**Touchpoint 5.3 -- Gap Reinforcement (dia 28)**
Agent: keenan (Gap check-in)

> **Subject (saas_enterprise):** Quick check: has {problem} gotten better or worse since we spoke?
>
> Hi {prospect_name},
>
> It has been about a month since we last connected. I am genuinely curious:
>
> Has the {gap_metric} situation improved, stayed the same, or gotten worse?
>
> No agenda behind the question. I am tracking industry patterns and your data point matters to me -- both professionally and because I think {company} deserves better than {current_state}.
>
> A one-line reply is more than enough.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Pergunta rápida: {problema} melhorou ou piorou?
>
> {prospect_name},
>
> Faz uns 30 dias que a gente conversou. Tenho uma curiosidade genuína:
>
> A situação com {problema} melhorou, ficou na mesma ou piorou?
>
> Não tem segunda intenção. Estou acompanhando padrões e seu caso me interessa -- profissionalmente e porque acho que você merece mais do que {estado_atual}.
>
> Uma frase de resposta já é suficiente.
>
> Abraço,
> {sender_name}

---

**Touchpoint 5.4 -- Case Study Relevante (dia 42)**
Agent: chet-holmes (prova social educacional)

> Enviar case study de cliente/aluno em situação similar, posicionado como conteúdo educacional, não como pitch.
> Format: email com resumo + link para case completo

---

**Touchpoint 5.5 -- Trigger Event Check (dia 60)**
Agent: aaron-ross (systematic cadence -- 30-Day Rule check)

> **Subject (saas_enterprise):** Quarterly check-in -- any changes at {company}?
>
> Hi {prospect_name},
>
> I keep a 30-day rhythm with people I believe can benefit from what we do, and your name came up again.
>
> Have any of these happened since we last spoke?
> - New budget cycle or fiscal year planning
> - Leadership change or team restructuring
> - Competitor making a move that changes priorities
> - The {problem} reaching a breaking point
>
> If yes to any, let us talk. If not, I will check in again in 30 days.
>
> No pressure, just persistence.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Check-in -- mudou alguma coisa?
>
> {prospect_name},
>
> Mantenho o hábito de verificar a cada 30 dias com pessoas que acredito que posso ajudar, e seu nome apareceu de novo.
>
> Aconteceu alguma dessas coisas desde a última vez que conversamos?
> - Mudança na sua situação financeira ou profissional
> - Novo projeto ou meta que exige {habilidade}
> - O {problema} chegou num ponto insustentável
> - Alguém próximo teve resultado que te motivou
>
> Se sim, vamos conversar. Se não, volto em 30 dias.
>
> Sem pressão, só consistência.
>
> Abraço,
> {sender_name}

---

**Touchpoint 5.6 -- Oferta de Reativação (dia 90)**
Agent: challenger-sale (Take Control -- provocar decisão)

> **Subject (saas_enterprise):** 90 days later -- the math has changed
>
> Hi {prospect_name},
>
> It has been 90 days since we first identified the {gap_value} gap at {company}. I did a quick back-of-the-envelope calculation:
>
> At {monthly_impact}/month, that gap has now cost you approximately {90_day_cost} in the last quarter alone.
>
> I am not saying this to pressure you. I am saying it because the numbers speak for themselves, and I think you deserve to see them clearly.
>
> If the situation has changed and this is no longer relevant, tell me and I will update my notes. If it is still a priority, the path we discussed is still available.
>
> What would you like to do?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** 90 dias depois -- os números mudaram
>
> {prospect_name},
>
> Faz 90 dias desde que identificamos juntos que {problema} estava te custando {impacto}. Fiz uma conta rápida:
>
> A {impacto_mensal}/mês, o custo acumulado dos últimos 3 meses é aproximadamente {custo_90_dias}.
>
> Não digo isso pra pressionar. Digo porque os números falam por si, e acho que você merece vê-los com clareza.
>
> Se a situação mudou e isso não é mais relevante, me diz e eu atualizo aqui. Se ainda é prioridade, o caminho que discutimos continua disponível.
>
> O que você gostaria de fazer?
>
> Abraço,
> {sender_name}

**Adaptação por niche:**
- **infoproduto_low_ticket:** Nurture 100% automatizado via email + WhatsApp broadcast. Conteúdo educacional no formato Stadium Pitch. Trigger = abertura de carrinho ou lançamento
- **saas_smb:** Cadência mais agressiva (a cada 10 dias). Incluir LinkedIn touches entre emails
- **saas_enterprise:** Cadência mais espaçada (a cada 3 semanas). Incluir convites para eventos/webinars da empresa
- **ecommerce_dtc:** Nurture = email marketing com conteúdo de uso do produto + novidades + cupons periódicos
- **services_consulting:** Nurture fortemente baseado em thought-leadership (artigos, podcasts, insights de mercado)

---

### Step 6: Went-Dark Re-Engagement (chris-voss + jeb-blount + david-sandler)

**Objetivo:** Recuperar prospects que pararam de responder, usando empatia tática, persistência disciplinada e múltiplos canais.

**Framework:** Chris Voss (Labels, Mirrors, No-oriented questions) + Jeb Blount (Fanatical Prospecting persistence, Triple-Touch) + David Sandler (Reverse Psychology, Break-up)

**Sequência: 3 touches + park | Timing: dia 1, 5, 10, depois park**

---

**Touch 6.1 -- Email: Label + Espelho (dia 1 após silêncio)**
Agent: chris-voss (Labeling)

> **Subject (saas_enterprise):** It seems like this fell off your radar
>
> Hi {prospect_name},
>
> It seems like our project might have fallen off your radar, and I understand -- things get busy.
>
> The last time we spoke, you were dealing with {problem} and we were exploring how to close the {gap_value} gap. If that is still relevant, I am here. If not, a quick "not right now" works perfectly.
>
> What makes sense from your end?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Parece que a vida apertou
>
> {prospect_name},
>
> Parece que as coisas ficaram corridas do seu lado, e eu entendo completamente.
>
> Da última vez que conversamos, você estava lidando com {problema} e a gente tava explorando como resolver isso. Se ainda faz sentido, estou aqui. Se não, um "agora não" resolve.
>
> O que faz sentido pra você?
>
> Abraço,
> {sender_name}

---

**Touch 6.2 -- Value-Add Re-Entry (dia 5)**
Agent: challenger-sale (Teach -- commercial insight, não venda)

> **Subject (saas_enterprise):** Thought you should see this -- relevant to {problem}
>
> Hi {prospect_name},
>
> I came across {insight_or_data_or_article} and immediately thought of our conversation about {problem} at {company}.
>
> The key takeaway: {one_sentence_insight}. Companies that acted on this saw {result}.
>
> Sharing this because it is genuinely useful, not because I am trying to restart a sales conversation. If it sparks something, great. If not, at least you have the data.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Vi isso e pensei em você
>
> {prospect_name},
>
> Encontrei {insight_ou_dado_ou_artigo} e pensei imediatamente na nossa conversa sobre {problema}.
>
> O ponto principal: {insight_em_uma_frase}. Quem agiu nisso viu {resultado}.
>
> Compartilho porque é genuinamente útil, não porque estou tentando retomar uma conversa de venda. Se despertar algo, ótimo. Se não, pelo menos você tem a informação.
>
> Abraço,
> {sender_name}

---

**Touch 6.3 -- Break-Up Email (dia 10)**
Agent: david-sandler (Reverse Psychology -- "Did I lose you?")

> **Subject (saas_enterprise):** Did I lose you?
>
> Hi {prospect_name},
>
> I have reached out a couple of times without hearing back, so I want to check: should I stop reaching out?
>
> I do not want to be a nuisance. If {problem} is no longer on your agenda, just say the word and I will close your file. No hard feelings.
>
> If you are still interested but the timing is off, tell me when to circle back and I will put it on my calendar.
>
> Either answer is completely fine. The only one that does not work is silence.
>
> Respectfully,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Te perdi?
>
> {prospect_name},
>
> Mandei algumas mensagens e não tive retorno, então quero verificar: devo parar de te procurar?
>
> Não quero ser inconveniente. Se {problema} saiu da sua lista de prioridades, só me diz e eu encerro o acompanhamento. Sem ressentimento.
>
> Se ainda tem interesse mas o momento não é agora, me fala quando devo voltar e coloco no calendário.
>
> Qualquer resposta serve. A única que não funciona é o silêncio.
>
> Abraço,
> {sender_name}

**Após Touch 6.3 -- PARK:**
- Se não houve resposta após 3 touches, mover para Nurture (Step 5) com cadência de 30 dias
- NÃO continuar insistindo -- respeitar o silêncio e deixar o conteúdo trabalhar
- Reativar somente se trigger event for detectado

**Quando PARAR definitivamente (deal-breaker signals):**
- Prospect responde pedindo explicitamente para não ser contatado
- Prospect marca email como spam
- Prospect bloqueou no LinkedIn ou WhatsApp
- Empresa fechou, foi adquirida ou prospect saiu do cargo

**Adaptação por niche:**
- **infoproduto_low_ticket:** Comprimir para 2 touches em 7 dias (email + WhatsApp). Tom mais leve. Park para lista de nurture automático
- **saas_enterprise:** Adicionar touchpoint de contato com outro stakeholder na empresa se o champion original sumiu
- **ecommerce_dtc:** Went-dark = "carrinho abandonado" -- sequência específica de 3 emails com produto + desconto progressivo

---

### Step 7: Post-Close Nurture (chet-holmes + david-sandler)

**Objetivo:** Maximizar valor do cliente após a compra via onboarding, prevenção de buyer's remorse, satisfação, referrals, testimonials e upsell.

**Framework:** Chet Holmes (Strategy 11 -- Follow-Up and Client Bonding, Stadium Pitch) + David Sandler (Post-Sell step -- prevenir buyer's remorse) + Dream 100 persistence para referrals

**Sequência: 3 fases | Onboarding (dia 1-30), Referral + Testimonial (dia 45-90), Upsell (mês 3+)**

---

**Fase 7A: Onboarding + Buyer's Remorse Prevention**

**Email 7A.1 -- Welcome + Quick Win (dia 1 após compra)**
Agent: chet-holmes (education-first approach)

> **Subject (saas_enterprise):** Welcome aboard -- your first quick win in 15 minutes
>
> Hi {prospect_name},
>
> Welcome to {product}. You made a strong decision, and I want to make sure you see value fast.
>
> Here is your Day 1 Quick Win (takes less than 15 minutes):
>
> 1. Log in at {link}
> 2. Go to {feature} and set up {specific_action}
> 3. Run your first {output} -- you should see {immediate_result}
>
> Why this matters: {similar_company} did this on day one and immediately saw {micro_result}. It is the fastest way to prove the value to yourself and your team.
>
> Your dedicated success contact is {csm_name} ({csm_email}). Do not hesitate to reach out for anything.
>
> Let us make this a great start.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Bem-vindo/a -- sua primeira vitória em 15 minutos
>
> {prospect_name}, parabéns pela decisão.
>
> Quero que você tenha sua primeira vitória rápida. Aqui está o que fazer agora (menos de 15 minutos):
>
> 1. Acesse {link_plataforma}
> 2. Vá até {módulo_1} e faça {ação_específica}
> 3. Você vai ver {resultado_imediato}
>
> Por que isso importa: {nome_case} fez exatamente isso no primeiro dia e {micro_resultado}. É o jeito mais rápido de sentir que a decisão valeu a pena.
>
> Se precisar de qualquer coisa, me chama direto por aqui ou no {canal_suporte}.
>
> Vamos juntos.
>
> Abraço,
> {sender_name}

---

**Email 7A.2 -- Buyer's Remorse Prevention (dia 7 após compra)**
Agent: david-sandler (Post-Sell step -- reforçar decisão)

> **Subject (saas_enterprise):** Week 1 check-in -- reinforcing why you made the right call
>
> Hi {prospect_name},
>
> You are one week in and I want to share something important.
>
> Right about now, a little voice in some buyers' heads starts saying things like "Did I make the right decision?" or "Maybe I should have waited." That is completely normal -- it is called buyer's remorse and it has nothing to do with whether the decision was good.
>
> Here is the reality: you chose to address {problem} because the {gap_value} gap was costing you {monthly_impact} every month. That has not changed. What has changed is that you are now on a path to close it.
>
> Here is what I have noticed from your first week of usage: {early_signal_of_value}. That is exactly where successful customers are at this stage.
>
> Keep going. The compounding starts around week 3.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Primeira semana -- reforçando por que você tomou a decisão certa
>
> {prospect_name},
>
> Você está há uma semana na jornada e quero te falar algo importante.
>
> Mais ou menos agora, uma voz na cabeça de algumas pessoas começa a dizer "Será que fiz a escolha certa?" ou "Talvez eu devesse ter esperado." Isso é completamente normal -- se chama remorso do comprador e não tem nada a ver com a qualidade da decisão.
>
> A realidade: você escolheu resolver {problema} porque {consequência_gap} estava te custando demais. Isso não mudou. O que mudou é que agora você está no caminho pra resolver.
>
> O que os alunos que mais tiveram resultado fizeram nessa fase:
> 1. Completaram {módulo_2} e aplicaram {exercício}
> 2. Entraram no grupo e fizeram a primeira pergunta
> 3. Agendaram a primeira mentoria em {link}
>
> Continue. O efeito composto começa na semana 3.
>
> Abraço,
> {sender_name}

---

**Email 7A.3 -- Expand Value (dia 30 após compra)**
Agent: chet-holmes (core story / bigger picture education)

> **Subject (saas_enterprise):** The bigger picture -- why {product} is just the beginning
>
> Hi {prospect_name},
>
> Now that you have the basics down, I want to share something most customers do not see until month 3.
>
> {product} is not just a {category} tool. The teams that get the most value use it as {strategic_positioning}. Here is what that looks like:
>
> - **Phase 1 (where you are now):** {current_use_case} -- solving {original_problem}
> - **Phase 2 (month 2-3):** {expanded_use_case} -- unlocking {additional_value}
> - **Phase 3 (month 4+):** {strategic_use_case} -- achieving {transformative_outcome}
>
> {similar_company} followed this exact path and went from {initial_result} to {expanded_result} in {timeframe}.
>
> Want me to walk you through how Phase 2 would look for {company}? It is a 20-minute conversation.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** A visão completa -- por que isso é só o começo
>
> {prospect_name},
>
> Agora que você pegou a base, quero te mostrar algo que a maioria dos alunos só percebe no mês 3.
>
> O que você comprou não é só {descrição_produto}. Os alunos que mais transformam a vida usam como {posicionamento_estratégico}. Veja como:
>
> - Fase 1 (onde você está): {uso_atual} -- resolvendo {problema_original}
> - Fase 2 (mês 2-3): {uso_expandido} -- destravando {valor_adicional}
> - Fase 3 (mês 4+): {uso_estratégico} -- alcançando {resultado_transformador}
>
> {nome_case} seguiu exatamente esse caminho e saiu de {resultado_inicial} para {resultado_expandido} em {prazo}.
>
> Quer que eu te mostre como a Fase 2 funciona pra você? São 15 minutos de conversa.
>
> Abraço,
> {sender_name}

---

**Fase 7B: Referral + Testimonial Request (dia 45-90)**

**Email 7B.1 -- Referral Request (dia 45-60)**
Agent: david-sandler (ask at peak satisfaction)

> **Subject (saas_enterprise):** Quick favor -- 2 minutes
>
> Hi {prospect_name},
>
> I hope {product} has been delivering on the value we discussed. Based on our last check-in, it sounds like {positive_outcome} is already happening -- which is great to hear.
>
> I have a straightforward favor to ask. You are exactly the type of customer I love working with, and I would like to find more people like you. Are there one or two people in your network who are dealing with similar challenges -- {problem} specifically -- who might benefit from a conversation?
>
> I am not asking for a warm intro unless you are comfortable. Even just a name and company would help me start the right conversation.
>
> And of course, if there is anything I can do for you in return, name it.
>
> Thanks,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Um pedido rápido -- 2 minutos
>
> {prospect_name},
>
> Pelo que vi até agora, você já está tendo {resultado_positivo} -- e isso me deixa muito contente.
>
> Quero te pedir algo simples. Você é exatamente o tipo de pessoa que eu gosto de trabalhar, e queria encontrar mais gente como você. Conhece uma ou duas pessoas que estão enfrentando {problema} e que poderiam se beneficiar do mesmo caminho?
>
> Não precisa fazer apresentação formal se não quiser. Até um nome e contexto já me ajuda a iniciar a conversa certa.
>
> E claro, se tiver algo que eu possa fazer por você em troca, é só falar.
>
> Abraço,
> {sender_name}

---

**Email 7B.2 -- Testimonial/Case Study Request (dia 60-90)**
Agent: chet-holmes (Dream 100 -- construir prova social)

> **Subject (saas_enterprise):** Would you be open to sharing your story?
>
> Hi {prospect_name},
>
> I have been following your progress with {product} and the results are genuinely impressive: {specific_result}.
>
> I would love to feature your story as a case study. It would help other companies in {industry} facing {problem} see what is possible. Here is what it would involve:
>
> - A 20-minute interview (we handle everything)
> - You approve the final version before anything goes live
> - We link back to {company} -- good visibility for your team too
>
> If you are open to it, I will send a few suggested times. If not, completely understand.
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Toparia compartilhar a sua história?
>
> {prospect_name},
>
> Tenho acompanhado o seu progresso e os resultados são genuinamente impressionantes: {resultado_específico}.
>
> Gostaria de contar a sua história como um case de sucesso. Isso ajudaria outras pessoas na mesma situação a verem o que é possível. Funciona assim:
>
> - Uma conversa de 20 minutos (a gente cuida de tudo)
> - Você aprova a versão final antes de publicar
> - Pode ser anônimo se preferir
>
> Se topar, te mando alguns horários. Se não for o momento, sem problema nenhum.
>
> Abraço,
> {sender_name}

---

**Fase 7C: Upsell/Cross-sell Education (mês 3+)**
Agent: chet-holmes (Stadium Pitch approach)

> **Subject (saas_enterprise):** New data: how teams like yours are getting {X%} more from {product}
>
> Hi {prospect_name},
>
> I wanted to share a finding from our latest customer benchmark. Teams in {industry} that use {advanced_feature} alongside {current_feature} are seeing {X%} improvement in {metric}.
>
> Here is what the data shows:
>
> | Approach | Avg Result | Time to Value |
> |---|---|---|
> | {current_feature} only | {current_result} | {current_timeline} |
> | {current_feature} + {advanced_feature} | {expanded_result} | {expanded_timeline} |
>
> I am not pitching an upgrade. I am sharing what the data says because I think you deserve to see it. If it makes sense for {company}, we can explore it. If not, keep doing what is already working.
>
> Want me to walk you through the benchmark?
>
> Best,
> {sender_name}

> **Subject (infoproduto_high_ticket):** Dado novo: como alunos como você estão indo {X%} além
>
> {prospect_name},
>
> Quero compartilhar um dado que saiu da nossa última análise de resultados. Alunos que combinam {módulo_atual} com {recurso_avançado} estão tendo {X%} mais resultado em {métrica}.
>
> Os números:
>
> | Abordagem | Resultado médio | Tempo até resultado |
> |---|---|---|
> | Só {módulo_atual} | {resultado_atual} | {prazo_atual} |
> | {módulo_atual} + {recurso_avançado} | {resultado_expandido} | {prazo_expandido} |
>
> Não estou vendendo upgrade. Estou mostrando o que os dados dizem porque acho que você merece ver. Se fizer sentido, a gente explora. Se não, continue com o que já está funcionando.
>
> Quer que eu te mostre o benchmark completo?
>
> Abraço,
> {sender_name}

**Adaptação por niche:**
- **infoproduto_low_ticket:** Onboarding automatizado (email + WhatsApp). Referral via programa de indicação com incentivo (desconto ou bônus). Upsell via oferta de order bump ou one-time offer. Testimonial = formulário automatizado com NPS
- **saas_smb:** Referral mais cedo (semana 3) porque ciclo de satisfação é mais curto. Upsell focado em plano superior
- **ecommerce_dtc:** Onboarding = confirmação de compra + tracking + dica de uso. Referral = programa de indicação com cupom. Upsell = produtos complementares. Testimonial = review automatizado pós-entrega
- **services_consulting:** Referral é o canal #1 de growth. Pedir mais cedo (dia 30) e com mais ênfase. Upsell = escopo adicional baseado em resultados

---

### Step 8: Launch Follow-Up (jeb-blount + chet-holmes) -- SOMENTE NICHES INFOPRODUTO

**Objetivo:** Executar sequência completa de lançamento digital: aquecimento pré-lançamento, abertura de carrinho, urgência de fechamento e ativação pós-compra.

**Framework:** Jeb Blount (Fanatical Prospecting -- 30-Day Rule, Law of Replacement, urgência) + Chet Holmes (Stadium Pitch -- educar antes de vender)

**VETO: Este step é executado SOMENTE para infoproduto_low_ticket e infoproduto_high_ticket. Para outros niches, pular.**

---

**Fase 8A: Pré-Launch Warming (7 dias antes da abertura)**

**Email 8A.1 -- Semente (7 dias antes)**
Agent: chet-holmes (Stadium Pitch -- educate before selling)

> **Subject:** O maior erro de quem tenta {objetivo} sozinho
>
> {first_name},
>
> Nos últimos {prazo}, eu acompanhei {número} pessoas tentando {objetivo}. E percebi um padrão perturbador.
>
> A maioria faz {erro_comum}. E o resultado é sempre o mesmo: {consequência_negativa}.
>
> Não é culpa delas. É que ninguém ensinou o caminho certo. E o caminho certo não é o que parece.
>
> Na próxima semana, vou revelar exatamente o que separa quem consegue {resultado} de quem fica patinando. Fique de olho na sua caixa de entrada.
>
> {sender_name}

**Email 8A.2 -- Conteúdo de valor (5 dias antes)**
Agent: chet-holmes

> **Subject:** 3 números que explicam por que {problema} não melhora
>
> {first_name},
>
> Olha esses dados:
>
> - {estatística_1}: {explicação_impacto_1}
> - {estatística_2}: {explicação_impacto_2}
> - {estatística_3}: {explicação_impacto_3}
>
> O que esses números dizem é simples: {conclusão_provocativa}.
>
> Eu passei {tempo} estudando isso e descobri um método que inverte essa lógica. Vou compartilhar com você em breve -- incluindo como aplicar mesmo que {objeção_comum}.
>
> Fique atento/a.
>
> {sender_name}

**Email 8A.3 -- Antecipação (2 dias antes)**
Agent: jeb-blount (urgency building)

> **Subject:** Amanhã acontece uma coisa que pode mudar {área_vida}
>
> {first_name},
>
> Nos últimos dias eu te mostrei {resumo_conteúdo_anterior}. Hoje quero te preparar pro que vem.
>
> Amanhã, às {horário}, vou abrir {nome_produto}. É a única oportunidade de {benefício_principal} com {condição_especial}.
>
> {número_vagas} vagas. Sem exceção.
>
> Não vou ficar te vendendo. Você já tem as informações. Amanhã é o momento de decidir.
>
> Te vejo lá.
>
> {sender_name}

---

**Fase 8B: Cart Open (3 emails no período de abertura)**

**Email 8B.1 -- Abertura (dia do lançamento)**
Agent: jeb-blount (Fanatical urgency)

> **Subject:** ABERTO -- {nome_produto} está disponível agora
>
> {first_name},
>
> Chegou a hora.
>
> {nome_produto} está aberto. {número_vagas} vagas. Quando acabar, acabou.
>
> O que você recebe:
> - {benefício_1}
> - {benefício_2}
> - {benefício_3}
> - {bônus_1} (somente para quem entrar até {data_bônus})
>
> O investimento: {preço} (ou {parcelas})
>
> Você pode continuar fazendo {situação_atual} e tendo {resultado_atual}. Ou pode decidir hoje que {resultado_desejado} não é mais opcional.
>
> {link_página_vendas}
>
> Qualquer dúvida, responde esse email.
>
> {sender_name}

**Email 8B.2 -- Prova social (dia 2 de carrinho aberto)**
Agent: chet-holmes

> **Subject:** O que {nome_case} me disse 30 dias depois
>
> {first_name},
>
> Ontem abri {nome_produto} e {número_inscritos} pessoas já entraram. Quero te contar por quê.
>
> {nome_case} entrou na edição anterior. A situação dele/dela era parecida com a sua: {situação_similar}.
>
> 30 dias depois, ele/ela me mandou essa mensagem:
>
> "{depoimento_real}"
>
> Não foi mágica. Foi método. O mesmo método que está disponível pra você agora.
>
> {link_página_vendas}
>
> Restam {vagas_restantes} vagas.
>
> {sender_name}

**Email 8B.3 -- Objeções (dia 3 de carrinho aberto)**
Agent: jeb-blount

> **Subject:** Você provavelmente está pensando uma dessas coisas
>
> {first_name},
>
> Se você ainda não entrou em {nome_produto}, aposto que é por um desses motivos:
>
> "Não tenho tempo agora"
> -- O formato é {formato_tempo}. Se você tem {tempo_mínimo} por dia, consegue. E não ter tempo é exatamente o sintoma do problema que a gente resolve.
>
> "Não tenho certeza se funciona pra mim"
> -- {garantia}. Se em {prazo_garantia} você não vir resultado, devolvemos {condição_devolução}.
>
> "O preço é alto"
> -- {preço} dividido em {parcelas} dá {valor_diário} por dia. Menos que {comparação_cotidiana}. E o custo de NÃO resolver {problema} é {custo_inação} por {período}.
>
> "Vou esperar a próxima turma"
> -- {motivo_não_esperar}. {condição_exclusiva_dessa_turma}.
>
> Se tem outra dúvida que não listei aqui, responde esse email. Eu leio e respondo pessoalmente.
>
> {link_página_vendas}
>
> {sender_name}

---

**Fase 8C: Cart Close Urgency (últimos 2 dias)**

**Email 8C.1 -- 48h para fechar**
Agent: jeb-blount

> **Subject:** 48 horas -- depois disso, {nome_produto} fecha
>
> {first_name},
>
> Faltam 48 horas para {nome_produto} fechar.
>
> Até agora, {número_inscritos} pessoas decidiram que {resultado_desejado} não é mais opcional. Restam {vagas_restantes} vagas.
>
> Vou ser direto: você já tem toda a informação que precisa. Você sabe o problema. Sabe o custo de não resolver. Sabe que existe um caminho.
>
> A única pergunta é: você vai agir ou vai esperar mais {tempo} e continuar no mesmo lugar?
>
> {link_página_vendas}
>
> {sender_name}

**Email 8C.2 -- Último dia (manhã)**
Agent: jeb-blount

> **Subject:** Último dia -- {nome_produto} fecha hoje à meia-noite
>
> {first_name},
>
> Hoje é o último dia.
>
> À meia-noite, {nome_produto} fecha. Sem exceção. Sem "abre de novo amanhã". Sem lista de espera.
>
> Se você quer {resultado_desejado}, a hora é agora. Não semana que vem. Não "quando estiver pronto." Agora.
>
> {número_inscritos} pessoas já decidiram. Restam {vagas_restantes} vagas.
>
> {link_página_vendas}
>
> Se tiver qualquer dúvida, me responde AGORA. Estou online o dia inteiro.
>
> {sender_name}

**Email 8C.3 -- Última hora**
Agent: jeb-blount

> **Subject:** Encerramento em {X} horas
>
> {first_name},
>
> Esta é a última mensagem.
>
> {nome_produto} fecha em {horas_restantes} horas. Depois disso, essa oportunidade não existe mais nas mesmas condições.
>
> Daqui a 6 meses, você vai estar em um de dois lugares:
>
> 1. No mesmo lugar de hoje, lidando com {problema}, desejando ter agido.
> 2. {prazo} meses dentro da jornada, já tendo {resultado_parcial}, caminhando para {resultado_final}.
>
> A diferença entre os dois é uma decisão. Essa. Agora.
>
> {link_página_vendas}
>
> Nos vemos do outro lado.
>
> {sender_name}

---

**Fase 8D: Post-Purchase Activation (após a compra)**

**Email 8D.1 -- Ativação imediata (automático após compra)**
Agent: chet-holmes

> **Subject:** Você está dentro -- faça isso nos próximos 10 minutos
>
> {first_name}, parabéns. Você tomou a decisão certa.
>
> Agora, não deixa o entusiasmo esfriar. Faça isso nos próximos 10 minutos:
>
> 1. Acesse {link_plataforma} com o email {email}
> 2. Assista a aula de boas-vindas (8 minutos)
> 3. Faça o exercício do Módulo 0 e poste no grupo
>
> Por que nos próximos 10 minutos? Porque os alunos que começam na primeira hora têm {X%} mais chance de completar o programa. Procrastinar é o inimigo agora.
>
> Qualquer problema de acesso: {canal_suporte}
>
> Bora.
>
> {sender_name}

**Adaptação:**
- **infoproduto_low_ticket:** Tom mais casual, emails mais curtos, WhatsApp como canal primário junto com email
- **infoproduto_high_ticket:** Adicionar chamada 1:1 de boas-vindas após compra, email mais pessoal

---

## Veto Conditions

- **VETO** se niche_context não foi detectado ou classificado -- follow-up sem contexto de niche é genérico demais para funcionar
- **VETO** se enviando post-proposal follow-up (Step 4) sem qualificação prévia (qualify-prospect com score mínimo B) -- follow-up de proposta pressupõe dor validada e budget investigado
- **VETO** se qualquer email na sequência não tem um CTA claro -- todo follow-up deve ter uma ação específica pedida ao destinatário
- **VETO** se Step 8 (Launch) é ativado para niche que não é infoproduto -- lançamento digital é específico para infoproduto_low_ticket e infoproduto_high_ticket
- **VETO** se went-dark re-engagement (Step 6) é ativado sem pelo menos uma interação bilateral prévia registrada -- não se re-engaja quem nunca engajou
- **VETO** se follow-up pessoal 1-on-1 para infoproduto_low_ticket ou ecommerce_dtc -- redirecionar para automação

---

## Output

```yaml
followup_sequence:
  metadata:
    task_id: create-followup-sequence
    date: "{ISO-8601}"
    niche_profile: "{niche}"
    deal_stage: "{stage}"
    agents_involved:
      - sales-chief
      - "{agent_1}"
      - "{agent_2}"
      - "{agent_3}"

  prospect:
    name: "{prospect_name}"
    company_or_audience: "{company_or_audience}"
    product_service: "{product_service}"
    deal_size: "{deal_size}"
    pain_identified: "{pain_identified}"
    gap_quantified: "{gap_quantified}"

  sequence:
    active_steps: [2, 3, 4, 5, 6, 7, 8]  # quais steps foram ativados
    total_touchpoints: N
    total_duration_days: N
    channels_used:
      - email
      - call
      - linkedin
      - whatsapp
      - video

    touchpoints:
      - id: "{step}.{number}"
        type: "email | call | social | video"
        timing: "{quando enviar relativo ao trigger}"
        agent: "{agent responsável}"
        framework: "{framework aplicado}"
        subject: "{subject line}"
        body: "{corpo completo do email/script}"
        cta: "{ação específica pedida}"
        niche_adaptation: "{adaptação aplicada}"
        channel: "{canal primário}"

  timing_summary:
    - touchpoint: "{id}"
      day: N
      channel: "{canal}"
      purpose: "{objetivo do touchpoint}"

  niche_adaptations_applied:
    - rule: "{regra aplicada}"
      impact: "{o que mudou}"

  stop_signals:
    - "{sinal que indica parar a sequência}"
    - "{sinal que indica parar a sequência}"

  escalation_rules:
    - condition: "{condição}"
      action: "{ação}"
      escalate_to: "{agente ou humano}"

  notes: "{observações adicionais do sales-chief}"
```

---

## Completion Criteria

- [ ] Niche detectado e classificado com regras de adaptação carregadas
- [ ] Follow-up triggers mapeados e sequência correta ativada para o deal_stage
- [ ] Post-Discovery (Step 2): 3 emails com SPIN recap + Gap reinforcement -- templates com subject, body e CTA
- [ ] Post-Demo (Step 3): 5 touchpoints com value recap, objeções, commercial insight, champion enablement e commitment
- [ ] Post-Proposal (Step 4): 6 touchpoints com cadência dia 1/3/7/14/21/30 -- Up-Front Contract, Reversing, Labels, No-oriented
- [ ] Nurture (Step 5): 6 touchpoints em ciclo de 90 dias -- Stadium Pitch, Commercial Insight, Gap check, Trigger Event monitoring
- [ ] Went-Dark (Step 6): 3 touches + park -- Label, Value-Add, Break-up. Respeitando limite de 3 tentativas antes de park
- [ ] Post-Close (Step 7): Onboarding dia 1/7/30, Buyer's Remorse Prevention, Referral dia 45-60, Testimonial dia 60-90, Upsell mês 3+
- [ ] Launch (Step 8, se aplicável): Pré-launch (3), cart open (3), cart close (3), pós-compra (1) -- 10 emails totais
- [ ] Todos os emails têm subject line + body completo + CTA específico
- [ ] Adaptações de niche aplicadas em cada step (idioma, tom, cadência, canais)
- [ ] Timing de cada touchpoint documentado com dias e canal
- [ ] Stop signals e regras de escalação definidos
- [ ] Output formatado conforme template YAML
