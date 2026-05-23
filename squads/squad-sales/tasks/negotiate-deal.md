# Task: Negotiate Deal

**Task ID:** negotiate-deal
**Purpose:** Negociacao tatica usando Tactical Empathy + Sandler closing discipline. Conduzir negociacao de deal com controle emocional, inteligencia situacional e arquitetura de fechamento disciplinada.
**Agent:** chris-voss (primary -- Tactical Empathy), david-sandler (secondary -- closing discipline)
**Mode:** Interactive
**Execution Type:** Agent

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| deal_context | string | Yes | Contexto completo do deal (prospect, produto/servico, valor, estagio no pipeline) |
| current_offer | string | Yes | Proposta atual na mesa (preco, termos, condicoes) |
| prospect_position | string | Yes | Posicao declarada do prospect (o que ele diz que quer, onde esta travado) |
| objections_faced | string | Yes | Objecoes ja apresentadas pelo prospect (preco, timing, concorrente, autoridade) |
| decision_makers | string | Yes | Mapa de decision makers (quem decide, quem influencia, quem bloqueia) |
| deadline | string | Yes | Deadline real ou percebido para fechar (data ou trigger event) |

## Pre-Conditions

- Deal qualificado (pain validado, gap quantificado -- idealmente via `diagnose-deal`)
- Proposta já apresentada ao prospect (não estamos em fase de discovery)
- Fase de negociação iniciada (prospect respondeu à proposta com contraproposta, objeção ou pedido de desconto)
- Acesso direto a pelo menos um decision maker confirmado

## Niche Context Notes

A negociação tática se aplica a TODOS os nichos, mas com calibrações:
- **infoproduto_low_ticket:** Negociação não se aplica (preço fixo, take-it-or-leave-it). Se prospect pede desconto → reframe com valor, não negocie
- **infoproduto_high_ticket:** Negociação leve (parcelamento, bônus, garantia). Foco em Accusation Audit para objeções emocionais
- **saas_smb:** Negociação padrão (preço, termos, implementação). Tactical Empathy completa
- **saas_enterprise:** Negociação pesada (procurement, legal, múltiplos rounds). Todas as técnicas de Voss + Sandler closing discipline
- **services_consulting:** Negociação de escopo (não de preço). Calibrated Questions para scopar corretamente
- **ecommerce_dtc:** Negociação não se aplica (preço fixo). Redirecionar para Stadium Pitch se prospect resiste

## Steps

### Step 1: Pre-Negotiation Intel (chris-voss)
- **elicit: true**
- Perguntar ao usuario: "Me conta tudo sobre a pessoa do outro lado da mesa. O que ela ja disse? O que ela nao disse mas voce sentiu? O que ela tem medo de perder?"
- Mapear o worldview do counterpart -- o que ele acredita ser verdade sobre a situacao
- Identificar Black Swans: informacoes ocultas que, se reveladas, mudam tudo. Tres categorias:
  - O que o prospect nao sabe que nao sabe
  - O que o prospect sabe mas nao esta dizendo
  - O que o prospect assume incorretamente sobre voce
- Determinar o tipo de negociador do counterpart (Analyst, Assertive, Accommodator)
- Preparar Accusation Audit draft baseado no intel coletado
- Output: `pre_negotiation_intel`

### Step 2: Accusation Audit (chris-voss)
- Listar TODAS as coisas negativas que o prospect pode estar pensando sobre voce, seu produto, sua empresa, seu preco
- Nao filtrar. Nao suavizar. Colocar na mesa antes que o prospect coloque
- Formato de cada linha: "Voce provavelmente esta pensando que..." / "Pode parecer que..."
- Objetivo: defuse emocional. Quando voce diz o pior antes do outro, o outro responde "Nao, nao e tao ruim assim"
- Regra: nunca usar "Eu entendo" (trigger de resistencia). Usar labels: "Parece que...", "Soa como se..."
- Sequenciar o Accusation Audit do mais severo para o mais leve
- Output: `accusation_audit_script` (lista ordenada de 5-10 declaracoes)

### Step 3: Label & Mirror Discovery (chris-voss)
- **elicit: true**
- Perguntar ao usuario: "Quais foram as palavras exatas que o prospect usou quando fez a objecao? Me da a frase dele, nao a sua interpretacao"
- Usar **Labels** para validar emocoes: "Parece que o timing e uma preocupacao real pra voce" / "Soa como se voce ja tivesse tido uma experiencia ruim com algo parecido"
- Usar **Mirrors** (repetir as ultimas 1-3 palavras com tom de curiosidade) para fazer o prospect expandir
- Objetivo: descobrir a preocupacao REAL por tras da objecao declarada
  - Objecao declarada: "Esta caro" → Preocupacao real: "Nao consigo justificar pra meu chefe"
  - Objecao declarada: "Preciso pensar" → Preocupacao real: "Tenho uma opcao mais segura"
  - Objecao declarada: "O timing nao e bom" → Preocupacao real: "Nao tenho budget aprovado"
- Mapear cada objecao → label/mirror → preocupacao real descoberta
- Output: `discovery_map` (objecao declarada | tecnica usada | preocupacao real)

### Step 4: Calibrated Questions (chris-voss)
- Desenhar perguntas "How" e "What" que fazem o prospect resolver seus problemas por voce
- NUNCA perguntas "Why" (trigger defensivo) ou "Can you" / "Do you" (resposta sim/nao)
- Calibrated Questions por cenario:
  - Preco: "Como voce gostaria que eu apresentasse isso pra sua equipe de forma que faca sentido?"
  - Autoridade: "O que acontece quando voce leva essa recomendacao pro time de decisao?"
  - Timing: "Como esse projeto se encaixa nas prioridades que voce ja tem no trimestre?"
  - Concorrente: "O que seria necessario pra voce ter certeza de que essa e a melhor opcao?"
  - Implementacao: "Como voce imagina que a implementacao aconteceria no dia-a-dia da equipe?"
