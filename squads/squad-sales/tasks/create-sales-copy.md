# Task: Create Sales Copy Assets
# Squad: squad-sales
# Agents: keenan (primary), chet-holmes, david-sandler, chris-voss, challenger-sale, jeb-blount, neil-rackham, aaron-ross
# Pattern: SL-TP-007

## Task Anatomy

| Field | Value |
|-------|-------|
| **ID** | create-sales-copy |
| **task_name** | Create Sales Copy Assets |
| **status** | active |
| **responsible_executor** | sales-chief (orchestrator), keenan, chet-holmes, david-sandler, chris-voss, challenger-sale, jeb-blount, neil-rackham, aaron-ross |
| **execution_type** | agent |
| **elicit** | true (Steps 0-1) |
| **complexity** | very-high |
| **estimated_time** | 90-150min |
| **purpose** | Gerar TODOS os assets de copy que uma operação de vendas precisa: Sales Page, VSL Script, Webinar Script, Proposal Template, Case Study Template e One-Page Offer Summary -- usando frameworks combinados dos 8 agentes do squad |

> **NOTA:** Para copywriting profundo (brand voice, storytelling, email nurture, content marketing), redirecionar para o **Copy Squad (squad-copy)**. Esta task cria copy ORIENTADA A VENDAS -- focada em conversão direta usando metodologias de vendas reais.

---

## Objetivo

Construir o pacote completo de sales copy para uma oferta, combinando os frameworks dos 8 agentes do squad-sales para produzir assets prontos para uso. Cada asset é gerado pelo agente cujo framework domina aquele formato, com contribuições cruzadas dos demais.

**Mapa Agent-Framework-Copy:**

| Agent | Framework Principal | Contribuição no Copy |
|-------|--------------------|-----------------------|
| keenan | Gap Selling | Estrutura narrativa Current State → Gap → Future State, headlines baseadas em gap |
| neil-rackham | SPIN Selling | Hooks de implicação, perguntas adaptadas como copy hooks (Implication Questions) |
| chet-holmes | Stadium Pitch | Seções educacionais que vendem (60% educação / 40% pitch), apresentação tipo estádio |
| david-sandler | Sandler System | Pain Funnel no copy (aprofundar dor), Up-Front Contract (framing), remoção de risco (garantia), Negative Reverse |
| chris-voss | Never Split the Difference | Accusation Audit (seção de objeções), Labels (empatia tática), Calibrated Questions |
| challenger-sale | The Challenger Sale | Commercial Teaching (insight que reframe o pensamento), Constructive Tension na transição para oferta |
| jeb-blount | Fanatical Prospecting / Sales EQ | Gatilhos emocionais, urgência sem desespero, CTAs com Sales EQ |
| aaron-ross | Predictable Revenue | Copy baseado em métricas/ROI, pipeline math como prova, linguagem data-driven |

---

## Inputs

```yaml
required:
  - offer_name: string              # Nome da oferta/produto/serviço
  - target_audience: string          # Quem é o público-alvo (ICP, persona, avatar)
  - main_pain: string               # Dor principal que a oferta resolve
  - main_transformation: string      # Transformação/resultado principal prometido

optional:
  - niche_context: string            # Niche profile (se já classificado em task anterior)
  - price_point: string              # Preço ou faixa de preço (ex: "R$997", "$2.000/mês")
  - guarantee: string                # Tipo de garantia oferecida (ex: "7 dias", "30 dias", "performance")
  - mechanism: string                # Mecanismo único (como a solução funciona / diferencial)
  - case_studies: list               # Cases/depoimentos disponíveis para social proof
  - competitor_landscape: list       # Concorrentes conhecidos (para diferenciação)
  - secondary_pains: list            # Dores secundárias além da principal
  - metrics_available: list          # Métricas/ROI já comprovados (ex: "300% ROI", "redução de 40% no churn")
  - brand_voice: string              # Tom de voz da marca (formal, casual, autoritário, empático)
  - assets_requested: list           # Quais assets gerar (default: ALL). Opções: sales_page, vsl, webinar, proposal, case_study, one_pager
  - existing_copy: string            # Copy existente para revisão/melhoria (se houver)
  - launch_date: string              # Data de lançamento (para urgência real)
  - bonus_stack: list                # Bônus incluídos na oferta
  - payment_options: list            # Opções de pagamento (à vista, parcelado, trial)
```

---

## Pre-Conditions

- [ ] Oferta definida (nome, preço ou range, o que inclui)
- [ ] Público-alvo identificado (quem é, o que sofre, o que deseja)
- [ ] Dor principal articulada (problema real que a oferta resolve)
- [ ] Transformação clara (resultado que o comprador obtém)

**Se pre-conditions não forem atendidas:** Ativar elicitação no Step 0 para coletar dados mínimos antes de prosseguir.

---

## Niche Adaptation Rules

O copy muda radicalmente conforme o nicho. Antes de executar qualquer Step, classificar:

| Niche | Copy Model | Tom | Estrutura | Ênfase |
|-------|-----------|-----|-----------|--------|
| infoproduto | Emocional + storytelling | Direto, pessoal, urgente | PAS + Stadium Pitch | Escassez, depoimentos, parcelas, transformação pessoal |
| saas | ROI-focused + metrics | Profissional, data-driven | Problem → Solution → Proof → CTA | Métricas, demo CTA, free trial/freemium, comparação |
| enterprise | Formal + business case | Executivo, consultivo | Gap Analysis → Business Case → ROI | Multi-stakeholder, RFP-ready, consensus building |
| services | Expertise + autoridade | Consultivo, confiável | Autoridade → Diagnóstico → Solução → Cases | Case studies pesados, consultation CTA, credenciais |
| ecommerce | Produto-focused + reviews | Casual, objetivo | Benefícios → Comparação → Reviews → Checkout | Reviews, comparação, frete, checkout rápido |

**VETO por niche:**
- Enterprise: NÃO usar urgência artificial (scarcity), countdown timers ou linguagem hype
- Infoproduto: NÃO usar tom corporativo seco -- precisa de conexão emocional
- SaaS: NÃO prometer resultados sem métricas de suporte -- tudo precisa de data
- E-commerce: NÃO criar VSL de 20 minutos -- atenção do shopper é curta

**Assets primários por niche:**

| Niche | Assets Primários | Assets Secundários |
|-------|-----------------|-------------------|
| infoproduto | Sales Page + VSL + Webinar | One-Pager + Case Study |
| saas | Sales Page + Proposal + Case Study | One-Pager + VSL (curto) |
| enterprise | Proposal + Case Study + One-Pager | Sales Page (formal) |
| services | Sales Page + Proposal + Case Study | One-Pager + Webinar |
| ecommerce | Sales Page + One-Pager | Case Study (como review) |

---

## Steps

### Step 0: Niche Context & Offer Discovery (sales-chief) -- MANDATORY FIRST

**Agent:** @sales-chief | **Elicit:** true

Coletar e classificar contexto antes de gerar qualquer copy:

1. **Se niche_context não foi recebido**, perguntar:
   - "O que você vende? (curso/mentoria, SaaS, consultoria, serviço, produto físico)"
   - "Qual o ticket médio?"
   - "B2B ou B2C?"
