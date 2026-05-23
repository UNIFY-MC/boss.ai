// Shared sidebar loader — slim version (only Formações + Referências).
// Each page must have <div id="sidebar-mount"></div> and link _shared/sidebar.css.

(function () {
  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;

  const ROOT = '/';

  const html = `
    <button class="sb-toggle" id="sb-toggle" aria-label="Abrir menu">☰</button>
    <button class="sb-reopen" id="sb-reopen" aria-label="Mostrar menu lateral" title="Mostrar menu lateral">≡</button>
    <aside class="sb-sidebar" id="sb-sidebar">
      <button class="sb-collapse" id="sb-collapse" aria-label="Ocultar menu lateral" title="Ocultar menu lateral">«</button>
      <div class="sb-brand">
        <div class="sb-brand-name">Acervo</div>
        <span class="sb-brand-sub">de Formações</span>
      </div>

      <div class="sb-search">
        <input type="search" id="sb-search" placeholder="Pesquisar…" aria-label="Pesquisar no acervo">
      </div>

      <nav class="sb-nav" aria-label="Navegação principal">
        <div class="sb-group">
          <div class="sb-group-title">Início</div>
          <a class="sb-link" href="${ROOT}">
            <span class="sb-link-icon">◇</span>
            <span class="sb-link-text">Hub do acervo</span>
          </a>
        </div>

        <div class="sb-group">
          <div class="sb-group-title">Formações</div>
          <a class="sb-link" href="${ROOT}formacoes/aiox-cohort-fundamentals/">
            <span class="sb-link-icon">●</span>
            <span class="sb-link-text">AIOX Cohort T5</span>
            <span class="sb-link-badge live">live</span>
          </a>
          <a class="sb-link" href="${ROOT}formacoes/reprise-masterclass-design-ia/">
            <span class="sb-link-icon">◆</span>
            <span class="sb-link-text">Masterclass Design</span>
            <span class="sb-link-badge done">11/05</span>
          </a>
          <a class="sb-link" href="${ROOT}formacoes/aulao-claude-code/">
            <span class="sb-link-icon">◆</span>
            <span class="sb-link-text">Aulão Claude Code</span>
            <span class="sb-link-badge done">12/05</span>
          </a>
          <a class="sb-link" href="${ROOT}formacoes/claude-code-build-day/">
            <span class="sb-link-icon">◆</span>
            <span class="sb-link-text">Build Day Porto</span>
            <span class="sb-link-badge done">09/05</span>
          </a>
        </div>

        <div class="sb-group">
          <div class="sb-group-title">Projetos · Hackathons</div>
          <a class="sb-link" href="${ROOT}projetos/">
            <span class="sb-link-icon">◇</span>
            <span class="sb-link-text">Todos os projetos</span>
          </a>
          <a class="sb-link" href="${ROOT}projetos/hackathons/milan-ai-week/">
            <span class="sb-link-icon">🇮🇹</span>
            <span class="sb-link-text">Milan AI Week</span>
            <span class="sb-link-badge">1</span>
          </a>
          <a class="sb-link" href="${ROOT}projetos/hackathons/milan-ai-week/deals-machine/">
            <span class="sb-link-icon">▶</span>
            <span class="sb-link-text">Deals Machine</span>
            <span class="sb-link-badge next">AI</span>
          </a>
          <a class="sb-link" href="${ROOT}projetos/hackathons/milan-ai-week/deals-machine/how-to-replicate/" style="padding-left:42px;font-size:12px;">
            <span class="sb-link-icon">↳</span>
            <span class="sb-link-text">Como replicar</span>
          </a>
          <a class="sb-link" href="${ROOT}projetos/hackathons/milan-ai-week/deals-machine/github-snapshot/" style="padding-left:42px;font-size:12px;">
            <span class="sb-link-icon">↳</span>
            <span class="sb-link-text">Repo (snapshot)</span>
          </a>
        </div>

        <div class="sb-group">
          <div class="sb-group-title">Referências</div>
          <a class="sb-link" href="${ROOT}#ref-design-system">
            <span class="sb-link-icon">◌</span>
            <span class="sb-link-text">Design System</span>
            <span class="sb-link-badge">8</span>
          </a>
          <a class="sb-link" href="${ROOT}#ref-scraping">
            <span class="sb-link-icon">◌</span>
            <span class="sb-link-text">Scraping &amp; Web Data</span>
            <span class="sb-link-badge">1</span>
          </a>
        </div>
      </nav>
    </aside>
    <div class="sb-backdrop" id="sb-backdrop"></div>
  `;

  mount.innerHTML = html;

  const sidebar = document.getElementById('sb-sidebar');
  const toggle = document.getElementById('sb-toggle');
  const backdrop = document.getElementById('sb-backdrop');
  const search = document.getElementById('sb-search');
  const collapse = document.getElementById('sb-collapse');
  const reopen = document.getElementById('sb-reopen');
  const links = Array.from(sidebar.querySelectorAll('.sb-link'));
  const groups = Array.from(sidebar.querySelectorAll('.sb-group'));

  // Restore collapsed state from localStorage
  if (localStorage.getItem('acervo-sb-collapsed') === '1') {
    document.body.classList.add('sb-collapsed');
  }

  collapse.addEventListener('click', () => {
    document.body.classList.add('sb-collapsed');
    localStorage.setItem('acervo-sb-collapsed', '1');
  });
  reopen.addEventListener('click', () => {
    document.body.classList.remove('sb-collapsed');
    localStorage.removeItem('acervo-sb-collapsed');
  });

  const close = () => sidebar.classList.remove('open');
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  backdrop.addEventListener('click', close);
  links.forEach(l => l.addEventListener('click', () => {
    if (window.innerWidth <= 1000) close();
  }));

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    links.forEach(l => {
      const text = l.textContent.toLowerCase();
      l.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
    groups.forEach(g => {
      const anyVisible = Array.from(g.querySelectorAll('.sb-link'))
        .some(l => l.style.display !== 'none');
      g.style.display = anyVisible ? '' : 'none';
    });
  });

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  links.forEach(l => {
    const href = l.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    const cleanHref = href.split('#')[0].replace(/\/$/, '') || '/';
    if (cleanHref === currentPath) l.classList.add('active');
  });
})();
