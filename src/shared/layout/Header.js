/**
 * Topbar Header Component Renderer
 */

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-left">
        <div class="page-breadcrumb">
          <span id="headerOrgBreadcrumb">Garden Experience</span>
          <span>/</span>
          <span class="current-page" id="headerBreadcrumbCurrent">Dashboard</span>
        </div>
      </div>

      <div class="header-right">
        <!-- Quick Theme Toggle -->
        <button class="btn-theme-quick-toggle" id="btnQuickThemeToggle" title="Alternar Tema da Interface" style="background:var(--bg-card); border:1px solid var(--border-subtle); color:var(--text-main); padding:0.4rem 0.85rem; border-radius:8px; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s;">
          <span id="quickThemeIcon">🌙</span>
          <span id="quickThemeText" style="font-size:0.78rem; font-weight:600;">Escuro</span>
        </button>

        <!-- SaaS Organization Selector -->
        <div class="org-selector-badge" style="display:flex; align-items:center; gap:0.4rem; background:var(--bg-card); border:1px solid var(--border-subtle); padding:0.25rem 0.6rem; border-radius:8px;">
          <span style="color:var(--text-muted); font-size:0.78rem;">Empresa:</span>
          <select id="selectActiveOrg" class="select-clean" style="font-weight:700; color:var(--gold-primary); font-size:0.82rem; cursor:pointer;">
            <!-- Dynamically populated -->
          </select>
          <span id="headerModeBadge" class="badge-status promoter" style="font-size:0.7rem; padding:0.15rem 0.45rem;">🟢 CONTA COMERCIAL SAAS</span>
          <button type="button" class="btn-primary-gold btn-sm" id="btnStartOnboarding" style="padding:0.25rem 0.6rem; font-size:0.75rem; font-weight:700;" title="Criar Nova Organização">+ Novo Cliente</button>
        </div>

        <!-- Global Unit Selector -->
        <div class="unit-selector-badge">
          <span style="color:var(--text-muted); font-size:0.8rem;">Unidade:</span>
          <select id="filterUnit" class="select-clean">
            <option value="all">Todas as Unidades (Geral)</option>
          </select>
        </div>

        <!-- User Profile & Auth -->
        <div class="user-profile-menu" style="display:flex; align-items:center; gap:0.5rem;">
          <div class="user-avatar" id="userAvatarBadge">A</div>
          <select id="filterRoleSim" class="select-clean" style="font-size:0.78rem; color:var(--gold-primary); font-weight:600;">
            <option value="admin">Administrador Geral</option>
            <option value="gestor_a">Gestor Unidade 1</option>
            <option value="gestor_b">Gestor Unidade 2</option>
          </select>
          <button type="button" class="btn-outline-gold btn-sm" id="btnOpenAuthModal" style="padding:0.25rem 0.55rem; font-size:0.75rem;" title="Acessar Conta / Login">🔐 Auth</button>
        </div>
      </div>
    </header>
  `;
}
