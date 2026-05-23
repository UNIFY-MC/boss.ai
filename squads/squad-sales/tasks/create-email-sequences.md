# Task: Create Email Sequences
# Squad: squad-sales
# Agents: jeb-blount (primary), chet-holmes (secondary)
# Pattern: SL-TP-007

## Task Anatomy

| Field | Value |
|-------|-------|
| **ID** | create-email-sequences |
| **task_name** | Create Email Sequences |
| **status** | active |
| **responsible_executor** | jeb-blount (primary -- Fanatical Prospecting email methodology), chet-holmes (secondary -- Stadium Pitch education sequences) |
| **execution_type** | agent |
| **elicit** | true (Steps 0-1) |
| **complexity** | high |
| **estimated_time** | 60-90min |
| **mode** | Interactive |
| **purpose** | Criar sequências de email marketing para vendas -- nurture, launch, cart abandonment, onboarding, re-engagement, upsell/cross-sell e webinar/event -- com templates, cadência, personalização e KPIs |

---

## Inputs

```yaml
required:
  - sequence_type: string          # nurture | launch | cart_abandonment | onboarding | reengagement | upsell_crosssell | webinar_event
  - product_service: string        # O que está sendo vendido
  - target_audience: string        # Descrição da audiência/ICP
  - offer_price: string            # Preço ou faixa de preço da oferta

optional:
  - niche_context: string          # Niche profile (se já classificado em task anterior)
  - brand_voice: string            # Tom de voz da marca (formal, casual, provocativo, etc.)
  - existing_list_size: number     # Tamanho da lista atual de emails
  - email_platform: string         # Ferramenta (ActiveCampaign, Mailchimp, ConvertKit, etc.)
  - launch_date: string            # Data de lançamento (para launch sequence)
  - event_date: string             # Data do evento/webinar (para webinar_event)
  - case_studies: list             # Cases/provas sociais disponíveis
  - lead_magnet: string            # Isca digital que trouxe o lead
  - average_open_rate: number      # Taxa de abertura atual (benchmark interno)
  - average_ctr: number            # CTR atual (benchmark interno)
```

---

## Pre-Conditions

- [ ] Lista de emails existe com pelo menos 100 contatos opt-in
- [ ] Oferta/produto claramente definido com preço, benefícios e página de destino
- [ ] Conformidade com LGPD/GDPR confirmada (opt-in, política de privacidade, link de descadastro)
- [ ] Plataforma de email marketing configurada e funcional
- [ ] Audiência-alvo definida (mínimo: dor principal, desejo, nível de consciência)

**Se pre-conditions não atendidas:** Ativar elicitação para coletar dados mínimos antes de prosseguir.

---

## Niche Context Notes

| Niche | Sequências Prioritárias | Observação |
|-------|------------------------|------------|
| infoproduto_low_ticket | nurture + launch + cart_abandonment | O motor de vendas. Todas as sequências se aplicam. Volume alto, automação total |
| infoproduto_high_ticket | nurture + application + call booking | Nurture educa, sequência conduz a aplicação/call. Menos emails, mais profundidade |
| saas_smb | onboarding + nurture + upsell_crosssell | Onboarding é crítico para retenção. Nurture educa sobre features. Upsell expande MRR |
| saas_enterprise | Mínimo email | Multi-touch com calls/meetings é a abordagem. Email é suporte, não motor |
| services_consulting | nurture + case studies | Autoridade e prova social via email. Sequências consultivas, não agressivas |
| ecommerce_dtc | cart_abandonment + onboarding + reengagement | Cart recovery é receita imediata. Pós-compra e reativação são prioridade |

---

## Veto Conditions

```yaml
veto_conditions:
  - "Sem lista de emails (< 100 contatos opt-in) = NÃO INICIAR. Redirecionar para list building"
  - "Sem oferta/produto definido (sem preço, sem benefício claro) = NÃO INICIAR"
  - "Sem conformidade LGPD/GDPR (sem opt-in, sem descadastro) = BLOQUEIO TOTAL. Risco legal"
  - "Email sem subject line A/B = INCOMPLETO. Toda sequência requer variação para teste"
  - "Email sem CTA único e claro = REESCREVER. Regra: 1 email = 1 CTA"
  - "Cadência sem timing definido entre emails = INCOMPLETO"
```

---

## Steps

### Step 0: Context Detection & Sequence Selection (jeb-blount) -- MANDATORY FIRST

**Agent:** @jeb-blount | **Elicit:** true

1. Se niche_context não recebido, perguntar:
   - "O que você vende? (curso online, SaaS, consultoria, produto físico, etc.)"
   - "Qual o ticket médio?"
   - "Vende para empresas (B2B) ou consumidor final (B2C)?"
2. Classificar niche conforme tabela de Niche Context Notes
3. Validar sequence_type contra o niche -- aplicar VETO se incompatível
4. Confirmar sequência a ser criada e tom de voz desejado