- Cada pergunta deve forcar o prospect a pensar na solucao, nao na objecao
- Output: `calibrated_questions_bank` (5-8 perguntas customizadas para este deal)

### Step 5: Ackerman Bargaining (chris-voss)
- Aplicar SOMENTE se a negociacao envolve preco/valor monetario
- Modelo Ackerman -- quatro movimentos calculados:
  1. **Abertura em 65%** do target price (ancora agressiva mas justificavel)
  2. **Incremento para 85%** (subir 20 pontos -- mostra flexibilidade calculada)
  3. **Incremento para 95%** (subir 10 pontos -- desacelera o ritmo, sinaliza limite)
  4. **Numero final em 100%** (numero nao-redondo + item nao-monetario de valor)
- Em cada incremento: usar empatia tatica + label + silencio estrategico
- No movimento final: oferecer item nao-monetario (implementacao, suporte, treinamento, prazo estendido) para sinalizar que voce chegou no limite
- Regra de ouro: "No deal is better than a bad deal." Nunca ceder por desespero
- Output: `ackerman_plan` (4 movimentos com valores calculados + script para cada rodada)

### Step 6: Close Architecture (david-sandler)
- **Transicao** de negociacao tatica para fechamento estruturado
- **Up-Front Contract** para proximos passos:
  - "Pra gente ser justo com os dois lados, posso sugerir como podemos encerrar essa conversa hoje? Vamos revisar os pontos, e no final, se fizer sentido pra voce, a gente avanca. Se nao fizer sentido, voce me diz nao. Tudo bem dizer nao. Justo?"
- **Thermometer Check** (escala 1-10):
  - "Numa escala de 1 a 10, onde 1 e 'sem chance' e 10 e 'onde eu assino', onde voce esta agora?"
  - Se < 7: "O que precisaria mudar pra isso virar um 10?" (volta pra chris-voss com calibrated questions)
  - Se >= 7: avancar para close
- **Final Close** (Sandler-style -- nunca implorar):
  - Recapitular: pain validado + gap quantificado + proposta que resolve
  - Pedir decisao clara: "Com base no que conversamos, qual e a sua decisao?"
  - Aceitar qualquer resposta com dignidade -- "nao" e um resultado valido
- **Post-Sell** (prevenir buyer's remorse):
  - Validar a decisao do prospect: "Voce tomou uma boa decisao. Aqui esta o que acontece agora..."
  - Definir proximo passo concreto com data e responsavel
- Output: `close_script` (up-front contract + thermometer script + close sequence + post-sell steps)

## Veto Conditions

- **VETO** se deal nao esta qualificado (sem pain validado, sem gap identificado -- executar `diagnose-deal` primeiro)
- **VETO** se nao ha acesso direto a decision maker (negociar com intermediario sem poder e perder tempo)
- **VETO** se nao houve discovery previa (voce nao pode negociar o que nao entendeu -- executar discovery com neil-rackham)
- **VETO** se a proposta ainda nao foi apresentada (negociacao pressupoe que uma oferta esta na mesa)

## Output

```yaml
negotiation_plan:
  deal: "{prospect} - {produto/servico}"
  negotiation_date: "YYYY-MM-DD"
  primary_agent: chris-voss
  secondary_agent: david-sandler

  pre_negotiation_intel:
    counterpart_type: "Analyst | Assertive | Accommodator"
    worldview_summary: "..."
    black_swans_identified:
      - type: "unknown_unknown | known_withheld | false_assumption"
        description: "..."
    emotional_landscape: "..."

  accusation_audit_script:
    - order: 1
      statement: "Voce provavelmente esta pensando que..."
      expected_reaction: "..."
    - order: 2
      statement: "..."
      expected_reaction: "..."

  labels_prepared:
    - trigger_objection: "Esta caro"
      label: "Parece que o investimento e uma preocupacao real..."
      mirror: "...preocupacao real?"
      real_concern_hypothesis: "..."

  calibrated_questions:
    - context: "preco | autoridade | timing | concorrente | implementacao"
      question: "Como...?"
      strategic_intent: "..."

  ackerman_anchors:
    target_price: "R$ X"
    move_1_65pct: "R$ X"
    move_2_85pct: "R$ X"
    move_3_95pct: "R$ X"
    move_4_final: "R$ X (numero nao-redondo)"
    non_monetary_sweetener: "..."

  close_script:
    up_front_contract: "..."
    thermometer_question: "Numa escala de 1 a 10..."
    fallback_if_below_7: "O que precisaria mudar...?"
    close_statement: "Com base no que conversamos..."
    post_sell_steps:
      - step: 1
        action: "..."
        owner: "..."
        deadline: "..."
```

## Completion Criteria

- [ ] Pre-Negotiation Intel coletado (worldview + Black Swans + tipo de negociador)
- [ ] Accusation Audit redigido (5-10 declaracoes ordenadas do mais severo ao mais leve)
- [ ] Label & Mirror Discovery executado (objecoes mapeadas para preocupacoes reais)
- [ ] Calibrated Questions desenhadas (5-8 perguntas "How"/"What" customizadas)
- [ ] Ackerman Bargaining planejado (4 movimentos com valores calculados) -- se aplicavel
- [ ] Close Architecture montada (Up-Front Contract + Thermometer + Close + Post-Sell)
- [ ] Output YAML completo e formatado conforme template
- [ ] Plano revisado pelo usuario antes de execucao
