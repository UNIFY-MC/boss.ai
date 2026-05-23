# QA Review — Technical Debt DRAFT

**Fase:** Brownfield Discovery — Phase 7 (QA Gate)
**Revisor:** Quinn (`@qa` — Guardian)
**Data:** 2026-05-23
**Inputs:** `technical-debt-DRAFT.md` (Phase 4 — @architect) + `db-specialist-review.md` (Phase 5 — @data-engineer) + `ux-specialist-review.md` (Phase 6 — @ux-design-expert) + `_CONTEXT.md` + dossier Phases 1-3
**Idioma:** PT-PT

---

## 1. Gate Decision

**NEEDS WORK**

---

## 2. Justificação

O draft do @architect é **substancialmente sólido**: cobre os três componentes principais do `_CONTEXT.md` (framework AIOX, acervo-formacoes, IDE configs), atribui severidades coerentes, mapeia 24 TDs com effort, dependências, quick wins e sequencing em 6 ondas, e isola 10 items OUT_OF_SCOPE com justificação. O cruzamento de findings entre as três análises (Architect / Data / UX) está explícito e sustenta as severidades dos 3 HIGH cross-citados (TD-001, TD-002, TD-003). Para um inventário pré-revisão, este é um documento accionável.

Contudo, **não está pronto para consolidar como `technical-debt-assessment.md` final sem absorver 7 items materialmente relevantes que emergiram das specialist reviews**: 5 items novos de Dara (DS-001 a DS-005, sendo DS-001 e DS-002 ambos MEDIUM e funcionalmente blockers para a estratégia "manter filesystem-first"), 4 items novos de Uma (TD-025 a TD-028) e 6 revisões de severidade/escopo nos TDs existentes (TD-002, TD-003, TD-004, TD-008, TD-014, TD-018, TD-019, TD-010, TD-014, TD-021). Adicionalmente, a recomendação estratégica de Uma (hybrid approach: tokens semânticos partilhados + themes por formação, com Wave 5 promovida para imediatamente após Wave 1) requer integração explícita porque altera o sequencing recomendado. Sem estas absorções, o `technical-debt-assessment.md` final entregaria uma vista incompleta do débito real — e algumas das severidades estariam mal calibradas (TD-018 LOW, TD-019 LOW). O draft está a 80% — falta integrar o feedback dos specialists antes de carimbar como final.

---

## 3. Verificações

| # | Verificação | Estado |
|---|-------------|--------|
| 1 | Todos os componentes do `_CONTEXT.md` foram cobertos (framework + acervo + IDE configs)? | ✓ |
| 2 | Severidades atribuídas correctamente (CRITICAL/HIGH/MEDIUM/LOW)? | ✗ (3 ajustes necessários: TD-018, TD-019, possivelmente TD-014) |
| 3 | Effort estimado é razoável (XS/S/M/L)? | ✗ (TD-008 efectivamente L, não M, conforme Uma; TD-003 sobe para M-L com schema validation) |
| 4 | Dependências entre TDs mapeadas? | ✓ (boa rede: TD-008→TD-010→TD-015; TD-011 depende de build step; TD-002 afecta TD-006/007; etc.) |
| 5 | Quick wins identificados (top 5)? | ✓ (top 5 razoável; UX adiciona 3 sub-quick-wins XS que valem absorver) |
| 6 | Items dos specialist reviews integrados ou justificados se rejeitados? | ✗ (DS-001 a DS-005 e TD-025 a TD-028 ainda não foram integrados — natural, é o que esta gate decide) |
| 7 | Items OUT_OF_SCOPE explicitamente listados? | ✓ (10 items bem articulados; Uma marcou correctamente como OUT_OF_SCOPE os TDs não-frontend) |

**Score:** 4 ✓ / 3 ✗ — não atinge o threshold para APPROVED automático.

---

## 4. Issues encontrados

### Q-1 (Blockers — impedem gate APPROVED)

**Q-1.1 — DS-001 (schema validation runtime) não está absorvido**
Dara classifica como **MEDIUM** e justifica que combina mal com TD-002 (framework in-tree, upgrades manuais) e TD-018 (checksums declarados, não recomputados). É o gap data mais importante na revisão de Phase 5. O draft do @architect tocou em "core-config.yaml sem schema validation" dentro de TD-003 mas não estendeu para os ≥9 YAMLs de `.aiox-core/data/`. **Acção obrigatória Phase 8:** absorver como TD novo (sugiro renumerar para TD-025 ou manter ID `DS-001`).