2. **Classificar no niche profile** e carregar regras de adaptação
3. **Validar inputs mínimos:**
   - Oferta (nome + o que inclui)
   - Público (quem + dor + desejo)
   - Transformação (antes → depois)
   - Diferencial (por que essa oferta e não outra)
4. **Definir quais assets gerar:**
   - Se `assets_requested` foi informado, seguir a lista
   - Se não, recomendar baseado no niche (ver tabela de assets primários acima)

**Elicitação obrigatória:**
```
1. Descreva sua oferta em 2-3 frases (o que é, para quem, quanto custa)
2. Qual a DOR #1 que seu cliente sente antes de comprar?
3. Qual a TRANSFORMAÇÃO #1 que ele experimenta depois?
4. Por que a SUA solução e não a do concorrente? (mecanismo/diferencial)
5. Tem depoimentos, cases ou métricas de resultado? (sim/não -- se sim, liste)
6. Quais assets você precisa? (todos / só página de vendas / só VSL / etc.)
```

**Output:** `niche_profile` + `offer_brief` + `assets_to_generate` + `copy_tone_guide`

---

### Step 1: Core Messaging Foundation (keenan + neil-rackham)

**Agent:** @keenan (primary), @neil-rackham (support) | **Elicit:** true

Construir a fundação de messaging que alimenta TODOS os assets subsequentes. Sem essa etapa, cada asset reinventa a roda.

#### 1.1 Gap Narrative (keenan)

Definir a estrutura narrativa central usando Gap Selling:

**Current State (Onde o público está hoje):**
- Situação objetiva (o que fazem, como fazem, com que ferramentas)
- Dor vivida (frustração, perda, risco, ineficiência)
- Impacto emocional (stress, medo, vergonha, estagnação)
- Custo de inação (o que acontece se não resolver -- em dinheiro, tempo, oportunidade)

**Future State (Onde o público quer chegar):**
- Resultado desejado (métricas, outcomes, conquistas)
- Vida transformada (dia-a-dia, status, emoções)
- Ganhos tangíveis (receita, tempo, eficiência, liberdade)
- Identidade aspiracional (quem eles se tornam)

**The Gap (A distância que justifica a compra):**
- Gap financeiro (quanto estão perdendo / deixando de ganhar)
- Gap operacional (quanto tempo/energia desperdiçam)
- Gap emocional (quanto sofrem desnecessariamente)
- **Quantificar em valor monetário quando possível**

#### 1.2 SPIN Copy Hooks (neil-rackham)

Adaptar as 4 categorias SPIN como copy hooks:

- **Situation Hooks:** Frases de abertura que espelham a realidade do leitor ("Se você está [situação]...")
- **Problem Hooks:** Frases que nomeiam a dor explicitamente ("O problema com [abordagem atual] é...")
- **Implication Hooks:** Frases que amplificam a gravidade ("Isso significa que a cada mês você está [consequência]...")
- **Need-Payoff Hooks:** Frases que conectam à solução ("Imagine se [resultado desejado]...")

#### 1.3 Pain Copy Arsenal (david-sandler)

Adaptar o Sandler Pain Funnel para gerar hooks de copy:

**Level 1 -- Surface Pain (Headlines e Leads):**
- Identificar o sintoma visível que o prospect reconhece imediatamente
- Gerar 5 variantes de headline baseadas nesse sintoma
- Formato: "Você [sintoma]?" / "[Sintoma] está custando [consequência]"

**Level 2 -- Business/Life Impact (Body Copy):**
- Traduzir a dor em impacto concreto (dinheiro, tempo, oportunidade perdida)
- Gerar 10 bullets de agitação: cada bullet amplifica uma consequência
- Formato: "Enquanto você [status quo], você está perdendo [quantificação]"

**Level 3 -- Personal Pain (Emotional Triggers):**
- Conectar a dor ao impacto pessoal (reputação, autoestima, relacionamentos, futuro)
- Gerar 3 transições emocionais para seções de close
- Formato: "Imagina como seria [estado emocional desejado] quando [resultado]"

**Output:** `core_messaging_foundation` com Gap Narrative + 12 SPIN copy hooks (3 por categoria) + Pain Copy Arsenal (5 headlines, 10 bullets, 3 transições emocionais)

---

### Step 2: Sales Page / Landing Page (ALL agents)

**Agent:** @keenan (structure), @neil-rackham (hooks), @david-sandler (guarantee + pain), @chris-voss (objections), @challenger-sale (mechanism), @jeb-blount (CTA), @aaron-ross (metrics), @chet-holmes (offer stack)

Gerar a sales page completa com template estrutural e [PLACEHOLDERS]:

#### Estrutura da Sales Page

