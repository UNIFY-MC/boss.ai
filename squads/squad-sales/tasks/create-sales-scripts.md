# Task: Create Sales Scripts

**Task ID:** create-sales-scripts
**Purpose:** Criar scripts de vendas para calls de discovery, demos, closing, objecoes, DMs/WhatsApp, triagem e pedidos de referral -- cobrindo todo o ciclo de interacao com prospects e clientes
**Agent:** david-sandler (primary -- Sandler Up-Front Contract + Pain Funnel scripts), chris-voss (secondary -- Tactical Empathy para scripts de objecao)
**Mode:** Interactive
**Execution Type:** Agent

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| niche_context | string | Yes | Perfil de nicho (infoproduto_low_ticket, infoproduto_high_ticket, saas_smb, saas_enterprise, services_consulting, ecommerce_dtc) |
| product_service | string | Yes | Descricao do produto/servico vendido (o que faz, para quem, principal transformacao) |
| icp_profile | string | Yes | Perfil do cliente ideal (cargo, industria, tamanho da empresa, dor principal, linguagem que usa) |
| avg_ticket | string | Yes | Ticket medio do deal (ex: "R$5k", "$20k ARR", "R$297") |
| script_types | array | No | Quais scripts gerar (discovery, demo, closing, objection, dm, triage, referral). Default: todos aplicaveis ao niche |
| sales_cycle_length | string | No | Duracao media do ciclo de vendas (ex: "7 dias", "45 dias", "6 meses") |
| common_objections | array | No | Lista de objecoes mais ouvidas pelo time (enriquece Step 4) |

---

## Pre-Conditions

- ICP definido com dor principal, cargo-alvo e linguagem do comprador -- sem ICP, scripts serao genericos e ineficazes
- Produto/servico claramente definido (proposta de valor, diferenciais, faixa de preco)
- Niche context identificado (pode vir do diagnose-deal ou ser informado diretamente)
- Se niche = ecommerce_dtc: PARAR e redirecionar para copy squad (scripts de venda nao se aplicam; o "script" e a pagina de produto + checkout)

---

## Steps

### Step 0: Niche Context Validation (sales-chief) -- MANDATORY FIRST
- **elicit: true**
- Validar niche_context e determinar quais scripts sao aplicaveis:

| Niche | Scripts Aplicaveis | Scripts NAO Aplicaveis |
|-------|-------------------|----------------------|
| infoproduto_low_ticket | DM Scripts + Triagem Call | Discovery, Demo, Closing, Referral |
| infoproduto_high_ticket | Discovery + Closing + Objecao + DM + Referral | Demo (a call JA e a demo) |
| saas_smb | Todos (ciclo completo) | -- |
| saas_enterprise | Discovery + Demo + Closing + Objecao + Referral | DM (inapropriado), Triagem (discovery ja qualifica) |
| services_consulting | Discovery (diagnostico) + Closing (proposta) + Objecao + Referral | Demo (servico nao tem demo), DM |
| ecommerce_dtc | NENHUM -- redirecionar para copy squad | Todos |

- Se usuario pediu scripts nao aplicaveis ao niche: alertar e sugerir alternativa
- **Output:** scripts_to_generate (lista filtrada pelo niche)

### Step 1: Discovery Call Script (david-sandler + neil-rackham) -- 30-60min
**Aplicavel a:** saas_smb, saas_enterprise, services_consulting, infoproduto_high_ticket

**Abertura -- Up-Front Contract (david-sandler):**
- Proposito: "O objetivo da nossa conversa e entender se faz sentido trabalharmos juntos."
- Tempo: duracao acordada. Agenda: perguntas, compartilhar contexto, decidir proximo passo.
- Outcome: "Sim, quero avancar / Nao, nao faz sentido / Preciso de mais informacao. Todas sao validas."
- Permissao: "Tudo bem se seguirmos assim?"
- Transicao: "Otimo, entao vamos comecar. Me conta um pouco sobre..."

**Corpo -- SPIN Discovery (neil-rackham):**
- **Situation (2-3 perguntas max):** "Como funciona o processo de [area] hoje?" / "Que ferramentas usam?"
- **Problem (3-4 perguntas):** "Onde o processo atual trava ou gera frustracao?" / "O que ja tentaram para resolver?"
- **Implication (2-3 perguntas):** "Se continuar por mais 6 meses, qual o impacto no [receita/time]?" / "Que oportunidades estao sendo perdidas?"
- **Need-Payoff (2 perguntas):** "Se fosse resolvido, quanto tempo/dinheiro economizariam?" / "Que metas seriam desbloqueadas?"
- Transicao entre secoes: "Interessante. Deixa eu entender melhor..."