**Q-1.2 — DS-002 (healing/rebuild do `entity-registry.yaml`) não está absorvido**
Dara classifica como **MEDIUM**. Sem comandos `--recompute-checksums`, `--detect-orphans`, `--rebuild`, o registry de 821 entidades fica frágil a qualquer upgrade do framework. Combina com TD-018 (LOW) que Dara também recomenda re-discutir para MEDIUM. **Acção obrigatória Phase 8:** absorver como TD novo.

**Q-1.3 — TD-025 (sidebar sem graceful degradation `<noscript>`) não está absorvido**
Uma classifica como **MEDIUM**. Single point of failure de navegação em todas as 11 páginas — quebra o princípio "HTML estático manutenível por décadas" do acervo arquivístico. Effort S, ROI imediato. **Acção obrigatória Phase 8:** absorver.

**Q-1.4 — TD-019 severidade subdimensionada (LOW → MEDIUM)**
Uma indica explicitamente que falta de skip-link em site com sidebar persistente é **WCAG 2.1 Level A failure** (2.4.1 Bypass Blocks). Não é polish — é compliance básico. Adicionalmente, Uma enriquece com `aria-current="page"`, focus trap no drawer mobile e Escape key — três sub-pontos que estavam ausentes. **Acção obrigatória Phase 8:** promover para MEDIUM e absorver os 3 sub-pontos.

**Q-1.5 — TD-018 (checksums) deve ser re-discutido (LOW → MEDIUM)**
Dara argumenta que "checksum existe mas nunca é verificado automaticamente" cria falsa sensação de integridade em sistema cujo Article II depende de boundaries deterministas. O argumento é sólido. **Acção obrigatória Phase 8:** re-justificar a severidade explicitamente (manter LOW com defesa OU subir para MEDIUM).

### Q-2 (Concerns — aceitos mas registados)

**Q-2.1 — TD-004 alvo deve ser SVG inline, não só "PNG optimizado"**
Uma propõe SVG inline em vez de PNG <20 KB. Elimina 1 request HTTP em 5 páginas e habilita `currentColor` + `prefers-color-scheme`. Effort idêntico, resultado superior. **Acção Phase 8:** reescrever solução de TD-004.

**Q-2.2 — TD-008 effort M → L**
Uma estima 3-4h (não 1-2h) porque o refactor toca em `_shared/sidebar.css`, `_shared/page-toc.css`, 11 ficheiros HTML + decisão de granularidade (`--accent` único vs `--accent-primary/secondary`). **Acção Phase 8:** ajustar.

**Q-2.3 — TD-010 reframe — dark mode como variante `prefers-color-scheme`, não default**
Uma identifica decisão de produto escondida: o hub claro funciona como palate cleanser deliberado entre formações escuras. **Acção Phase 8:** reescrever TD-010 como "implementar `prefers-color-scheme` no hub com escuro como variante opcional, mantendo claro como default".

**Q-2.4 — TD-014 reframe — "audit pesos + preload hero font", não "reduzir famílias"**
Uma argumenta que 6 famílias são parte do valor arquivístico (preservar marcas originais). O verdadeiro débito é Geist carregar 7 pesos e usar 4-5, falta de `font-display: swap` consistente, e ausência de `preload` para hero font. **Acção Phase 8:** reescrever descrição.

**Q-2.5 — TD-021 enriquecer com favicon único de "Acervo"**
Uma identifica inconsistência subtil: sidebar diz "Acervo de Formações" mas favicon (quando existe) reflecte marca de uma formação específica. **Acção Phase 8:** adicionar nota à descrição de TD-021.

**Q-2.6 — TD-002 trade-off data não articulado**
Dara nota que migrar framework para out-of-tree implica que `entity-registry.yaml` também sai do tracking git — perde-se diff-review explicitamente declarado como valioso em DB-AUDIT.md §4.2. Trade-off legítimo, deve estar visível. **Acção Phase 8:** adicionar parágrafo de trade-off híbrido ("framework out-of-tree + `.aiox-core/data/` in-tree").

**Q-2.7 — TD-026, TD-027, TD-028 (UX novos LOW) não absorvidos**
- TD-026: performance budget (LCP/CLS/INP) — LOW, pode ser absorvido em TD-016
- TD-027: mobile responsiveness não auditada — LOW
- TD-028: `<main>` landmark em falta — LOW, pré-requisito de TD-019

Aceitos como LOW; absorver mas sem promover. Acção Phase 8.

**Q-2.8 — Recomendação estratégica de Uma (Wave 5 antes de Wave 2-4) não integrada**
Uma argumenta que TD-008 desbloqueia TD-010, TD-013, TD-015, TD-019, TD-021 — quase metade do inventário UX — pelo que faz sentido executar Wave 5 imediatamente após Wave 1, **saltando temporariamente** Waves 2-4. Argumento de ROI razoável; merece pelo menos referência explícita no documento final como "alternative sequencing".

