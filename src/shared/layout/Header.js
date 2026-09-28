/**
 * Clean Topbar Header Component Renderer
 */

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-left">
        <div class="page-breadcrumb">
          <span style="color:var(--text-muted); font-size:0.82rem; font-weight:500;" id="headerOrgName">Garden Experience</span>
          <span style="color:var(--text-dim); font-size:0.8rem;">/</span>
          <span id="headerBreadcrumbCurrent" style="color:var(--text-title); font-size:0.9rem; font-weight:600;">Dashboard</span>
        </div>
      </div>

      <div class="header-right">
        <!-- Connection Status Dot -->
        <div class="connection-status-badge" style="display:flex; align-items:center; gap:0.4rem; padding:0.35rem 0.75rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-size:0.78rem; font-weight:500; color:var(--text-muted);" title="Status da Conexão Supabase">
          <span class="status-dot online" id="headerConnectionDot"></span>
          <span id="headerConnectionText">Conectado</span>
        </div>

        <!-- Global Unit Selector -->
        <div class="unit-selector-badge" style="display:flex; align-items:center; gap:0.4rem;">
          <select id="filterUnit" class="select-clean" aria-label="Filtrar por Unidade">
            <option value="all">Todas as unidades</option>
          </select>
        </div>

        <!-- Notification Bell Indicator -->
        <div id="headerNotificationBell" title="Notificações & Central de Ações" style="position:relative; cursor:pointer; padding:0.4rem 0.6rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); display:flex; align-items:center; gap:0.35rem;">
          <span style="font-size:0.85rem;">🔔</span>
          <span id="headerNotificationCount" style="font-size:0.75rem; font-weight:700; color:var(--text-title);">0</span>
        </div>

        <!-- Theme Toggle -->
        <button class="btn-theme-quick-toggle" id="btnQuickThemeToggle" title="Alternar Tema da Interface" style="background:var(--bg-card); border:1px solid var(--border-subtle); color:var(--text-main); padding:0.38rem 0.75rem; border-radius:var(--radius-md); cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.15s;">
          <span id="quickThemeIcon">🌙</span>
          <span id="quickThemeText" style="font-size:0.75rem; font-weight:600;">Escuro</span>
        </button>

        <!-- User Profile Avatar -->
        <div class="user-profile-menu" style="display:flex; align-items:center; gap:0.5rem; margin-left:0.2rem;">
          <div class="user-avatar-circle" id="userAvatarBadge">A</div>
          <span style="font-size:0.82rem; font-weight:600; color:var(--text-main);" id="headerUserName">Administrador</span>
          <select id="selectActiveOrg" style="display:none;"></select>
          <select id="filterRoleSim" style="display:none;"><option value="admin">admin</option></select>
        </div>
      </div>
    </header>
  `;
}