```markdown
## [SECTION 1: HEADLINE -- keenan]
<!-- Gap-based hook: nomeia o gap entre onde o leitor está e onde quer chegar -->

# [HEADLINE: Resultado desejado -- sem a dor atual]
## [SUB-HEADLINE: Implicação do problema -- neil-rackham]

---

## [SECTION 2: ABERTURA -- keenan]
<!-- Current State: parágrafo que espelha a realidade dolorosa do leitor -->

Se você está [SITUAÇÃO ATUAL]... se já tentou [TENTATIVA FRUSTRADA]... e ainda assim [PROBLEMA PERSISTE]...

Você não está sozinho(a). E **não é sua culpa.**

[EXPLICAR por que as abordagens convencionais falham -- challenger-sale Commercial Teaching]

---

## [SECTION 3: AGITAÇÃO / IMPLICAÇÕES -- neil-rackham]
<!-- Implication Questions adaptadas como afirmações de copy -->

O que a maioria das pessoas não percebe é que [IMPLICAÇÃO #1].

A cada [PERÍODO], isso custa [CUSTO QUANTIFICADO]. E quanto mais tempo passa, [PIORA COMO].

[IMPLICAÇÃO #2 -- impacto emocional]
[IMPLICAÇÃO #3 -- impacto na identidade/status]

---

## [SECTION 4: INSIGHT REFRAME -- challenger-sale]
<!-- Commercial Teaching: insight que muda a perspectiva do leitor -->

Aqui está o que [NÚMERO]% das pessoas no seu mercado não sabem:

[INSIGHT que reframe o problema. Não é o que eles pensam -- é algo diferente/mais profundo]

[DADOS/PESQUISA que suporta o reframe]

Isso muda tudo. Porque significa que a solução não é [ABORDAGEM CONVENCIONAL]...

**A solução é [MECANISMO DIFERENTE].**

---

## [SECTION 5: SOLUÇÃO / MECANISMO -- challenger-sale + keenan]
<!-- Future State: apresentar a oferta como a ponte sobre o gap -->

Apresentando: **[NOME DA OFERTA]**

[DESCRIÇÃO em 1-2 frases -- o que é + para quem]

### Como funciona:

**Passo 1:** [MECANISMO -- o que acontece primeiro]
**Passo 2:** [MECANISMO -- o que acontece depois]
**Passo 3:** [MECANISMO -- resultado final]

[Por que esse mecanismo é diferente/superior -- challenger-sale Constructive Tension]

---

## [SECTION 6: PROVA SOCIAL -- aaron-ross + chet-holmes]
<!-- Case studies, depoimentos, métricas -->

### Resultados Reais

> "[DEPOIMENTO #1 -- resultado + emoção]"
> -- [Nome], [Cargo/Contexto]

> "[DEPOIMENTO #2 -- antes/depois]"
> -- [Nome], [Cargo/Contexto]

**Métricas comprovadas:**
- [MÉTRICA #1]: [RESULTADO] (ex: "aumento de 300% em conversão")
- [MÉTRICA #2]: [RESULTADO]
- [MÉTRICA #3]: [RESULTADO]

---

## [SECTION 7: O QUE ESTÁ INCLUÍDO -- chet-holmes Stadium Pitch]
<!-- Educação sobre o valor: listar módulos/entregáveis com valor individual -->

Aqui está tudo o que você recebe:

| Item | O que faz | Valor |
|------|-----------|-------|
| [ENTREGÁVEL #1] | [BENEFÍCIO] | [VALOR PERCEBIDO] |
| [ENTREGÁVEL #2] | [BENEFÍCIO] | [VALOR PERCEBIDO] |
| [ENTREGÁVEL #3] | [BENEFÍCIO] | [VALOR PERCEBIDO] |
| **BÔNUS:** [BÔNUS #1] | [BENEFÍCIO] | [VALOR PERCEBIDO] |
| **BÔNUS:** [BÔNUS #2] | [BENEFÍCIO] | [VALOR PERCEBIDO] |

**Valor total:** [SOMA DOS VALORES]
**Seu investimento hoje:** [PREÇO REAL]

---

## [SECTION 8: OBJEÇÕES -- chris-voss Accusation Audit]
<!-- Antecipar objeções usando Accusation Audit -->

### Você provavelmente está pensando...

**"[OBJEÇÃO #1 -- preço]"**
[LABEL: "Parece que o investimento é uma preocupação..." + reframe para custo de inação]

**"[OBJEÇÃO #2 -- timing]"**
[LABEL: "Parece que o timing não é ideal..." + reframe para custo de esperar]

**"[OBJEÇÃO #3 -- confiança]"**
[LABEL: "Parece que já tentou algo similar antes..." + diferenciação + garantia]

**"[OBJEÇÃO #4 -- adequação]"**
[LABEL: "Será que funciona para mim?" + segmentação + case relevante]

**"[OBJEÇÃO #5 -- niche-specific]"**
[RESPOSTA adaptada ao niche]

---

## [SECTION 9: GARANTIA -- david-sandler]
<!-- Remover risco usando Sandler risk reversal -->

### Garantia [TIPO]: [PRAZO]

[NOME DA GARANTIA]: Você tem [X DIAS] para [testar/implementar/experimentar].
Se por QUALQUER motivo não estiver [satisfeito/vendo resultados/convencido],
[devolução completa / crédito / ajuste].

**Sem perguntas. Sem burocracia. O risco é todo nosso.**

[EXPLICAÇÃO de por que oferecemos essa garantia -- Sandler Negative Reverse:
"Se não funcionar para você, nós não queremos seu dinheiro"]

---

## [SECTION 10: CTA FINAL -- jeb-blount Sales EQ]
<!-- Urgência sem desespero + gatilho emocional -->

### [CTA HEADLINE: Decisão + Urgência]

[PARÁGRAFO que contrasta o custo de inação (ficar onde está) vs.
o futuro possível (agir agora)]

[URGÊNCIA REAL -- se houver: vagas limitadas, data de encerramento, bônus expirando]
[Se não houver urgência real: NÃO inventar.
Usar urgência interna: "A cada dia sem resolver, o gap cresce"]

**[BOTÃO CTA: Verbo de ação + resultado]**
(ex: "Quero Começar Minha Transformação", "Agendar Demo Gratuita")

[MICRO-COPY sob o botão: "Pagamento seguro | Garantia de X dias | Suporte incluído"]

---

## [SECTION 11: PS / ÚLTIMO ARGUMENTO -- david-sandler]
<!-- P.S. que recapitula a oferta + gatilho final -->

**P.S.** [Recapitular o gap: "Lembre-se, a cada [período] sem resolver [problema],
você está perdendo [custo quantificado]"]

**P.P.S.** [Garantia reforçada + CTA final]
```

**Niche-specific adjustments para Sales Page:**
- **Infoproduto:** Adicionar seção de storytelling pessoal entre Sections 2-3. Stack de bônus visual. Countdown se lançamento real.
- **SaaS:** Adicionar comparison table (vs concorrentes). "Planos e Preços" em vez de "Investimento". CTA = "Start Free Trial" ou "Request Demo".
- **Enterprise:** Social proof = logos de clientes + case studies detalhados. Incluir ROI calculator. CTA = "Schedule a Consultation".
- **Services:** Seção "Sobre [Especialista/Empresa]" com credenciais. CTA = "Agendar Diagnóstico Gratuito".
- **E-commerce:** Comparison table de produto. Reviews com estrelas. CTA = "Comprar Agora" + frete/entrega. FAQs técnicas.

**Output:** Sales page completa em Markdown com [PLACEHOLDERS] preenchíveis.

---

### Step 3: VSL Script -- Video Sales Letter (chet-holmes + keenan + david-sandler + chris-voss)

**Agent:** @chet-holmes (Stadium Pitch education), @keenan (gap narrative), @david-sandler (commitment progression), @chris-voss (objection demolition)

Gerar script de VSL de 15-20 minutos com timestamps e instruções de produção:

#### Estrutura do VSL (15-20 min)

