/**
 * Settings Page Renderer
 */

export function renderSettingsPage() {
  return `
    <section id="mod-config" class="mod-pane">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1>Configurações da Organização</h1>
          <p>Gestão de cadastro, unidades, equipe, aparência e integrações</p>
        </div>
      </div>

      <div class="cfg-tabs-header mb-3" style="display:flex; gap:0.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
        <button class="cfg-tab active" data-cfg-pane="cfgPaneOrg">🏢 Empresa</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneUnits">📍 Unidades</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneUsers">👥 Equipe</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneTheme">🎨 Aparência</button>
      </div>

      <!-- Tab 1: Organization -->
      <div id="cfgPaneOrg" class="cfg-pane active glass-card">
        <form id="formConfigOrg" style="max-width:500px; display:flex; flex-direction:column; gap:1rem;">
          <div><label style="font-size:0.8rem; color:var(--text-muted);">Nome da Organização:</label><input type="text" id="cfgOrgNameInput" class="text-input"></div>
          <div><label style="font-size:0.8rem; color:var(--text-muted);">Nome Fantasia:</label><input type="text" id="cfgOrgTradeNameInput" class="text-input"></div>
          <div><label style="font-size:0.8rem; color:var(--text-muted);">E-mail Administrativo:</label><input type="email" id="cfgOrgEmailInput" class="text-input"></div>
          <div><label style="font-size:0.8rem; color:var(--text-muted);">Telefone:</label><input type="text" id="cfgOrgPhoneInput" class="text-input"></div>
          <button type="submit" class="btn-primary-gold btn-sm">💾 Salvar Alterações</button>
        </form>
      </div>

      <!-- Tab 2: Units -->
      <div id="cfgPaneUnits" class="cfg-pane glass-card">
        <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-3">
          <h3>Unidades Cadastradas</h3>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUnit">+ Nova Unidade</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>Cidade</th><th>Código</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody id="configUnitsTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Users -->
      <div id="cfgPaneUsers" class="cfg-pane glass-card">
        <div style="display:flex; justify-content:space-between; align-items:center;" class="mb-3">
          <h3>Usuários & Permissões</h3>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUser">+ Convidar Usuário</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Unidades</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody id="configUsersTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Theme -->
      <div id="cfgPaneTheme" class="cfg-pane glass-card">
        <h3>Aparência e Modo Visual</h3>
        <p style="font-size:0.85rem; color:var(--text-muted);" class="mb-3">Escolha a preferência de tema da sua interface:</p>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <label id="cardThemeLight" class="glass-card theme-option-card" style="cursor:pointer; padding:1rem 1.5rem;">
            <input type="radio" name="radioThemeMode" value="light"> ☀️ Modo Claro
          </label>
          <label id="cardThemeDark" class="glass-card theme-option-card" style="cursor:pointer; padding:1rem 1.5rem;">
            <input type="radio" name="radioThemeMode" value="dark"> 🌙 Modo Escuro
          </label>
          <label id="cardThemeSystem" class="glass-card theme-option-card" style="cursor:pointer; padding:1rem 1.5rem;">
            <input type="radio" name="radioThemeMode" value="system"> 💻 Seguir Sistema
          </label>
        </div>
      </div>
    </section>
  `;
}
