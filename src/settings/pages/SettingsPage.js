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

        <form id="formConfigOrg" style="max-width:860px; width:100%; display:flex; flex-direction:column; gap:1.25rem;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1.25rem;">
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Nome da Organização:</label>
              <input type="text" id="cfgOrgNameInput" class="text-input" placeholder="Ex: Garden Gold Academia">
            </div>
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Nome Fantasia / Marca:</label>
              <input type="text" id="cfgOrgTradeNameInput" class="text-input" placeholder="Ex: Garden Gold">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1.25rem;">
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">E-mail Administrativo:</label>
              <input type="email" id="cfgOrgEmailInput" class="text-input" placeholder="contato@empresa.com.br">
            </div>
            <div>
              <label style="font-size:0.82rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.4rem;">Telefone Principal:</label>
              <input type="text" id="cfgOrgPhoneInput" class="text-input" placeholder="(11) 99999-0000">
            </div>
          </div>

          <div style="border-top:1px solid var(--border-subtle); padding-top:1rem;">
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.5rem;">Identidade Visual / Logo da Empresa (Pesquisa Pública, Totem e Cartaz QR Code):</label>
            <div style="display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap;">
              <div style="width:96px; height:96px; border-radius:12px; background:#ffffff; border:2px solid var(--gold-primary); display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0.35rem; flex-shrink:0;">
                <img id="cfgOrgLogoPreview" src="/logo-garden-gold.jpg" alt="Logo da Empresa" style="max-width:100%; max-height:100%; object-fit:contain;">
              </div>
              <div style="flex:1; min-width:240px; display:flex; flex-direction:column; gap:0.5rem;">
                <input type="text" id="cfgOrgLogoUrlInput" class="text-input" placeholder="URL da Logo ou envie um arquivo abaixo (/logo-garden-gold.jpg)">
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
                  <label class="btn-secondary btn-sm" style="cursor:pointer; margin:0; display:inline-flex; align-items:center; gap:0.35rem;">
                    <span>📤 Enviar Imagem</span>
                    <input type="file" id="cfgOrgLogoFileInput" accept="image/*" style="display:none;">
                  </label>
                  <button type="button" id="btnResetDefaultLogo" class="btn-outline-gold btn-sm">✨ Usar Logo Garden Gold</button>
                </div>
                <span style="font-size:0.74rem; color:var(--text-muted);">Exibida automaticamente na Pesquisa Pública, Modo Totem e Cartaz A4 de QR Code.</span>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-subtle); padding-top:1rem;">
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.5rem;">Tema & Aparência do Painel:</label>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:0.75rem;">
              <label id="cardThemeDark" class="theme-option-card" style="display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; border-radius:var(--radius-md); background:var(--bg-card-surface); border:1px solid var(--border-subtle); cursor:pointer;">
                <input type="radio" name="radioThemeMode" id="themeRadioDark" value="dark" style="accent-color:var(--gold-primary);">
                <div>
                  <div style="font-size:0.84rem; font-weight:700; color:var(--text-title);">🌙 Modo Escuro</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Black & Gold (Padrão)</div>
                </div>
              </label>
              <label id="cardThemeLight" class="theme-option-card" style="display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; border-radius:var(--radius-md); background:var(--bg-card-surface); border:1px solid var(--border-subtle); cursor:pointer;">
                <input type="radio" name="radioThemeMode" id="themeRadioLight" value="light" style="accent-color:var(--gold-primary);">
                <div>
                  <div style="font-size:0.84rem; font-weight:700; color:var(--text-title);">☀️ Modo Claro</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Fundo claro de alto contraste</div>
                </div>
              </label>
              <label id="cardThemeSystem" class="theme-option-card" style="display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; border-radius:var(--radius-md); background:var(--bg-card-surface); border:1px solid var(--border-subtle); cursor:pointer;">
                <input type="radio" name="radioThemeMode" id="themeRadioSystem" value="system" style="accent-color:var(--gold-primary);">
                <div>
                  <div style="font-size:0.84rem; font-weight:700; color:var(--text-title);">💻 Seguir Sistema</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Automático conforme o PC</div>
                </div>
              </label>
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
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Pesquisa NPS Ativa na Organização</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Habilitar respostas públicas de NPS. (Persistido no Supabase)</span>
            </div>
            <input type="checkbox" id="cfgSurveyActiveToggle" style="width:18px; height:18px; accent-color:var(--gold-primary); cursor:pointer;">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Identificação Opcional do Aluno</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Permitir envio de pesquisas em modo anônimo no totem. (Persistido no Supabase)</span>
            </div>
            <input type="checkbox" id="cfgSurveyAnonToggle" style="width:18px; height:18px; accent-color:var(--gold-primary); cursor:pointer;">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.9rem; color:var(--text-title); display:block;">Alerta Sonoro e Pop-up de Detratores em Tempo Real (0-6)</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Tocar aviso sonoro e exibir card de ação imediata quando um aluno der nota baixa.</span>
            </div>
            <input type="checkbox" id="cfgDetractorSoundToggle" checked style="width:18px; height:18px; accent-color:var(--gold-primary); cursor:pointer;">
          </div>

          <div style="padding:1.1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:0.85rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <strong style="font-size:0.9rem; color:var(--text-title); display:block;">🚨 Central de Alertas Automáticos de Detratores</strong>
                <span style="font-size:0.78rem; color:var(--text-muted);">Receba notificações no computador ou integre via Webhook (WhatsApp / Zapier / n8n).</span>
              </div>
              <div style="display:flex; gap:0.45rem; flex-wrap:wrap;">
                <button type="button" id="btnEnableDesktopNotifications" class="btn-secondary btn-sm">🔔 Ativar Push no Computador</button>
                <button type="button" id="btnTestDetractorAlert" class="btn-outline-gold btn-sm">🔊 Testar Alerta Ao Vivo</button>
              </div>
            </div>

            <div style="padding-top:0.75rem; border-top:1px solid var(--border-subtle);">
              <label style="font-size:0.78rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Webhook URL para Disparo Automático (WhatsApp / Make / Zapier / n8n):</label>
              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <input type="url" id="cfgDetractorWebhookInput" class="text-input" style="flex:1; min-width:220px;" placeholder="https://seu-webhook-ou-automacao.com/detractor">
                <button type="button" id="btnSaveDetractorWebhook" class="btn-primary-gold btn-sm">💾 Salvar Webhook</button>
              </div>
              <span style="font-size:0.72rem; color:var(--text-muted); display:block; margin-top:0.3rem;">Sempre que entrar uma nota de 0 a 6, o sistema envia automaticamente um JSON POST com nome, telefone, nota e comentário do aluno.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 5: Dispositivos -->
      <div id="cfgPaneDevices" class="cfg-pane glass-card" style="padding:1.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h3 class="section-title">Configuração de Dispositivos Totem</h3>
            <p class="section-subtitle">Dispositivos cadastrados na rede e parâmetros de reset do totem.</p>
          </div>
          <button class="btn-primary-gold btn-sm" id="btnConfigNewDevice">+ Novo Dispositivo</button>
        </div>
        
        <div style="margin-bottom:2rem;">
          <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin-bottom:0.75rem;">Totens de Recepção Cadastrados</h4>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dispositivo / Totem</th>
                  <th>Unidade</th>
                  <th>Token de Acesso</th>
                  <th>Status</th>
                  <th>Último Ping</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="configDevicesTableBody"></tbody>
            </table>
          </div>
        </div>

        <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-subtle);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-title); margin:0;">QR Codes das Pesquisas por Unidade</h4>
              <p style="font-size:0.78rem; color:var(--text-muted); margin:0.2rem 0 0 0;">Links públicos reais gerados a partir da tabela survey_links para Coleta via QR Code.</p>
            </div>
          </div>
          <div id="configQrCodesGrid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1.25rem;"></div>
        </div>

        <div style="max-width:650px; margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border-subtle);">
          <div>
            <label style="font-size:0.8rem; font-weight:600; color:var(--text-title); display:block; margin-bottom:0.35rem;">Tempo de Reinício Automático (Auto-Reset) pós-envio (segundos):</label>
            <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
              <input type="number" id="cfgKioskResetSecondsInput" value="10" min="3" max="120" class="text-input" style="max-width:140px;">
              <button type="button" id="btnSaveKioskResetSeconds" class="btn-primary-gold btn-sm">💾 Salvar Tempo</button>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:0.35rem;">Após o aluno avaliar no Totem ou Pesquisa Pública, a tela de agradecimento reinicia sozinha após esse tempo (padrão: 10 segundos).</span>
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
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Sessão Autenticada</strong>
              <span id="cfgSecUserEmail" style="font-size:0.78rem; color:var(--text-muted);">Usuário autenticado</span>
            </div>
            <span id="cfgSecUserRoleBadge" class="badge-status promoter" style="font-family:var(--font-title); font-weight:700;">ADMIN</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Organização Ativa (UUID)</strong>
              <span id="cfgSecOrgId" style="font-size:0.78rem; font-family:monospace; color:var(--text-muted);">—</span>
            </div>
            <span class="badge-status promoter">🏢 Escopo Ativo</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding:1rem; background:var(--bg-card-surface); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <div>
              <strong style="font-size:0.88rem; color:var(--text-title); display:block;">Isolamento Multi-Tenant (RLS)</strong>
              <span style="font-size:0.78rem; color:var(--text-muted);">Regras PostgreSQL Row Level Security (Migration 13)</span>
            </div>
            <span class="badge-status promoter">🛡️ Ativo (RLS Enforced)</span>
          </div>
        </div>
      </div>
    </section>
  `;
}