**Output:** niche classificado + sequence_type validado + tom de voz confirmado.

---

### Step 1: Nurture Sequence -- 5 a 7 emails (chet-holmes)

**Agent:** @chet-holmes | **Elicit:** true (primeira execução)

Sequência de educação e confiança usando o framework Stadium Pitch:

| # | Email | Dia | Propósito |
|---|-------|-----|-----------|
| 1 | Welcome + Promessa | 0 | Entregar lead magnet + estabelecer expectativa da sequência |
| 2 | Educação -- Problema | 2 | Amplificar a dor com dados ou história. "A maioria não sabe que..." |
| 3 | Educação -- Mecanismo | 4 | Explicar POR QUE o problema existe (causa raiz) |
| 4 | Autoridade + Prova | 7 | Case study, resultado, depoimento ou dado de mercado |
| 5 | Visão de Futuro | 10 | Cenário ideal -- contraste antes/depois |
| 6 | Soft CTA | 13 | Primeira menção da solução, sem pressão |
| 7 | Transição | 16 | Segmentar: quem clicou vai para oferta, quem não vai para mais nurture |

- **Subject Line:** A: Curiosidade ("O erro que 93% dos [audiência] cometem") / B: Benefício ("Como [resultado] em [tempo]")
- **Body:** Hook (1-2 linhas) + Contexto (2-3 parágrafos) + Insight + CTA
- **CTA:** Soft nos emails 1-5, direto nos emails 6-7
- **Personalização:** `{{nome}}`, `{{lead_magnet}}`, `{{dor_principal}}`, `{{segmento}}`
- **Cadência:** 2-3 dias entre emails. Total: 16 dias
- **A/B Testing:** Subject curiosidade vs. benefício | Sender pessoal vs. marca | Horário manhã vs. noite
- **KPIs:** Open rate >= 35% | CTR >= 3% | Reply rate >= 1% | Conversão para próximo estágio >= 15%

---

### Step 2: Launch Sequence -- 7 a 10 emails (jeb-blount)

**Agent:** @jeb-blount

Três fases: pré-launch, launch e cart close.

**Pré-Launch (3 emails):** Dia -7 Antecipação | Dia -4 Bastidores | Dia -1 Early Access/Waitlist

**Launch (4 emails):** Dia 0 Abertura oficial | Dia +1 Prova social + FAQ | Dia +3 Quebra de objeções | Dia +5 Bônus por tempo limitado

**Cart Close (3 emails):** Dia +6 Urgência (faltam 48h) | Dia +7 manhã Últimas horas | Dia +7 noite Final notice

- **Subject Line:** A: Urgência ("Faltam 48h para [X]") / B: Resultado ("Como [cliente] conquistou [resultado]")
- **Body:** Hook emocional + Contexto da oferta + Prova/benefício do dia + CTA urgente
- **CTA:** Direto em todos. Link de compra + deadline visível
- **Personalização:** `{{nome}}`, `{{produto}}`, `{{preço}}`, `{{data_fechamento}}`, `{{link_checkout}}`
- **Cadência:** Pré-launch a cada 3 dias. Launch diário. Cart close 2x no último dia
- **A/B Testing:** Subject urgência vs. prova social | Preço cheio vs. parcelado | CTA "Quero Agora" vs. "Garantir Minha Vaga"
- **KPIs:** Open rate >= 40% | CTR >= 5% | Conversão >= 2-5% da lista | Revenue por email enviado

---

### Step 3: Cart Abandonment / Went-Dark -- 3 a 5 emails (jeb-blount)

**Agent:** @jeb-blount

| # | Email | Timing | Propósito |
|---|-------|--------|-----------|
| 1 | Lembrete Suave | +1h (cart) / +3d (dark) | "Você esqueceu algo?" -- amigável, sem pressão |
| 2 | Objeção Antecipada | +24h / +7d | Atacar a objeção mais provável |
| 3 | Prova Social | +48h / +14d | Case ou depoimento de alguém similar |
| 4 | Incentivo | +72h / +21d | Desconto, bônus ou condição especial |
| 5 | Breakup | +7d / +30d | "Entendo se não é o momento" -- porta aberta |

- **Subject Line:** A: Pergunta ("Ainda pensando sobre [X]?") / B: Escassez suave ("Sua vaga ainda está reservada")
- **Body:** Reconhecer a situação + Remover fricção + CTA simples
- **Personalização:** `{{nome}}`, `{{produto_abandonado}}`, `{{preço}}`, `{{link_carrinho}}`, `{{dias_sem_contato}}`
- **Cadência:** Cart: agressiva (1h, 24h, 48h, 72h, 7d). Went-dark: espaçada (3d, 7d, 14d, 21d, 30d)
- **A/B Testing:** Com vs. sem imagem do produto | Desconto % vs. bônus vs. frete grátis | Subject pergunta vs. afirmação
- **KPIs:** Recovery rate >= 5-10% (cart) / >= 3-5% (dark) | Open rate >= 45% (cart) / >= 25% (dark)

