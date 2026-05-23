# Brownfield Discovery Context — boss.ai

**Data:** 2026-05-23
**Iniciado por:** Mário Carvalho (via @aiox-master, YOLO mode)
**Escopo:** total (framework AIOX + acervo-formacoes)

## Briefing partilhado por todos os agentes

### Project root
`C:\Users\mario\dev\boss.ai`

### Output directory
`docs/brownfield/` (todos os ficheiros vão aqui)

### Componentes a analisar

1. **Framework AIOX** em `.aiox-core/` (v5.2.9, instalado de @aiox-squads/core)
   - 12 agentes (.aiox-core/development/agents/)
   - CLI em .aiox-core/cli/
   - Configurações em core-config.yaml
   - **NÃO modificar** (.claude/settings.json tem deny rules para L1/L2)

2. **acervo-formacoes/** — site estático HTML/CSS/JS, deploy Vercel
   - 4 formações arquivadas (HTML puro, sem framework JS)
   - Tailwind CDN, Google Fonts, sem build step
   - Headers de segurança configurados (CSP, HSTS, etc — recém-adicionados)

3. **Configs por IDE** — `.claude/`, `.codex/`, `.gemini/`, `.cursor/`, `.kimi/`, `.antigravity/`
   - Sincronizados via aiox ideSync
   - 19 skills, 22 commands, 11 rules no Claude Code

### O que NÃO existe (não precisa de scan)

- **Sem base de dados** — nem Supabase nem outra. `.env` tem SUPABASE_* mas vazios
- **Sem backend/API** — só HTML estático em produção
- **Sem test suite** — não há `tests/`, `vitest`, `jest` configs
- **Sem build step** no acervo (HTML+CDN)
- **Sem `docs/stories/`, `docs/prd/`** — workflows AIOX são lazy-created

### Contexto recente (Git)

- Repo inicializado hoje (2026-05-23), branch `main`
- 4 commits até agora:
  - `63aad64` initial commit (1383 ficheiros)
  - `e33b0e2` CI workflow
  - `d34b641` fix CI YAML validator
  - `5fc6471` security headers acervo
  - `7d339d3` align core-config + AGENTS.md
  - `9e326a3` deny rules AIOX framework
- CI **verde** em todos os jobs (gitleaks, YAML validation, HTMLHint)

### Auditoria já feita (NÃO repetir)

O @aiox-master já fez uma audit pass. Estão pendentes (médio/baixo prioridade):
- Dark mode em acervo-formacoes
- Materiais privados em Drive externo
- 7 directorias de IDE configuradas (drift potencial)

### Convenções de output

- Cada agente escreve no path indicado no seu prompt individual
- Português de Portugal
- Markdown bem estruturado com TOC quando o documento for > 500 linhas
- Citar paths concretos (`file:line`) sempre que possível
