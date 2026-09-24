/**
 * Clean Topbar Header Component Renderer
 */

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-left">
        <div class="page-breadcrumb">
          <span id="headerBreadcrumbCurrent">Dashboard</span>
        </div>
      </div>

      <div class="header-right">
        <!-- Global Unit Selector -->
        <div class="unit-selector-badge" style="display:flex; align-items:center; gap:0.4rem;">
          <span style="color:var(--text-muted); font-size:0.8rem; font-weight:500;">Unidade:</span>
          <select id="filterUnit" class="select-clean">
            <option value="all">Todas as unidades</option>
          </select>
        </div>

        <!-- Notification Bell Indicator -->
        <div id="headerNotificationBell" title="Notificações & Central de Ações" style="position:relative; cursor:pointer; padding:0.4rem 0.6rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:8px; display:flex; align-items:center; gap:0.3rem;">
          <span style="font-size:0.9rem;">🔔</span>
          <span id="headerNotificationCount" style="font-size:0.75rem; font-weight:700; color:var(--text-title);">0</span>
        </div>

        <!-- Theme Toggle -->
        <button class="btn-theme-quick-toggle" id="btnQuickThemeToggle" title="Alternar Tema da Interface" style="background:var(--bg-card); border:1px solid var(--border-subtle); color:var(--text-main); padding:0.35rem 0.75rem; border-radius:8px; cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.15s;">
          <span id="quickThemeIcon">🌙</span>
          <span id="quickThemeText" style="font-size:0.75rem; font-weight:600;">Escuro</span>
        </button>

        <!-- User Profile Avatar -->
        <div class="user-profile-menu" style="display:flex; align-items:center; gap:0.5rem; margin-left:0.3rem;">
          <div class="user-avatar" id="userAvatarBadge">A</div>
          <span style="font-size:0.82rem; font-weight:600; color:var(--text-main);" id="headerUserName">Administrador</span>
          <select id="selectActiveOrg" style="display:none;"></select>
          <select id="filterRoleSim" style="display:none;"><option value="admin">admin</option></select>
        </div>
      </div>
    </header>
  `;
}