### Q-3 (Nits — cosméticos)

**Q-3.1** — DS-003, DS-004, DS-005 (todos LOW de Dara) e TD-026/27/28 (LOW de Uma) podem ser absorvidos como cluster "specialist additions" sem reordenar o inventário todo. Numeração contínua (TD-025+) ou prefixos preservados (`DS-001`, `TD-UX-25`) — decisão de @architect, não bloqueante.

**Q-3.2** — A nota de Uma sobre `loading="lazy"` invertido no logo do Build Day (LCP candidate marcado lazy) é uma sub-nota de TD-004 — vale ficheiro como bullet dentro de TD-004, não TD novo.

**Q-3.3** — A QW-UX-2 (`aria-current="page"`, 5 min) é trivial absorver como bullet dentro de TD-019 enriquecido.

**Q-3.4** — O draft usa "DataOps" como categoria — é coerente, mas note-se que DS-001 a DS-005 expandem materialmente esta categoria. Considerar adicionar nota no Sumário Executivo de Phase 8 a destacar este shift.

---

## 5. Items dos specialist reviews que DEVEM ser absorvidos no Phase 8

### Do `db-specialist-review.md` (Phase 5 — Dara)

| ID | Item | Severidade | Esforço | Como integrar |
|----|------|-----------|---------|---------------|
| **DS-001** | Schema validation runtime para YAMLs internos (`.aiox-core/data/*.yaml`) | **MEDIUM** | M | Novo TD; pode renumerar para TD-025 ou preservar `DS-001` |
| **DS-002** | Healing/rebuild commands para `entity-registry.yaml` (--recompute-checksums, --detect-orphans, --rebuild) | **MEDIUM** | M-L | Novo TD; combina com TD-018 (mesmo registry) |
| **DS-003** | Política de compactação/lifecycle de memory files | LOW | S | Novo TD; cluster com DataOps housekeeping |
| **DS-004** | Equivalência de permissions entre IDEs (multi-IDE governance) | LOW | M | Novo TD; pré-requisito: TD-006 (drift checker base) |
| **DS-005** | Backup/snapshot strategy para memory files | LOW | XS-S | Novo TD; trivial absorver |

**Revisões de TDs existentes (Dara):**
- TD-002: adicionar trade-off data (framework out-of-tree vs `.aiox-core/data/` in-tree)
- TD-003: expandir scope para schema validation dos YAMLs (sobe esforço M → M-L)
- TD-018: re-discutir severidade LOW → MEDIUM

### Do `ux-specialist-review.md` (Phase 6 — Uma)

| ID | Item | Severidade | Esforço | Como integrar |
|----|------|-----------|---------|---------------|
| **TD-025** | Sidebar sem graceful degradation (`<noscript>` fallback) | **MEDIUM** | S | Novo TD; quick win imediato (QW-UX-1) |
| **TD-026** | Sem performance budget (LCP/CLS/INP) | LOW | S | Novo TD; absorver em Wave 3 (TD-016 CI hardening) |
| **TD-027** | Mobile responsiveness não auditada (tap targets, overflow) | LOW | S | Novo TD; cluster com TD-019 |
| **TD-028** | `<main>` landmark em falta nas 11 páginas | LOW | XS | Novo TD; pré-requisito de TD-019 (skip-link aponta para `<main>`) |

**Revisões de TDs existentes (Uma):**
- TD-004: alvo SVG inline (não PNG optimizado)
- TD-008: effort M → L; enriquecer com argumento de escalabilidade
- TD-010: reframe — dark mode como variante `prefers-color-scheme`, não default
- TD-014: reframe — "audit pesos + preload hero font", não "reduzir famílias"
- TD-019: promover LOW → MEDIUM; incluir `aria-current`, focus trap drawer, Escape key
- TD-021: favicon único de "Acervo", não de formação

**Recomendação estratégica de Uma — hybrid approach (preservar identidades, unificar contrato semântico):**
- Camada 1: `_shared/tokens.css` com vocabulário semântico (`--accent`, `--bg-base`, `--text-primary`, etc.)
- Camada 2: `_shared/themes/{nome}.css` por formação (legora, aiox-limon, kopkai-cyan)
- Justificação: preserva valor arquivístico + reduz manutenção + habilita escalabilidade trivial + mantém "sem build step"
- **Sequencing alternativo:** Wave 5 (design system) imediatamente após Wave 1, antes de Waves 2-4

**Quick wins UX (de Uma) que podem ser absorvidos:**
- QW-UX-1: `<noscript>` fallback na sidebar (15 min) — é a forma concreta de resolver TD-025 (Wave 1)
- QW-UX-2: `aria-current="page"` na sidebar activa (5 min) — bullet dentro de TD-019 enriquecido
- QW-UX-3: `loading="lazy"` invertido (eager no LCP, lazy nas decorativas) (10 min) — bullet dentro de TD-004 enriquecido