**Fechamento da Discovery:**
- Resumo: "Se eu entendi certo, o principal desafio e [dor], causando [impacto], e idealmente voce gostaria de [resultado]. Correto?"
- Proximo passo: agendar demo/proposta ou desqualificar com respeito
- **Anti-patterns:** NAO apresentar solucao durante discovery. NAO pular Situation. NAO fazer mais de 3 Situation seguidas. NAO terminar sem UFC para o proximo encontro.

### Step 2: Demo/Presentation Script (keenan) -- 30-45min
**Aplicavel a:** saas_smb, saas_enterprise

**Abertura -- Up-Front Contract:** Referenciar discovery anterior e estabelecer UFC para a demo.

**Corpo -- Gap Selling Structure (keenan):**
- **Current State Recap (5min):** Relembrar situacao atual com as palavras DO PROSPECT
- **Pain Amplification (5min):** Reconectar ao impacto financeiro + pessoal
- **Solution Demonstration (15-20min):** Mostrar APENAS o que resolve a dor mapeada. Para cada feature: "Lembra que voce mencionou [dor]? Aqui e como resolvemos isso." Regra: cada feature DEVE conectar a uma dor da discovery
- **Future State Vision (5min):** "Com base no que voce me disse, estimamos que [resultado quantificado]."
- Transicao: "Agora que viu como funciona, deixa eu mostrar o impacto no seu dia-a-dia..."

**Fechamento:** Pergunta de teste: "Baseado no que viu, isso resolveria o problema?" Se sim: agendar closing. Se objecoes: capturar e tratar (Step 4).
- **Anti-patterns:** NAO fazer feature dump. NAO comecar sem recap de dor. NAO pular Future State. NAO encerrar sem proximo passo.

### Step 3: Closing Call Script (david-sandler) -- 20-30min
**Aplicavel a:** saas_smb, saas_enterprise, services_consulting, infoproduto_high_ticket

**Abertura -- Up-Front Contract para Close:**
- "O objetivo de hoje e tomar uma decisao -- sim, nao, ou o que precisa mudar para ser sim. As tres sao validas."
- Permissao para "Nao": "'Nao' e perfeitamente aceitavel. Prefiro um nao honesto a um sim forcado."

**Corpo -- Sandler Submarine Final Close:**
- **Pain Recap + Thermometer:** "Da ultima vez, voce mencionou [dor Level 3]. Numa escala de 1-10, onde esta hoje?" Se < 7: investigar o que mudou. Se >= 7: avancar.
- **Proposta como ponte:** "O investimento e [valor], que comparado ao custo de inacao de [X/mes], se paga em [timeframe]."
- **Decision Ask:** "Baseado em tudo, o que voce gostaria de fazer?"

**Negative Reverse Selling (objecoes finais):**
- "Esta caro" -> "Voce provavelmente tem razao. O que acontece se nao resolverem?"
- "Preciso pensar" -> "Geralmente significa que algo nao esta certo. O que te incomoda?"
- "Preciso falar com X" -> "Entendo. O que voce vai recomendar para X?"