---

### Step 4: Onboarding Sequence -- 5 a 7 emails (chet-holmes)

**Agent:** @chet-holmes

| # | Email | Dia | Propósito |
|---|-------|-----|-----------|
| 1 | Welcome + Quick Win | 0 | Parabéns + primeiro passo concreto (5 min para resultado) |
| 2 | Setup Guide | 1 | Guia passo-a-passo para configuração/acesso |
| 3 | Primeiro Marco | 3 | Encorajar a completar o primeiro marco significativo |
| 4 | Dica Avançada | 5 | Feature/conteúdo que 80% não descobrem sozinhos |
| 5 | Check-in | 7 | "Como está indo?" -- suporte + feedback |
| 6 | Case de Sucesso | 14 | Resultado de cliente similar ("em 14 dias, [fulano] já...") |
| 7 | Próximo Passo | 21 | Sugerir upgrade, módulo avançado ou comunidade |

- **Subject Line:** A: Ação ("Seu próximo passo em [produto]") / B: Celebração ("Parabéns -- aproveite ao máximo")
- **Body:** Reconhecer progresso + Próxima ação clara + Recurso de suporte
- **Personalização:** `{{nome}}`, `{{produto_comprado}}`, `{{data_compra}}`, `{{progresso}}`, `{{proximo_passo}}`
- **Cadência:** Intensiva nos primeiros 7 dias, depois espaçada. Total: 21 dias
- **A/B Testing:** Email 1 vídeo vs. texto | Email 5 NPS survey vs. pergunta aberta | Email 7 dia 21 vs. dia 30
- **KPIs:** Activation rate (quick win) >= 60% | Open rate >= 50% | Completion rate >= 40% | NPS response >= 30%

---

### Step 5: Re-engagement Sequence -- 3 a 5 emails (jeb-blount)

**Agent:** @jeb-blount

| # | Email | Dia | Propósito |
|---|-------|-----|-----------|
| 1 | Pattern Interrupt | 0 | Subject radicalmente diferente. Quebrar padrão de ignorar |
| 2 | Value Reset | 3 | Conteúdo de alto valor gratuito -- resetar percepção |
| 3 | Pergunta Direta | 7 | "O que mudou? O que você precisa agora?" |
| 4 | Oferta Exclusiva | 12 | Condição exclusiva para re-engajados |
| 5 | Sunset | 18 | "Vamos manter contato? Se não, sem problema" -- limpar lista |

- **Subject Line:** A: Ruptura ("Isso não é mais um email de vendas") / B: Pessoal ("{{nome}}, eu errei?")
- **Body:** Tom honesto e humano + Reconhecer o silêncio + Valor sem pedir nada
- **Personalização:** `{{nome}}`, `{{ultimo_email_aberto}}`, `{{tempo_inativo}}`, `{{interesse_original}}`
- **Cadência:** 3-5 dias entre emails. Total: 18 dias
- **A/B Testing:** Tom pessoal vs. provocativo | Com vs. sem prazo no sunset | Sender CEO vs. marca
- **KPIs:** Re-engagement rate >= 10-15% | Open rate >= 20% | Unsubscribe aceitável até 5%

---

### Step 6: Upsell / Cross-sell Sequence -- 3 a 5 emails (chet-holmes)

**Agent:** @chet-holmes

| # | Email | Dia | Propósito |
|---|-------|-----|-----------|
| 1 | Resultado + Gap | 0 (pós-onboarding) | Celebrar resultado + revelar próximo nível |
| 2 | Educação -- Novo Problema | 3 | Ensinar sobre o próximo desafio que enfrentará |
| 3 | Case de Expansão | 7 | Cliente que fez upgrade e os resultados obtidos |
| 4 | Oferta de Upgrade | 10 | Produto/plano complementar com condição especial |
| 5 | Última Chance | 14 | Deadline da condição. Recap do valor total |

- **Subject Line:** A: Progresso ("Você já conquistou [X] -- próximo passo") / B: Exclusividade ("Para clientes [produto]: acesso antecipado")
- **Body:** Reconhecer investimento anterior + Educar sobre novo valor + CTA para upgrade
- **Personalização:** `{{nome}}`, `{{produto_atual}}`, `{{resultado_obtido}}`, `{{produto_upgrade}}`, `{{preço_especial}}`
- **Cadência:** 3-4 dias entre emails. Iniciar após onboarding completo. Total: 14 dias
- **A/B Testing:** Desconto vs. bônus vs. acesso antecipado | Iniciar semana 3 vs. semana 4 | Dados de uso vs. case genérico
- **KPIs:** Upsell conversion >= 10-15% | Cross-sell conversion >= 5-8% | Open rate >= 45%

