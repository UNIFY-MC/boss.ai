# Epic 001 — Remediação de Dívida Técnica (Brownfield)

**Estado:** Ready for Wave 1
**Owner:** Mário Carvalho (decisor) · @pm Morgan (orquestração)
**Origem:** Brownfield Discovery (Phases 1-9)
**Data de abertura:** 2026-05-23
**Severidade global:** MODERADA-BOA (sem CRITICAL)

---

## 1. Contexto

O `boss.ai` é um sistema declarativo single-user, single-machine, sem base de dados aplicacional e sem código de negócio não-trivial. Apresenta saúde global moderada-boa: CI verde, sem credenciais expostas, security headers já configurados (commit `5fc6471`), e arquitectura filesystem-first coerente com o seu propósito.

O Brownfield Discovery completo (Phases 1-9, executado entre Maio 2026) produziu um inventário consolidado de **30 items de dívida técnica** (5 HIGH, 14 MEDIUM, 11 LOW), nenhum CRITICAL. O débito é predominantemente **estrutural e de manutenibilidade** — quase nada está partido, mas várias partes são frágeis face a evolução.

Este epic transforma o sequencing em 6 waves do assessment técnico em stories accionáveis, prontas para implementação pelo `@dev`.

**Documentos-fonte:**
- Executive report (Phase 9): `docs/brownfield/TECHNICAL-DEBT-REPORT.md`
- Assessment técnico FINAL (Phase 8): `docs/brownfield/technical-debt-assessment.md`
- Specialist reviews: `docs/brownfield/db-specialist-review.md` (Dara), `ux-specialist-review.md` (Uma), `qa-review.md` (Quinn)

---

## 2. Justificação

O Brownfield Discovery identificou 5 HIGH items que representam ~1 dia de trabalho mas resolvem:

- **2 violações de governance constitucional (Article II — Agent Authority)** — TD-001 (hooks só em `settings.local.json`), TD-003 (sem testes para hooks críticos)
- **1 problema de performance crítica em 5 páginas** — TD-004 (logo PNG 788 KB dominando LCP)
- **2 violações de compliance editorial** — TD-005 (`lang="pt-BR"` numa página PT-PT), TD-009 (5 ficheiros com `lang="pt"` sem region)

Além disso, **decisão arquitectural central** integrada do assessment: adoptar a **abordagem hybrid de Uma** para o design system do `acervo-formacoes/` — preservar as identidades visuais das 4 sub-formações (LegalCode, Academia Lendária, KopkAI, Build Day) como **valor arquivístico**, mas extrair um contrato semântico partilhado em `_shared/tokens.css` + `_shared/themes/{nome}.css` por formação. Este refactor de 3-4h desbloqueia em cascata 5 outros TDs do inventário UX.

A Wave 3 (DataOps integrity — DS-001, DS-002) é **pré-requisito da estratégia filesystem-first sustentável a 6-12 meses** (argumentação de Dara).

---

## 3. Waves de execução

| Wave | Foco | Stories | Effort | Outcome |
|------|------|---------|--------|---------|
| **Wave 1** | Quick wins críticos (5 HIGH + 2 LOW) | 1.1 – 1.7 | ~1 dia | Compliance editorial + Article II + LCP + graceful degradation |
| **Wave 2** | Design system hybrid + WCAG Level A | 2.1 – 2.6 | 2-3 dias | Metade do inventário UX desbloqueada; dark mode coerente |
| **Wave 3** | DataOps integrity (filesystem-first sustentável) | 3.1 – 3.4 | 2-3 dias | Schema validation + registry healing + testes hooks |
| **Wave 4** | CI hardening + ideSync drift | 4.1 – 4.2 | 1-2 dias | CI passa de "verde por sintaxe" a "verde por comportamento" |
| **Wave 5** | Housekeeping + documentação | 5.1 – 5.8 | ~1 dia | Documentação reflecte realidade; backup de memories |
| **Wave 6** | Strategic refactors (decisão por decisão) | 6.1 – 6.3 | Variável | Apenas com sinal verde explícito do Mário |

