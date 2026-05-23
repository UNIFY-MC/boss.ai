# DB Specialist Review — Technical Debt DRAFT

**Fase:** Brownfield Discovery — Phase 5 (data-engineer specialist review)
**Revisor:** @data-engineer (Dara)
**Data:** 2026-05-23
**Input revisto:** `technical-debt-DRAFT.md` (Phase 4, @architect Aria)
**Cross-references:** `SCHEMA.md` + `DB-AUDIT.md` (Phase 2, ambos da minha autoria)

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Revisão item-a-item dos TDs que tocam a data layer](#2-revisão-item-a-item-dos-tds-que-tocam-a-data-layer)
3. [Items em falta — perspectiva data](#3-items-em-falta--perspectiva-data)
4. [Riscos de migração futura](#4-riscos-de-migração-futura)
5. [Recomendação técnica final](#5-recomendação-técnica-final)

---

## 1. Sumário executivo

O draft do @architect cobre bem o débito *transversal* (governance, frontend, CI), mas trata a data layer com bastante leveza — o que é justificável porque, de facto, não há DB. No entanto, há **5 itens novos** materialmente relevantes que não estão capturados, e **2 itens** do draft que precisam de reframe quando vistos pela óptica data/storage.

| Métrica da revisão | Valor |
|---|---|
| TDs revistos com toque em data layer | 5 (TD-002, TD-003, TD-007, TD-018, TD-023) |
| AGREE | 3 |
| AGREE_WITH_CHANGES | 2 |
| DISAGREE | 0 |
| OUT_OF_SCOPE | 0 |
| Items novos propostos | 5 (DS-001 a DS-005) |
| Severidade do item novo mais alto | **MEDIUM** (DS-001 — falta de schema validation runtime) |

**Veredicto data layer:** a arquitectura filesystem-first é **adequada e correcta para o tamanho actual**. Os gaps que identifico não exigem migração para DB — são robustez incremental.

---

## 2. Revisão item-a-item dos TDs que tocam a data layer

Selecciono apenas TDs com toque material em data/storage. Os restantes (frontend, security CSP, ideSync, etc.) estão fora do meu mandato como revisor data.

---

### TD-002 — Framework AIOX instalado in-tree

- **Verdict:** **AGREE_WITH_CHANGES**
- **Justificação data:** O draft enquadra TD-002 como problema *arquitectural* (repo size, upgrades manuais). Concordo, mas falta a dimensão **data**: o `entity-registry.yaml` (580 KB, 19.677 linhas, 821 entidades) é o maior single point de truth do sistema e está commitado in-tree precisamente porque o framework está in-tree. Se o framework migrar para `node_modules/@aiox-squads/core` (out-of-tree), o `entity-registry.yaml` desce com ele e perde-se a propriedade **diffável/auditável em PR** — propriedade essa que `DB-AUDIT.md §4.2` declara explicitamente como *razão para não migrar para DB*.
- **Mudança proposta:** Adicionar à descrição de TD-002 o trade-off data: "Migrar framework para out-of-tree implica que `entity-registry.yaml` e demais YAMLs de `.aiox-core/data/` também saem do tracking git do `boss.ai`. Decisão estratégica: aceitar perda de diff-review ou preservar `.aiox-core/data/` in-tree mesmo com framework out-of-tree (modelo híbrido)."
- **Referências:** `SCHEMA.md §3.1` (footprint do registry), `DB-AUDIT.md §4.2` ("Entity-registry.yaml — é versionado em git por design"), `technical-debt-DRAFT.md §2 TD-002`.

---

### TD-003 — Ausência total de testes automatizados

- **Verdict:** **AGREE_WITH_CHANGES**
- **Justificação data:** Concordo plenamente com a severidade HIGH e com o foco do draft nos hooks `.cjs`. **Em falta:** o draft toca de raspão na validação do `core-config.yaml` ("10 KB de configuração viva — não tem schema validation"), mas o problema é maior. Não existe schema validation runtime para **nenhum** dos YAMLs de `.aiox-core/data/`:
  - `entity-registry.yaml` (821 entradas, schema implícito complexo)
  - `agent-config-requirements.yaml`
  - `workflow-patterns.yaml`
  - `workflow-chains.yaml`
  - `tool-registry.yaml`

  Se qualquer agente AIOX (ou o operador humano) editar uma destas tabelas e introduzir um campo malformado, **não há erro até alguém consumir o registry**. O `aiox doctor` é manual.
- **Mudança proposta:** Expandir o scope de TD-003 para incluir "schema validation (JSON Schema ou Zod equivalente) para os ≥5 YAMLs em `.aiox-core/data/` + step CI que valida". Subir esforço de M para M-L. Esta extensão também serve TD-018 (recompute de checksums) e o novo **DS-001** (ver §3.1).
- **Referências:** `SCHEMA.md §3.2` (schema implícito do entity-registry), `DB-AUDIT.md §1.2`, `technical-debt-DRAFT.md §2 TD-003`.

---

### TD-007 — README de hooks documenta 9 hooks, só 2 existem

- **Verdict:** **AGREE** (mas note-se a dimensão data)
- **Justificação data:** Issue primariamente de documentação, fora do meu mandato directo. Toca data layer porque alguns dos hooks documentados (`read-protection.py`, `sql-governance.py`) seriam *enforcement layer* sobre operações em ficheiros do framework — se materializados, complementariam as deny rules de `settings.json` que descrevi em `SCHEMA.md §4.1`. Sem mudança no item.
- **Referências:** `SCHEMA.md §4.1`, `technical-debt-DRAFT.md §2 TD-007`.

---

### TD-018 — Checksums do `entity-registry.yaml` declarados mas nunca recomputados

- **Verdict:** **AGREE** (com nota de severidade)
- **Justificação data:** Concordo com o item, é meu finding original (`DB-AUDIT.md §1.2`). Discordo subtilmente da severidade **LOW** atribuída pelo draft.

  O `entity-registry.yaml` é o **registry-of-record** do framework: define paths, layers, dependencies e checksums de 821 entidades. Se um upgrade do framework AIOX silenciosamente alterar um ficheiro L1/L2 e o checksum no registry **não** for actualizado, fica-se com uma das duas situações degeneradas:
  1. Checksum no registry desactualizado → `aiox doctor` reporta divergência falsa positiva permanente.
  2. Ficheiro modificado por engano (apesar das deny rules) → indetectável até alguém correr `aiox doctor`.

  A combinação "checksum existe mas nunca é verificado automaticamente" cria uma falsa sensação de integridade. Para um sistema cujo Article II da Constitution depende de boundaries deterministas, isto está mais perto de **MEDIUM** do que LOW.

- **Mudança proposta:** Considerar subir TD-018 de LOW para MEDIUM. Não bloqueante, mas vale a pena re-discutir com o @architect.
- **Referências:** `DB-AUDIT.md §1.2`, `SCHEMA.md §3.2`, `technical-debt-DRAFT.md §2 TD-018`.

---

### TD-023 — `learned-patterns.yaml` está vazio

- **Verdict:** **AGREE**
- **Justificação data:** Item meu, capturado correctamente. Severidade LOW está certa. Nenhuma mudança.
- **Referências:** `DB-AUDIT.md §1.2`, `technical-debt-DRAFT.md §2 TD-023`.

---

### Resumo da revisão item-a-item

| TD | Verdict | Mudança proposta? |
|----|---------|---------|
| TD-002 | AGREE_WITH_CHANGES | Adicionar trade-off `entity-registry` se framework sair in-tree |
| TD-003 | AGREE_WITH_CHANGES | Expandir scope para schema validation dos YAMLs de `data/` |
| TD-007 | AGREE | — |
| TD-018 | AGREE | Reconsiderar severidade LOW → MEDIUM |
| TD-023 | AGREE | — |

---

## 3. Items em falta — perspectiva data

5 itens que o draft não captura. Atribuo IDs `DS-NNN` (Data Specialist) para não colidir com `TD-NNN`.

---

### DS-001 — Falta de schema validation runtime para YAMLs internos

- **Categoria:** DataOps
- **Severidade:** **MEDIUM**
- **Componente afectado:** `.aiox-core/data/*.yaml` (≥9 ficheiros)
- **Descrição:** Conforme detalhado na revisão de TD-003, nenhum dos YAMLs catalogados em `SCHEMA.md §3.1` (`entity-registry.yaml`, `workflow-patterns.yaml`, `tool-registry.yaml`, `workflow-chains.yaml`, `agent-config-requirements.yaml`, `mcp-tool-examples.yaml`, `workflow-state-schema.yaml`, `learned-patterns.yaml`, `technical-preferences.md`) tem JSON Schema, Zod schema, ou equivalente. Schemas implícitos vivem nos consumidores (loader code em `.aiox-core/core/`).
- **Impacto:** Edits manuais inválidos só são detectados em runtime quando o loader falha. Erros típicos esperáveis:
  - Campo `layer` com valor não-enum (ex.: `L5`)
  - `usedBy` ou `dependencies` apontando para `entity-id` inexistente (referential integrity ausente)
  - Campo `lifecycle` com typo (ex.: `producton`)
  - `checksum` sem prefixo `sha256:` ou hex inválido
  - `lastVerified` ISO-8601 malformada
- **Solução proposta:** JSON Schema (ou Zod) por ficheiro, validado em pre-commit hook + CI. Pode reutilizar `workflow-state-schema.yaml` como padrão de inspiração (é o único que já se autodescreve).
- **Esforço:** M (1-2 dias para os ≥9 ficheiros, com prioridade no `entity-registry.yaml`)
- **Dependência:** Pode partilhar pipeline com TD-003 (testes dos hooks).

---

### DS-002 — Sem mecanismo de healing do `entity-registry.yaml`

- **Categoria:** DataOps
- **Severidade:** **MEDIUM**
- **Componente afectado:** `.aiox-core/data/entity-registry.yaml` (821 entidades)
- **Descrição:** O registry traz checksums por entidade. **Não traz**:
  1. Comando para *recomputar* todos os checksums automaticamente após upgrade do framework
  2. Comando para *re-scan* do disco e detectar entidades órfãs (registry referencia path que já não existe) ou entidades novas (path no disco que não está no registry)
  3. Comando para *rebuild* do registry from scratch a partir do estado actual do disco

  Existe o `aiox doctor` (referido por TD-018) mas as suas capacidades exactas não estão documentadas no `_CONTEXT.md`. Pelo que vejo, é diagnóstico, não healing.
- **Impacto:**
  - Após qualquer upgrade do framework, o registry corre risco de ficar dessincronizado com o disco. Como TD-002 (framework in-tree) já cria dificuldade em upgrades selectivos, esta combinação é especialmente frágil.
  - Se uma entidade for renomeada (improvável dado o boundary L1/L2, mas possível em L3), o registry mantém referência morta até intervenção manual.
  - **Não há audit log** de quando o registry foi modificado por quê — só `lastUpdated` no metadata.
- **Solução proposta:** Adicionar a `aiox doctor` (ou criar `aiox registry`) os subcommands: `--recompute-checksums`, `--detect-orphans`, `--rebuild`. Adicionar campo `metadata.lastRebuiltBy` para audit trail.
- **Esforço:** M-L (depende se o framework já oferece estes verbos internamente — neste caso é "só" wire-up CLI)
- **Dependência:** Idealmente após DS-001 (schema válido antes de rebuild) e antes/junto de TD-018 (recompute periódico).
- **Acessibilidade do registry:** Cabe notar que o registry **é acessível** (texto YAML legível), mas a **escala** dele (19.677 linhas) torna-o praticamente *humanly write-once* — não se edita manualmente uma entidade em 821 sem tooling. Os comandos acima fecham esse gap.

---

### DS-003 — Memory files growth pattern não tem política de compactação

- **Categoria:** DataOps
- **Severidade:** **LOW**
- **Componente afectado:** `C:\Users\mario\.claude\projects\C--Users-mario-dev-boss-ai\memory\` (Store A)
- **Descrição:** Hoje há 3 memory files (~4 KB total). O `MEMORY.md` index tem cap operacional de 200 linhas (descrito no `CLAUDE.md` global do Mário e em `SCHEMA.md §2.4`). **Não há**:
  1. Política de compactação (quando consolidar várias memories em uma?)
  2. Limite por ficheiro (uma memory pode crescer indefinidamente?)
  3. Estratégia de archive (memories `project` que decaem em dias/semanas — para onde vão?)
  4. Detecção de duplicação (`MEMORY.md` instrui "First check if there is an existing memory you can update before writing a new one" mas é mera convenção)
- **Impacto:** Hoje irrelevante (4 KB). Se o Mário usar o projecto durante 6+ meses, com Claude a escrever 1-2 memories por sessão, atinge centenas. O `MEMORY.md` cap de 200 linhas força truncagem silenciosa — perda de contexto sem aviso. A regra `handoff-consolidation.md` (que conheço de leitura recente) já tem padrão para handoffs (consolidate ≥5 → RUN-LOG). **A mesma lógica não existe para memories.**
- **Solução proposta:** Documentar política em `.claude/rules/` (proposta: `memory-lifecycle.md`):
  - Threshold de compactação: ≥30 memories ou MEMORY.md ≥150 linhas → revisão de consolidação
  - `project` memories com `last_referenced > 60 dias` → candidatas a archive
  - `user` e `feedback` memories → permanentes (alvo de update, não de archive)
  - Audit periódico (manual, mensal) de slugs duplicados
- **Esforço:** S (documento de policy + procedure; nenhuma alteração de código se for política humana)
- **Dependência:** Nenhuma.

---

### DS-004 — Duplicação potencial de settings entre IDEs (data drift latente)

- **Categoria:** DataOps
- **Severidade:** **LOW**
- **Componente afectado:** `.claude/settings.json`, `.codex/`, `.gemini/`, `.cursor/`, `.kimi/`, `.antigravity/`, `.github/`
- **Descrição:** O `_CONTEXT.md` lista 7 directorias de IDE sincronizadas via `aiox ideSync`. TD-006 cobre o **drift do ideSync** (skills/commands/rules). **Não cobre:** drift de **configurações de permissões equivalentes** entre IDEs.

  Exemplo concreto: `.claude/settings.json` declara 14 deny rules a proteger L1/L2. Os outros IDEs (`.codex/`, `.cursor/`, `.gemini/`, ...) têm os seus próprios mecanismos de permission/governance — `aiox ideSync` sincroniza skills, commands e rules de agentes, mas **não está claro se sincroniza os equivalentes a `settings.json` deny/allow rules**.

  Se um operador usar Cursor em vez de Claude Code, as 14 deny rules de `.claude/settings.json` podem não estar a proteger nada. O boundary L1/L2 colapsa em IDEs onde não foi replicado.
- **Impacto:** O Article II + as deny rules foram tratadas pelo @architect (TD-001) e por mim (`DB-AUDIT.md §2.3`) na perspectiva Claude Code. **A multi-IDE story não foi auditada.**
- **Solução proposta:** Adicionar a `aiox ideSync --check` (TD-006) uma verificação de **equivalência semântica de permissões** entre IDEs — não diff textual, mas confirmação de que cada IDE expressa o boundary L1/L2 no seu próprio idioma. Se um IDE não tem mecanismo equivalente, registar como gap conhecido em `core-config.yaml`.
- **Esforço:** M (depende profundamente das capacidades de cada IDE)
- **Dependência:** Após TD-006 (drift checker base existir).

---

### DS-005 — Falta de backup/snapshot strategy para memory files

- **Categoria:** DataOps
- **Severidade:** **LOW**
- **Componente afectado:** `C:\Users\mario\.claude\projects\C--Users-mario-dev-boss-ai\memory\`
- **Descrição:** Memory files vivem fora do repo, fora do git, em path local da máquina do Mário. **Não há**:
  1. Backup automatizado para outro local (cloud, NAS, segundo disco)
  2. Versionamento (cada edição substitui a anterior — sem histórico, sem revert)
  3. Sync entre máquinas (se Mário trabalhar do portátil hoje e do desktop amanhã, as memories divergem)
- **Impacto:** Risco baixo hoje (4 KB de dados, recuperáveis por re-aprendizagem). Risco cresce com o tempo — uma memory `user` consolidada após 6 meses de aprendizagem do Mário **é perda real** se o disco falhar.
- **Solução proposta:** Decisão de produto. Três opções, ordenadas por effort crescente:
  1. **Manual:** copiar a directoria periodicamente para Google Drive (p7.digitall@gmail.com, conta já existente)
  2. **Symlink:** memory directory como symlink para uma pasta OneDrive/Drive sync
  3. **Repo dedicado:** repo privado `mario-claude-memory` separado de `boss.ai`, sincronizado manualmente
- **Esforço:** XS (opção 1) a S (opção 2-3)
- **Dependência:** Nenhuma.

---

### Resumo dos items novos

| ID | Item | Severidade | Esforço |
|----|------|-----------|---------|
| **DS-001** | Schema validation runtime para YAMLs de `.aiox-core/data/` | **MEDIUM** | M |
| **DS-002** | Healing/rebuild commands para `entity-registry.yaml` | **MEDIUM** | M-L |
| DS-003 | Política de compactação/lifecycle de memory files | LOW | S |
| DS-004 | Equivalência de permissions entre IDEs (multi-IDE governance) | LOW | M |
| DS-005 | Backup/snapshot strategy para memory files | LOW | XS-S |

**Item novo crítico:** **DS-001 (schema validation runtime)** — combina mal com TD-002 (framework in-tree, upgrades manuais) e com TD-018 (checksums declarados, não recomputados). É o gap data mais importante.

---

## 4. Riscos de migração futura

`DB-AUDIT.md §4` já definiu **quando** uma DB faria sentido. Aqui aprofundo dois sinais específicos que o draft não destaca:

---

### 4.1. Se o `acervo-formacoes/` crescer (>20 formações)

**Estado actual:** 4 formações, hub `index.html` com filtros JS client-side (TD-008 a TD-022 cobrem a parte visual).

**Threshold crítico (revisto):** O draft (`technical-debt-DRAFT.md §3` quick wins e `DB-AUDIT.md §5`) menciona ~20-30 e ~30-50 entradas em diferentes locais. Refino:

| Tamanho do acervo | Recomendação data |
|---|---|
| ≤10 formações | Status quo (HTML+JS filters) — sem dor |
| 11-20 formações | Status quo, mas índice JSON-driven (extrair card list de HTML para `index.json` consumido por JS) |
| 21-50 formações | **SQLite local** com schema mínimo (`formacoes`, `materiais`, `tags`, `notes`), UI client-side via `sql.js`. Mantém deploy estático Vercel. |
| >50 formações OU multi-utilizador OU notas/comentários do Mário | **Supabase Postgres** (`.env` já tem slots prontos), com RLS para futuro multi-user, sync de notas/highlights entre máquinas. |

**Sinal antecipador (não só contagem):** Se o Mário começar a querer **notas pessoais por formação** (highlights, follow-ups, "rever em X dias"), o threshold cai de 20 para ~5-8. Notas são dados *operacionais* (mudam com frequência), não *arquivísticos* — HTML estático não comporta.

**Trigger técnico:** se `acervo-formacoes/index.html` passar de ~1000 linhas com filtros, está na hora. Hoje está confortável (a estimar ~950 linhas pelo que vi nos refs do draft).

---

### 4.2. Se memory files crescerem (>500 ficheiros)

**Estado actual:** 3 ficheiros, ~4 KB. `MEMORY.md` index com cap de 200 linhas (≈200 memories).

**Refino:**

| Tamanho do conjunto memory | Recomendação |
|---|---|
| ≤30 memories | Status quo. |
| 31-100 memories | **DS-003** activo (política de compactação + audit de duplicação). Sem indexação necessária. |
| 101-200 memories | **Hard cap operacional do MEMORY.md** começa a doer. Considerar partição por `metadata.type` (multiple index files: `MEMORY-user.md`, `MEMORY-project.md`, etc.) |
| 201-500 memories | Index único insustentável. Necessária **indexação tipo full-text local** (ex.: `lunr.js` ou `fuse.js` carregado pelo Claude no startup do projecto). |
| >500 memories | **Repensar arquitectura.** Migração para SQLite local com FTS5 (full-text search) é provavelmente a resposta. Memory files individuais continuam a existir; SQLite é apenas o índice. Single-machine, low effort. |

**Sinal antecipador:** Se o Claude começar a perder ou duplicar memories (porque o context window não consegue carregar `MEMORY.md` inteiro + escolher a relevante), o threshold real foi atingido — mesmo com <200 memories.

**Trigger técnico:** monitorizar tamanho de `MEMORY.md` em bytes/linhas. >150 linhas = revisão; >180 linhas = compactação obrigatória.

---

### 4.3. Riscos transversais (não dependentes de tamanho)

1. **Adoção de multi-utilizador real** (já descrito em `DB-AUDIT.md §4.1`) — única razão *categórica* para introduzir DB. Tudo o resto é optimização incremental.
2. **Métricas operacionais do framework** — se aparecer requisito de medir "tempo por agente", "success rate por workflow", o store de time-series não cabe em YAML. Postgres ou DuckDB local resolveria.
3. **Concorrência multi-processo** — se algum dia houver dois processos AIOX a escrever em `entity-registry.yaml` em simultâneo, não há locking. YAML edits são *last-writer-wins*. Não é problema hoje (single CLI), passa a ser se aparecer daemon/background sync.

---

## 5. Recomendação técnica final

A data layer actual do `boss.ai` é **adequada para o tamanho actual e para o próximo ano de uso plausível**: 3 stores baseados em ficheiros, ~700 KB versionados, integridade declarada por checksums, segurança enforced por deny rules. O modelo filesystem-first é coerente com o perfil do projecto (single-user, single-machine, framework + acervo pessoal) e a migração para DB seria prematura — produziria mais débito do que resolveria. **Contudo**, o draft do @architect subestima dois riscos *internos* à própria filesystem layer: a ausência de schema validation runtime para os YAMLs de `.aiox-core/data/` (DS-001) e a inexistência de healing/rebuild commands para o `entity-registry.yaml` de 821 entidades (DS-002). Estes dois itens MEDIUM são pré-requisitos para que a estratégia "manter filesystem-first" seja sustentável a 6-12 meses — sem eles, qualquer upgrade do framework AIOX (TD-002) corre risco de degradação silenciosa do registry, e qualquer edit manual num YAML interno é uma porta para inconsistência indetectada. Os restantes 3 itens novos (DS-003 lifecycle de memories, DS-004 governance multi-IDE, DS-005 backup) são LOW, defensivos, e podem aguardar.

---

*Documento produzido por @data-engineer (Dara) — Brownfield Discovery Phase 5 — 2026-05-23*