```markdown
## [00:00 - 00:15] HOOK -- Pattern Interrupt (jeb-blount)
<!-- Primeiros 15 segundos: capturar atenção ou perder para sempre -->

[VISUAL: Texto na tela ou presenter direto para câmera]

"[FRASE DE ABERTURA -- pattern interrupt que quebra expectativa]"

Opções de hook:
- Pergunta provocativa: "E se tudo que você aprendeu sobre [tópico] estiver errado?"
- Estatística chocante: "[X]% das pessoas que tentam [objetivo] falham. Aqui está o porquê."
- Declaração ousada: "Nos próximos 15 minutos, vou te mostrar [resultado específico]."
- História: "Há [X meses/anos], eu estava exatamente onde você está agora..."

---

## [00:15 - 02:00] HISTÓRIA -- Transformação Pessoal ou de Cliente (keenan)
<!-- Narrativa Gap Selling: Current State -> ponto de virada -> Future State -->

[VISUAL: B-roll, fotos antes/depois, ou presenter contando história]

"[CURRENT STATE da história: situação dolorosa, detalhes vívidos, emoção]"

"[PONTO DE VIRADA: o que mudou, a descoberta, o insight]"

"[RESULTADO: Future State com números e emoção]"

Transição: "E é exatamente isso que eu quero te mostrar como fazer hoje."

---

## [02:00 - 06:00] PROBLEMA -- Stadium Pitch Education (chet-holmes)
<!-- 60% educação: ensinar algo valioso ANTES de vender -->

[VISUAL: Slides, dados, gráficos]

### Dado #1: [ESTATÍSTICA do mercado/indústria]
"A maioria das pessoas não sabe que [DADO SURPREENDENTE]."

### Dado #2: [POR QUE as abordagens convencionais falham]
"O problema com [MÉTODO CONVENCIONAL] é que [FALHA FUNDAMENTAL]."

### Dado #3: [IMPLICAÇÃO -- neil-rackham]
"Isso significa que a cada [período], [CUSTO/PERDA]."

### Dado #4: [O que os melhores fazem diferente -- challenger-sale]
"Os top [X]% do mercado descobriram que [INSIGHT DIFERENTE]."

[4-5 minutos de ensino genuíno que posiciona a solução como conclusão lógica]

---

## [06:00 - 08:00] REVELAÇÃO DA SOLUÇÃO (challenger-sale + keenan)
<!-- Constructive Tension: transição de educação para oferta -->

[VISUAL: Reveal do produto/serviço]

"Depois de [pesquisar/testar/validar] com [número] de [clientes/alunos/empresas],
criei [NOME DA OFERTA]."

[MECANISMO: explicar como funciona em 3 passos simples]

Passo 1: [AÇÃO] -> [RESULTADO INTERMEDIÁRIO]
Passo 2: [AÇÃO] -> [RESULTADO INTERMEDIÁRIO]
Passo 3: [AÇÃO] -> [RESULTADO FINAL]

"[POR QUE este mecanismo é diferente -- Constructive Tension]"

---

## [08:00 - 11:00] PROOF STACK -- Provas Empilhadas (aaron-ross + chet-holmes)
<!-- Empilhar camadas de prova: lógica + social + autoridade + dados -->

[VISUAL: Depoimentos em vídeo, screenshots, gráficos]

### Camada 1: Prova Social
"[DEPOIMENTO #1 -- resultado específico em vídeo ou áudio]"
"[DEPOIMENTO #2 -- transformação emocional]"
"[DEPOIMENTO #3 -- ceticismo inicial que virou resultado]"

### Camada 2: Prova por Dados (aaron-ross)
"Nos últimos [período], nossos [clientes/alunos] alcançaram:"
- [MÉTRICA #1]: [RESULTADO]
- [MÉTRICA #2]: [RESULTADO]
- [MÉTRICA #3]: [RESULTADO]

### Camada 3: Prova de Autoridade
"[CREDENCIAL #1] + [CREDENCIAL #2] + [MÍDIA/RECONHECIMENTO]"

### Camada 4: Prova Lógica
"Se [premissa verdadeira], e [premissa verdadeira],
então [conclusão = funciona]."

---

## [11:00 - 14:00] OFFER STACK -- Apresentação da Oferta (chet-holmes)
<!-- Stadium Pitch: apresentar valor percebido antes do preço -->

[VISUAL: Itens aparecendo um a um na tela]

"Aqui está tudo o que você recebe quando entra hoje:"

[ITEM #1]: [DESCRIÇÃO + BENEFÍCIO] -- Valor: [R$X]
[ITEM #2]: [DESCRIÇÃO + BENEFÍCIO] -- Valor: [R$X]
[ITEM #3]: [DESCRIÇÃO + BENEFÍCIO] -- Valor: [R$X]

[BÔNUS #1]: [DESCRIÇÃO + POR QUE É VALIOSO] -- Valor: [R$X]
[BÔNUS #2]: [DESCRIÇÃO + POR QUE É VALIOSO] -- Valor: [R$X]

"Se você fosse comprar tudo isso separadamente, investiria [SOMA TOTAL]."
"Mas hoje, seu investimento é apenas [PREÇO REAL]."

[Se parcelado: "Ou [X]x de [VALOR] -- menos que [COMPARAÇÃO DO DIA-A-DIA]"]

---

## [14:00 - 17:00] OBJECTION DEMOLITION -- chris-voss Accusation Audit

[VISUAL: Presenter direto para câmera, tom empático]

"Agora, eu sei o que você provavelmente está pensando..."

### Accusation Audit:

"Você provavelmente está pensando que é caro demais."
-> [LABEL]: "Parece que o investimento é uma barreira..."
-> [REFRAME]: [Custo de inação vs. investimento]

"Você provavelmente está pensando que não vai funcionar para você."
-> [LABEL]: "Parece que já tentou algo antes e não deu certo..."
-> [REFRAME]: [Diferencial do mecanismo + case similar]

"Você provavelmente está pensando que não é o momento."
-> [LABEL]: "Parece que tem outras prioridades agora..."
-> [REFRAME]: [Custo de esperar mais X meses]

"Você provavelmente está pensando que pode fazer sozinho."
-> [LABEL]: "Parece que você é capaz de resolver por conta própria..."
-> [REFRAME]: [Tempo vs. atalho + custo de tentativa e erro]

---

## [17:00 - 19:00] CLOSE -- Sandler Commitment Progression (david-sandler)
<!-- Progressão de compromisso, não pressão -->

[VISUAL: Recap visual + botão CTA]

### Sandler Close em 3 camadas:

**Camada 1 -- Recapitular o gap:**
"Você me disse que está [Current State]. E que quer chegar em [Future State].
O gap entre os dois é [VALOR QUANTIFICADO]."

**Camada 2 -- Up-Front Contract:**
"Vou ser direto com você: se depois de ver tudo isso você não acredita
que [OFERTA] pode te ajudar a fechar esse gap, eu respeito totalmente.
Inclusive, você tem [GARANTIA]."

**Camada 3 -- Negative Reverse (opcional, alta conversão):**
"Talvez isso não seja para você. Se [OBJEÇÃO COMUM], talvez você deva esperar.
Mas se [PERFIL IDEAL], esse é o momento."

---

## [19:00 - 20:00] CTA FINAL -- jeb-blount Sales EQ
<!-- Urgência sem desespero -->

[VISUAL: Botão CTA + urgência visual]

"[URGÊNCIA: prazo, vagas, bônus expirando -- SOMENTE se real]"

"Clique no botão abaixo para [CTA ESPECÍFICO]."

[Se infoproduto: link direto para checkout]
[Se SaaS: link para demo/trial]
[Se enterprise: link para agendar call]
[Se services: link para diagnóstico gratuito]
```

**Niche adjustments para VSL:**
- **Infoproduto:** VSL completo de 15-20 min. Storytelling pesado. Countdown no final.
- **SaaS:** Encurtar para 8-12 min. Mais dados, menos história. Demo walkthrough no Proof Stack.
- **Enterprise:** NÃO usar VSL tradicional. Substituir por "Executive Video Brief" de 5-7 min com ROI focus.
- **Services:** VSL de 10-15 min. Foco em autoridade e cases. Tom consultivo.
- **E-commerce:** NÃO usar VSL longo. Substituir por "Product Video" de 2-3 min com benefícios + reviews.

**Output:** VSL script completo com timestamps, instruções visuais e [PLACEHOLDERS].

---

### Step 4: Webinar Script (chet-holmes + challenger-sale + chris-voss + david-sandler)

