# Relatório Executivo — Dívida Técnica do `boss.ai`

**Para:** Mário Carvalho
**De:** @analyst (Alex) — Brownfield Discovery Phase 9
**Data:** 2026-05-23
**Fontes:** `technical-debt-assessment.md` (Phase 8, @architect Aria), revisões de Phase 5 (@data-engineer Dara), Phase 6 (@ux-design-expert Uma), Phase 7 (@qa Quinn).

---

## 1. TL;DR

O `boss.ai` está em **saúde moderada-boa**: nada está partido, CI verde, sem credenciais expostas, sem base de dados a manter — o débito é estrutural e de manutenibilidade, não operacional. O inventário final tem **30 items** (5 HIGH, 14 MEDIUM, 11 LOW), com os HIGH a representar cerca de **2-3 dias úteis totais** se atacados em Wave 1 + parte da Wave 2. Não há nada que precise de ser corrigido esta semana, mas há 5-7 quick wins que dão para fazer numa tarde de domingo e desbloqueiam metade do inventário UX.

---

## 2. Estado actual

| Severidade | Quantos | Categoria dominante | Comentário |
|---|---|---|---|
| **CRITICAL** | 0 | — | Não há nada com impacto imediato em produção |
| **HIGH** | 5 | Architecture (2), Frontend (2), DevEx (1) | Núcleo a atacar primeiro — todos accionáveis |
| **MEDIUM** | 14 | Frontend (8), DataOps (4), Architecture (2) | Maioria desbloqueada pelo refactor do design system |
| **LOW** | 11 | Frontend (5), DataOps (3), Architecture (3) | Housekeeping; podem esperar |
| **Total** | **30** | Frontend dominante (15/30) | Acervo concentra o débito UX |

**Categoria dominante:** Frontend (acervo-formacoes) — metade do inventário. Tudo o resto está em arquitectura/governance do framework AIOX e DataOps do registry.

---

## 3. Quick wins (Wave 1) — uma tarde de domingo

Cinco items que resolvem compliance editorial + governance + performance crítica em poucas horas:

| # | O que fazer | Tempo | Porquê importa |
|---|---|---|---|
| 1 | **TD-005** — corrigir `lang="pt-BR"` para `lang="pt-PT"` em `aulao-claude-code/index.html:2` | **5 min** | Viola directriz global; afecta hyphenation e leitores de ecrã |
| 2 | **TD-009** — uniformizar `lang="pt-PT"` em 5 ficheiros do Build Day | **5 min** | Consistência editorial total no acervo |
| 3 | **TD-001** — mover registo dos hooks de `settings.local.json` para `settings.json` commitado | **30 min** | Restaura Article II (governance) em clones novos |
| 4 | **TD-004** — re-exportar logo Build Day como SVG inline + inverter `loading="lazy"` (eager no LCP, lazy nas decorativas) | **1h** | LCP cai drasticamente em 5 páginas; -1 request HTTP por página |
| 5 | **TD-025** — adicionar `<noscript>` fallback dentro de `<div id="sidebar-mount">` | **15 min** | Sidebar não desaparece se JS falhar; preserva o "HTML estático manutenível por décadas" |

**Bónus low-effort se houver tempo:** TD-013 (5 min, remover tokens "gold/cream" mortos) e TD-020 (10 min, substituir `onmouseover` inline por `:hover` CSS).

**Total Wave 1:** ~2h de trabalho focado. Outcome: compliance editorial completo + governance restaurada + LCP fix + graceful degradation.

---

## 4. Decisão estratégica chave — o design system hybrid

A decisão arquitectural mais consequente do assessment é como tratar os **4 sub-design-systems** do acervo (cada formação tem a sua identidade visual: LegalCode, Academia Lendária, KopkAI, Build Day). A tentação óbvia seria consolidar tudo num só sistema; a recomendação adoptada é o **oposto** — preservar as identidades visuais porque elas são **valor arquivístico** (representam a fonte original de cada formação), mas extrair um **contrato semântico partilhado** em `_shared/tokens.css` (vocabulário tipo `--accent`, `--bg-base`, `--font-display`) e ter `_shared/themes/{nome}.css` por formação. Os componentes partilhados (sidebar, page-toc) passam a ler **apenas** tokens semânticos. Resultado: cada nova formação é 1 ficheiro de theme novo, sem inventar vocabulário; refactor de 3-4h desbloqueia em cascata 5 outros items do inventário UX (dark mode, acessibilidade WCAG, favicon, tipografia). Esta é a peça central de Wave 2.

