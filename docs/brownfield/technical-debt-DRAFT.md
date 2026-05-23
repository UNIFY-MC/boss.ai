# Technical Debt — DRAFT

**Fase:** Brownfield Discovery — Phase 4 (synthesis)
**Autor:** @architect (Aria)
**Data:** 2026-05-23
**Inputs:** `system-architecture.md` (Phase 1) + `SCHEMA.md` + `DB-AUDIT.md` (Phase 2) + `frontend-spec.md` (Phase 3)
**Estado:** DRAFT — sujeito a revisão pelos specialists nas Phases 5-7

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Inventário de technical debt (24 itens)](#2-inventário-de-technical-debt)
3. [Quick wins (top 5 ratio impacto/effort)](#3-quick-wins)
4. [Recommended sequencing](#4-recommended-sequencing)
5. [Itens explicitamente FORA do scope](#5-itens-explicitamente-fora-do-scope)

---

## 1. Sumário executivo

O `boss.ai` é, hoje, um sistema declarativo e governado por convenções, com saúde geral **MODERADA-BOA**: não há base de dados, não há código aplicacional não-trivial, não há credenciais expostas, e o CI básico está verde. O débito que existe é predominantemente **estrutural e de manutenibilidade**, não funcional — quase nada está "partido", mas várias partes são frágeis a evoluções (drift entre IDEs sem detecção activa, hooks críticos vivendo em ficheiros não-commitados, framework AIOX instalado in-tree com 1383 ficheiros) e a fragmentação visual do `acervo-formacoes/` paga um custo de manutenção crescente. As classes de debt detectadas são: **Architecture** (coupling do framework in-tree, governance enforcement dependente de `settings.local.json`), **DevEx/CI** (ausência total de testes automatizados, detecção de drift do ideSync não automatizada), **Frontend** (6 famílias tipográficas, 3 sub-design systems disjuntos, asset crítico de 788 KB, `lang="pt-BR"` numa página), **Security** (CSP com `unsafe-inline` forçado pelo Tailwind CDN, wildcards Vercel pré-aprovados), **Documentation** (README de hooks documenta 9 hooks mas só 2 existem no FS) e **DataOps** (single point: `entity-registry.yaml` 580 KB nunca recomputado). Não há itens **CRITICAL** com impacto imediato em produção; há **2 HIGH** que afectam directamente a governança constitucional (Article II) e a integridade do publish (LCP de 788 KB).

---

## 2. Inventário de technical debt

> **Cruzamento de findings:** itens marcados com `(cross-cited)` aparecem em pelo menos duas das três análises (Architect + Data + UX) — peso reforçado.

### Tabela mestre

| ID | Categoria | Severidade | Componente | Esforço | Cross-cited |
|----|-----------|------------|------------|---------|-------------|
| TD-001 | Architecture | HIGH | `.claude/settings.local.json` (hooks) | S | Yes |
| TD-002 | Architecture | HIGH | `.aiox-core/` (framework in-tree) | L | Yes |
| TD-003 | DevEx/CI | HIGH | (sem `tests/`) | M | Yes |
| TD-004 | Frontend | HIGH | `claude-code-build-day/assets/logo.png` | S | No |
| TD-005 | Frontend | HIGH | `aulao-claude-code/index.html:2` | XS | No |
| TD-006 | Architecture | MEDIUM | `core-config.yaml` § ideSync | S | Yes |
| TD-007 | Documentation | MEDIUM | `.claude/hooks/README.md` | S | No |
| TD-008 | Frontend | MEDIUM | `_shared/` (sem design tokens) | M | No |
| TD-009 | Frontend | MEDIUM | 5× `formacoes/claude-code-build-day/*.html` | XS | No |
| TD-010 | Frontend | MEDIUM | Hub `index.html` (sem dark mode) | M | No |
| TD-011 | Security | MEDIUM | `acervo-formacoes/vercel.json` (CSP) | M | No |
| TD-012 | Architecture | MEDIUM | `.docker/mcp/` (referenciado, ausente) | S | No |
| TD-013 | Frontend | MEDIUM | `aiox-cohort-fundamentals/`, `reprise-masterclass-design-ia/` | XS | No |
| TD-014 | Frontend | MEDIUM | (6 famílias tipográficas) | S | No |
| TD-015 | Frontend | MEDIUM | (sem `prefers-color-scheme`) | M | No |
| TD-016 | DevEx/CI | LOW | `.github/workflows/ci.yml` | S | No |
| TD-017 | Security | LOW | `.gitignore` / `.vercelignore` | XS | No |
| TD-018 | DataOps | LOW | `entity-registry.yaml` (checksums) | S | No |
| TD-019 | Frontend | LOW | (acessibilidade — skip-link / `:focus-visible`) | S | No |
| TD-020 | Frontend | LOW | `index.html:595-597` (onmouseover inline) | XS | No |
| TD-021 | Frontend | LOW | (favicon inconsistente) | XS | No |
| TD-022 | Frontend | LOW | (SEO/OG meta tags) | S | No |
| TD-023 | DataOps | LOW | `.aiox-core/data/learned-patterns.yaml` | XS | No |
| TD-024 | Architecture | LOW | `.github/agents/` (flag enabled, dir ausente) | XS | No |

---

### TD-001 — Hooks de governança vivem em ficheiro não-commitado

- **Categoria:** Architecture
- **Severidade:** HIGH
- **Componente afectado:** `.claude/settings.local.json` (gitignored) vs `.claude/settings.json` (committed)
- **Descrição:** Os dois hooks `.cjs` activos (`synapse-engine.cjs` e `enforce-git-push-authority.cjs`) só estão registados em `settings.local.json`, que está no `.gitignore`. `settings.json` (commitado) contém apenas deny rules. Um clone fresh do repositório **não tem hooks activos**.
- **Impacto:** O Artigo II da constituição (Agent Authority — "git push é exclusivo do @devops") não está enforced para clones novos ou para outros operadores. A governança crítica é dependente de configuração local que cada operador tem de reproduzir manualmente. Findings cross-citados pelo Architect (system-architecture.md §5 R8) e implicitamente pela Data analysis (DB-AUDIT.md §2.1 distingue settings vs settings.local).
- **Effort estimado:** S
- **Dependência:** Nenhuma

---

### TD-002 — Framework AIOX instalado in-tree (coupling estrutural)

- **Categoria:** Architecture
- **Severidade:** HIGH
- **Componente afectado:** `.aiox-core/` (1383 ficheiros no initial commit, incluindo `.aiox-core/node_modules/`)
- **Descrição:** `@aiox-squads/core` v5.2.9 está commitado dentro de `.aiox-core/` em vez de resolvido via NPM. Consequências: repo size inflacionado, upgrades manuais via re-install com risco de sobrescrita de L3, CI do projecto valida YAML do próprio framework (acoplamento de responsabilidades), e as deny rules em `.claude/settings.json` são a única barreira que separa framework do projecto.
- **Impacto:** Diffs enormes em upgrades, dificuldade em aplicar patches selectivos, repo size cresce com cada upgrade do framework, e o consumidor (boss.ai) é responsabilizado pela validação do produto (`aiox-core`). Cross-cited: Architect (system-architecture.md §5 R2) + Data engineer (SCHEMA.md §1 nota sobre `entity-registry.yaml` 580 KB versionado).
- **Effort estimado:** L
- **Dependência:** Nenhuma directa, mas afecta TD-006 (ideSync) e TD-007 (docs)

---

### TD-003 — Ausência total de testes automatizados

- **Categoria:** DevEx/CI
- **Severidade:** HIGH
- **Componente afectado:** raiz do projecto (sem `tests/`, sem `vitest.config`, sem `jest.config`, sem `package.json` na raiz)
- **Descrição:** O projecto tem 256 linhas de código de governança em hooks `.cjs` (`enforce-git-push-authority.cjs` 143 linhas + `synapse-engine.cjs` 113 linhas) sem nenhum teste unitário. `core-config.yaml` (10 KB de configuração viva) não tem schema validation. O CI valida sintaxe YAML, contagem de agentes e HTML lint — não valida comportamento.
- **Impacto:** Qualquer alteração nos hooks ou no `core-config.yaml` só é detectada pós-deploy ou pelo CodeRabbit (manual, opcional, depende do WSL). Bug regression em `enforce-git-push-authority.cjs` é catastrófico (permite bypass do `@devops`). Cross-cited: Architect (system-architecture.md §5 R3) + Data engineer (DB-AUDIT.md §1.2 — checksums declarados mas não recomputados).
- **Effort estimado:** M (cobertura mínima dos 2 hooks + schema do `core-config.yaml`)
- **Dependência:** Nenhuma

---

### TD-004 — Logo do Claude Code Build Day pesa 788 KB

- **Categoria:** Frontend
- **Severidade:** HIGH
- **Componente afectado:** `acervo-formacoes/formacoes/claude-code-build-day/assets/logo.png`
- **Descrição:** PNG de 788 KB usado como logo em 5 páginas do sub-site Build Day. Provável export sem optimização do Figma. Renderizado a 32x32 no header. Outras formações usam SVG (`aiox-cohort-fundamentals/assets/logo.svg` = 6,5 KB).
- **Impacto:** LCP da página mais visitada do sub-site Build Day é dominado por este asset. Multiplicado por 5 páginas que partilham o logo, é o maior contribuinte de débito de performance no acervo. Custo de rede em mobile/conexões lentas. Identificado por UX (frontend-spec.md §6.1, §9 R2).
- **Effort estimado:** S (re-exportar SVG ou optimizar com `pngquant`/`oxipng`)
- **Dependência:** Nenhuma

---

### TD-005 — `lang="pt-BR"` numa página PT-PT

- **Categoria:** Frontend
- **Severidade:** HIGH
- **Componente afectado:** `acervo-formacoes/formacoes/aulao-claude-code/index.html:2`
- **Descrição:** Atributo `<html lang="pt-BR">` numa página de um site explicitamente PT-PT (declarado nas global instructions do Mário: "Sempre Português de Portugal. Nunca português brasileiro.").
- **Impacto:** Viola directriz global declarada do utilizador. Afecta hyphenation, leitores de ecrã (sotaque/pronúncia), e ferramentas de tradução automática. Sinal de inconsistência editorial. Identificado por UX (frontend-spec.md §5.1, §8.1, §9 R1).
- **Effort estimado:** XS (1 linha)
- **Dependência:** Nenhuma

---

### TD-006 — Drift do ideSync não detectado por CI

- **Categoria:** Architecture
- **Severidade:** MEDIUM
- **Componente afectado:** `core-config.yaml` § `ideSync` + `.github/workflows/ci.yml`
- **Descrição:** `ideSync.validation.strictMode: true` e `failOnDrift: true` declaram intenção de detectar drift entre `.aiox-core/development/agents/` (SSOT) e as 7 directorias de IDE (`.claude/`, `.codex/`, `.gemini/`, `.cursor/`, `.kimi/`, `.antigravity/`, `.github/`). Nenhum step CI executa `aiox ideSync --check`, nenhum pre-commit hook valida equivalência.
- **Impacto:** Edição manual em qualquer `.claude/skills/aiox-architect/...` introduz drift silencioso. Cada IDE pode comportar-se diferentemente para o mesmo agente. Cross-cited: Architect (system-architecture.md §2.2, §5 R1).
- **Effort estimado:** S (adicionar step CI `aiox ideSync --check`)
- **Dependência:** Pressupõe que `aiox ideSync --check` retorna exit code não-zero em drift (a validar)

---

### TD-007 — README de hooks documenta 9 hooks, só 2 existem

- **Categoria:** Documentation
- **Severidade:** MEDIUM
- **Componente afectado:** `.claude/hooks/README.md`
- **Descrição:** O README descreve 9 hooks (6 Python: `read-protection.py`, `enforce-architecture-first.py`, `write-path-validation.py`, `sql-governance.py`, `slug-validation.py`, `mind-clone-governance.py`; e 2 `.cjs` adicionais: `code-intel-pretool.cjs`, `precompact-session-digest.cjs`). **Nenhum destes ficheiros existe no FS actual** — apenas `synapse-engine.cjs` e `enforce-git-push-authority.cjs`.
- **Impacto:** Falsa sensação de governança. Quem lê o README pode assumir que `Read` parcial de ficheiros protegidos é bloqueado (não é). Confusão para novos operadores. Identificado por Architect (system-architecture.md §2.3, §5 R4).
- **Effort estimado:** S (decidir: instalar hooks documentados OU alinhar README ao estado real)
- **Dependência:** Decisão de produto (até onde governar?)

---

### TD-008 — `_shared/` não tem design tokens semânticos

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** `acervo-formacoes/_shared/sidebar.css`, `_shared/page-toc.css` + `:root` declarados inline em cada página
- **Descrição:** Cada uma das 11 páginas declara ~50 linhas de `:root` com tokens próprios (`--color-inkwell-black`, `--gold`, `cyan` Tailwind, etc.). Não existe `_shared/tokens.css` com tokens semânticos (`--accent`, `--bg`, `--bg-elev`, `--text`, `--text-mid`). A sidebar lê `--sb-*` específicos em vez de tokens semânticos partilhados.
- **Impacto:** Duplicação de ~500 linhas de CSS entre páginas. Qualquer mudança visual sistémica (ex.: novo accent) requer edição em 11 ficheiros. `_shared/page-toc.css:24` usa `var(--gold, #c9b298)` como fallback — se for usado no hub claro, o fallback não combina. Identificado por UX (frontend-spec.md §3, §8.2, §8.7, §9 R4).
- **Effort estimado:** M (1-2h: criar `_shared/tokens.css` + refactor por data-attribute `data-theme="legora|aiox|kopkai"`)
- **Dependência:** Nenhuma. Pré-requisito ideal para TD-010 (dark mode no hub).

---

### TD-009 — `lang="pt"` (sem region) no sub-site Build Day

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** 5× `acervo-formacoes/formacoes/claude-code-build-day/*.html`
- **Descrição:** As 5 páginas do sub-site Claude Code Build Day declaram `<html lang="pt">` em vez de `lang="pt-PT"`. Não viola directriz como TD-005, mas é genérico.
- **Impacto:** Hyphenation e leitores de ecrã podem fazer fallback para regra default. Inconsistência editorial com as restantes 6 páginas (`pt-PT`). Identificado por UX (frontend-spec.md §5.1, §8.1, §9 R3).
- **Effort estimado:** XS (5 linhas em 5 ficheiros)
- **Dependência:** Nenhuma

---

### TD-010 — Hub `index.html` sem dark mode

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** `acervo-formacoes/index.html`
- **Descrição:** O hub é o único ecrã claro (`#fefefc` background) num acervo onde as 4 formações são escuras. Salto visual abrupto ao navegar do hub para qualquer formação. Pesquisa por `prefers-color-scheme`, `dark-mode`, `data-theme` retorna **0 resultados** em todo `acervo-formacoes/`. Pendente já identificado pelo @aiox-master no contexto inicial.
- **Impacto:** UX descontínua. Mário tem que mudar mentalmente o registo entre claro (hub) e escuro (formações). Identificado por UX (frontend-spec.md §5.5, §9 R5) + cross-cited no _CONTEXT.md como pendente pré-existente.
- **Effort estimado:** M (2-3h: `prefers-color-scheme: dark` + toggle manual + persistência localStorage)
- **Dependência:** Ideal após TD-008 (tokens semânticos partilhados facilitam dark mode)

---

### TD-011 — CSP com `'unsafe-inline'` em `script-src` (forçado por Tailwind CDN)

- **Categoria:** Security
- **Severidade:** MEDIUM
- **Componente afectado:** `acervo-formacoes/vercel.json` + dependência de `https://cdn.tailwindcss.com`
- **Descrição:** CSP permite `script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com`. `'unsafe-inline'` reduz a eficácia do CSP contra XSS injectado em HTML estático. Forçado porque Tailwind Play CDN injecta scripts inline para gerar classes utilitárias runtime. Adicionalmente, há scripts inline em `index.html:902-947` e handlers `onmouseover` inline (TD-020).
- **Impacto:** Defesa-em-profundidade reduzida. Se algum dia o site receber input dinâmico (formulário, query string interpretada), uma injecção XSS não é mitigada pelo CSP. SPOF adicional em `cdn.tailwindcss.com`. Identificado por Architect (system-architecture.md §2.4, §5 R5) + UX (frontend-spec.md §4.4, §9 R12).
- **Effort estimado:** M (pré-compilar Tailwind + extrair scripts inline + remover `'unsafe-inline'`)
- **Dependência:** Implica introduzir build step (perde o princípio "sem build step"). Decisão estratégica.

---

### TD-012 — `.docker/mcp/gateway-service.yml` referenciado mas inexistente

- **Categoria:** Architecture
- **Severidade:** MEDIUM
- **Componente afectado:** `core-config.yaml § mcp.docker_mcp.gateway.service_file`
- **Descrição:** A config aponta para `.docker/mcp/gateway-service.yml`. A directoria `.docker/` não existe no repo actual. Commands como `docker compose -f .docker/mcp/gateway-service.yml up -d` falhariam.
- **Impacto:** Falsa impressão de funcionalidade pronta. Onboarding manual obrigatório para activar MCP Docker. Identificado por Architect (system-architecture.md §4.4, §5 R6).
- **Effort estimado:** S (criar esqueleto OU `mcp.docker_mcp.enabled: false` até estar pronto OU documentar como passo manual)
- **Dependência:** Decisão de @devops (autoridade exclusiva sobre MCP)

---

### TD-013 — Código morto em tokens AIOX (gold/cream nunca usados)

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** `aiox-cohort-fundamentals/index.html:17-50` + `reprise-masterclass-design-ia/index.html:18-49` (+ aula-01, aula-02 se herdam)
- **Descrição:** Cada `:root` declara primeiro tokens "gold/cream" (`#c9b298`, `#f3eee6`, `Cormorant Garamond`) e depois sobrescreve-os com tokens "Limon" (`#d1ff00`, Geist). Os tokens iniciais nunca chegam a ser usados — pegada de migração anterior.
- **Impacto:** Confunde quem leia o ficheiro. Aumenta surface de erro em refactors. Identificado por UX (frontend-spec.md §3.2, §8.5, §9 R8).
- **Effort estimado:** XS (remover linhas 17-32 do `:root` em ambos os ficheiros)
- **Dependência:** Pode ser absorvido em TD-008 (criação de `_shared/tokens.css`)

---

### TD-014 — 6 famílias tipográficas no acervo

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** Google Fonts loading em todas as páginas
- **Descrição:** O acervo carrega `Inter`, `Lora`, `Playfair Display`, `Geist` (7 pesos!), `Space Mono`, `Syne`. Mesmo descontando `Inter` como fallback, são 5 famílias display/heading diferentes para um "acervo único". Geist carrega 300-900 (7 pesos) mas usa só 4-5.
- **Impacto:** Custo de rede combinado de ~12 famílias/pesos. Reduz coerência visual entre páginas. Identificado por UX (frontend-spec.md §3.4, §8.3, §9 R6).
- **Effort estimado:** S (remover pesos não usados — decisão tipográfica é maior)
- **Dependência:** Decisão estratégica (manter fragmentação ou unificar)

---

### TD-015 — Sem `prefers-color-scheme` em todo o acervo

- **Categoria:** Frontend
- **Severidade:** MEDIUM
- **Componente afectado:** Todo `acervo-formacoes/`
- **Descrição:** Nenhuma página suporta `prefers-color-scheme`. Cada formação fixa o seu tema (claro ou escuro) sem respeitar a preferência do utilizador.
- **Impacto:** Acessibilidade reduzida. Utilizadores com preferência dark forçada não têm uma experiência consistente; o hub claro fere quem navega à noite. Identificado por UX (frontend-spec.md §5.5).
- **Effort estimado:** M (depende de TD-008 + TD-010)
- **Dependência:** TD-008 (tokens semânticos) + TD-010 (dark mode no hub)

---

### TD-016 — CI não valida security headers nem links quebrados

- **Categoria:** DevEx/CI
- **Severidade:** LOW
- **Componente afectado:** `.github/workflows/ci.yml`
- **Descrição:** O CI valida YAML, conta agentes (`≥10`) e faz HTMLHint. **Não valida:** security headers do Vercel após deploy, links internos entre páginas do acervo, equivalência content entre IDE configs, sintaxe dos hooks `.cjs`.
- **Impacto:** Regressões silenciosas possíveis (ex.: alguém edita `vercel.json` e remove HSTS sem notar). Identificado por Architect (system-architecture.md §4.3).
- **Effort estimado:** S (adicionar 1-2 steps: e.g. `curl -I` ao deployed URL + `lychee` link checker)
- **Dependência:** Nenhuma

---

### TD-017 — Materiais privados protegidos só por `.gitignore`

- **Categoria:** Security
- **Severidade:** LOW
- **Componente afectado:** `.gitignore` + `.vercelignore` (exclusões de `aulao-claude-code/materiais/` e `claude-code-build-day/assets/checklist-seguranca.md`)
- **Descrição:** Materiais de terceiros (curso de Lígia Covre) e checklists potencialmente sensíveis são protegidos apenas por entradas em `.gitignore` e `.vercelignore`. Qualquer reorganização que mova materiais para fora destes paths pode commitar conteúdo privado.
- **Impacto:** Risco legal/IP em caso de erro humano. O gitleaks no CI cobre secrets API, não conteúdo de terceiros. Identificado por Architect (system-architecture.md §5 R7).
- **Effort estimado:** XS (adicionar pre-commit hook que lista patterns proibidos OU rules ao gitleaks)
- **Dependência:** Nenhuma

---

### TD-018 — Checksums do `entity-registry.yaml` declarados mas nunca recomputados

- **Categoria:** DataOps
- **Severidade:** LOW
- **Componente afectado:** `.aiox-core/data/entity-registry.yaml` (19.677 linhas, 580 KB)
- **Descrição:** 821 entidades com SHA-256 checksum + `lastVerified` ISO-8601. Última verificação `2026-05-22T22:46:40.637Z`. Nenhum mecanismo automatizado recomputa os checksums periodicamente — depende de execução manual de `aiox doctor`.
- **Impacto:** Se algum ficheiro L1/L2 for adulterado (ou divergir após upgrade do framework), a divergência só é detectada se alguém correr `aiox doctor` manualmente. Identificado por Data engineer (DB-AUDIT.md §1.2, §5 item 4).
- **Effort estimado:** S (adicionar step CI mensal ou `cron` job)
- **Dependência:** Pressupõe que `aiox doctor` tem subcommand de recompute (a validar)

---

### TD-019 — Acessibilidade básica em falta (skip-link, `:focus-visible`)

- **Categoria:** Frontend
- **Severidade:** LOW
- **Componente afectado:** Todas as páginas `acervo-formacoes/`
- **Descrição:** Sem skip-link "Ir para conteúdo" em nenhuma página (WCAG 2.4.1). `outline: none` em inputs com `border-color` como substituto (deveria usar `:focus-visible` com outline explícito). Botões dos filtros do hub têm `role="tablist"` mas não têm `role="tab"`/`aria-selected` (implementação parcial).
- **Impacto:** Navegação por teclado degradada. Leitor de ecrã obrigado a percorrer sidebar inteira antes de chegar ao conteúdo. Identificado por UX (frontend-spec.md §5.6, §9 R10, R11).
- **Effort estimado:** S (skip-link em template + `:focus-visible` global em `_shared/`)
- **Dependência:** Beneficiado por TD-008 (CSS partilhado)

---

### TD-020 — Handlers `onmouseover`/`onmouseout` inline

- **Categoria:** Frontend
- **Severidade:** LOW
- **Componente afectado:** `acervo-formacoes/index.html:595-597`
- **Descrição:** Três links têm handlers `onmouseover` / `onmouseout` inline para trocar cor. Padrão obsoleto. Também contribui para a necessidade de `'unsafe-inline'` no CSP.
- **Impacto:** Manutenibilidade reduzida. Bloqueia caminho para CSP mais apertada. Identificado por UX (frontend-spec.md §8.6, §9 R9).
- **Effort estimado:** XS (substituir por CSS `:hover`)
- **Dependência:** Step preparatório de TD-011 (CSP sem `unsafe-inline`)

---

### TD-021 — Favicon inconsistente (só Build Day tem, e pesa 43 KB)

- **Categoria:** Frontend
- **Severidade:** LOW
- **Componente afectado:** Todas as páginas excepto `claude-code-build-day/` + `favicon.png` (43 KB)
- **Descrição:** Apenas o sub-site Build Day declara favicon (`./assets/favicon.png`, 43 KB). 6 outras páginas não têm favicon — browser mostra ícone genérico. O favicon que existe é demasiado pesado (favicons típicos: 1-4 KB).
- **Impacto:** Polish. Identificado por UX (frontend-spec.md §7).
- **Effort estimado:** XS (criar favicon SVG/ICO global em `_shared/` + optimizar o existente)
- **Dependência:** Nenhuma

---

### TD-022 — Sem Open Graph/Twitter Cards

- **Categoria:** Frontend
- **Severidade:** LOW
- **Componente afectado:** Todas as páginas `acervo-formacoes/`
- **Descrição:** Site é deliberadamente `noindex` (privado), mas links partilhados em Slack/WhatsApp/Notion mostram apenas URL nu — sem preview rico. Sem `og:title`, `og:image`, `og:description`.
- **Impacto:** UX degradada quando link é partilhado. Identificado por UX (frontend-spec.md §7, §9 R13).
- **Effort estimado:** S (1 imagem OG genérica + meta tags em template)
- **Dependência:** Nenhuma

---

### TD-023 — `learned-patterns.yaml` está vazio

- **Categoria:** DataOps
- **Severidade:** LOW
- **Componente afectado:** `.aiox-core/data/learned-patterns.yaml`
- **Descrição:** Ficheiro declara `patterns: []` (3 linhas, 68 bytes). Placeholder do framework AIOX para capturar padrões aprendidos em runtime — funcionalidade não activa neste projecto.
- **Impacto:** Nenhum impacto operacional, mas marca uma funcionalidade prometida que nunca foi materializada. Identificado por Data engineer (DB-AUDIT.md §1.2, §5 item 1).
- **Effort estimado:** XS (decidir: activar pattern capture OU marcar como `disabled`)
- **Dependência:** Decisão de produto

---

### TD-024 — Flag `.github/agents/` enabled mas directoria ausente

- **Categoria:** Architecture
- **Severidade:** LOW
- **Componente afectado:** `core-config.yaml` § `ideSync` + (não-existente) `.github/agents/`
- **Descrição:** Configuração de ideSync declara `github-copilot: enabled` mas a directoria `.github/agents/` não foi criada. Análogo a TD-012 (referenciado mas inexistente) mas de menor impacto.
- **Impacto:** GitHub Copilot users não têm os agentes AIOX. Identificado por Architect (system-architecture.md §2.2 tabela).
- **Effort estimado:** XS (rodar `aiox ideSync` para materializar OU desactivar a flag até ser preciso)
- **Dependência:** Decisão (precisa-se de Copilot integration?)

---

## 3. Quick wins

Top 5 itens XS/S com maior ratio impacto/effort. **Ordenados por impacto descendente.**

| # | ID | Item | Effort | Impacto |
|---|----|----|--------|---------|
| 1 | **TD-005** | Corrigir `lang="pt-BR"` em `aulao-claude-code/index.html:2` | XS | Viola directriz global declarada. 1 linha = compliance imediato. |
| 2 | **TD-004** | Optimizar `claude-code-build-day/assets/logo.png` (788 KB → <20 KB) | S | LCP de 5 páginas reduzido drasticamente. Single asset = single fix. |
| 3 | **TD-001** | Mover registo de hooks de `settings.local.json` para `settings.json` | S | Restaura Article II (Agent Authority) constitucional para todos os clones. |
| 4 | **TD-009** | Uniformizar `lang="pt-PT"` no Build Day (5 ficheiros) | XS | Consistência editorial completa em todo o acervo (após TD-005). |
| 5 | **TD-013** | Remover tokens "gold/cream" mortos em `aiox-cohort-fundamentals/` + `reprise-masterclass-design-ia/` | XS | Limpa ~30 linhas confusas + pré-requisito limpo para TD-008. |

---

## 4. Recommended sequencing

Ordem sugerida de ataque, agrupando dependências e maximizando momentum.

### Wave 1 — Quick wins editoriais e governance (1 dia)

1. **TD-005** — corrigir `lang="pt-BR"`
2. **TD-009** — uniformizar `lang="pt-PT"` no Build Day
3. **TD-001** — mover hooks para `settings.json` (commitado)
4. **TD-013** — remover tokens mortos
5. **TD-020** — substituir `onmouseover` por CSS `:hover`

**Outcome:** Compliance editorial completo + governance constitucional enforced em clones novos.

### Wave 2 — Performance e assets (meio dia)

6. **TD-004** — optimizar `logo.png` (788 KB → SVG/PNG optimizado)
7. **TD-021** — favicon global + optimizar o existente

**Outcome:** LCP melhorado, polish visual consistente.

### Wave 3 — DevEx/CI hardening (1-2 dias)

8. **TD-006** — adicionar `aiox ideSync --check` ao CI
9. **TD-016** — adicionar validação de headers + link checker ao CI
10. **TD-003** — testes unitários para os 2 hooks `.cjs` + schema do `core-config.yaml`
11. **TD-018** — step CI para recompute de checksums do `entity-registry.yaml`

**Outcome:** CI passa de "verde por sintaxe" para "verde por comportamento".

### Wave 4 — Documentação e housekeeping (meio dia)

12. **TD-007** — alinhar `.claude/hooks/README.md` ao estado real
13. **TD-012** — decisão sobre `.docker/mcp/` (criar esqueleto OU desactivar)
14. **TD-024** — decisão sobre `.github/agents/`
15. **TD-017** — pre-commit hook ou gitleaks rule para materiais privados
16. **TD-023** — decisão sobre `learned-patterns.yaml`

**Outcome:** Documentação reflecte realidade. Sem "dangling references".

### Wave 5 — Design system unification (2-3 dias)

17. **TD-008** — extrair `_shared/tokens.css` com tokens semânticos
18. **TD-014** — reduzir famílias tipográficas / pesos
19. **TD-010** — dark mode no hub (depende de TD-008)
20. **TD-015** — `prefers-color-scheme` global (depende de TD-008 + TD-010)
21. **TD-019** — skip-link + `:focus-visible` global

**Outcome:** Acervo com design system coerente, dark mode, e acessibilidade WCAG melhorada.

### Wave 6 — Strategic refactors (separar em decisão)

22. **TD-022** — Open Graph meta tags (executar quando tempo permitir)
23. **TD-011** — CSP sem `'unsafe-inline'` (implica build step — decisão estratégica)
24. **TD-002** — framework AIOX out-of-tree (decisão estratégica, alto effort)

**Outcome:** Apenas se decisão estratégica for tomada. Não bloqueia waves anteriores.

---

## 5. Itens explicitamente FORA do scope

Pontos detectados durante a análise mas **aceites como decisão deliberada**, não como débito:

1. **Sem base de dados** — `boss.ai` é single-user, single-machine. Filesystem-first é coerente. DB só faria sentido com multi-utilizador ou métricas operacionais (DB-AUDIT.md §4.2).
2. **Sem build step no `acervo-formacoes/`** — princípio explícito do projecto. Tradeoff aceite: paga `unsafe-inline` no CSP, ganha simplicidade de deploy.
3. **Fragmentação visual deliberada entre formações** — preservar identidade visual da fonte original (LegalCode, Academia Lendária, KopkAI) é parte do valor arquivístico. TD-008 unifica tokens semânticos sem destruir as identidades.
4. **`X-Robots-Tag: noindex,nofollow`** — site é privado por design. Sem `sitemap.xml`, sem `robots.txt` (parcialmente). OK.
5. **Memory files fora do repositório (Claude auto-memory)** — propositadamente locais (`C:\Users\mario\.claude\projects\...`). Migrar para repo perderia o modelo "memory por projecto".
6. **Sem testes ao `acervo-formacoes/`** — HTML estático sem lógica de negócio. HTMLHint no CI é suficiente.
7. **2 wildcards Vercel em `permissions.allow`** — `Bash(npx vercel *)` e `mcp__claude_ai_Vercel__deploy_to_vercel`. Aceitáveis dado contexto (proprietário único, projecto não-crítico). Tornar mais específico é optional, não débito.
8. **`Inter` carregado em hub + aulão** — fallback de sistema, custo marginal. Não conta como família "a mais" no inventário de TD-014.
9. **Wildcard `Bash(npm list *)`** — read-only, não escreve, não instala. Não é débito de segurança.
10. **6 commits em 1 dia (initial commit do repo)** — repo é recente. Não é débito histórico.

---

## Cruzamento de findings (verificação interna)

Itens citados em múltiplas vistas (peso reforçado):

| Item | Architect | Data | UX |
|------|-----------|------|----|
| TD-001 (hooks em settings.local) | ✅ §5 R8 | ✅ §2.1 (distingue) | — |
| TD-002 (framework in-tree) | ✅ §5 R2 | ✅ §1 (580 KB versionado) | — |
| TD-003 (sem testes) | ✅ §5 R3 | ✅ §1.2 (checksums) | — |
| TD-006 (ideSync drift) | ✅ §2.2, §5 R1 | — | — |

Os 3 HIGH cross-citados (TD-001, TD-002, TD-003) constituem o núcleo do débito **arquitectural** e devem ser tratados antes de qualquer feature work nova no framework.

---

*Documento gerado por @architect (Aria) — Brownfield Discovery Phase 4 — 2026-05-23*
