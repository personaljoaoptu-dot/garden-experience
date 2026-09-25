/**
 * Settings Page Renderer (V1.4.6 Premium SaaS Settings Suite)
 */

export function renderSettingsPage() {
  return `
    <section id="mod-config" class="mod-pane">
      <div class="page-header-block" style="margin-bottom:1.5rem;">
        <div class="page-title-group">
          <h1 style="font-size:1.5rem; font-weight:800; color:var(--text-title); margin:0;">Configurações da Organização</h1>
          <p style="font-size:0.88rem; color:var(--text-muted); margin-top:0.25rem;">Gestão da empresa, unidades, equipe, preferências visuais, notificações e status técnico.</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="cfg-tabs-header mb-4" style="display:flex; gap:0.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem; overflow-x:auto;">
        <button class="cfg-tab active" data-cfg-pane="cfgPaneOrg">🏢 Empresa</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneUnits">📍 Unidades</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneUsers">👥 Equipe</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneTheme">🎨 Aparência</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneNotifications">🔔 Notificações</button>
        <button class="cfg-tab" data-cfg-pane="cfgPaneTechnical">🛠️ Modo Técnico</button>
      </div>

      <!-- Tab 1: Empresa -->
      <div id="cfgPaneOrg" class="cfg-pane active glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Dados da Organização</h3>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Informações cadastrais e dados de contato institucionais.</p>
        </div>

        <form id="formConfigOrg" style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Nome da Organização:</label>
              <input type="text" id="cfgOrgNameInput" class="text-input" placeholder="Ex: Garden Gold Academia">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Nome Fantasia / Marca:</label>
              <input type="text" id="cfgOrgTradeNameInput" class="text-input" placeholder="Ex: Garden Gold">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">E-mail Administrativo:</label>
              <input type="email" id="cfgOrgEmailInput" class="text-input" placeholder="contato@empresa.com.br">
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Telefone Principal:</label>
              <input type="text" id="cfgOrgPhoneInput" class="text-input" placeholder="(11) 99999-0000">
            </div>
          </div>

          <div style="padding-top:1rem; border-top:1px solid var(--border-subtle); display:flex; justify-content:flex-end;">
            <button type="submit" class="btn-primary-gold">💾 Salvar Alterações</button>
          </div>
        </form>
      </div>

      <!-- Tab 2: Unidades -->
      <div id="cfgPaneUnits" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Unidades da Rede</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Gestão das filiais e pontos físicos cadastrados.</p>
          </div>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUnit">+ Nova Unidade</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome da Unidade</th>
                <th>Localização</th>
                <th>Código</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="configUnitsTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Equipe -->
      <div id="cfgPaneUsers" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Usuários & Permissões</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Controle de acesso dos gestores e colaboradores.</p>
          </div>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUser">+ Convidar Usuário</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th>Unidades</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="configUsersTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Aparência -->
      <div id="cfgPaneTheme" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Aparência e Modo Visual</h3>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Escolha a preferência de tema e contraste da sua interface.</p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; max-width:700px;">
          <label id="cardThemeDark" class="glass-card theme-option-card" style="cursor:pointer; padding:1.25rem; border:2px solid var(--border-subtle); display:flex; flex-direction:column; gap:0.5rem; transition:all 0.2s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:var(--text-title);">🌙 Modo Escuro</span>
              <input type="radio" name="radioThemeMode" value="dark">
            </div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">Tema escuro obsidian premium para baixa luminosidade.</p>
          </label>

          <label id="cardThemeLight" class="glass-card theme-option-card" style="cursor:pointer; padding:1.25rem; border:2px solid var(--border-subtle); display:flex; flex-direction:column; gap:0.5rem; transition:all 0.2s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:var(--text-title);">☀️ Modo Claro</span>
              <input type="radio" name="radioThemeMode" value="light">
            </div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">Interface clara limpa com alto contraste.</p>
          </label>

          <label id="cardThemeSystem" class="glass-card theme-option-card" style="cursor:pointer; padding:1.25rem; border:2px solid var(--border-subtle); display:flex; flex-direction:column; gap:0.5rem; transition:all 0.2s ease;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:var(--text-title);">💻 Seguir Sistema</span>
              <input type="radio" name="radioThemeMode" value="system">
            </div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">Alterna automaticamente conforme as configurações do SO.</p>
          </label>
        </div>
      </div>

      <!-- Tab 5: Notificações -->
      <div id="cfgPaneNotifications" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Preferências de Notificações</h3>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Configure como e quando sua equipe deve ser alertada sobre feedbacks.</p>
        </div>

        <div style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Alertas Imediatos de Detratores (Notas 1-6)</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Notificar a equipe no painel ao receber uma avaliação baixa.</span>
            </div>
            <input type="checkbox" checked style="width:18px; height:18px; accent-color:var(--gold-primary);">
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Resumo Semanal Executivo</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Relatório consolidador com médias de NPS e evolução da semana.</span>
            </div>
            <input type="checkbox" checked style="width:18px; height:18px; accent-color:var(--gold-primary);">
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Aviso de Dispositivos Offline</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Notificar quando um tablet totem perder conexão por mais de 30 minutos.</span>
            </div>
            <input type="checkbox" checked style="width:18px; height:18px; accent-color:var(--gold-primary);">
          </div>
        </div>
      </div>

      <!-- Tab 6: Modo Técnico -->
      <div id="cfgPaneTechnical" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-title); margin:0;">Modo Técnico & Diagnóstico de Infraestrutura</h3>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0 0 0;">Status de conexão com a nuvem, sincronização e integridade do sistema.</p>
        </div>

        <div style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Conexão Supabase Backend</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Fonte de dados primária em tempo real</span>
            </div>
            <span id="techSupabaseStatusBadge" class="badge-status resolved">🟢 Conectado</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Versão da Plataforma</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Garden Experience SaaS Suite</span>
            </div>
            <span class="badge-status passive" style="font-family:var(--font-title); font-weight:700;">v1.4.6 Production</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Isolamento Multi-Tenant</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Contexto de RLS e IDs dinâmicos de organização</span>
            </div>
            <span class="badge-status resolved">🛡️ Ativo (RLS Enforced)</span>
          </div>
        </div>
      </div>
    </section>
  `;
}