**Agent:** @chet-holmes (Stadium Pitch -- 60/40 rule), @challenger-sale (Constructive Tension transition), @chris-voss (Q&A objection handling), @david-sandler (close)

Gerar script de webinar de 45-60 minutos + emails de pré-webinar:

#### 4.1 Pre-Webinar Emails (jeb-blount -- urgência + Sales EQ)

**Email de Confirmação (imediato):**
```
Subject: Sua vaga está confirmada -- [NOME DO WEBINAR]
Body: Confirmação + data/hora + "Prepare sua pergunta mais importante sobre [TEMA]"
```

**Email Reminder -24h:**
```
Subject: Amanhã: [DADO SURPREENDENTE] sobre [TEMA]
Body: Teaser com 1 insight + "Não perca -- esse dado muda tudo"
```

**Email Reminder -1h:**
```
Subject: Começamos em 1 hora -- [NOME]
Body: Link direto + "Chegue nos primeiros 5 minutos para o bônus [X]"
```

**Email Reminder -15min:**
```
Subject: AO VIVO agora!
Body: Link + "Estamos começando"
```

#### 4.2 Webinar Structure (45-60 min)

```markdown
## [00:00 - 03:00] ABERTURA -- Hook + Promessa (3 min)

[Esperar 2-3 min para sala encher]

"Bem-vindos ao [NOME DO WEBINAR]."

"Nos próximos [X] minutos, vou te mostrar [PROMESSA ESPECÍFICA #1],
[PROMESSA ESPECÍFICA #2] e [PROMESSA ESPECÍFICA #3]."

"Mas primeiro, uma pergunta: [PERGUNTA que engaja e faz o público pensar]"

[REGRA: pedir para digitar no chat -> gera engajamento inicial]

---

## [03:00 - 08:00] CREDIBILIDADE + HISTÓRIA (5 min)

"Antes de começar, deixa eu me apresentar rapidamente."

[HISTÓRIA PESSOAL -- de onde veio, pelo que passou, como chegou aqui]
[CREDENCIAIS -- rápido, sem arrogância: resultados, clientes, reconhecimento]
[CONEXÃO com a dor do público: "Eu estava exatamente onde você está"]

---

## [08:00 - 33:00] CONTEÚDO -- Stadium Pitch (25 min)
<!-- chet-holmes: 60% educação genuína -- a parte mais importante -->

### Pilar #1: [TEMA EDUCATIVO] (8 min)
- [INSIGHT #1 -- dado ou conceito que surpreende]
- [APLICAÇÃO PRÁTICA -- o que fazer com esse insight]
- [MINI CASE -- exemplo rápido de alguém que aplicou]

### Pilar #2: [TEMA EDUCATIVO] (8 min)
- [INSIGHT #2 -- challenger-sale Commercial Teaching]
- [REFRAME -- "O que a maioria pensa: X. O que realmente funciona: Y"]
- [EXERCÍCIO RÁPIDO -- fazer público aplicar no chat]

### Pilar #3: [TEMA EDUCATIVO] (8 min)
- [INSIGHT #3 -- conecta os dois pilares anteriores]
- [O GRANDE AHA -- momento em que o público percebe que precisa de ajuda]
- [PONTE NATURAL para a oferta]

[REGRA CHET HOLMES: cada pilar entrega valor real MESMO SEM COMPRAR.
O público sai melhor do que entrou.]

---

## [33:00 - 38:00] TRANSIÇÃO -- Constructive Tension (5 min)
<!-- challenger-sale: criar tensão construtiva para a mudança -->

"Agora vocês têm [INSIGHT #1], [INSIGHT #2] e [INSIGHT #3]."

"A pergunta é: o que vocês vão fazer com isso?"

[OPÇÃO A: Fazer sozinho -- possível, mas lento + arriscado + caro]
[OPÇÃO B: Continuar como está -- consequências em X meses]
[OPÇÃO C: Usar sistema/método comprovado -- atalho com suporte]

"Se vocês querem a Opção C, deixa eu mostrar o que eu criei para vocês..."

---

## [38:00 - 48:00] OFERTA -- Pitch (10 min)

[Apresentação da oferta com offer stack visual]

"Aqui está tudo o que você recebe:"
[ITEM a ITEM com valor percebido]
[BÔNUS -- especialmente bônus exclusivo para quem assiste ao vivo]
[PREÇO + COMPARAÇÃO]
[GARANTIA -- Sandler risk reversal]

---

## [48:00 - 55:00] Q&A -- Objeção Handling ao vivo (7 min)
<!-- chris-voss: Accusation Audit + Labels + Calibrated Questions -->

[PREPARAR 5-7 perguntas planted que são objeções disfarçadas]

**Pergunta/Objeção:** "[OBJEÇÃO COMUM]"
**Resposta:** [LABEL] + [REFRAME] + [CTA]

[TÉCNICA VOSS: "It seems like..." / "Parece que..." antes de cada resposta]

[Se objeção inesperada: Calibrated Question:
"O que te impediria de começar hoje?"]

---

## [55:00 - 60:00] CLOSE -- Urgência + Último CTA (5 min)

"Para quem ficou até o final -- parabéns,
vocês são [X]% que realmente levam a sério."

[BÔNUS EXCLUSIVO para quem agir nas próximas 24/48h]

[CTA FINAL com link no chat]

"Vou ficar mais uns minutos para responder perguntas.
Se quiser garantir antes, o link está no chat."

[ENCERRAMENTO: "Obrigado(a) por investirem seu tempo.
Independente de comprarem ou não, apliquem [INSIGHT DO PILAR #1]"]
```

**Niche adjustments para Webinar:**
- **Infoproduto:** Webinar completo de 60-90 min. Storytelling pesado. Bônus ao vivo. Countdown no final.
- **SaaS:** Encurtar para 30-45 min. Mais demo ao vivo, menos história. Focar em produto.
- **Enterprise:** Formato "Executive Briefing" de 30 min. Tom formal. ROI-focused. Panel com expert.
- **Services:** Webinar educativo de 45-60 min. Foco em autoridade + cases. CTA = "Agendar Diagnóstico".
- **E-commerce:** Webinar NÃO recomendado. SKIP ou adaptar para "Live Shopping" de 15-20 min.

**Output:** Webinar script completo + 4 templates de email pre-webinar.

---

### Step 5: Proposal Template (keenan + aaron-ross + david-sandler)

**Agent:** @keenan (gap quantification), @aaron-ross (ROI/metrics), @david-sandler (Up-Front Contract + risk mitigation)

Gerar template de proposta comercial:

```markdown
# [NOME DA EMPRESA]
## Proposta Comercial: [NOME DA OFERTA]
### Preparado para: [NOME DO PROSPECT / EMPRESA]
### Data: [DATA]

---

## 1. Sumário Executivo (keenan -- gap quantificado)

[NOME DO PROSPECT/EMPRESA] enfrenta [PROBLEMA PRINCIPAL] que resulta
em [IMPACTO QUANTIFICADO] por [período].

A distância entre a situação atual e o resultado desejado representa
um gap estimado de **[VALOR DO GAP]** em [receita perdida / custos
desnecessários / oportunidade não capturada].

Esta proposta apresenta [NOME DA SOLUÇÃO] como a ponte para fechar
esse gap em [TIMELINE ESTIMADA].

---

## 2. Análise da Situação Atual (keenan -- Current State)

### O que observamos:
- [PONTO #1 -- processo/ferramenta/situação atual]
- [PONTO #2 -- ineficiência/dor/risco identificado]
- [PONTO #3 -- impacto mensurável no negócio]

### Custo de inação (neil-rackham -- Implication):
- **Financeiro:** [VALOR] por [período]
- **Operacional:** [HORAS/RECURSOS desperdiçados]
- **Estratégico:** [OPORTUNIDADE perdida]
- **Projeção 12 meses sem mudança:** [IMPACTO TOTAL]

---

## 3. Solução Proposta

### Visão geral:
[DESCRIÇÃO da solução em 2-3 parágrafos]

### Escopo de entrega:

| # | Entregável | Descrição | Prazo |
|---|-----------|-----------|-------|
| 1 | [ENTREGÁVEL] | [DETALHE] | [SEMANA/MÊS] |
| 2 | [ENTREGÁVEL] | [DETALHE] | [SEMANA/MÊS] |
| 3 | [ENTREGÁVEL] | [DETALHE] | [SEMANA/MÊS] |

### Metodologia / Abordagem:
[COMO será implementado -- fases, milestones, pontos de validação]

---

## 4. Investimento e ROI (aaron-ross -- Predictable Revenue math)

### Investimento:

| Componente | Valor |
|-----------|-------|
| [COMPONENTE #1] | [VALOR] |
| [COMPONENTE #2] | [VALOR] |
| [COMPONENTE #3] | [VALOR] |
| **Total** | **[VALOR TOTAL]** |

[Opções de pagamento: à vista, parcelado, recorrente]

### ROI Projetado:

| Métrica | Atual | Projetado | Melhoria |
|---------|-------|-----------|----------|
| [MÉTRICA #1] | [VALOR ATUAL] | [VALOR PROJETADO] | [DELTA %] |
| [MÉTRICA #2] | [VALOR ATUAL] | [VALOR PROJETADO] | [DELTA %] |
| [MÉTRICA #3] | [VALOR ATUAL] | [VALOR PROJETADO] | [DELTA %] |

**ROI estimado:** [X]x o investimento em [PERÍODO]
**Payback period:** [X] meses

---

## 5. Timeline de Implementação

| Fase | Atividades | Duração | Marcos |
|------|-----------|---------|--------|
| Fase 1: [NOME] | [ATIVIDADES] | [SEMANAS] | [MILESTONE] |
| Fase 2: [NOME] | [ATIVIDADES] | [SEMANAS] | [MILESTONE] |
| Fase 3: [NOME] | [ATIVIDADES] | [SEMANAS] | [MILESTONE] |

**Duração total estimada:** [X] semanas/meses

---

## 6. Mitigação de Riscos (david-sandler -- remoção de risco)

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| [RISCO #1] | [BAIXA/MÉDIA/ALTA] | [COMO MITIGAMOS] |
| [RISCO #2] | [BAIXA/MÉDIA/ALTA] | [COMO MITIGAMOS] |

### Garantia:
[TIPO DE GARANTIA + CONDIÇÕES + PRAZO]

---

## 7. Próximos Passos (david-sandler -- Up-Front Contract)

Para avançar, propomos o seguinte acordo mútuo:

| # | Ação | Responsável | Prazo |
|---|------|------------|-------|
| 1 | [AÇÃO -- ex: Revisão interna desta proposta] | [PROSPECT] | [DATA] |
| 2 | [AÇÃO -- ex: Reunião de alinhamento] | [AMBOS] | [DATA] |
| 3 | [AÇÃO -- ex: Assinatura do contrato] | [PROSPECT] | [DATA] |
| 4 | [AÇÃO -- ex: Kick-off do projeto] | [NÓS] | [DATA] |

**Contato:** [NOME] | [EMAIL] | [TELEFONE]

**Validade desta proposta:** [X] dias
```

**Niche adjustments para Proposal:**
- **Enterprise:** Adicionar "Stakeholder Map", "Governance / Reporting" e NDA reference.
- **SaaS:** Adicionar "Technical Requirements", "Integration Plan" e SLA.
- **Services:** Adicionar "Team / Qualifications" com bios dos consultores.
- **Infoproduto:** Proposal NÃO se aplica na maioria dos casos. SKIP ou adaptar para parceiros/afiliados B2B.
- **E-commerce:** Proposal não se aplica no B2C. Adaptar apenas para wholesale/B2B.

**Output:** Proposal template completo em Markdown com [PLACEHOLDERS].

---

### Step 6: Case Study Template (keenan + aaron-ross)

**Agent:** @keenan (Before/After Gap narrative), @aaron-ross (métricas quantificadas)

Gerar template de case study com estrutura Before → Challenge → Solution → Results → Quote:

```markdown
# Case Study: [NOME DO CLIENTE / EMPRESA]
## [HEADLINE -- Resultado principal em uma frase]

---

### O Desafio (keenan -- Current State)

**Empresa:** [NOME] | **Setor:** [INDÚSTRIA] | **Tamanho:** [PORTE]

[NOME DO CLIENTE] enfrentava [PROBLEMA PRINCIPAL].

**Situação antes:**
- [PONTO #1 -- métrica ruim ou situação negativa]
- [PONTO #2 -- consequência operacional]
- [PONTO #3 -- impacto financeiro]

**O que já haviam tentado:**
- [TENTATIVA #1 -- o que fizeram e por que não funcionou]
- [TENTATIVA #2 -- o que fizeram e por que não funcionou]

**Custo do problema:** [VALOR QUANTIFICADO por período]

---

### O Problema Real (neil-rackham -- Implication Questions)

O que [NOME DO CLIENTE] não percebia era que [INSIGHT SOBRE A CAUSA RAIZ].

Isso significava que:
- [IMPLICAÇÃO #1 -- o problema era pior do que imaginavam]
- [IMPLICAÇÃO #2 -- estava afetando outras áreas]
- [IMPLICAÇÃO #3 -- tendência de piora sem intervenção]

---

### A Solução

[O QUE FOI IMPLEMENTADO -- descrição clara da solução]

**Abordagem:**
1. [PASSO #1 -- diagnóstico / discovery]
2. [PASSO #2 -- implementação / execução]
3. [PASSO #3 -- otimização / ajuste]

**Timeline:** [DURAÇÃO da implementação]

---

### Os Resultados (aaron-ross -- métricas quantificadas)

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| [MÉTRICA #1] | [VALOR] | [VALOR] | [DELTA %] |
| [MÉTRICA #2] | [VALOR] | [VALOR] | [DELTA %] |
| [MÉTRICA #3] | [VALOR] | [VALOR] | [DELTA %] |

**ROI total:** [VALOR ou MÚLTIPLO]
**Payback:** [PERÍODO]

---

### Depoimento do Cliente

> "[QUOTE DIRETA do cliente -- resultado + emoção + recomendação]"
>
> -- **[NOME]**, [CARGO], [EMPRESA]

---

### Conclusão

[1 parágrafo que conecta o resultado ao gap original: "O gap de [VALOR]
que existia entre [Current State] e [Future State] foi fechado em [PERÍODO],
resultando em [RESULTADO PRINCIPAL]."]

[CTA: "Quer resultados similares? [LINK/CONTATO]"]
```

