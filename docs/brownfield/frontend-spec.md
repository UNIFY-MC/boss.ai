# Frontend Spec — `acervo-formacoes/`

**Agente:** Uma (`@ux-design-expert`)
**Data:** 2026-05-23
**Escopo:** `acervo-formacoes/` (site estático HTML/CSS/JS, deploy Vercel)
**Tipo de análise:** Brownfield Discovery — Phase 3
**Idioma:** PT-PT

---

## Índice

1. [Resumo do produto](#1-resumo-do-produto)
2. [Inventário de páginas](#2-inventário-de-páginas)
3. [Design system observado](#3-design-system-observado)
4. [Arquitectura HTML](#4-arquitectura-html)
5. [Acessibilidade (auditoria rápida)](#5-acessibilidade-auditoria-rápida)
6. [Performance](#6-performance)
7. [SEO / Robots](#7-seo--robots)
8. [Inconsistências detectadas](#8-inconsistências-detectadas)
9. [Recomendações prioritizadas](#9-recomendações-prioritizadas)
10. [Apêndice — Matriz de tokens por formação](#10-apêndice--matriz-de-tokens-por-formação)

---

## 1. Resumo do produto

`acervo-formacoes/` é um **arquivo pessoal de formações assistidas por Mário Carvalho** (Property 007, Lda.), publicado em Vercel com headers de segurança apertados (CSP, HSTS, `X-Robots-Tag: noindex,nofollow`). É um site estático em PT-PT, sem build step, sem backend, sem base de dados — apenas HTML/CSS/JS vanilla servido como histórico permanente para que o material das formações sobreviva mesmo que o organizador original retire o acesso. O hub (`index.html`) lista 4 formações arquivadas (Aulão Claude Code, Reprise Masterclass Design IA, AIOX Cohort Fundamentals, Claude Code Build Day) e mantém uma secção de "Referências por tema" com bookmarks curados. Cada formação tem o seu próprio sub-site, com layout e identidade visual replicados do contexto original (LegalCode, Academia Lendária, KopkAI) — o que gera fragmentação visual deliberada (cada arquivo "preserva" a marca da fonte) mas tem custos de manutenção e coerência.

---

## 2. Inventário de páginas

| # | Caminho | Tamanho | Idioma `<html>` | Tema | Tipografia | Framework |
|---|---------|---------|-----------------|------|------------|-----------|
| 1 | `acervo-formacoes/index.html` | 33 KB | `pt-PT` | Light (cream) | Playfair / Lora / Inter | Vanilla |
| 2 | `formacoes/aulao-claude-code/index.html` | 57 KB | **`pt-BR`** ❌ | Light (cream) | Playfair / Lora / Inter | Vanilla |
| 3 | `formacoes/reprise-masterclass-design-ia/index.html` | 22 KB | `pt-PT` | Dark + Limon (#d1ff00) | Geist + Geist Mono | Vanilla |
| 4 | `formacoes/aiox-cohort-fundamentals/index.html` | 53 KB | `pt-PT` | Dark + Limon (#d1ff00) | Geist + Geist Mono | Vanilla |
| 5 | `formacoes/aiox-cohort-fundamentals/aula-01/index.html` | 14 KB | `pt-PT` | Dark + Limon | Geist | Vanilla |
| 6 | `formacoes/aiox-cohort-fundamentals/aula-02/index.html` | 16 KB | `pt-PT` | Dark + Limon | Geist | Vanilla |
| 7 | `formacoes/claude-code-build-day/index.html` | 19 KB | **`pt`** ⚠️ | Dark + Cyan (#7eeaea) | Syne + Space Mono | Tailwind CDN |
| 8 | `formacoes/claude-code-build-day/materiais/index.html` | 10 KB | `pt` | Dark + Cyan | Syne + Space Mono | Tailwind CDN |
| 9 | `formacoes/claude-code-build-day/ferramentas/index.html` | 52 KB | `pt` | Dark + Cyan | Syne + Space Mono | Tailwind CDN |
| 10 | `formacoes/claude-code-build-day/toolkit/index.html` | 11 KB | `pt` | Dark + Cyan | Syne + Space Mono | Tailwind CDN |
| 11 | `formacoes/claude-code-build-day/recursos/index.html` | 31 KB | `pt` | Dark + Cyan | Syne + Space Mono | Tailwind CDN |

**Partilhado** (`_shared/`): `sidebar.css` (5,2 KB), `sidebar.js` (5,2 KB), `page-toc.css` (1,9 KB)
**Assets estáticos:** `claude-code-build-day/assets/logo.png` **(788 KB)** ⚠️, `favicon.png` (43 KB), `aiox-cohort-fundamentals/assets/logo.svg` (6,5 KB)

---

## 3. Design system observado

Não existe um design system formal. O que existe é a **união de três sub-design systems**, cada um com a sua identidade. A única camada partilhada são as variáveis CSS da sidebar (`_shared/sidebar.css`), que aceita tokens injectados pelas variáveis CSS de cada página.

### 3.1 Hub (`index.html`) — "Legora-style" (claro)

Inspirado no design system "Legora" (declarado explicitamente em `aulao-claude-code/index.html:17`).

#### Paleta

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-inkwell-black` | `#000000` | Texto forte, hero |
| `--color-canvas-white` | `#fefefc` | Background principal |
| `--color-text-gray` | `#0a0a0a` | Texto corrente |
| `--color-pale-ash` | `#ebf5ed` | Background de blocos secundários (toolbar, referências) |
| `--color-shadowstone-gray` | `#6b6b6b` | Labels, meta |
| `--color-whisper-gray` | `#444444` | Texto auxiliar |
| `--color-parchment-tan` | `#e1d5b6` | Accent (badge hero, hover sidebar) |
| `--color-sky-tint` | `#bdd4f0` | (declarado, não usado activamente) |
| `--color-steel-blue` | `#98a7aa` | Subtítulo hero |

#### Tipografia

- `--font-display`: `'Playfair Display', 'Lora', Georgia, serif` — H1, valores de estatísticas
- `--font-heading`: `'Lora', Georgia, serif` — H2/H3, brand
- `--font-body`: `'Inter', -apple-system, …, sans-serif` — corpo

Pesos carregados: Inter 400/500, Lora 300/400, Playfair 400/700. Display swap activo.

Escala (estimada):

| Token | Tamanho | Onde |
|-------|---------|------|
| Hero H1 | `clamp(40px, 6vw, 64px)` | `.hero h1` |
| Section title | `clamp(28px, 4vw, 36px)` | `.section-title` |
| Card H3 | `22px` | `.formacao-card h3` |
| Body | `16px` (base) | `body` |
| Meta label | `10–11px` uppercase 0.06–0.08em letter-spacing | `.formacao-meta-label`, `.section-label` |

#### Radius e spacing

- `--radius-cards: 8px` (cards, ref-link)
- `--radius-buttons: 2px` (chips, inputs, badge)
- Container: `max-width: 1080px; padding: 0 24px`
- Section gap: `80px`
- Card padding: `28px`

### 3.2 Reprise + AIOX Cohort — "AIOX Kinetic Limon" (escuro)

Declarado em `reprise-masterclass-design-ia/index.html:18-67` e replicado quase à letra em `aiox-cohort-fundamentals/index.html:17-69`. Curiosidade: ambos definem primeiro tokens "gold/cream" (`#c9b298`, `#f3eee6`) e depois sobrescrevem-nos com tokens "Limon" (`#d1ff00`) — código morto que confunde quem mantenha.

#### Paleta efectiva

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#09090a` | Background principal |
| `--bg-deep` | `#000` | Background hero |
| `--bg-elev` | `#121213` | Cards, sidebar |
| `--text` | `#f4f4f4` | Texto |
| `--text-mid` | `rgba(244,244,244,0.65)` | Texto secundário |
| `--text-dim` | `rgba(245,244,231,0.4)` | Meta |
| `--gold` / `--gold-bright` | `#d1ff00` (Limon) | Accent, links, brand |
| `--border` | `rgba(255,255,255,0.09)` | Bordas |

#### Tipografia

- `--font-display`, `--font-body`: ambos `'Geist', sans-serif` (carrega 7 pesos: 300–900)
- `Geist Mono` carregado mas pouco usado

#### Radius

- `10px` para painéis (TOC), `2px` para badges, `8px` para cards

### 3.3 Claude Code Build Day — "KopkAI Cyan" (escuro, Tailwind)

Único subsite com **Tailwind CDN** (`https://cdn.tailwindcss.com`) e config inline.

#### Paleta (Tailwind extend)

| Token | Valor | Uso |
|-------|-------|-----|
| `background` | `#000` | Body |
| `foreground` | `#fff` | Texto |
| `cyan` | `#7eeaea` | Accent principal |
| `cyan.dim` | `#3aadad` | Accent secundário |
| `cyan.bright` | `#b8f5f5` | Hover |
| `surface` | `#111` | Cards |
| `surface.alt` | `#0a0a0a` | Cards alt |
| `border` | `#222` | Bordas |
| `border.dim` | `#1a2a2a` | Bordas dim |
| `muted` | `#888` | Meta |

#### Tipografia

- `font-display`: `'Syne', sans-serif` — títulos
- `font-mono`: `'Space Mono', monospace` — body (!) e meta

### 3.4 Resumo agregado — **6 famílias tipográficas**

`Inter`, `Lora`, `Playfair Display`, `Geist` (+ `Geist Mono`), `Space Mono`, `Syne`.
**Custo de rede combinado:** ~12 famílias/pesos diferentes carregadas do Google Fonts entre páginas.

---

## 4. Arquitectura HTML

### 4.1 Padrão de sidebar partilhado

- Cada página tem `<div id="sidebar-mount"></div>` no início do `<body>` e carrega `_shared/sidebar.js` no fim (com `defer`).
- O script injecta a sidebar inteira (HTML + CSS via classes pré-definidas em `_shared/sidebar.css`) e gere:
  - Estado colapsado (persistido em `localStorage` com a chave `acervo-sb-collapsed`)
  - Drawer mobile (toggle abaixo de 1000px de viewport)
  - Pesquisa local (filtra `.sb-link` por texto)
  - Marca `active` por correspondência de `window.location.pathname`
- A sidebar lê os seus próprios tokens (`--sb-bg`, `--sb-fg`, `--sb-accent`, etc.) das variáveis CSS da página parent — assim adapta-se automaticamente ao tema claro (hub) ou escuro (formações).

### 4.2 Estrutura por formação

| Formação | Sub-páginas | Padrão |
|----------|-------------|--------|
| `aulao-claude-code/` | apenas `index.html` | Hero + secções "Sobre"/"Conteúdo"/"Instrutora" no estilo Legora |
| `reprise-masterclass-design-ia/` | apenas `index.html` | Hero escuro + TOC lateral direita + corpo |
| `aiox-cohort-fundamentals/` | `index.html`, `aula-01/`, `aula-02/` | Hub do cohort + uma sub-página por aula com notas |
| `claude-code-build-day/` | `index.html` (hub) + `materiais/`, `ferramentas/`, `toolkit/`, `recursos/` | Hub + 4 sub-páginas tematizadas em grid 2x2 |

### 4.3 Build & deploy

- **Sem build step**, sem `package.json`, sem npm/yarn/pnpm.
- **Tailwind via CDN** apenas em `claude-code-build-day/` (`https://cdn.tailwindcss.com` — Tailwind Play CDN, ~3 MB JIT bundle).
- **Google Fonts via CDN** em todas as páginas (com `preconnect` correcto para `fonts.googleapis.com` e `fonts.gstatic.com`).
- **Deploy:** Vercel, com `cleanUrls: true`, `trailingSlash: true` e headers de segurança fortes (`vercel.json`).

### 4.4 Headers de segurança (em vigor)

Configurados em `vercel.json:5-21`:

- `X-Robots-Tag: noindex, nofollow` — intencional, conteúdo privado
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Content-Security-Policy`: permite `'self'`, `'unsafe-inline'` para scripts/styles, `cdn.tailwindcss.com`, Google Fonts; `object-src 'none'`, `frame-ancestors 'none'`

**Observação:** `'unsafe-inline'` em `script-src` é necessário porque há lógica inline em `index.html:902-947` e nas páginas Build Day; remover passaria por extrair tudo para ficheiros separados.

---

## 5. Acessibilidade (auditoria rápida)

### 5.1 `<html lang>` — **3 inconsistências**

| Página | `lang` | Avaliação |
|--------|--------|-----------|
| Hub, aiox-cohort (3), reprise | `pt-PT` | ✅ Correcto |
| `aulao-claude-code/index.html:2` | **`pt-BR`** | ❌ Erro — o site é PT-PT, não PT-BR |
| Build Day (5 páginas) | **`pt`** | ⚠️ Genérico — deveria ser `pt-PT` |

### 5.2 Alt text em imagens

- **Total de `<img>` encontrados:** 6 (todos em Build Day) — todos com `alt="Logo"`.
- `alt="Logo"` é tecnicamente válido mas pouco descritivo. Deveria ser `"Claude Code Build Day — logótipo"` ou similar. Como o logo é decorativo dentro de um `<a>` cuja contraparte de texto já anuncia "Claude Code Build Day", `alt=""` seria aceitável segundo WCAG (imagens decorativas).
- **Outros gráficos:** As ilustrações SVG inline (cards do hub Build Day) **não têm** `<title>` nem `aria-label` — são puramente decorativas e isso é defensável, mas deveriam ter `aria-hidden="true"` explícito.

### 5.3 Hierarquia de headings

- 93 ocorrências `<h1>` a `<h6>` em 11 ficheiros (média ~8 por página).
- O hub tem **1 `<h1>`** (correcto). `aulao-claude-code/index.html` tem **44 headings** distribuídos em vários níveis — provável uso correcto mas merece auditoria semântica (saltos H1→H3 sem H2 são comuns em hero-driven layouts).
- Não confirmado: ordem semântica (auditoria detalhada com axe-core ficaria fora do âmbito desta análise).

### 5.4 Contraste de cores (estimativa pelos tokens)

| Combinação | Ratio aproximado | WCAG AA (4.5:1) |
|------------|------------------|-----------------|
| `#0a0a0a` sobre `#fefefc` (hub body) | ~20:1 | ✅ |
| `#444` (`--whisper-gray`) sobre `#fefefc` | ~9:1 | ✅ |
| `#6b6b6b` (`--shadowstone-gray`) sobre `#fefefc` | ~5.7:1 | ✅ |
| `#f4f4f4` sobre `#09090a` (AIOX dark) | ~18:1 | ✅ |
| `rgba(244,244,244,0.65)` sobre `#09090a` (text-mid) | ~9.5:1 | ✅ |
| `rgba(245,244,231,0.4)` sobre `#09090a` (text-dim) | ~5.5:1 | ✅ |
| `#888` sobre `#000` (Build Day muted) | ~5.9:1 | ✅ |
| `#7eeaea` (cyan) sobre `#000` | ~12:1 | ✅ |
| `#d1ff00` (Limon) sobre `#09090a` | ~17:1 | ✅ |
| `#e1d5b6` (parchment-tan) sobre `#000000` (badge hero hub) | ~12:1 | ✅ |

**Risco de contraste baixo:** badges/CTAs com `--text-dim` (`0.4` opacity) em hover sobre superfícies elevadas — auditar caso a caso.

### 5.5 `prefers-color-scheme`

**Não suportado.** Procura por `prefers-color-scheme`, `dark-mode`, `data-theme` retorna **0 resultados** em todo `acervo-formacoes/`. O hub é fixamente claro; cada formação fixa o seu tema (claro ou escuro). Era pendente já identificado pelo @aiox-master no contexto.

### 5.6 Outros pontos de acessibilidade

- `aria-label` presente em inputs de pesquisa (hub e sidebar): ✅
- `role="tablist"` declarado nos filtros do hub (`index.html:638`) mas os botões não têm `role="tab"`/`aria-selected` — ⚠️ implementação parcial.
- `aria-disabled="true"` no CTA do card "upcoming" (`index.html:791`): ✅
- Botões da sidebar (`sb-toggle`, `sb-collapse`, `sb-reopen`) têm `aria-label`: ✅
- **Sem skip-link** ("ir para conteúdo") em nenhuma página: ⚠️
- Focus styles nativos do browser são mantidos (`outline: none` apenas em inputs com `border-color` como substituto — deveria usar `:focus-visible` com outline explícito): ⚠️

---

## 6. Performance

### 6.1 Recursos críticos

| Recurso | Tamanho | Impacto |
|---------|---------|---------|
| `claude-code-build-day/assets/logo.png` | **788 KB** | ❌ **Crítico** — logo de 32x32 com 788 KB. PNG não optimizado, provável captura em resolução excessiva. LCP risk no header de Build Day. |
| Tailwind CDN (Play) | ~3 MB JIT | ⚠️ Apenas no `claude-code-build-day/`. Não usa purge — todo o CSS gerado runtime. |
| Google Fonts (hub, aulão, reprise) | 3 famílias (Inter+Lora+Playfair) ou 1 família com 7 pesos (Geist) | ⚠️ Aceitável com `display=swap`, mas pesos a mais (300/400/500/600/700/800/900 em Geist é excessivo) |
| Google Fonts (Build Day) | Syne + Space Mono | ✅ Conjunto leve |
| `aulao-claude-code/index.html` | 57 KB | ⚠️ Maior ficheiro HTML — todo o CSS está inline |
| `claude-code-build-day/ferramentas/index.html` | 52 KB | ⚠️ Conteúdo extenso em uma única página |

### 6.2 LCP risk

- **Hub (`index.html`):** LCP provável = `.hero h1` (texto puro, Playfair 400). Sem imagens, sem hero image — risco baixo. ✅
- **Build Day (`index.html`):** LCP provável = `logo.png` (788 KB!) ou `h2` "Hub de Recursos". Optimizar o logo é mandatório.
- **AIOX Cohort/Reprise:** sem imagens hero, LCP = texto (Geist). Risco baixo, mas Geist em 7 pesos atrasa first-paint do texto.

### 6.3 Outros pontos

- `<link rel="preconnect">` para `fonts.googleapis.com` e `fonts.gstatic.com` em todas as páginas: ✅
- Sem `loading="lazy"` em imagens (excepto `logo.png` no Build Day, que tem `loading="lazy"` — irónico porque é o LCP).
- Sem `<picture>` / WebP / AVIF — todos os assets são PNG.
- Sem `font-display: swap` explícito no `@font-face` (delegado ao Google Fonts via `&display=swap` na URL): ✅
- JavaScript inline com `defer` apenas no Build Day. No hub e nas restantes páginas, scripts inline são executados síncronos no final do `<body>` — aceitável dado o tamanho mínimo.
- Sem service worker, sem cache HTTP customizado (delegado às defaults do Vercel CDN).

---

## 7. SEO / Robots

| Aspecto | Estado |
|---------|--------|
| `X-Robots-Tag: noindex, nofollow` | ✅ Configurado em `vercel.json:9` (intencional — conteúdo privado) |
| `<meta name="robots" content="noindex, nofollow">` | ⚠️ Apenas em `aiox-cohort-fundamentals/aula-01/index.html:8` e `reprise-masterclass-design-ia/index.html:8`. Inconsistente entre páginas (redundante, mas serve de cinto de segurança caso o header HTTP não seja servido) |
| `sitemap.xml` | ❌ Inexistente (consistente com a intenção de não indexar) |
| `robots.txt` | ❌ Inexistente (deveria existir com `User-agent: * Disallow: /` para reforçar) |
| Open Graph (`og:title`, `og:image`, etc.) | ❌ Inexistente em todas as páginas |
| Twitter Cards | ❌ Inexistente |
| `<meta name="description">` | ✅ Presente em todas as páginas analisadas |
| Canonical URLs | ❌ Inexistente |
| Favicon | ⚠️ Apenas Build Day tem (`./assets/favicon.png`, 43 KB — também grande para um favicon) |

**Conclusão SEO:** O site é deliberadamente privado e o `noindex` está bem implementado ao nível do header. Open Graph não é necessário para conteúdo privado, mas seria útil para quando o link é partilhado via Slack/WhatsApp (ficaria com preview rico). A ausência de favicon nas páginas que não são Build Day é uma falha menor de polish.

---

## 8. Inconsistências detectadas

Esta secção lista divergências concretas entre páginas — cada formação herdou o design system da fonte original, o que cria fragmentação visual deliberada mas com custos.

### 8.1 Idioma do `<html>`

- Hub: `pt-PT` ✅
- Reprise: `pt-PT` ✅
- AIOX Cohort (3 páginas): `pt-PT` ✅
- **Aulão Claude Code: `pt-BR`** ❌ — viola directrizes globais ("Sempre Português de Portugal")
- **Build Day (5 páginas): `pt`** ⚠️ — falta o region tag

### 8.2 Design tokens — três paletas e tipografias completamente disjuntas

Não há overlap útil entre as paletas: o que numa formação é "accent" (cyan) noutra é fundo (cinzento). Não há token semântico partilhado (`--accent`, `--bg-elevated`) — cada formação reinventa o vocabulário.

### 8.3 Famílias tipográficas — 6 distintas

`Inter`, `Lora`, `Playfair Display`, `Geist`, `Space Mono`, `Syne`. Mesmo descontando `Inter` (sistema de fallback), são **5 famílias display/heading** diferentes — pouco coerente para um "acervo único".

### 8.4 Frameworks CSS

- **9 de 11 páginas:** Vanilla CSS inline
- **5 páginas (Build Day inteiro):** Tailwind CDN + Tailwind config inline + CSS inline complementar (`bg-cyan/10` etc. são re-declarados em vanilla porque a CDN Play tem limitações de opacity modifiers)

### 8.5 Código morto nos tokens AIOX

Em `aiox-cohort-fundamentals/index.html:17-50` e `reprise-masterclass-design-ia/index.html:18-49`: o `:root` declara primeiro os tokens "gold/cream/Cormorant Garamond" e depois sobrescreve-os com tokens "Limon/Geist". Os tokens iniciais nunca chegam a ser usados — pegadas de uma migração anterior. Confunde quem leia o ficheiro.

### 8.6 Estilos inline `onmouseover`/`onmouseout`

Em `index.html:595-597`: três links têm handlers `onmouseover` / `onmouseout` inline para trocar cor. Padrão obsoleto — deveria ser CSS `:hover`. Também impede CSP estrita (já está aberta com `'unsafe-inline'`).

### 8.7 TOC (page-toc.css) acoplado a tokens de tema escuro

`_shared/page-toc.css:24` usa `var(--gold, #c9b298)` como fallback (tema escuro com gold), mas é "shared". Se algum dia for usado no hub claro, o fallback `#c9b298` não combina com a paleta clara. Tokens partilhados deveriam ser **agnósticos** ou ter fallbacks neutros (cinzentos).

### 8.8 `robots` meta tag inconsistente

Presente em 2 das 11 páginas. Não é bloqueante (o header HTTP cobre todo o domínio) mas é prova de inconsistência editorial.

### 8.9 Tamanhos de assets fora de padrão

- `logo.png` Build Day: **788 KB** para um logótipo 32x32 renderizado no header. Provável export sem optimização do Figma.
- `favicon.png` Build Day: 43 KB — favicons devem rondar 1-4 KB.

### 8.10 Logo SVG vs PNG

- AIOX Cohort usa SVG (`logo.svg`, 6,5 KB) ✅
- Build Day usa PNG (`logo.png`, 788 KB) ❌

Inconsistência de formato e de bom senso.

---

## 9. Recomendações prioritizadas

Cada recomendação é classificada por **prioridade** (P0 bloqueante / P1 alta / P2 média / P3 baixa) e por **esforço estimado** (XS/S/M/L).

### P0 — Crítico

**R1. Corrigir `lang` em `aulao-claude-code/` (5 min) — XS**
- Trocar `pt-BR` para `pt-PT` em `acervo-formacoes/formacoes/aulao-claude-code/index.html:2`.
- Viola a directriz global "Sempre Português de Portugal" do Mário.

**R2. Optimizar `claude-code-build-day/assets/logo.png` (15 min) — S**
- 788 KB → alvo: < 20 KB.
- Acções: (a) exportar SVG do logo original, ou (b) exportar PNG 64x64 @2x optimizado com `pngquant`/`oxipng`. Idealmente migrar para SVG inline (alinha com AIOX Cohort).
- Impacto directo no LCP da página mais visitada do sub-site (hub Build Day) + nas 4 sub-páginas que partilham o mesmo logo.

### P1 — Alta

**R3. Uniformizar `lang` para `pt-PT` no Build Day (5 min) — XS**
- Trocar `lang="pt"` para `lang="pt-PT"` nos 5 ficheiros HTML do Build Day.

**R4. Extrair design tokens para um `_shared/tokens.css` (1-2 h) — M**
- Criar três temas como CSS layers ou data-attributes (`data-theme="legora"` / `data-theme="aiox"` / `data-theme="kopkai"`).
- Manter o vocabulário semântico (`--accent`, `--bg`, `--bg-elev`, `--text`, `--text-mid`) consistente entre temas.
- Reduz duplicação (cada página declara hoje ~50 linhas de `:root`).
- Sidebar passa a ler tokens semânticos em vez de `--sb-*` específicos.

**R5. Implementar dark mode opcional para o hub (2-3 h) — M**
- Pendente já identificado pelo @aiox-master.
- Adicionar `prefers-color-scheme: dark` ou um toggle manual com persistência em `localStorage` (mesmo padrão da sidebar colapsada).
- O hub é hoje o único ecrã claro; alinhá-lo com o tema escuro das formações tornaria o salto entre páginas menos abrupto.

### P2 — Média

**R6. Reduzir o catálogo tipográfico (1 h) — S**
- Decisão estratégica: assumir uma família "do acervo" (proposta: Geist) e usar Playfair/Lora/Syne **apenas** dentro do conteúdo replicado das fontes originais.
- Alternativa pragmática: manter as 6 famílias mas declarar `font-display: swap` consistentemente e remover pesos não usados (Geist carrega 300-900, usa só 4-5 pesos).

**R7. Adicionar `<meta name="robots" content="noindex, nofollow">` em todas as páginas (10 min) — XS**
- Redundante com o header HTTP mas elimina inconsistência editorial.
- Ou remover das 2 páginas onde está, para consistência inversa.

**R8. Limpar tokens "gold/cream" mortos em AIOX Cohort/Reprise (15 min) — XS**
- Remover linhas 17-32 do `:root` em `aiox-cohort-fundamentals/index.html` e linhas 18-32 em `reprise-masterclass-design-ia/index.html` (e respectivos aula-01, aula-02). Ficam só os tokens Limon usados.

**R9. Substituir `onmouseover`/`onmouseout` inline por CSS `:hover` (10 min) — XS**
- `index.html:595-597`. Limpa o HTML e abre caminho para CSP mais apertada no futuro (remover `'unsafe-inline'` de `script-src`).

**R10. Adicionar skip-link "Ir para conteúdo" em todas as páginas (30 min) — S**
- WCAG 2.1 §2.4.1. Útil sobretudo no hub onde a sidebar tem ~10 links antes do conteúdo.

### P3 — Baixa

**R11. Adicionar `:focus-visible` global (15 min) — XS**
- Substituir `outline: none` + `border-color` por `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`. Garante feedback de foco para teclado/leitor.

**R12. Migrar Tailwind CDN para Tailwind compilado no Build Day (4-6 h) — L**
- Apenas se o site crescer ou se a performance no Build Day se tornar problemática.
- Exigiria introduzir build step (npm + tailwindcss) — perde o "sem build step" como princípio.
- **Alternativa preferida:** manter CDN, dado o escopo limitado e a natureza arquivística.

**R13. Adicionar Open Graph meta tags em todas as páginas (1 h) — S**
- Não para SEO público (o site é `noindex`), mas para previews ricos quando o link é partilhado em Slack/WhatsApp/Notion.
- 1 imagem OG genérica + título/descrição por página.

**R14. Adicionar `robots.txt` (5 min) — XS**
- `User-agent: * \n Disallow: /`. Cinto-de-segurança redundante mas standard.

---

## 10. Apêndice — Matriz de tokens por formação

### 10.1 Cores principais

| Token semântico | Hub (Legora) | Aulão (Legora) | Reprise (AIOX) | AIOX Cohort | Build Day (KopkAI) |
|-----------------|--------------|----------------|----------------|-------------|---------------------|
| Background base | `#fefefc` | `#fefefc` | `#09090a` | `#09090a` | `#000` |
| Background elevado | `#ebf5ed` | `#ebf5ed` | `#121213` | `#121213` | `#111` |
| Texto principal | `#0a0a0a` | `#0a0a0a` | `#f4f4f4` | `#f4f4f4` | `#fff` |
| Texto secundário | `#444444` | `#444444` | rgba(244,244,244,0.65) | rgba(244,244,244,0.65) | `#888` |
| Accent | `#e1d5b6` (parchment) | `#e1d5b6` | `#d1ff00` (Limon) | `#d1ff00` | `#7eeaea` (cyan) |
| Border | rgba(0,0,0,0.06-0.08) | rgba(0,0,0,0.06-0.08) | rgba(255,255,255,0.09) | rgba(255,255,255,0.09) | `#222` |
| Radius (cards) | 8px | 8px | 10px | 10px | 16px (`rounded-2xl`) |
| Radius (botões) | 2px | 2px | 2px | 2px | 4-8px |

### 10.2 Tipografia

| Função | Hub | Aulão | Reprise | AIOX Cohort | Build Day |
|--------|-----|-------|---------|-------------|-----------|
| Display (H1) | Playfair Display | Playfair Display | Geist | Geist | Syne |
| Heading (H2/H3) | Lora | Lora | Geist | Geist | Syne |
| Body | Inter | Inter | Geist | Geist | **Space Mono** (!) |
| Mono | — | — | Geist Mono | Geist Mono | Space Mono |
| Pesos carregados | 5 (300/400/500/700) | 5 | 7 (300-900) | 7 | 5 (Syne 400-800 + Space Mono 400/700) |

### 10.3 Layout

| Métrica | Hub | Aulão | Reprise | AIOX Cohort | Build Day |
|---------|-----|-------|---------|-------------|-----------|
| Container max-width | 1080px | 1080px | 1100px | 1100px | 1280px (`max-w-6xl`) / 1024px (`max-w-5xl`) |
| Container padding-x | 24px | 24px | 24px | 24px | 24px (`px-6`) |
| Sidebar width | 280px (shared) | 280px | 280px | 280px | 280px |
| Section gap | 80px | 80px | 80-100px | 80-100px | `py-12` (48px) / `py-6` (24px) |

---

**Próximos passos sugeridos para Phase 4 (technical-debt draft):**
- Trazer R1, R2, R3 para a lista de débito imediato.
- R4 (extracção de tokens) é o item de maior alavancagem para a manutenibilidade futura — vale uma story dedicada.
- R5 (dark mode no hub) cruza-se com o pendente já anotado pelo @aiox-master.