**Total Waves 1-5:** ~7-10 dias úteis para atingir ≥ 90% das métricas alvo.

---

## 4. Stories

### Wave 1 — Quick wins críticos (~1 dia)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 1.1 | [1.1.fix-lang-aulao.story.md](./stories/1.1.fix-lang-aulao.story.md) | Corrigir `lang="pt-BR"` em aulao-claude-code | XS | TD-005 |
| 1.2 | [1.2.lang-build-day.story.md](./stories/1.2.lang-build-day.story.md) | Uniformizar `lang="pt-PT"` no Build Day (5 ficheiros) | XS | TD-009 |
| 1.3 | [1.3.hooks-settings-json.story.md](./stories/1.3.hooks-settings-json.story.md) | Mover hooks para `settings.json` commitado | S | TD-001 |
| 1.4 | [1.4.logo-svg-build-day.story.md](./stories/1.4.logo-svg-build-day.story.md) | Logo Build Day → SVG inline + `loading="lazy"` invertido | S | TD-004 |
| 1.5 | [1.5.noscript-sidebar.story.md](./stories/1.5.noscript-sidebar.story.md) | `<noscript>` fallback na sidebar partilhada | XS | TD-025 |
| 1.6 | [1.6.tokens-mortos-cleanup.story.md](./stories/1.6.tokens-mortos-cleanup.story.md) | Remover tokens CSS "gold/cream" mortos | XS | TD-013 |
| 1.7 | [1.7.onmouseover-css-hover.story.md](./stories/1.7.onmouseover-css-hover.story.md) | Substituir `onmouseover` inline por `:hover` CSS | XS | TD-020 |

### Wave 2 — Design system hybrid + acessibilidade WCAG (2-3 dias)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 2.1 | [2.1.design-system-hybrid.story.md](./stories/2.1.design-system-hybrid.story.md) | `_shared/tokens.css` semântico + `_shared/themes/{nome}.css` | L | TD-008 (+ TD-013 já feito em 1.6) |
| 2.2 | [2.2.a11y-wcag-level-a.story.md](./stories/2.2.a11y-wcag-level-a.story.md) | Skip-link + `<main>` + focus + `aria-current` + tap targets | S+ | TD-019 |
| 2.3 | [2.3.dark-mode-hub.story.md](./stories/2.3.dark-mode-hub.story.md) | `prefers-color-scheme` no hub (variante opcional) | M | TD-010 |
| 2.4 | [2.4.dark-mode-global.story.md](./stories/2.4.dark-mode-global.story.md) | `prefers-color-scheme` global no acervo | M | TD-015 |
| 2.5 | [2.5.favicon-acervo.story.md](./stories/2.5.favicon-acervo.story.md) | Favicon único `_shared/favicon.svg` (Acervo) | XS | TD-021 |
| 2.6 | [2.6.fonts-audit-preload.story.md](./stories/2.6.fonts-audit-preload.story.md) | Audit pesos Geist + preload hero font + `font-display: swap` | S | TD-014 |

### Wave 3 — DataOps integrity (2-3 dias)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 3.1 | [3.1.schema-validation-yamls.story.md](./stories/3.1.schema-validation-yamls.story.md) | Schema validation runtime para YAMLs de `.aiox-core/data/` | M | DS-001 |
| 3.2 | [3.2.registry-healing-commands.story.md](./stories/3.2.registry-healing-commands.story.md) | Comandos `--recompute-checksums` / `--detect-orphans` / `--rebuild` | M-L | DS-002 |
| 3.3 | [3.3.checksums-ci-monthly.story.md](./stories/3.3.checksums-ci-monthly.story.md) | CI mensal de recompute de checksums | S | TD-018 |
| 3.4 | [3.4.tests-hooks-loaders.story.md](./stories/3.4.tests-hooks-loaders.story.md) | Testes unitários para hooks `.cjs` + loaders de YAML | M-L | TD-003 |