**Post-Sell (inoculacao contra buyer's remorse):**
- "Nos proximos dias pode surgir uma duvida. Quando acontecer, lembre que [reconectar a dor e resultado]."
- Proximos passos com datas: contrato, kick-off, ponto de contato
- **Anti-patterns:** NAO apresentar preco sem reconectar a dor. NAO aceitar "vou pensar" sem desenterrar objecao real. NAO pressionar apos "nao" genuino. NAO esquecer post-sell.

### Step 4: Objection Handling Scripts (chris-voss) -- Top 10
**Aplicavel a:** todos os niches com interacao humana

**Framework -- Tactical Empathy (para CADA objecao):**
1. **Label:** "Parece que voce esta preocupado com..."
2. **Mirror:** Repetir as 2-3 ultimas palavras como pergunta
3. **Calibrated Question:** Comecar com "Como" ou "O que" -- NUNCA "Por que"
4. **Pausa tatica:** 3-5 segundos de silencio apos o label

**Top 10 objecoes a scriptar:**
1. "Esta caro" / "Nao tenho budget"
2. "Preciso pensar" / "Vou analisar"
3. "Preciso falar com meu [socio/chefe/esposa]"
4. "Ja uso [concorrente]"
5. "Nao e prioridade agora"
6. "Me manda uma proposta por email"
7. "Preciso ver mais cases/resultados"
8. "Nao confio nesse tipo de solucao"
9. "Ja tentei algo parecido e nao funcionou"
10. "O timing nao e bom"

- Se common_objections foi fornecido: substituir as menos relevantes por objecoes reais do usuario
- Para CADA objecao: Label + Mirror + Calibrated Question + exemplo de dialogo completo
- **Anti-patterns:** NAO argumentar com a objecao. NAO responder imediatamente (pausa desarma). NAO usar "mas" apos validar. NAO ignorar a emocao por tras da objecao.

### Step 5: DM/WhatsApp Scripts (jeb-blount + chris-voss)
**Aplicavel a:** infoproduto_low_ticket, infoproduto_high_ticket, saas_smb

**Cold DM Script:**
- Hook (max 2 linhas): "[Observacao pessoal]. [Pergunta genuina relacionada a dor]."
- Follow-up (se respondeu): 1 pergunta SPIN Problem para aprofundar
- Transicao para call/oferta: "Tenho algo que pode ajudar. Posso te mandar um [material/link]?"

**Warm DM Script (pos-interacao):**
- Contexto: prospect curtiu, comentou, respondeu story, participou de live
- Hook: "Vi que voce [acao]. [Pergunta sobre a dor]."
- 2-3 mensagens de conversa antes de qualquer oferta

**Post-Event DM Script (apos webinar/live/evento):**
- Imediato (< 24h): "Vi que voce participou do [evento]. O que mais chamou atencao?"
- Follow-up (48-72h): referenciar resposta, aprofundar, oferecer proximo passo
- **Anti-patterns:** NAO mandar audio longo como primeira mensagem. NAO fazer pitch na primeira DM. NAO usar mensagem generica copiada-colada. NAO esperar mais de 48h para primeira mensagem.

### Step 6: Triagem/Qualification Call Script (sales-chief) -- 15-20min
**Aplicavel a:** infoproduto_low_ticket (via WhatsApp), infoproduto_high_ticket, saas_smb

**Abertura -- Up-Front Contract Light:**
- "Essa conversa e rapida -- so para entender sua situacao e ver se faz sentido avancar. [Tempo]. No final, te digo sinceramente se posso ajudar ou nao."

**5 Perguntas de Qualificacao:**
1. **Dor:** "Qual o maior problema que voce enfrenta com [area] hoje?"
2. **Urgencia:** "Numa escala de 1-10, o quanto e urgente resolver isso?"
3. **Tentativas:** "O que voce ja tentou para resolver?"
4. **Investimento:** "Voce esta preparado para investir em uma solucao se fizer sentido?"
5. **Decisao:** "Se fizer sentido, voce consegue tomar a decisao sozinho(a)?"

**Fechamento:** Se qualificado: agendar discovery ou enviar oferta. Se desqualificado: "Nesse momento, nao sou a melhor opcao. [Sugestao alternativa]."
- **Anti-patterns:** NAO transformar triagem em discovery completa. NAO vender durante triagem. NAO desqualificar com grosseria.

### Step 7: Referral Ask Script (david-sandler) -- Pos-Close
**Aplicavel a:** saas_smb, saas_enterprise, services_consulting, infoproduto_high_ticket

**Timing:** Pedir referral APOS resultado concreto, nao no dia do close.

**Script de Referral:**
- Setup: "Fico feliz com o resultado que voces estao tendo com [resultado especifico]."
- Ask: "Conhece mais alguem que enfrenta o mesmo desafio que voce tinha antes de trabalharmos juntos?"
- Facilitacao: "Posso mandar uma mensagem curta que voce pode encaminhar."

**Mensagem para o Indicado:**
- "[Cliente] me passou seu contato. Mencionou que voce pode estar enfrentando [dor similar]. Se fizer sentido, podemos conversar 15 minutos?"
- **Anti-patterns:** NAO pedir referral no dia do close. NAO ser generico ("conhece alguem?") -- especificar o TIPO de pessoa. NAO pressionar se o cliente nao quiser indicar.

---

## Niche Context Notes

| Niche | Scripts Core | Observacao |
|-------|-------------|------------|
| infoproduto_low_ticket | DM Scripts + Triagem Call | NAO discovery calls -- modelo e volume via WhatsApp. Se precisar de copy, redirecionar para copy squad |
| infoproduto_high_ticket | Discovery + Closing + Objecao | Core do high-ticket. DM e Referral complementam |
| saas_smb | Ciclo completo | Discovery + Demo + Closing + Objecao + DM + Referral. Todos aplicaveis |
| saas_enterprise | Discovery + Demo + multi-stakeholder + procurement | Closing complexo com multiplas reunioes. Sem DM (canal inadequado) |
| services_consulting | Diagnostic Call + Proposta + Referral | Discovery e consultiva (diagnostico, nao interrogatorio). Referral e canal primario de aquisicao |
| ecommerce_dtc | NAO APLICAVEL | Redirecionar para copy squad para descricoes de produto e checkout optimization |

---

## Veto Conditions

- **VETO** se ICP nao esta definido -- scripts precisam da linguagem especifica do comprador para serem eficazes
- **VETO** se produto/servico nao esta claramente definido -- impossivel criar scripts de proposta de valor sem saber o que se vende
- **VETO** se niche = ecommerce_dtc -- redirecionar para copy squad. Scripts de call/DM nao se aplicam ao modelo DTC
- **VETO** se criando Discovery Call + Closing Call para infoproduto_low_ticket -- modelo errado. Low-ticket vende via copy (pagina, VSL, anuncio), nao call 1-a-1. Redirecionar para copy squad
- **VETO** se criando DM Scripts para saas_enterprise -- canal inapropriado. Enterprise usa email formal, LinkedIn InMail ou introducoes via referral

---

## Output

```yaml
sales_scripts_package:
  metadata:
    task_id: create-sales-scripts
    date: "{ISO-8601}"
    niche_context: "{niche_profile}"
    agents_involved:
      - david-sandler
      - chris-voss
      - neil-rackham
      - keenan
      - jeb-blount

  scripts:
    - script_type: "discovery_call | demo | closing_call | objection_handling | dm_cold | dm_warm | dm_post_event | triage_call | referral_ask"
      duration: "Xmin"
      applicable_niches:
        - "{niche_1}"
      sections:
        - name: "Nome da secao (ex: Up-Front Contract)"
          purpose: "Objetivo desta secao no script"
          timing: "Xmin"
          key_phrases:
            - "Frase exata sugerida 1"
            - "Frase exata sugerida 2"
          transitions:
            - para: "Nome da proxima secao"
              frase: "Frase de transicao sugerida"
          notes: "Observacoes de adaptacao"

      objection_bank:
        - objection: "Texto da objecao"
          frequency: "alta|media|baixa"
          response:
            label: "Parece que..."
            mirror: "..."
            calibrated_question: "Como/O que..."
            example_dialogue: |
              Prospect: "[objecao]"
              Vendedor: "[label + pausa]"
              Prospect: "[resposta provavel]"
              Vendedor: "[calibrated question]"

      anti_patterns:
        - pattern: "Descricao do erro comum"
          why_bad: "Por que prejudica a venda"
          do_instead: "O que fazer no lugar"

  niche_adaptation_notes: |
    Observacoes sobre como os scripts foram adaptados ao niche.
    Quais scripts foram omitidos e por que.
    Sugestoes de canais alternativos quando aplicavel.
```

---

## Completion Criteria

- [ ] Niche context validado e scripts aplicaveis filtrados corretamente
- [ ] Discovery Call Script com Up-Front Contract + SPIN + fechamento (se aplicavel ao niche)
- [ ] Demo/Presentation Script com Gap Selling: dor -> solucao -> impacto (se aplicavel)
- [ ] Closing Call Script com Sandler Submarine: recap pain -> proposta -> decisao (se aplicavel)
- [ ] Objection Handling Scripts para top 10 objecoes com Tactical Empathy (Label + Mirror + Calibrated Question)
- [ ] DM Scripts para cold, warm e post-event (se aplicavel ao niche)
- [ ] Triagem Call Script com 5 perguntas de qualificacao rapida (se aplicavel)
- [ ] Referral Ask Script com timing, ask e mensagem para indicado (se aplicavel)
- [ ] Anti-patterns documentados para CADA tipo de script gerado
- [ ] Frases de transicao entre secoes de CADA script
- [ ] Output formatado conforme template YAML
- [ ] Nenhum conteudo especifico de business -- scripts sao frameworks genericos, nao templates preenchidos
