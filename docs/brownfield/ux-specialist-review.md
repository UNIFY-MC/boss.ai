# UX Specialist Review — Tech Debt DRAFT

**Fase:** Brownfield Discovery — Phase 6 (UX specialist review)
**Especialista:** Uma (`@ux-design-expert`)
**Data:** 2026-05-23
**Input:** `technical-debt-DRAFT.md` (Phase 4 — @architect)
**Cruzamentos:** `frontend-spec.md` (Phase 3 — UX) + `_CONTEXT.md`
**Escopo:** Acessibilidade, frontend, design system, performance percebida
**Idioma:** PT-PT

---

## Índice

1. [Veredictos sobre itens TD do draft (frontend/UX)](#1-veredictos-sobre-itens-td-do-draft-frontendux)
2. [Itens em falta — gaps detectados na perspectiva UX](#2-itens-em-falta--gaps-detectados-na-perspectiva-ux)
3. [Quick wins UX adicionais (top 3)](#3-quick-wins-ux-adicionais-top-3)
4. [Recommendation strategy — consolidar ou preservar identidades?](#4-recommendation-strategy)
5. [Sumário executivo de mudanças propostas ao draft](#5-sumário-executivo-de-mudanças-propostas-ao-draft)

---

## 1. Veredictos sobre itens TD do draft (frontend/UX)

### TD-004 — Logo `logo.png` 788 KB
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** Concordo com a severidade HIGH e o effort S. Mas o draft sub-especifica o resultado esperado: não basta "optimizar para < 20 KB" — o alvo correcto é **SVG inline** (~2-4 KB embutido no `<head>` do template), por três razões:
  1. Alinha com `aiox-cohort-fundamentals/assets/logo.svg` (6,5 KB) — coerência inter-formação;
  2. Elimina 1 request HTTP em 5 páginas (Build Day hub + 4 sub-páginas);
  3. SVG inline herda `currentColor` e responde a `prefers-color-scheme` — habilita TD-015 sem trabalho extra.
- **Mudança ao draft:** Trocar "Re-exportar SVG ou optimizar com `pngquant`/`oxipng`" por **"Re-exportar como SVG e inline-ar no `<head>` partilhado das 5 páginas Build Day"**. Manter PNG só se a marca KopkAI exigir gradientes complexos (a verificar contra o original Figma; não há evidência de gradientes no logo actual).

### TD-005 — `lang="pt-BR"` no Aulão
- **Verdict:** AGREE
- **Justificação:** Severidade HIGH proporcional ao impacto (viola directriz global do Mário + afecta TTS de leitores de ecrã). Effort XS correcto. Já cobrido em `frontend-spec.md §9 R1`.

### TD-008 — `_shared/` sem design tokens semânticos
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** O draft acerta na essência (criar `_shared/tokens.css` com vocabulário semântico) mas subestima o **escopo da refactorização**. As 11 páginas declaram cada uma ~50 linhas de `:root` — extrair isso requer:
  1. Decidir granularidade dos tokens: `--accent` único OU `--accent-primary` + `--accent-secondary`?
  2. Reescrever `_shared/sidebar.css` para deixar de ler `--sb-*` específicos e passar a ler tokens semânticos (`--accent`, `--bg-elev`);
  3. Migrar `_shared/page-toc.css:24` que tem fallback hardcoded `#c9b298` (gold) — quebra no hub claro;
  4. Validar que `prefers-color-scheme` (TD-015) só inverte tokens semânticos, sem tocar nos display-tokens (Playfair vs Geist vs Syne).
- **Effort revisto:** **M → L** (estimo 3-4h, não 1-2h). Vale a pena na mesma — habilita TD-010, TD-015, TD-019 em cascata.
- **Sequencing crítico:** Este item é pré-requisito hard para TD-010 e TD-015 (já reconhecido no draft) **e também** para o gap "Consistency entre 4 sub-design-systems" (ver §2.4 abaixo).

### TD-009 — `lang="pt"` no Build Day
- **Verdict:** AGREE
- **Justificação:** Severidade MEDIUM coerente — não viola directriz como TD-005 mas mancha consistência editorial. Effort XS. Sem comentários adicionais.

### TD-010 — Hub sem dark mode
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** Severidade MEDIUM está correcta mas o draft trata isto como "alinhar tema claro com escuro". Há uma **decisão de produto** escondida que o draft não articula: o hub claro funciona como **palate cleanser** entre formações escuras — o salto é deliberadamente abrupto para sinalizar "saiste de uma formação, estás no índice". Tornar o hub escuro perde esse sinal.
- **Mudança ao draft:** Em vez de "implementar dark mode no hub", recomendo **"implementar `prefers-color-scheme` no hub com escuro como variante opcional, mantendo claro como default"**. Decisão de produto: dark mode é opt-in (via `@media (prefers-color-scheme: dark)`), não default. Isto resolve TD-015 simultaneamente.
- **Effort revisto:** mantém M, mas só faz sentido após TD-008.

### TD-011 — CSP com `'unsafe-inline'` (Tailwind CDN)
- **Verdict:** AGREE
- **Justificação:** Severidade MEDIUM e effort M correctos. Concordo também com o "Dependência: implica introduzir build step — decisão estratégica". Da perspectiva UX puro, **não vale a pena** o trade-off: ganha-se defesa-em-profundidade (que já é redundante com `noindex` + `X-Frame-Options: SAMEORIGIN` + ausência de inputs dinâmicos) e perde-se o princípio "sem build step" que torna o acervo manutenível pelo Mário sozinho num futuro de 2-3 anos. **Recomendo deixar este TD como "aceite, não resolver"** até que apareça um trigger concreto (e.g., adicionar formulário de contacto, conteúdo gerado por user, etc.).

### TD-013 — Tokens "gold/cream" mortos
- **Verdict:** AGREE
- **Justificação:** Effort XS, ganho de clareza imediato. Concordo com a observação "Pode ser absorvido em TD-008" — fazer dentro do refactor de tokens evita commit duplo no mesmo ficheiro.

### TD-014 — 6 famílias tipográficas
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** Concordo com severidade MEDIUM mas discordo da framing "reduzir famílias". A fragmentação tipográfica é **parte do valor arquivístico** (cada formação preserva a marca da fonte original). O verdadeiro débito não é "6 famílias" mas sim:
  1. **Geist carrega 7 pesos (300-900) e usa só 4-5** — desperdício de payload claro;
  2. Não há `font-display: swap` consistente (delegado ao `&display=swap` na URL Google Fonts — frágil);
  3. Não há `preload` para a fonte do hero de cada página → FOIT visível.
- **Mudança ao draft:** Reescrever descrição como "**Audit de pesos não-usados + preload de hero font por página**". Manter 6 famílias é decisão arquitectural, não débito.
- **Effort:** Mantém S.

### TD-015 — Sem `prefers-color-scheme`
- **Verdict:** AGREE
- **Justificação:** Severidade MEDIUM e dependência explícita de TD-008 + TD-010 estão correctas. Apenas reforço: este item ganha valor real **apenas** se TD-010 for executado como variante (ver minha mudança a TD-010 acima). Caso contrário, dar `prefers-color-scheme: dark` ao hub sem ter design-system semântico = caos.

### TD-019 — Acessibilidade básica (skip-link, `:focus-visible`)
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** Severidade LOW está **subdimensionada**. Em rigor WCAG 2.1 AA, ausência de skip-link em sites com sidebar persistente de 10+ links é classificada como **Level A failure** (`2.4.1 Bypass Blocks`). Não é "polish" — é compliance básico.
- **Mudança ao draft:** Promover de LOW para **MEDIUM**. Effort mantém S.
- **Adição:** Acrescentar também `aria-current="page"` na sidebar quando link está marked como `active` (linha 124-125 do `sidebar.js` já adiciona `class="active"`, mas falta o aria attribute — leitor de ecrã não anuncia "página actual").

### TD-020 — `onmouseover`/`onmouseout` inline
- **Verdict:** AGREE
- **Justificação:** Effort XS, ganho de manutenibilidade. Concordo com o draft.

### TD-021 — Favicon inconsistente
- **Verdict:** AGREE_WITH_CHANGES
- **Justificação:** Concordo com a severidade LOW e o effort XS, mas o draft não chama atenção para um detalhe: **o `_shared/sidebar.js` injecta uma sidebar com brand "Acervo de Formações"**, mas o favicon que o browser mostra na tab é (a) o do Build Day quando estás lá ou (b) nada nas restantes. Inconsistência de signature visual entre tab e sidebar.
- **Mudança ao draft:** Adicionar à descrição: "favicon único em `_shared/favicon.svg` que reflicta a marca 'Acervo' (não a marca de uma formação específica)". Permite ter o mesmo símbolo na tab independentemente da formação aberta.

### TD-022 — Sem Open Graph
- **Verdict:** AGREE
- **Justificação:** LOW é a severidade certa. Note-se que o site é `noindex` (CSP + header) mas o `og:*` não é interpretado por crawlers — é interpretado por **clientes de mensagens** (Slack, WhatsApp, Notion). O `noindex` é ortogonal. Effort S correcto.

### Itens TD não-frontend (TD-001, TD-002, TD-003, TD-006, TD-007, TD-012, TD-016, TD-017, TD-018, TD-023, TD-024)
- **Verdict:** OUT_OF_SCOPE
- **Justificação:** Fora do âmbito UX/frontend/acessibilidade. Deferidos aos especialistas correspondentes (Architect já cobriu; QA na Phase 7).

---

## 2. Itens em falta — gaps detectados na perspectiva UX

Itens que o @architect não capturou na Phase 4 mas merecem entrada no inventário de TD:

### 2.1 Sidebar JS — sem graceful degradation

- **Severidade proposta:** MEDIUM
- **Componente:** `acervo-formacoes/_shared/sidebar.js` (linhas 1-127)
- **Descrição:** A sidebar inteira é **construída por JS** (`mount.innerHTML = html;` na linha 75). Se o JS falhar (rede, AdBlock agressivo, browser antigo, CSP a bloquear `'unsafe-inline'` no futuro), a página fica **sem navegação alguma** — sem links para outras formações, sem hub, sem nada. Não há HTML estático fallback dentro de `<div id="sidebar-mount">`, nem `<noscript>` com links mínimos.
- **Impacto:** Single point of failure de navegação em todas as 11 páginas do acervo. Quebra também o princípio "HTML estático manutenível por décadas" implícito num acervo arquivístico — daqui a 5 anos, se o Google Fonts CDN bloquear (e via CSP) e o JS partir, o acervo torna-se inacessível.
- **Effort estimado:** S (adicionar `<noscript>` com lista mínima de links + considerar pre-render do HTML no template a longo prazo)
- **Recomendação:** Acrescentar ao inventário como **TD-025**.

### 2.2 Performance budget — sem LCP/CLS/INP targets declarados

- **Severidade proposta:** LOW
- **Componente:** Todo `acervo-formacoes/` + `core-config.yaml` (se aplicável)
- **Descrição:** Não há budget declarado para Core Web Vitals. O draft do @architect captura "logo.png 788 KB" como item pontual mas não estabelece **gates** que impeçam regressões similares (e.g., "qualquer asset > 100 KB falha o CI", "LCP em mobile 3G < 2.5s").
- **Impacto:** Próximo asset pesado entra sem fricção. Sem budget = sem alarme.
- **Effort estimado:** S (adicionar Lighthouse CI step no `.github/workflows/ci.yml` com budget JSON)
- **Recomendação:** Acrescentar como **TD-026**, com nota de que está adjacente a TD-016 (CI hardening) e pode ser absorvido nessa wave.

### 2.3 Mobile responsiveness — não validada além de `<meta viewport>`

- **Severidade proposta:** LOW
- **Componente:** Todas as páginas + `_shared/sidebar.css`
- **Descrição:** A `frontend-spec.md` confirma que existe `<meta viewport>` e que a sidebar tem drawer mobile (toggle abaixo de 1000px). Mas não foi feito teste de:
  - Tap targets ≥ 44×44 px (WCAG 2.5.5) — particularmente nos filter-chips do hub (`index.html:638-642`) e nos meta-items dos cards;
  - Overflow horizontal em viewports < 360px (alguns hero H1 com `clamp(40px, 6vw, 64px)` podem causar overflow);
  - Tipografia escalada para mobile (Playfair em mobile a 40px é dramático e bonito, Geist em 7 pesos é overkill em mobile).
- **Impacto:** Acervo é provavelmente usado em mobile (consulta rápida em deslocação). Sem audit, há risco de UX degradada nos casos exactos em que utilidade é maior.
- **Effort estimado:** S (audit manual com DevTools device mode + correcções pontuais)
- **Recomendação:** Acrescentar como **TD-027**.

### 2.4 Consistency entre 4 sub-design-systems — fragmentação como débito implícito

- **Severidade proposta:** MEDIUM
- **Componente:** Os 3 "sub-design systems" descritos em `frontend-spec.md §3` (Legora claro, AIOX Limon escuro, KopkAI cyan escuro)
- **Descrição:** TD-008 captura "duplicação de tokens entre páginas" mas não captura o **gap de vocabulário entre formações**: o que numa formação é `--accent` (Limon) noutra é `cyan` (Tailwind) e noutra é `--color-parchment-tan`. Não há contrato semântico entre formações — só sintáctico (`--sb-bg` por exemplo). Isto significa que **adicionar uma 5ª formação** requer reinventar o vocabulário visual de novo. É débito de **escalabilidade**, não de manutenção do existente.
- **Impacto:** Cada nova formação = +50 linhas de `:root` novos + risco de drift visual de elementos partilhados (sidebar, page-toc).
- **Effort estimado:** Coberto se TD-008 for executado **completamente** (tokens semânticos), mas o draft do @architect não articula este ângulo de escalabilidade.
- **Recomendação:** **Não criar novo TD** — em vez disso, **enriquecer descrição de TD-008** com "Escalabilidade: novo theme = só adicionar 1 ficheiro `_shared/themes/{nome}.css` que sobrescreve tokens semânticos. Sem novo vocabulário."

### 2.5 Focus visível e keyboard navigation além de `:focus-visible`

- **Severidade proposta:** MEDIUM (parcialmente absorvido em TD-019)
- **Componente:** Sidebar, filter chips do hub, page-toc
- **Descrição:** TD-019 menciona `:focus-visible` mas não cobre:
  1. **Ordem de tab** na sidebar — actualmente o `id="sb-toggle"` e `id="sb-reopen"` são botões fixos no canto superior esquerdo; o tab order pode pular o link "Hub do acervo" e ir directamente para a pesquisa;
  2. **Trap de foco** no drawer mobile — ao abrir o drawer (`<1000px viewport`), o foco deveria ficar preso dentro até fechar (WCAG 2.4.3). Hoje, tab key sai do drawer e foca elementos por trás (que estão visualmente escondidos pelo backdrop) — confuso para keyboard users;
  3. **Escape key** para fechar o drawer — `sidebar.js:101-105` só fecha por click em link ou backdrop. Sem `Escape`, keyboard users ficam presos a fechar manualmente.
- **Impacto:** Keyboard navigation degradada. Falha em WCAG 2.1.1 e 2.4.3.
- **Effort estimado:** S (~30 min de JS adicional em `sidebar.js`)
- **Recomendação:** **Enriquecer TD-019** com estes 3 sub-pontos (não criar TD novo). Promover severidade de LOW para MEDIUM (já recomendado em §1 acima).

### 2.6 Landmarks ARIA e estrutura semântica

- **Severidade proposta:** LOW
- **Componente:** Todas as páginas + `_shared/sidebar.js`
- **Descrição:** Auditoria rápida com Grep mostra:
  - Sidebar usa `<aside>` (landmark implícito `complementary`) e `<nav aria-label="Navegação principal">` — ✅ correcto;
  - Hub (`index.html`) tem `<section>` mas não declara `<main>` explícito — leitor de ecrã não tem landmark `main` para saltar;
  - Cards-de-formação são `<a class="formacao-card">` (link wrapping H3 + meta) — semântica OK, mas falta `aria-labelledby` para anunciar o título primeiro;
  - Build Day usa `<div>` em vez de `<main>` (a confirmar por leitura, mas é padrão Tailwind-CDN comum).
- **Impacto:** Leitor de ecrã não anuncia regiões claramente. Skip-link (TD-019) é menos útil se não houver `<main id="content">` para apontar.
- **Effort estimado:** XS (envolver conteúdo principal em `<main id="content">` nas 11 páginas)
- **Recomendação:** Acrescentar como **TD-028**. Dependência: pré-requisito do skip-link em TD-019.

---

## 3. Quick wins UX adicionais (top 3)

Acima dos 5 quick wins do draft do @architect, estes 3 são UX-puros, baixo effort, alto retorno percebido:

### QW-UX-1 — `<noscript>` fallback na sidebar (15 min)
Adicionar dentro de `<div id="sidebar-mount">` um bloco `<noscript>` com lista estática mínima dos 4 links de formações + hub. Cobre o gap §2.1 (graceful degradation) sem refactor do `sidebar.js`. **Resolve o pior cenário de falha futura.**

### QW-UX-2 — `aria-current="page"` na sidebar activa (5 min)
Em `_shared/sidebar.js:125`, adicionar `l.setAttribute('aria-current', 'page')` ao mesmo tempo que `classList.add('active')`. Custo zero, ganho directo para leitores de ecrã. **Impacto a11y desproporcional ao effort.**

### QW-UX-3 — `loading="lazy"` em todas as imagens **excepto LCP candidates** (10 min)
Audit: das 6 `<img>` no Build Day, 1 é logo (LCP candidate — remover `loading="lazy"` para que carregue eagerly) e 5 são decorativas (manter `loading="lazy"`). Inverte a ironia detectada em `frontend-spec.md §6.3` (o logo grande está `lazy` mas é LCP). **Optimiza LCP sem optimizar o asset** — complementar a TD-004, não substituto.

**Recomendação:** Acrescentar estes 3 quick wins à **Wave 1 do sequencing do draft** (ainda XS effort, alto impacto editorial/a11y).

---

## 4. Recommendation strategy

> "Consolidar 4 sub-design-systems num único? Vale o esforço? Ou manter cada formação com identity própria (e investir em landing/index polido)?"

### Recomendação: **Hybrid approach — preservar identidades, unificar contrato semântico**

Não consolidar os 4 sub-design-systems num design system único. Em vez disso, **dividir em duas camadas**:

#### Camada 1 — Contrato semântico partilhado (`_shared/tokens.css`)

Define **vocabulário**, não valores. Tokens semânticos abstractos:
- `--accent`, `--accent-on-bg`, `--accent-muted`
- `--bg-base`, `--bg-elev`, `--bg-deep`
- `--text-primary`, `--text-mid`, `--text-dim`
- `--border`, `--border-strong`
- `--radius-card`, `--radius-button`, `--radius-input`
- `--font-display`, `--font-heading`, `--font-body`, `--font-mono`

Este ficheiro é único, partilhado, e a sidebar + page-toc lêem **apenas** estes tokens (não `--gold`, não `--sb-bg`, não `cyan`).

#### Camada 2 — Theme overrides por formação (`_shared/themes/{nome}.css`)

Cada formação carrega o seu theme depois do `tokens.css`:
- `themes/legora.css` (Hub + Aulão): `--accent: #e1d5b6; --bg-base: #fefefc; --font-display: 'Playfair Display'…`
- `themes/aiox-limon.css` (Reprise + Cohort): `--accent: #d1ff00; --bg-base: #09090a; --font-display: 'Geist'…`
- `themes/kopkai-cyan.css` (Build Day): `--accent: #7eeaea; --bg-base: #000; --font-display: 'Syne'…`

Cada theme é ~30 linhas (override de 12-15 tokens). O resto da página usa tokens semânticos.

#### Por que esta abordagem (não consolidação total)

1. **Preserva valor arquivístico** — cada formação mantém a identidade visual da fonte (LegalCode, Academia Lendária, KopkAI). Esse é o **produto**.
2. **Reduz custo de manutenção** — sidebar e componentes partilhados deixam de ter código condicional ("se for Build Day, usa cyan, senão usa gold"). Lêem `var(--accent)` e está feito.
3. **Habilita escalabilidade trivial** — adicionar 5ª formação = criar 1 ficheiro `themes/nova.css`, não reinventar tokens.
4. **Habilita dark mode no hub** sem destruir o salto deliberado claro→escuro (ver TD-010 revisto): basta o tema "legora.css" responder a `prefers-color-scheme`.
5. **Mantém princípio "sem build step"** — tudo continua a ser CSS estático carregado via `<link>`.

#### Por que NÃO investir só num "landing/index polido"

Tentação válida (manter status quo, polir apenas o hub) mas tem custos compostos:
- Cada nova formação adicionada = +50 linhas de `:root` duplicado;
- Cada bug visual em componentes partilhados (sidebar, TOC) tem de ser corrigido em 4 contextos;
- Dark mode no hub não chega para corrigir o problema percebido (`prefers-color-scheme` não funciona por página individual sem tokens semânticos);
- Daqui a 2 anos, a manutenção é exponencialmente mais cara que fazer o refactor hoje (3-4h).

### Decisão de produto requerida

Há **uma** pergunta que o draft do @architect não articula e que precisa de resposta do Mário:

> **Quer dar prioridade à wave 5 (design system unification — 2-3 dias) antes ou depois das waves 3-4 (CI hardening + housekeeping)?**

A minha recomendação: **fazer a Wave 5 imediatamente após a Wave 1 (quick wins editoriais), saltando temporariamente as Waves 2-4**. Razão: TD-008 desbloqueia simultaneamente TD-010, TD-013, TD-015, TD-019 (na parte de `:focus-visible`), TD-021 — quase metade do inventário UX. O ROI da Wave 5 é o mais alto de todas as waves; adiá-la é continuar a pagar duplicação em cada edição.

---

## 5. Sumário executivo de mudanças propostas ao draft

| Tipo | Item | Mudança |
|------|------|---------|
| Verdict | TD-004 | AGREE_WITH_CHANGES — alvo: SVG inline, não PNG optimizado |
| Verdict | TD-008 | AGREE_WITH_CHANGES — effort revisto M → L; enriquecer com argumento de escalabilidade (gap §2.4) |
| Verdict | TD-010 | AGREE_WITH_CHANGES — dark mode como variante `prefers-color-scheme`, não default |
| Verdict | TD-014 | AGREE_WITH_CHANGES — reframe como "audit pesos + preload hero font", não "reduzir famílias" |
| Verdict | TD-019 | AGREE_WITH_CHANGES — promover LOW → MEDIUM; incluir `aria-current`, focus trap, Escape key (gap §2.5) |
| Verdict | TD-021 | AGREE_WITH_CHANGES — favicon único de "Acervo", não de formação |
| Novo | TD-025 | Sidebar sem graceful degradation (`<noscript>` fallback) — MEDIUM, S |
| Novo | TD-026 | Sem performance budget (LCP/CLS/INP) — LOW, S |
| Novo | TD-027 | Mobile responsiveness não auditada (tap targets, overflow) — LOW, S |
| Novo | TD-028 | `<main>` landmark em falta nas 11 páginas — LOW, XS |
| Quick win | QW-UX-1 | `<noscript>` na sidebar — 15 min |
| Quick win | QW-UX-2 | `aria-current="page"` na sidebar — 5 min |
| Quick win | QW-UX-3 | `loading="lazy"` invertido (lazy em decorativas, eager no LCP) — 10 min |
| Strategy | — | Hybrid: tokens semânticos partilhados + themes por formação. Manter identidades. |
| Sequencing | — | Sugerir Wave 5 (design system) imediatamente após Wave 1, antes de Waves 2-4 |

---

*Documento gerado por Uma (@ux-design-expert) — Brownfield Discovery Phase 6 — 2026-05-23*