### Wave 4 — CI hardening (1-2 dias)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 4.1 | [4.1.ide-sync-ci-check.story.md](./stories/4.1.ide-sync-ci-check.story.md) | CI step + pre-commit `aiox ideSync --check` | S | TD-006 |
| 4.2 | [4.2.ci-hardening-lighthouse.story.md](./stories/4.2.ci-hardening-lighthouse.story.md) | Headers pós-deploy + link checker + Lighthouse CI budget | S | TD-016 |

### Wave 5 — Housekeeping e documentação (~1 dia)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 5.1 | [5.1.hooks-readme-align.story.md](./stories/5.1.hooks-readme-align.story.md) | Alinhar `.claude/hooks/README.md` à realidade | S | TD-007 |
| 5.2 | [5.2.docker-mcp-gateway-decision.story.md](./stories/5.2.docker-mcp-gateway-decision.story.md) | Decidir `.docker/mcp/gateway-service.yml` | S | TD-012 |
| 5.3 | [5.3.github-agents-decision.story.md](./stories/5.3.github-agents-decision.story.md) | Decidir `.github/agents/` (materializar OU desactivar) | XS | TD-024 |
| 5.4 | [5.4.gitleaks-private-materials.story.md](./stories/5.4.gitleaks-private-materials.story.md) | Pre-commit/gitleaks para materiais privados | XS | TD-017 |
| 5.5 | [5.5.learned-patterns-decision.story.md](./stories/5.5.learned-patterns-decision.story.md) | Decisão sobre `learned-patterns.yaml` | XS | TD-023 |
| 5.6 | [5.6.open-graph-meta.story.md](./stories/5.6.open-graph-meta.story.md) | Open Graph / Twitter Cards meta tags | S | TD-022 |
| 5.7 | [5.7.memory-lifecycle-rule.story.md](./stories/5.7.memory-lifecycle-rule.story.md) | `memory-lifecycle.md` em `.claude/rules/` | S | DS-003 |
| 5.8 | [5.8.memory-backup-sync.story.md](./stories/5.8.memory-backup-sync.story.md) | Backup/sync de memory files (symlink ou repo) | XS-S | DS-005 |

### Wave 6 — Strategic refactors (apenas com sign-off do Mário)

| # | ID | Título | Effort | TD source |
|---|----|--------|--------|-----------|
| 6.1 | [6.1.multi-ide-permissions.story.md](./stories/6.1.multi-ide-permissions.story.md) | Equivalência permissions multi-IDE | M | DS-004 |
| 6.2 | [6.2.framework-out-of-tree.story.md](./stories/6.2.framework-out-of-tree.story.md) | Framework AIOX out-of-tree (modelo híbrido) | L | TD-002 |
| 6.3 | [6.3.csp-no-unsafe-inline.story.md](./stories/6.3.csp-no-unsafe-inline.story.md) | CSP sem `'unsafe-inline'` (build step Tailwind) | M | TD-011 |

**Total:** 30 stories (7 + 6 + 4 + 2 + 8 + 3 = 30).

---

## 5. Métricas alvo (Definition of Done do Epic)

Critério global: **≥ 90% das métricas atingidas, com as 5 HIGH (TD-001 a TD-005) a 100%**.

### Compliance e governance
- [ ] Article II enforced em clones fresh (hooks em `settings.json` commitado)
- [ ] `lang="pt-PT"` em 11/11 páginas do acervo
- [ ] Drift do ideSync = 0 (CI bloqueia merge)
- [ ] Checksums do `entity-registry.yaml`: 821/821 verificados <30 dias
- [ ] Schema validation runtime para 100% dos ≥9 YAMLs de `.aiox-core/data/`

### Performance e UX
- [ ] LCP mobile 3G (Build Day) < 2.5s
- [ ] CLS global < 0.1
- [ ] INP global < 200ms
- [ ] Asset máximo individual < 100 KB
- [ ] Logo Build Day: SVG inline < 5 KB em 5/5 páginas
- [ ] Geist com 4-5 pesos (não 7)
- [ ] Hero font com `preload` em 100% das páginas
- [ ] FOIT visível = 0

