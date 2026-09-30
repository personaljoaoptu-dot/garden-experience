/**
 * Settings Page Renderer (V1.5.0 Premium SaaS Settings Suite)
 */

export function renderSettingsPage() {
  return `
    <section id="mod-config" class="mod-pane">
      <div class="page-header" style="margin-bottom:1.5rem;">
        <div>
          <h1 class="page-header-title">Configurações da Organização</h1>
          <p class="page-header-subtitle">Gestão da empresa, unidades, equipe, pesquisas, dispositivos e segurança.</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="nav-tabs" style="overflow-x:auto;">
        <button class="nav-tab-item cfg-tab active" data-cfg-pane="cfgPaneOrg">🏢 Organização</button>
        <button class="nav-tab-item cfg-tab" data-cfg-pane="cfgPaneUnits">📍 Unidades</button>
        <button class="nav-tab-item cfg-tab" data-cfg-pane="cfgPaneUsers">👥 Usuários</button>
        <button class="nav-tab-item cfg-tab" data-cfg-pane="cfgPaneSurveys">📋 Pesquisas</button>
        <button class="nav-tab-item cfg-tab" data-cfg-pane="cfgPaneDevices">📱 Dispositivos</button>
        <button class="nav-tab-item cfg-tab" data-cfg-pane="cfgPaneSecurity">🛡️ Segurança</button>
      </div>

      <!-- Tab 1: Organização -->
      <div id="cfgPaneOrg" class="cfg-pane active glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 class="section-title">Dados da Organização</h3>
          <p class="section-subtitle">Informações cadastrais e dados de contato institucionais.</p>
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
            <h3 class="section-title">Unidades da Rede</h3>
            <p class="section-subtitle">Gestão das filiais e pontos físicos cadastrados.</p>
          </div>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUnit">+ Nova Unidade</button>
        </div>

        <div class="table-container">
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

      <!-- Tab 3: Usuários -->
      <div id="cfgPaneUsers" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h3 class="section-title">Usuários & Permissões</h3>
            <p class="section-subtitle">Controle de acesso dos gestores e colaboradores.</p>
          </div>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewUser">+ Convidar Usuário</button>
        </div>

        <div class="table-container">
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

      <!-- Tab 4: Pesquisas -->
      <div id="cfgPaneSurveys" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 class="section-title">Configuração de Pesquisas</h3>
          <p class="section-subtitle">Ajustes gerais dos questionários de NPS e escala de avaliação.</p>
        </div>
        <div style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Exigir Comentário em Detratores (0-6)</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Solicitar justificativa em texto quando o aluno der nota baixa. (Padrão Ativo no Sistema)</span>
            </div>
            <input type="checkbox" checked disabled style="width:18px; height:18px; accent-color:var(--gold-primary); cursor:not-allowed;">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Identificação Opcional do Aluno</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Permitir envio de pesquisas em modo anônimo no totem. (Configurado por Pesquisa)</span>
            </div>
            <input type="checkbox" checked disabled style="width:18px; height:18px; accent-color:var(--gold-primary); cursor:not-allowed;">
          </div>
        </div>
      </div>

      <!-- Tab 5: Dispositivos -->
      <div id="cfgPaneDevices" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 class="section-title">Configuração de Dispositivos Totem</h3>
          <p class="section-subtitle">Parâmetros de timeout e atualização automática dos tablets.</p>
        </div>
        <div style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div>
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Tempo de Reset do Totem pós-envio (segundos):</label>
            <input type="number" value="5" readonly class="text-input" style="max-width:200px; background:var(--bg-card-surface); cursor:default;" title="Tempo padrão de 5 segundos configurado no controlador do Kiosk">
          </div>
        </div>
      </div>

      <!-- Tab 6: Segurança -->
      <div id="cfgPaneSecurity" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
          <h3 class="section-title">Segurança & Isolamento RLS</h3>
          <p class="section-subtitle">Status de proteção multi-tenant e autenticação Supabase.</p>
        </div>

        <div style="max-width:650px; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Conexão Supabase Cloud Backend</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Fonte de dados primária em tempo real</span>
            </div>
            <span id="techSupabaseStatusBadge" class="badge-status resolved">🟢 Conectado</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Versão da Plataforma</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Garden Experience SaaS Suite</span>
            </div>
            <span class="badge-status promoter" style="font-family:var(--font-title); font-weight:700;">v1.5.0 Production</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Isolamento Multi-Tenant</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Contexto de RLS e IDs dinâmicos de organização</span>
            </div>
            <span class="badge-status promoter">🛡️ Ativo (RLS Enforced)</span>
          </div>
        </div>
      </div>
    </section>
  `;
}
