# Squad Sales - Elite Sales Methodology Agents

Squad de vendas baseado em **elite minds reais** com frameworks documentados. Cobre o funil completo: diagnostico, qualificacao, negociacao, prospecting, closing e escala.

## Quick Start

```
@sales-chief
```

O orchestrador diagnostica a situacao e roteia para o especialista certo. Use `*help` para ver todos os comandos disponíveis.

## Tier Organization

| Tier | Agent | Especialidade | Framework Principal |
|------|-------|---------------|---------------------|
| Orchestrator | sales-chief | Coordenação e diagnóstico | Routing Protocol (6 dimensões + niche) |
| Tier 0 - Diagnostico | neil-rackham | Discovery e qualificacao | SPIN Selling |
| Tier 1 - Masters | david-sandler | Controle do processo | Sandler Submarine System |
| Tier 1 - Masters | keenan | Venda centrada em problema | Gap Selling |
| Tier 1 - Masters | chris-voss | Negociacao tatica | Tactical Empathy / Never Split the Difference |
| Tier 2 - Systematizers | challenger-sale | Ensino e reframe | Teach-Tailor-Take Control |
| Tier 2 - Systematizers | jeb-blount | Prospecting fanatico | Fanatical Prospecting + Sales EQ |
| Tier 2 - Systematizers | chet-holmes | Maquina de vendas | Ultimate Sales Machine / Dream 100 |
| Tier 3 - Specialists | aaron-ross | Outbound engine | Predictable Revenue / Cold Calling 2.0 |

## Comandos do Orchestrator

| Comando | Descricao |
|---------|-----------|
| `*diagnose` | Diagnóstico completo da situação de vendas (6 dimensões + niche detection) |
| `*prospect` | Roteia para prospecting (Jeb Blount / Aaron Ross) |
| `*qualify` | Roteia para qualificação (Neil Rackham / Keenan / Sandler) |
| `*negotiate` | Roteia para negociação (Chris Voss) |
| `*close` | Roteia para fechamento (David Sandler) |
| `*scale` | Roteia para escala (Aaron Ross / Chet Holmes) |
| `*followup` | Criar sequências de follow-up para deals em qualquer estágio |
| `*email-sequence` | Criar sequências de email marketing (nurture, launch, cart, onboarding) |
| `*sales-copy` | Criar copy de vendas (sales page, VSL, webinar, proposta, landing page) |
| `*scripts` | Criar scripts de vendas (discovery call, demo, closing, objeções, DMs) |
| `*help` | Lista todos os comandos disponíveis |
| `*exit` | Sair do modo Sales Squad |

## Comandos por Agent

### Neil Rackham (Tier 0)
- `*spin-discovery` - Sessao completa de discovery SPIN
- `*develop-implications` - Aprofundar implicacoes do problema
- `*craft-need-payoff` - Construir perguntas Need-Payoff
- `*diagnose-deal` - Diagnosticar saude do deal

### David Sandler (Tier 1)
- `*pain-funnel` - Executar Pain Funnel (8 perguntas)
- `*upfront-contract` - Criar Upfront Contract
- `*qualify-budget` - Qualificar budget (Money step)
- `*sandler-close` - Fechar usando Sandler system

### Keenan (Tier 1)
- `*gap-analysis` - Analise completa Current State -> Gap -> Future State
- `*map-current-state` - Mapear estado atual do prospect
- `*quantify-gap` - Quantificar o gap em termos de impacto
- `*problem-discovery` - Discovery centrada em problemas

### Chris Voss (Tier 1)
- `*negotiate` - Sessao completa de negociacao tatica
- `*accusation-audit` - Executar Accusation Audit
- `*handle-objection` - Tratar objecao com empatia tatica
- `*calibrate-questions` - Gerar perguntas calibradas

### Challenger Sale (Tier 2)
- `*teaching-pitch` - Criar 6-Step Teaching Pitch
- `*reframe-insight` - Construir Reframe com insight
- `*constructive-tension` - Aplicar tensao construtiva
- `*challenger-profile` - Diagnosticar perfil de vendedor