---

### Step 7: Webinar / Event Sequence -- 5 a 7 emails (jeb-blount + chet-holmes)

**Agent:** @jeb-blount (urgência/inscrição) + @chet-holmes (conteúdo pré-evento)

**Pré-Evento (3 emails):** D-7 Convite (tema, aprendizados, CTA inscrição) | D-3 Prova + urgência ("X inscritos") | D-1 Lembrete + dica de preparação

**Dia do Evento (2 emails):** D-0 manhã Lembrete final com link | D-0 hora do evento "Estamos ao vivo" (para no-shows)

**Pós-Evento (2-3 emails):** D+1 Replay + oferta | D+3 Follow-up da oferta + objeções | D+5 "Replay sai do ar em 24h"

- **Subject Line:** A: Evento ("[Ao Vivo] Como [resultado] em [tempo]") / B: Social proof ("[X] confirmados -- sua vaga?")
- **Body:** Pré: educar sobre o tema. Pós: replay + oferta
- **Personalização:** `{{nome}}`, `{{evento_nome}}`, `{{data_evento}}`, `{{link_inscricao}}`, `{{link_replay}}`, `{{link_oferta}}`
- **Cadência:** Pré a cada 2-3 dias. Dia 2 emails. Pós a cada 2 dias. Total: 12 dias
- **A/B Testing:** Vídeo-convite vs. texto | Agenda detalhada vs. teaser | Replay imediato vs. delay 12h
- **KPIs:** Inscrição >= 20% da lista | Show-up >= 30-40% | Replay views >= 20% | Conversão pós-evento >= 3-8%

---

## Output

```yaml
email_sequence_package:
  metadata:
    task_id: create-email-sequences
    created_at: "{{date}}"
    niche_context: "{{niche}}"
    sequence_type: "{{sequence_type}}"
    product_service: "{{product_service}}"
    target_audience: "{{target_audience}}"

  sequence:
    type: "{{sequence_type}}"
    total_emails: 0
    total_duration_days: 0
    cadence: "{{descrição da cadência}}"

    emails:
      - email_number: 1
        name: ""
        subject_line_a: ""
        subject_line_b: ""
        send_day: 0
        body_structure:
          hook: ""
          context: ""
          insight_or_proof: ""
          cta: ""
        cta_type: ""               # soft | direct | urgency
        cta_text: ""
        cta_link: "{{link}}"

    personalization_vars:
      - "{{nome}}"
      - "{{produto}}"

    ab_test_plan:
      test_1:
        variable: ""               # subject_line | sender | timing | cta_text | format
        variant_a: ""
        variant_b: ""
        metric: ""                 # open_rate | ctr | conversion

    kpis:
      open_rate_target: ""
      ctr_target: ""
      conversion_target: ""
```

**Formato de entrega:** Markdown estruturado, pronto para importar na plataforma de email marketing ou usar como playbook.

---

## Completion Criteria

- [ ] Niche context classificado e sequence_type validado contra niche
- [ ] Todas as veto conditions verificadas e passando
- [ ] Todos os emails criados com: subject line A/B, body completo, CTA único e claro
- [ ] Cadência/timing definido entre cada email da sequência
- [ ] Variáveis de personalização mapeadas para cada email
- [ ] Plano de A/B testing definido (mínimo 2 testes por sequência)
- [ ] KPIs alvo definidos com benchmarks realistas para o niche
- [ ] Output YAML consolidado preenchido e validado
- [ ] Conformidade LGPD/GDPR verificada (descadastro em todos os emails)

---

## Error Handling

| Erro | Ação |
|------|------|
| Lista < 100 contatos | Redirecionar para list building. Não criar sequência sem base |
| Niche não identificado | Ativar elicitação no Step 0 antes de qualquer criação |
| Sem case studies/provas | Substituir por dados de mercado, estatísticas ou framework educativo |
| Open rate atual < 15% | Recomendar higienização de lista antes de nova sequência |
| Plataforma não definida | Gerar templates genéricos com notas de adaptação por plataforma |
| Múltiplas sequências | Executar uma por vez na ordem de prioridade do niche |

---

## Handoff

| Direção | Agent/Squad | Condição |
|---------|-------------|----------|
| **From** | sales-chief *email-strategy | Diagnóstico indica necessidade de sequências |
| **From** | create-cold-outreach | Complementar outbound com nurture automatizado |
| **To** | jeb-blount *pipeline-audit | Após 30 dias para revisar métricas |
| **To** | chet-holmes *stadium-pitch | Quando nurture precisa de conteúdo mais profundo |
| **To** | create-followup-sequence | Quando lead responde e entra em deal ativo |

*Task: create-email-sequences v1.0.0 -- squad-sales*