**Niche adjustments para Case Study:**
- **Infoproduto:** Trocar "empresa" por "aluno/cliente". Foco em transformação pessoal. Incluir foto antes/depois se aplicável.
- **SaaS:** Incluir "Technical Implementation Details" e "Integration Stack".
- **Enterprise:** Formato extenso (2-3 páginas). Incluir "Lessons Learned" e "Scalability Notes".
- **Services:** Incluir "Why They Chose Us" com processo de seleção.
- **E-commerce:** Formato de "Customer Story" curto. Foco em reviews e estrelas.

**Output:** Case study template com [PLACEHOLDERS].

---

### Step 7: One-Page Offer Summary (sales-chief)

**Agent:** @sales-chief (consolidação de todos os frameworks)

Gerar resumo de 1 página para uso rápido em calls, demos e apresentações:

```markdown
# [NOME DA OFERTA] -- Resumo

---

## O que é
[1-2 frases: descrição objetiva da oferta]

## Para quem
[1-2 frases: perfil do cliente ideal + dor principal]

## O problema que resolve
- [Current State -- situação dolorosa #1]
- [Gap -- custo de inação quantificado]
- [Implicação -- o que piora se não resolver]

## Como funciona
1. [Passo 1 -- ação + resultado intermediário]
2. [Passo 2 -- ação + resultado intermediário]
3. [Passo 3 -- ação + resultado final]

## O que está incluído
- [ENTREGÁVEL #1 -- benefício em 1 frase]
- [ENTREGÁVEL #2 -- benefício em 1 frase]
- [ENTREGÁVEL #3 -- benefício em 1 frase]
- [BÔNUS se houver]

## Resultados comprovados
- [MÉTRICA/RESULTADO #1 -- número concreto]
- [MÉTRICA/RESULTADO #2 -- número concreto]
- "[DEPOIMENTO curto]" -- [Nome, Cargo]

## Investimento
- **Preço:** [VALOR]
- **Parcelamento:** [OPÇÕES]
- **Garantia:** [TIPO + PRAZO]

## Próximo passo
[1 CTA claro: link, botão ou instrução]

---

*Uso interno: referência rápida para calls de vendas e demos.*
*Não distribuir como material de marketing sem adaptação.*
```

**Output:** One-pager em Markdown, pronto para imprimir ou compartilhar em call.

---

### Step 8: Review & Polish (keenan + sales-chief)

Revisar TODOS os assets gerados contra checklist de qualidade:

**Checklist por asset:**
- [ ] Headline passa no "teste de 3 segundos" (entendo a promessa sem ler mais nada?)
- [ ] Current State está específico o suficiente para o leitor pensar "esse sou eu"
- [ ] Gap está quantificado (número, percentual, ou timeline concreta)
- [ ] Prova está presente em cada claim importante (não apenas no final)
- [ ] CTA é claro, único e impossível de ignorar
- [ ] Urgência é legítima (não fabricada)
- [ ] Reversão de risco está explícita
- [ ] Tom está consistente com o niche_context
- [ ] Seção de objeções usa Accusation Audit (chris-voss)
- [ ] Garantia usa Sandler risk reversal
- [ ] CTAs usam Sales EQ -- urgência sem desespero (jeb-blount)
- [ ] Nenhum dado específico de business está hardcoded (squad agnosticism)

**Cross-asset consistency check:**
- [ ] Gap Narrative é consistente em todos os assets
- [ ] Preço/investimento é consistente em todos os assets
- [ ] Garantia é consistente em todos os assets
- [ ] CTA é consistente (mesmo link/ação) em todos os assets
- [ ] Tom de voz é consistente em todos os assets

---

## Veto Conditions

```yaml
veto_conditions:
  - "Sem oferta definida (nem nome, nem o que inclui) = NÃO INICIAR"
  - "Sem público-alvo identificado (nem persona, nem dor) = NÃO INICIAR"
  - "Sem transformação articulada (resultado após compra) = NÃO INICIAR"
  - "Headline sem gap (não contrasta Current State vs Future State) = REESCREVER"
  - "Seção de objeções sem Accusation Audit structure = REFAZER com Voss framework"
  - "CTA com urgência falsa (scarcity inventada, countdown sem data real) = REMOVER urgência artificial"
  - "VSL sem timestamps = ADICIONAR timestamps"
  - "Webinar com menos de 60% educação = REBALANCEAR (Stadium Pitch rule)"
  - "Proposal sem ROI quantificado = BLOQUEAR Step 5 até ter métricas"
  - "Case study sem métricas before/after = INCOMPLETO"
  - "Enterprise copy com tom de infoproduto (hype, urgência artificial) = REESCREVER no tom correto"
  - "Copy menciona business específico (nome de empresa, preço real, produto real) = MOVER dados para workspace/, manter template genérico no squad"
  - "Email de VSL/Webinar com mais de 150 palavras = ENCURTAR"
  - "Offer stack sem ancoragem de preço (valor percebido vs preço real) = REFAZER"
```

---

## Output

O output final é um `sales_copy_package` consolidado:

