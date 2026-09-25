/**
 * Premium SaaS Sidebar Navigation Component Renderer
 */

export function renderSidebar() {
  return `
    <aside class="app-sidebar">
      <div class="sidebar-header">
        <a href="javascript:void(0)" class="brand-badge" id="brandHomeLink">
          <div class="logo-icon">G</div>
          <div>
            <span class="brand-title">Garden Experience</span>
            <span class="brand-subtitle">Customer Experience SaaS</span>
          </div>
        </a>
      </div>

      <nav class="sidebar-nav" id="mainSidebarNav">
        <div class="nav-section-title">VISÃO GERAL</div>
        <button class="nav-item active" data-mod="mod-dash">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span>Dashboard</span>
          </div>
        </button>

        <div class="nav-section-title">EXPERIÊNCIA</div>
        <button class="nav-item" data-mod="mod-responses">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>Respostas</span>
          </div>
        </button>

        <button class="nav-item" data-mod="mod-cases">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 3-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Acompanhamentos</span>
          </div>
          <span class="sidebar-badge" id="sidebarPendingBadge">0</span>
        </button>

        <button class="nav-item" data-mod="mod-student-evolution">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span>Evolução dos Alunos</span>
          </div>
        </button>

        <button class="nav-item" data-mod="mod-touchpoints">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>Pontos de Contato</span>
          </div>
        </button>

        <div class="nav-section-title">ANALYTICS</div>
        <button class="nav-item" data-mod="mod-reports">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Relatórios</span>
          </div>
        </button>

        <div class="nav-section-title">OPERAÇÃO</div>
        <button class="nav-item" data-mod="mod-surveys">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Pesquisas</span>
          </div>
        </button>

        <button class="nav-item" id="btnNavQrModalTrigger">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>QR Codes</span>
          </div>
        </button>

        <button class="nav-item" data-mod="mod-devices">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span>Dispositivos</span>
          </div>
        </button>

        <div class="nav-section-title">CONFIGURAÇÃO</div>
        <button class="nav-item" data-mod="mod-config">
          <div class="nav-item-left">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Configurações</span>
          </div>
        </button>
      </nav>

      <div class="sidebar-footer" style="padding-top:0.75rem; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.72rem; color:var(--text-dim); font-weight:600;">Garden Experience</span>
        <span style="font-size:0.72rem; color:var(--gold-primary); font-weight:700;">v1.4.6</span>
      </div>
    </aside>
  `;
}