---

## 5. Custos por wave

Estimativas conservadoras em dias úteis (sessões focadas de ~6h):

| Wave | Foco | Effort | Impacto |
|---|---|---|---|
| **Wave 1** | Quick wins críticos (5 HIGH + 2 LOW) | **~1 dia** | Compliance editorial + governance + LCP + graceful degradation |
| **Wave 2** | Design system hybrid + acessibilidade WCAG (6 items) | **~2-3 dias** | Desbloqueia metade do inventário UX; dark mode coerente; WCAG Level A |
| **Wave 3** | DataOps integrity — schema validation + healing do registry (4 items) | **~2-3 dias** | Filesystem-first sustentável a 6-12 meses |
| **Wave 4** | CI hardening + ideSync drift detection (2 items) | **~1-2 dias** | CI passa de "verde por sintaxe" para "verde por comportamento" |
| **Wave 5** | Housekeeping + documentação (8 items LOW) | **~1 dia** | Sem placeholders mortos; backup de memories; OG cards |
| **Wave 6** | Strategic refactors (decisão por decisão) | Variável | Só com sinal verde explícito — não bloqueia Waves 1-5 |
| **Total Wave 1-5** | Plano completo realizável | **~7-10 dias úteis** | 90% das métricas alvo atingidas |

**Os 5 HIGH (Wave 1) levam ~1 dia.** Tudo o resto é melhoria progressiva.

---

## 6. O que está bem — não mexer

Pontos onde a auditoria **não encontrou débito significativo** e que merecem ficar como estão:

- **CI verde em todos os jobs** — gitleaks, YAML validation, HTMLHint. A base está sólida; Wave 4 só lhe adiciona comportamento, não corrige nada partido.
- **Security headers do acervo** — CSP, HSTS, etc. já estão configurados (commit recente `5fc6471`). Só o `'unsafe-inline'` do Tailwind CDN fica em "aceite, não resolver" até haver trigger concreto.
- **Sem credenciais expostas** — gitleaks limpo. `.env` com SUPABASE_* vazios é correcto (não há DB).
- **Sem base de dados** — decisão deliberada, coerente com single-user single-machine. Filesystem-first é o caminho certo; só repensar se acervo passar 20 formações.
- **Sem build step no acervo** — princípio explícito do projecto; paga `'unsafe-inline'` no CSP mas ganha simplicidade de deploy e manutenibilidade a 2-3 anos.
- **Fragmentação visual entre formações** — é **valor arquivístico**, não débito. A decisão hybrid (secção 4) preserva-a.

---

## 7. Próximo passo concreto

**Faz a Wave 1 numa tarde** — são ~2h de trabalho que resolvem os 5 HIGH e dois quick wins LOW. Concretamente: abre `aulao-claude-code/index.html`, corrige a linha 2 (`pt-BR` → `pt-PT`); faz o mesmo nos 5 ficheiros do Build Day; move o registo dos hooks de `settings.local.json` para `settings.json` e commita; re-exporta o logo Build Day como SVG; adiciona o `<noscript>` na sidebar. Tudo isto cabe num único commit pequeno e deixa o projecto compliant + com LCP reduzido. Depois disso, decide se queres encadear directamente Wave 2 (design system, 2-3 dias) ou pausar e voltar mais tarde — Waves 2-5 são independentes da Wave 1 e podem esperar.

---

*Documento gerado por @analyst (Alex) — Brownfield Discovery Phase 9 — 2026-05-23*
*Próxima fase: Phase 10 (@pm Morgan → epic + stories prontas para desenvolvimento).*