### Acessibilidade (WCAG 2.1)
- [ ] Skip-link funcional em 11/11 páginas
- [ ] `<main id="content">` em 11/11 páginas
- [ ] `:focus-visible` global definido em `_shared/tokens.css`
- [ ] `aria-current="page"` na sidebar
- [ ] Focus trap + `Escape` no drawer mobile
- [ ] Tap targets ≥ 44×44 px (WCAG 2.5.5)
- [ ] Lighthouse a11y score ≥ 95 em 11/11 páginas

### Resilência e dataops
- [ ] Sidebar funcional com JS desactivado (`<noscript>`)
- [ ] `aiox registry --rebuild` determinístico
- [ ] `aiox registry --detect-orphans` exit code 0
- [ ] Backup de memory files activo
- [ ] `memory-lifecycle.md` em `.claude/rules/`

### Documentação e housekeeping
- [ ] Hooks documentados = hooks no FS
- [ ] Dangling references em `core-config.yaml` = 0
- [ ] Open Graph meta tags em 11/11 páginas
- [ ] Favicon único `_shared/favicon.svg` em 11/11 páginas

---

## 6. Ordem de execução recomendada

```
Wave 1 (1 dia) → Wave 2 (2-3 dias) → Wave 3 (2-3 dias) → Wave 4 (1-2 dias) → Wave 5 (1 dia)
                                                                                    │
                                                                                    └─→ [Decisão Mário] Wave 6
```

**Dependências críticas inter-wave:**
- Story 2.1 (TD-008 tokens + themes) é o **bottleneck cascade** — desbloqueia 2.2, 2.3, 2.4, 2.5
- Story 3.1 (DS-001 schema validation) é pré-requisito de 3.2 e 3.3
- Story 1.6 (cleanup tokens mortos) deve ser feita **antes** de 2.1 para evitar arrastar lixo no refactor

**Pré-requisitos de decisão (sign-off do Mário antes de cada wave começar):**
- Antes da Wave 2: confirmar adopção do hybrid approach de Uma (vs consolidação total)
- Antes da Wave 6: escolher quais dos 3 strategic refactors entram (ou nenhum)

---

## 7. Notas de execução

- Stories Wave 1 são **one-shot YOLO-able** — cada uma cabe em <1h
- Stories Wave 2-3 podem requerer modo interactive (decisões de granularidade de tokens, etc.)
- Stories Wave 5 contêm várias **decisões delegadas a @devops** (Docker MCP, gitleaks, GitHub agents)
- O epic NÃO inclui items OUT OF SCOPE listados na §5 do assessment técnico (sem BD, sem build step no acervo, fragmentação visual deliberada, etc.)

---

## 8. Histórico

| Data | Fase | Owner | Output |
|------|------|-------|--------|
| 2026-05-23 | Phase 1-3 (data collection) | Aria, Dara, Uma | `system-architecture.md`, `SCHEMA.md`, `frontend-spec.md` |
| 2026-05-23 | Phase 4 (draft) | Aria | `technical-debt-DRAFT.md` |
| 2026-05-23 | Phase 5-6 (specialist reviews) | Dara, Uma | `db-specialist-review.md`, `ux-specialist-review.md` |
| 2026-05-23 | Phase 7 (QA gate) | Quinn | `qa-review.md` (NEEDS WORK → endereçado em Phase 8) |
| 2026-05-23 | Phase 8 (final assessment) | Aria | `technical-debt-assessment.md` |
| 2026-05-23 | Phase 9 (executive report) | Alex | `TECHNICAL-DEBT-REPORT.md` |
| 2026-05-23 | **Phase 10 (this epic)** | **Morgan** | **Este README + 30 stories** |

---

*Epic criado por @pm Morgan — Brownfield Discovery Phase 10 — 2026-05-23*
*Próximo passo: priorização da Wave 1 pelo Mário e arranque de implementação por @dev.*