---

## 6. Recomendação para Phase 8 (@architect)

### Mudanças estruturais obrigatórias

1. **Renumeração com prefixos preservados:** sugiro manter `TD-001` a `TD-024` do draft + acrescentar `TD-025` (graceful degradation), `TD-026` (perf budget), `TD-027` (mobile a11y), `TD-028` (`<main>` landmark), `TD-029` (schema validation — antigo DS-001), `TD-030` (registry healing — antigo DS-002), `TD-031` (memory lifecycle — DS-003), `TD-032` (multi-IDE permissions equiv. — DS-004), `TD-033` (memory backup — DS-005). Total: 33 TDs. Alternativa: manter prefixos `DS-NNN` para sinalizar origem. **Decisão de @architect** — eu recomendo numeração contínua para simplicidade.

2. **Adicionar coluna "Specialist concordance" na tabela mestre.** Sugestão:
   - `Architect + Data + UX` (peso máximo, cross-citado em 3 vistas)
   - `Architect + Data` (cross-cited em 2 vistas)
   - `Architect + UX` (idem)
   - `Architect only` (descoberta inicial não contestada)
   - `Data only` / `UX only` (descoberta exclusiva de specialist)

   Isto torna explícito o peso evidencial de cada item e ajuda Phase 9 (Analyst) a construir narrativa executiva.

3. **Recalibrar severidades:**
   - TD-018: LOW → **MEDIUM** (Dara argumenta convincentemente)
   - TD-019: LOW → **MEDIUM** (Uma identifica WCAG Level A failure)
   - TD-014: rever (mudança de framing, severidade pode descer para LOW se reframed para "audit pesos")

4. **Re-estimar efforts ajustados:**
   - TD-003: M → **M-L** (inclui schema validation)
   - TD-008: M → **L** (Uma justifica 3-4h)
   - TD-002: L (mantém, mas com trade-off data explicitado)

5. **Sequencing — opção A (recomendado pelo arquitecto) ou opção B (recomendado por Uma):** documentar ambas no documento final. Opção B (Wave 5 antes de Wave 2-4) tem ROI superior segundo Uma; opção A é mais conservadora. Decisão de produto pelo Mário.

### Melhorias estruturais opcionais

6. **Secção "Specialist Diffs"** num apêndice — pequena secção que liste explicitamente "o que mudou face ao Phase 4 draft após Phase 5+6". Ajuda futura auditoria do processo brownfield.

7. **Quick wins consolidados:** absorver QW-UX-1 (=TD-025), QW-UX-2 (=bullet em TD-019), QW-UX-3 (=bullet em TD-004) directamente no top-5 do draft. Resultado: top 8 quick wins (5 do @architect + 3 UX).

8. **Cluster "specialist concerns"** no Sumário Executivo: 2-3 frases que reconheçam explicitamente as 2 MEDIUM novas (DS-001/TD-029, DS-002/TD-030) como pré-requisitos da estratégia "manter filesystem-first" sustentável a 6-12 meses (citação directa de Dara, §5).

9. **Reforçar a recomendação OUT_OF_SCOPE de TD-011** (CSP `unsafe-inline`): Uma recomenda explicitamente "aceite, não resolver" até trigger concreto. Mover TD-011 do inventário activo para OUT_OF_SCOPE até trigger? Decisão de @architect.

---

## 7. Resumo do gate para o Mário

| Aspecto | Estado |
|---------|--------|
| Cobertura dos componentes do `_CONTEXT.md` | ✓ Completa |
| Qualidade do mapeamento (severidades, efforts, dependências) | ⚠ 4-5 ajustes necessários após specialist reviews |
| Items dos specialists integrados | ✗ Pendente — 9 items novos + 8 revisões de TDs existentes |
| Recomendação estratégica clara | ⚠ Falta absorver hybrid approach de Uma + sequencing alternativo |
| Decisão sobre OUT_OF_SCOPE | ✓ Adequada (10 items bem justificados) |

**Verdict final:** O documento está a 80%. As Phase 5 e Phase 6 produziram feedback significativo e não cosmético — integrar é obrigatório antes de o documento ser carimbado como `technical-debt-assessment.md` final. **Estimativa de esforço para Phase 8:** 1-2h (incorporar 9 items novos + 8 revisões + sumário executivo de mudanças). Após isso, o documento estará accionável para o Mário priorizar a Wave 1 e iniciar implementação real do plano.

---

*Documento gerado por Quinn (`@qa`) — Brownfield Discovery Phase 7 — 2026-05-23*
