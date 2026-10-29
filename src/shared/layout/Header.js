/**
 * Clean Topbar Header Component Renderer (V2.0 Production Auth & User Profile Header)
 */

import { authService } from '../../auth/services/authService.js';

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-left" style="display:flex; align-items:center; gap:0.65rem;">
        <button type="button" id="btnMobileMenuToggle" class="btn-mobile-menu-toggle" aria-label="Abrir Menu de Navegação" title="Menu Principal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="page-breadcrumb">
          <span class="header-org-name-text" style="color:var(--text-muted); font-size:0.82rem; font-weight:500;" id="headerOrgName">Garden Experience</span>
          <span class="header-breadcrumb-sep" style="color:var(--text-dim); font-size:0.8rem;">/</span>
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

        <!-- User Profile & Logout -->
        <div class="user-profile-menu" style="display:flex; align-items:center; gap:0.6rem; margin-left:0.4rem; padding-left:0.6rem; border-left:1px solid var(--border-subtle);">
          <div class="user-avatar-circle" id="userAvatarBadge" style="width:30px; height:30px; border-radius:50%; background:var(--gold-primary); color:#0d1117; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:0.82rem; cursor:pointer;" title="Clique para alterar seu nome">A</div>
          
          <div id="headerUserProfileBox" style="display:flex; flex-direction:column; line-height:1.2; cursor:pointer;" title="Clique para alterar seu nome">
            <span style="font-size:0.82rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:0.25rem;" id="headerUserName">Administrador <span style="font-size:0.75rem; opacity:0.65;">✏️</span></span>
            <span style="font-size:0.7rem; color:var(--gold-primary); font-weight:700; text-transform:uppercase;" id="headerUserRoleBadge">OWNER</span>
          </div>

          <button type="button" id="btnHeaderLogout" class="btn-ghost btn-sm" title="Sair da Conta (Logout)" style="color:var(--color-detractor); font-size:0.8rem; padding:0.3rem 0.5rem; margin-left:0.2rem; cursor:pointer;">
            Sair 🚪
          </button>

          <select id="selectActiveOrg" style="display:none;"></select>
          <select id="filterRoleSim" style="display:none;"><option value="admin">admin</option></select>
        </div>
      </div>
    </header>
  `;
}