```yaml
sales_copy_package:
  metadata:
    task_id: create-sales-copy
    created_at: "{{date}}"
    niche: "{{niche_profile}}"
    offer: "{{offer_name}}"
    assets_generated: []           # Lista de assets criados
    agents_involved: []            # Lista de agentes que participaram

  core_messaging:
    gap_narrative:
      current_state: ""            # Situação dolorosa do público
      future_state: ""             # Resultado desejado
      the_gap: ""                  # Distância quantificada
      cost_of_inaction: ""         # Custo de não agir por período
    spin_hooks:
      situation_hooks: []          # 3 hooks de situação
      problem_hooks: []            # 3 hooks de problema
      implication_hooks: []        # 3 hooks de implicação
      need_payoff_hooks: []        # 3 hooks de solução
    pain_copy_arsenal:
      headlines: []                # 5 variantes Level 1 (surface pain)
      agitation_bullets: []        # 10 bullets Level 2 (business impact)
      emotional_transitions: []    # 3 transições Level 3 (personal pain)

  sales_page:
    headline: ""                   # Gap-based hook (keenan)
    sub_headline: ""               # Implication hook (neil-rackham)
    sections:
      opening: ""                  # Current State espelhado
      agitation: ""                # Implications amplificadas (neil-rackham)
      insight_reframe: ""          # Commercial Teaching (challenger-sale)
      solution_mechanism: ""       # Como funciona (challenger-sale + keenan)
      social_proof: ""             # Cases + métricas (aaron-ross + chet-holmes)
      offer_stack: ""              # O que recebe + valores (chet-holmes)
      objection_handling: ""       # Accusation Audit (chris-voss)
      guarantee: ""                # Risk reversal (david-sandler)
      cta: ""                      # Urgência + ação (jeb-blount)
      ps: ""                       # Último argumento (david-sandler)

  vsl_script:
    total_duration: "15-20 min"
    sections:
      hook: {}                     # 00:00-00:15 Pattern interrupt (jeb-blount)
      story: {}                    # 00:15-02:00 Transformação (keenan)
      problem_education: {}        # 02:00-06:00 Stadium Pitch (chet-holmes)
      solution_reveal: {}          # 06:00-08:00 Constructive Tension (challenger-sale)
      proof_stack: {}              # 08:00-11:00 Social + data + authority (aaron-ross)
      offer_stack: {}              # 11:00-14:00 Valor antes do preço (chet-holmes)
      objection_demolition: {}     # 14:00-17:00 Accusation Audit (chris-voss)
      close: {}                    # 17:00-19:00 Sandler progression (david-sandler)
      final_cta: {}                # 19:00-20:00 Sales EQ urgency (jeb-blount)

  webinar_script:
    total_duration: "45-60 min"
    pre_webinar_emails:
      confirmation: {}             # Email imediato pós-registro
      reminder_24h: {}             # Reminder -24h com teaser
      reminder_1h: {}              # Reminder -1h com link
      reminder_15min: {}           # Reminder -15min "ao vivo agora"
    sections:
      opening_hook: {}             # 00:00-03:00 Promessa + engajamento
      credibility_story: {}        # 03:00-08:00 História + credenciais
      content_pillar_1: {}         # 08:00-16:00 Stadium Pitch (chet-holmes)
      content_pillar_2: {}         # 16:00-24:00 Commercial Teaching (challenger-sale)
      content_pillar_3: {}         # 24:00-33:00 The Big Aha
      transition: {}               # 33:00-38:00 Constructive Tension (challenger-sale)
      offer_pitch: {}              # 38:00-48:00 Offer stack
      qa_objections: {}            # 48:00-55:00 Voss techniques (chris-voss)
      close: {}                    # 55:00-60:00 Urgência + CTA final

  proposal_template:
    executive_summary: ""          # Gap quantificado (keenan)
    current_state_analysis: ""     # Before + custo de inação (keenan + neil-rackham)
    proposed_solution: ""          # Escopo + metodologia
    investment_roi: ""             # ROI math (aaron-ross)
    timeline: ""                   # Fases + milestones
    risk_mitigation: ""            # Garantia + mitigação (david-sandler)
    next_steps: ""                 # Up-Front Contract (david-sandler)

  case_study_template:
    before: ""                     # Current State + métricas ruins (keenan)
    challenge: ""                  # Problema + implicações (neil-rackham)
    solution: ""                   # O que foi feito
    results: ""                    # Métricas before/after quantificadas (aaron-ross)
    testimonial: ""                # Quote direta do cliente

  one_page_summary:
    what: ""                       # O que é
    who: ""                        # Para quem
    problem: ""                    # O que resolve (Current State + Gap)
    how: ""                        # Como funciona (3 passos)
    includes: []                   # O que recebe
    results: []                    # Resultados comprovados
    investment: ""                 # Preço + garantia
    next_step: ""                  # CTA

  quality_review:
    headline_3s_test: true|false
    current_state_specific: true|false
    gap_quantified: true|false
    proof_present: true|false
    cta_clear: true|false
    urgency_legitimate: true|false
    risk_reversed: true|false
    tone_consistent: true|false
    cross_asset_consistent: true|false
```

**Formato de entrega:** Markdown estruturado por asset, com [PLACEHOLDERS] para personalização. Pronto para copiar/colar em page builder, teleprompter, slide deck ou CRM.

---

## Completion Criteria

- [ ] Niche classificado e regras de adaptação carregadas
- [ ] Core messaging foundation criada (Gap Narrative + 12 SPIN hooks + Pain Copy Arsenal)
- [ ] Sales Page completa com 11 seções e [PLACEHOLDERS] preenchíveis
- [ ] VSL Script com timestamps, instruções visuais e estrutura de 15-20 min (ou adaptação por niche)
- [ ] Webinar Script com 4 emails pre-webinar e estrutura de 45-60 min (60/40 educação/pitch)
- [ ] Proposal Template com 7 seções incluindo ROI math e Up-Front Contract
- [ ] Case Study Template com estrutura Before/Challenge/Solution/Results/Testimonial
- [ ] One-Page Offer Summary para referência rápida em calls
- [ ] Todas as seções de objeção usando Accusation Audit (chris-voss)
- [ ] Todas as seções de garantia usando Sandler risk reversal (david-sandler)
- [ ] Todas as CTAs usando Sales EQ -- urgência sem desespero (jeb-blount)
- [ ] Niche adjustments aplicados em cada asset
- [ ] Todas as veto conditions verificadas e passando
- [ ] Cross-asset consistency check passando
- [ ] Nenhum dado de business específico no template (squad agnosticism)

---

## Error Handling

| Erro | Ação |
|------|------|
| Oferta vaga demais | Ativar elicitação no Step 0 antes de prosseguir |
| Sem métricas/cases disponíveis | Gerar template com placeholders de prova + instruções para coletar |
| Niche não se encaixa nos 5 profiles | Perguntar e criar adaptação custom, usando o profile mais próximo como base |
| Assets_requested = single asset | Gerar apenas o solicitado, mas avisar que core_messaging (Step 1) é pré-requisito |
| Marca sem brand voice definida | Usar tom neutro-profissional como default, flaggar para revisão futura |
| Garantia não informada | Gerar seção com 3 opções (7 dias, 30 dias, performance) para o usuário escolher |
| Copy genérica pós-geração | Rodar checklist de especificidade: cada seção precisa de pelo menos 1 número/métrica concreto |
| Gap Analysis incompleta | BLOQUEAR Steps 2-7 até completar Step 1 com dados suficientes |
| Infoproduto pediu Proposal | SKIP Step 5. Redirecionar energia para Sales Page e VSL |
| E-commerce pediu VSL longo | Adaptar para Product Video de 2-3 min em vez de VSL de 15-20 min |

---

## Handoff

| Direção | Agent/Squad | Condição |
|---------|-------------|----------|
| **From** | sales-chief *diagnose | Diagnóstico indica necessidade de material de vendas |
| **From** | keenan *gap-analysis | Gap quantificado, precisa de asset para converter |
| **From** | squad-copy | Delegação quando copy precisa de framework de vendas (não apenas copywriting) |
| **To** | squad-copy | Quando precisa de brand voice, storytelling profundo, email nurture |
| **To** | squad-design | Quando sales page precisa de layout/design visual |
| **To** | squad-traffic-masters | Quando copy está pronta e precisa de tráfego pago |
| **To** | jeb-blount *followup | Quando webinar/VSL gera leads que precisam de follow-up |
| **To** | keenan *gap-analysis | Para aprofundar gap com prospect específico pós-webinar |
| **To** | sales-chief *close-deal | Quando proposal é aceita e deal precisa ser fechado |
| **To** | create-cold-outreach | Se o asset necessário é email sequence de prospecting |
| **To** | david-sandler *pain-funnel | Para aprofundar dor antes de criar copy (dados insuficientes) |

---

*Task: create-sales-copy v2.0.0 -- squad-sales*
