/**
 * Dashboard Page View Renderer
 */

export function renderDashboardPage() {
  return `
    <section id="mod-dash" class="mod-pane active">
      <div class="page-header-block">
        <div class="page-title-group">
          <h1 id="activeOrgBrandTitle">Dashboard</h1>
          <p>Visão geral da experiência e satisfação dos clientes</p>
        </div>
        <div class="btn-group-row">
          <select id="filterOrigin" class="select-input">
            <option value="all">Todas as Origens</option>
            <option value="qr_code">QR Code</option>
            <option value="link">Link Direto</option>
            <option value="tablet">Tablet Totem</option>
          </select>
          <select id="filterPeriod" class="select-input">
            <option value="all">Todo o Histórico</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
          <div style="display:flex; align-items:center; gap:0.3rem;">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">De:</span>
            <input type="date" id="filterStartDate" class="select-input" style="padding:0.35rem 0.5rem; font-size:0.78rem;">
          </div>
          <div style="display:flex; align-items:center; gap:0.3rem;">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Até:</span>
            <input type="date" id="filterEndDate" class="select-input" style="padding:0.35rem 0.5rem; font-size:0.78rem;">
          </div>
        </div>
      </div>

      <!-- DEMO MODE BANNER -->
      <div id="demoModeBanner" class="glass-card mb-3 p-3" style="display:none; background:rgba(147, 51, 234, 0.12); border:1px solid #a855f7;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <span style="font-weight:700; color:#c084fc; font-size:0.92rem;">🟣 MODO DEMONSTRAÇÃO ATIVO</span>
            <p style="font-size:0.82rem; color:var(--text-muted); margin:0.2rem 0 0 0;">Conta de demonstração comercial contendo dados de exemplo.</p>
          </div>
          <button type="button" class="btn-primary-gold btn-sm" id="btnDemoStartClient" style="font-weight:700;">+ Criar Conta Cliente</button>
        </div>
      </div>

      <!-- DASHBOARD ZERO DATA BANNER FOR NEW TENANTS -->
      <div id="dashZeroDataBanner" class="glass-card mb-3 p-3 border-gold" style="display:none; background: var(--bg-card-hover); border: 1px solid var(--border-gold);">
        <h4 style="color: var(--gold-primary); margin-bottom: 0.5rem; font-size: 1.05rem;">🚀 Bem-vindo ao Garden Experience!</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">Sua organização está configurada e pronta para receber avaliações.</p>
      </div>

      <!-- CENTRAL DE AÇÕES -->
      <div class="action-center-block" id="actionCenterBlock">
        <div class="action-center-header">
          <div class="action-center-title">
            <span>🚨 Central de Ações</span>
            <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">(Foco Operacional)</span>
          </div>
          <span style="font-size:0.75rem; color:var(--gold-primary); font-weight:600;">Clique no item para agir diretamente</span>
        </div>
        <div class="action-cards-grid" id="actionCardsGrid"></div>
      </div>

      <!-- CARDS PRINCIPAIS -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">NPS SCORE GERAL</div>
          <div class="nps-big-number" id="dashValNpsScore">—</div>
          <div class="nps-status-pill mt-2" id="dashBadgeNpsStatus">SEM DADOS</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">PROMOTORES (9–10)</div>
          <div class="kpi-number text-emerald" id="dashValPromoters">0 (0%)</div>
          <div class="progress-track mt-2"><div class="progress-fill bg-emerald" id="dashBarPromoters" style="width: 0%"></div></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">PASSIVOS (7–8)</div>
          <div class="kpi-number text-amber" id="dashValPassives">0 (0%)</div>
          <div class="progress-track mt-2"><div class="progress-fill bg-amber" id="dashBarPassives" style="width: 0%"></div></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">DETRATORES (0–6)</div>
          <div class="kpi-number text-rose" id="dashValDetractors">0 (0%)</div>
          <div class="progress-track mt-2"><div class="progress-fill bg-rose" id="dashBarDetractors" style="width: 0%"></div></div>
        </div>
      </div>

      <div class="glass-card panel-block mt-3">
        <div class="panel-header">
          <h3>AVALIAÇÕES RECENTES</h3>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente / Aluno</th>
                <th>Unidade</th>
                <th>NPS</th>
                <th>Canal</th>
                <th>Comentário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody id="dashRecentResponsesBody"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}
