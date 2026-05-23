# SCHEMA — boss.ai

**Data:** 2026-05-23
**Autor:** @data-engineer (Dara) — Brownfield Discovery, Fase 2
**Escopo:** stores persistentes do projecto `C:\Users\mario\dev\boss.ai`

---

## Sumário executivo

**O projecto `boss.ai` NÃO tem base de dados.** Não existe Postgres, SQLite, MongoDB, Redis, Supabase ativo, nem nenhuma outra forma de armazenamento relacional, documental ou key-value gerida por servidor.

O `.env` na raiz declara variáveis Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) mas estão todas vazias — são *placeholders* herdados do template AIOX. Outras credenciais (`DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, `VERCEL_TOKEN`, etc.) seguem o mesmo padrão.

A persistência real do projecto vive **em ficheiros no disco**, em três famílias distintas, descritas abaixo como se fossem um "schema simplificado".

---

## Índice

1. [Visão geral dos stores](#1-visão-geral-dos-stores)
2. [Store A — Memory Files (Claude auto-memory)](#2-store-a--memory-files-claude-auto-memory)
3. [Store B — YAML Registries (`.aiox-core/data/`)](#3-store-b--yaml-registries-aiox-coredata)
4. [Store C — JSON Settings (`.claude/settings*.json`)](#4-store-c--json-settings-claudesettingsjson)
5. [Store D — Auxiliares (config + handoffs runtime)](#5-store-d--auxiliares-config--handoffs-runtime)
6. [Mapa de relações](#6-mapa-de-relações)
7. [O que NÃO é schema](#7-o-que-não-é-schema)

---

## 1. Visão geral dos stores

| Store | Tipo | Localização | Mutável por | Versionado |
|-------|------|-------------|-------------|------------|
| A | Memory files (markdown + frontmatter YAML) | `C:\Users\mario\.claude\projects\C--Users-mario-dev-boss-ai\memory\` | Claude Code (auto-memory) | NÃO (fora do repo) |
| B | YAML registries | `.aiox-core/data/` | Framework AIOX (lazy-edits) | SIM (em git, L3 mutável) |
| C | JSON settings (project-shared) | `.claude/settings.json` | Equipa (manual) | SIM |
| C | JSON settings (user-local) | `.claude/settings.local.json` | Utilizador local | NÃO (gitignored) |
| D | Core config | `.aiox-core/core-config.yaml` | Framework + projecto | SIM |
| D | Runtime handoffs | `.aiox/handoffs/` (não existe ainda) | Agentes em runtime | NÃO (gitignored) |
| `.env` | Credenciais (vazias) | `.env` | Utilizador | NÃO (gitignored) |

**Total approximate footprint:** ~700 KB versionado (dominado por `entity-registry.yaml` — 580 KB) + ~2 KB de memory files locais.

---

## 2. Store A — Memory Files (Claude auto-memory)

### 2.1. Localização

```
C:\Users\mario\.claude\projects\C--Users-mario-dev-boss-ai\memory\
├── MEMORY.md                          (índice; ~450 bytes; 3 entradas)
├── project_acervo_formacoes.md        (~1.5 KB)
├── reference_drive_acervo.md          (~1 KB)
└── project_acervo_drive_pending.md    (~1.6 KB)
```

Path absoluto controlado pelo Claude Code, **fora** do repositório git. Cada projecto Claude tem um directório próprio, identificado pelo slug do `cwd`.

### 2.2. "Schema" típico de um memory file

```yaml
---
name: {{kebab-case-slug}}         # obrigatório, único
description: {{one-liner}}        # usado para relevance ranking
metadata:
  type: user|feedback|project|reference   # obrigatório, enum
---

{{body em markdown livre}}

Para `feedback` e `project` espera-se:
- **Why:** {{motivação/contexto}}
- **How to apply:** {{quando aplicar}}

Links cruzados: [[outro-slug]]
```

### 2.3. Tipos (enum `metadata.type`)

| Type | Conteúdo | Lifecycle | Exemplos no projecto |
|------|----------|-----------|----------------------|
| `user` | Quem é o utilizador, papel, expertise | Estável (raramente muda) | — (nenhum ainda) |
| `feedback` | Regras de colaboração, do/don't, lições | Estável | — (nenhum ainda) |
| `project` | Trabalho em curso, decisões, deadlines | Volátil (decai em dias/semanas) | `project_acervo_formacoes.md`, `project_acervo_drive_pending.md` |
| `reference` | Pointers para sistemas externos (IDs, URLs) | Semi-estável | `reference_drive_acervo.md` |

### 2.4. Índice (`MEMORY.md`)

Ficheiro plano (sem frontmatter), entradas de uma linha cada, formato:

```markdown
- [Title](file.md) — one-line hook
```

Limite operacional: 200 linhas (linhas além são truncadas no carregamento de contexto).

### 2.5. Relações

- `[[slug]]` no body de um memory file refere outro memory pelo `name:` do frontmatter. Não há FK enforcement — slugs órfãos são tolerados (marcam memories futuras).
- `MEMORY.md` é o "table of contents" que aponta para os ficheiros. **Não é um memory** — é índice.

---

## 3. Store B — YAML Registries (`.aiox-core/data/`)

Ficheiros YAML que funcionam como "tabelas" de configuração e conhecimento do framework. Layer L3 (mutável com excepções).

### 3.1. Inventário

| Ficheiro | Linhas | Tamanho | Finalidade |
|----------|--------|---------|------------|
| `entity-registry.yaml` | 19.677 | 580 KB | Catálogo de **821 entidades** do framework (tasks, agents, templates, checklists, workflows) com path, layer L1-L4, checksum SHA-256, keywords, usedBy, dependencies, adaptability score. **Principal "tabela" do sistema.** |
| `aiox-kb.md` | 916 | 34 KB | Knowledge base humana do método AIOX (lazy-loaded, só carrega no comando `*kb`) |
| `workflow-patterns.yaml` | 803 | 27 KB | Padrões de workflow para detecção contextual de agent sequences |
| `tool-registry.yaml` | 648 | 15 KB | Catálogo unificado de tools com profiles por agente + filter rules |
| `agent-config-requirements.yaml` | 407 | 11 KB | Que secções de config + ficheiros cada agente carrega, com performance targets (<30ms a <100ms) |
| `mcp-tool-examples.yaml` | 215 | 9 KB | Exemplos de inputs para tools MCP (selection guidance) |
| `workflow-state-schema.yaml` | 202 | 5 KB | Schema dos state files em `.aiox/{instance-id}-state.yaml` |
| `workflow-chains.yaml` | 156 | 5 KB | Cadeias canónicas (SDC, QA Loop, Spec Pipeline, Brownfield) para sugestão de próximo comando |
| `technical-preferences.md` | 88 | 3 KB | Tech presets disponíveis + preferências do utilizador (extensível) |
| `learned-patterns.yaml` | 3 | 68 B | Padrões aprendidos em runtime (placeholder, ainda **vazio**) |

### 3.2. "Schema" do registry-of-record: `entity-registry.yaml`

Estrutura (excerto representativo de uma entidade):

```yaml
metadata:
  version: 1.0.0
  lastUpdated: '2026-05-22T22:46:41.602Z'
  entityCount: 821
  checksumAlgorithm: sha256
  resolutionRate: 100

entities:
  {entityType}:                          # tasks | agents | templates | checklists | workflows
    {entity-id}:
      path: string                       # path relativo no repo
      layer: enum(L1, L2, L3, L4)        # mutabilidade
      type: string                       # task | agent | template | ...
      purpose: string                    # descrição one-liner
      keywords: string[]                 # para search
      usedBy: string[]                   # ids de outras entidades que dependem desta
      dependencies: string[]             # ids que esta entidade precisa
      externalDeps: string[]             # libs/serviços externos
      plannedDeps: string[]              # dependências futuras
      lifecycle: enum(production, draft, deprecated)
      adaptability:
        score: number (0-1)              # IDS REUSE/ADAPT/CREATE
        constraints: string[]
        extensionPoints: string[]
      checksum: string                   # sha256:<hex>
      lastVerified: ISO-8601 timestamp
```

Funcionalmente é uma "tabela" de 821 linhas, indexada por `entity-id`, com auto-integridade via checksums.

### 3.3. Relações entre os YAMLs

- `entity-registry.yaml.entities[*].dependencies` → outro `entity-id` no mesmo registry
- `workflow-patterns.yaml.workflows[*].agent_sequence` → `entity-id` em `entities.agents`
- `workflow-chains.yaml.workflows[*].chain[*].task` → `entity-id` em `entities.tasks`
- `agent-config-requirements.yaml.agents[*].files_loaded[*].path` → path real (não FK ao registry, mas deveria mapear)
- `tool-registry.yaml` é independente — catálogo de tools, não de entidades AIOX

---

## 4. Store C — JSON Settings (`.claude/settings*.json`)

Duas variantes que sobrepõem-se em runtime — `settings.local.json` tem precedência sobre `settings.json` para chaves coincidentes.

### 4.1. `settings.json` (project-shared, versionado)

```json
{
  "language": "english",
  "permissions": {
    "deny": [ ... ]                      // 14 regras Edit()/Write() bloqueando L1+L2
  }
}
```

Finalidade: enforce do **boundary L1/L2** (framework não pode ser modificado pelos agentes). 14 deny rules cobrem `.aiox-core/core/**`, `.aiox-core/development/{tasks,templates,checklists,workflows}/**`, `.aiox-core/infrastructure/**` e `.aiox-core/constitution.md`.

### 4.2. `settings.local.json` (user-local, gitignored)

```json
{
  "permissions": {
    "allow": [ ... ]                     // 8 entries (Vercel, npm, curl, Python)
  },
  "hooks": {
    "PreToolUse":     [ /* enforce-git-push-authority.cjs */ ],
    "UserPromptSubmit": [ /* synapse-engine.cjs */ ]
  }
}
```

Finalidade: permissões pessoais do Mário + hooks de runtime SYNAPSE/git authority.

### 4.3. "Schema" das permission entries

Cada entry é uma string com formato:
- `Tool(args)` — ex: `"Bash(vercel --version)"`, `"Edit(.aiox-core/core/**)"`
- `mcp__server__tool` — ex: `"mcp__claude_ai_Vercel__deploy_to_vercel"`
- Glob patterns suportados em paths (`**`, `*`)

---

## 5. Store D — Auxiliares (config + handoffs runtime)

### 5.1. `.aiox-core/core-config.yaml`

Configuração mestre do framework. Camada L3 (mutável). Contém toggle `boundary.frameworkProtection` que controla se as deny rules de `.claude/settings.json` estão activas.

### 5.2. `.aiox/handoffs/` (não existe actualmente)

Directório runtime previsto para artefactos de handoff entre agentes (`handoff-{from}-to-{to}-{timestamp}.yaml`). Gitignored. Schema definido em `.aiox-core/development/templates/agent-handoff-tmpl.yaml`.

Estado actual: **directório ainda não materializado** (nenhum handoff aconteceu neste repo desde 2026-05-23).

### 5.3. `.env` (gitignored)

15 variáveis declaradas, **todas vazias** excepto `NODE_ENV=development` e `AIOX_VERSION=5.2.9`. Não constitui um "store" no sentido de dados — apenas slots de credenciais à espera de valor.

---

## 6. Mapa de relações

```
                ┌─────────────────────────────┐
                │  MEMORY.md (index)          │  Store A — fora do repo
                │  → file links               │
                └──────────┬──────────────────┘
                           │ filesystem path
                           ▼
                ┌─────────────────────────────┐
                │  memory/*.md                │  body + [[slug]] refs
                │  (project|reference|...)    │
                └─────────────────────────────┘

                ┌─────────────────────────────┐
                │  entity-registry.yaml       │  Store B — versionado
                │  (821 entities, sha256)     │
                └──────────┬──────────────────┘
                           │ entity-id refs
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        workflow-      workflow-      agent-config-
        patterns       chains         requirements
        .yaml          .yaml          .yaml

                ┌─────────────────────────────┐
                │  settings.json (deny L1/L2) │  Store C — versionado
                └─────────────────────────────┘
                ┌─────────────────────────────┐
                │  settings.local.json        │  Store C — user-local
                │  (allow + hooks)            │
                └─────────────────────────────┘
```

Não há FKs no sentido tradicional — todas as "ligações" são por convenção de nome (slug, entity-id, path).

---

## 7. O que NÃO é schema

Para evitar confusão, estes artefactos **não** fazem parte do "schema" do projecto:

- **`acervo-formacoes/`** — site estático HTML/CSS/JS. Os ficheiros HTML são *conteúdo*, não dados estruturados.
- **`docs/`** — documentação narrativa em markdown.
- **`.aiox-core/development/{agents,tasks,workflows,templates,checklists}/`** — definições do framework AIOX (L1/L2, read-only). Estão *catalogados* no `entity-registry.yaml` mas não constituem stores de dados do projecto.
- **`bin/`, `scripts/`** — código executável.
- **`.git/`** — histórico Git é um store, mas gerido pelo próprio git, não pelo projecto.

---

## 8. Conclusão

`boss.ai` não tem DB e não precisa de uma neste momento. O que existe é um sistema de **stores baseados em ficheiros** com três responsabilidades distintas:

1. **Memory files** — contexto pessoal do utilizador entre sessões (Claude-managed, externo).
2. **YAML registries** — catálogo do framework AIOX (versionado, ~820 entidades).
3. **JSON settings** — permissões e hooks (versionado + user-local).

A auditoria detalhada (integridade, segurança, performance, migração futura) está em [`DB-AUDIT.md`](./DB-AUDIT.md).