### Jeb Blount (Tier 2)
- `*prospect-plan` - Plano de prospecting fanatico
- `*cold-call-script` - Script de cold call
- `*handle-objection` - Tratar objecao com LDA framework
- `*pipeline-audit` - Auditoria do pipeline

### Chet Holmes (Tier 2)
- `*dream-100` - Estrategia Dream 100
- `*stadium-pitch` - Criar Stadium Pitch educativo
- `*sales-machine-audit` - Auditoria das 12 estrategias
- `*education-pitch` - Pitch baseado em educacao

### Aaron Ross (Tier 3)
- `*outbound-engine` - Construir outbound engine
- `*sdr-playbook` - Criar playbook SDR
- `*pipeline-math` - Calcular matematica do pipeline
- `*cold-email-sequence` - Criar sequencia de cold email

## Fluxo de Uso Recomendado

```
1. @sales-chief *diagnose     --> Diagnostico inicial
2. neil-rackham *spin-discovery --> Discovery profunda
3. keenan *gap-analysis         --> Quantificar o gap
4. david-sandler *pain-funnel   --> Aprofundar a dor
5. chris-voss *negotiate        --> Negociar termos
6. david-sandler *sandler-close --> Fechar o deal
```

Para **prospecting em escala:**
```
1. aaron-ross *outbound-engine  --> Estruturar operacao
2. jeb-blount *prospect-plan    --> Plano de prospecting
3. chet-holmes *dream-100       --> Selecionar Dream 100
```

## Estrutura

```
squad-sales/
├── config.yaml                              # Configuração do squad
├── README.md                                # Este arquivo
├── ARCHITECTURE.md                          # Arquitetura e data flow
├── CHANGELOG.md                             # Histórico de versões
├── agents/
│   ├── sales-chief.md                       # Orchestrator
│   ├── neil-rackham.md                      # Tier 0 - SPIN Selling
│   ├── david-sandler.md                     # Tier 1 - Sandler System
│   ├── keenan.md                            # Tier 1 - Gap Selling
│   ├── chris-voss.md                        # Tier 1 - Tactical Empathy
│   ├── challenger-sale.md                   # Tier 2 - Teach-Tailor-Take Control
│   ├── jeb-blount.md                        # Tier 2 - Fanatical Prospecting
│   ├── chet-holmes.md                       # Tier 2 - Ultimate Sales Machine
│   └── aaron-ross.md                        # Tier 3 - Predictable Revenue
├── tasks/
│   ├── diagnose-deal.md                     # Diagnóstico completo do deal
│   ├── qualify-prospect.md                  # Qualificação SPIN + Gap + Sandler
│   ├── create-cold-outreach.md              # Outreach via Cold Calling 2.0 + Dream 100
│   ├── negotiate-deal.md                    # Negociação com Tactical Empathy
│   ├── close-deal.md                        # Fechamento via Submarine System
│   ├── create-followup-sequence.md          # Sequências de follow-up multi-estágio
│   ├── create-email-sequences.md            # Email marketing (nurture, launch, cart, onboarding)
│   ├── create-sales-copy.md                 # Copy de vendas (sales page, VSL, proposta)
│   └── create-sales-scripts.md              # Scripts de vendas (calls, DMs, objeções)
├── checklists/
│   ├── deal-qualification-checklist.md      # 14 items, scoring A/B/C/D
│   └── discovery-quality-checklist.md       # 13 items, SPIN + Gap quality
├── workflows/                               # (planejado)
├── data/                                    # (planejado)
└── templates/                               # (planejado)
```

## Metadata

| Campo | Valor |
|-------|-------|
| Versão | 1.0.0 |
| Autor | Squad Architect |
| Data | 2026-03-30 |
| Minds pesquisadas | 18 |
| Minds selecionadas | 8 |
| Modo de criação | YOLO |
| Score de validação | 7.9/10 (PASS) |
| Total de linhas | 15,768 |
