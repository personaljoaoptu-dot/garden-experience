/**
 * Premium Executive Analytics Dashboard Page Renderer
 */

import { renderTenantSetupChecklist } from '../components/tenantSetupChecklist.js';

export function renderDashboardPage() {
  return `
    <section id="mod-dash" class="mod-pane active">
      <!-- Page Header & Single Row Filters -->
      <div class="page-header" style="margin-bottom: 1.25rem;">
        <div>
          <h1 class="page-header-title">Visão geral da experiência</h1>
          <p class="page-header-subtitle">Veja o que mudou, o que precisa de atenção e onde a experiência está evoluindo.</p>
        </div>

        <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
          <div class="filter-period-pills" style="display:flex; background:var(--bg-card); border:1px solid var(--border-subtle); padding:0.2rem; border-radius:var(--radius-md); gap:0.2rem;">
            <button type="button" class="btn-period-pill active" data-period="7" style="background:var(--gold-subtle); color:var(--gold-primary); border:none; padding:0.3rem 0.65rem; border-radius:var(--radius-sm); font-size:0.78rem; font-weight:600; cursor:pointer;">7 dias</button>
            <button type="button" class="btn-period-pill" data-period="30" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:var(--radius-sm); font-size:0.78rem; font-weight:500; cursor:pointer;">30 dias</button>
            <button type="button" class="btn-period-pill" data-period="90" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:var(--radius-sm); font-size:0.78rem; font-weight:500; cursor:pointer;">90 dias</button>
            <button type="button" class="btn-period-pill" data-period="all" style="background:transparent; color:var(--text-muted); border:none; padding:0.3rem 0.65rem; border-radius:var(--radius-sm); font-size:0.78rem; font-weight:500; cursor:pointer;">Tudo</button>
          </div>

          <select id="filterOrigin" class="select-clean" style="padding:0.4rem 0.75rem;">
            <option value="all">Todas as origens</option>
            <option value="qr_code">QR Code</option>
            <option value="link">Link Direto</option>
            <option value="tablet">Tablet Totem</option>
          </select>

          <input type="date" id="filterStartDate" class="select-clean" style="display:none;">
          <input type="date" id="filterEndDate" class="select-clean" style="display:none;">
        </div>
      </div>

      <!-- CHECKLIST DE SETUP DO TENANT -->
      ${renderTenantSetupChecklist()}

      <!-- PRIMEIRO BLOCO & SEGUNDO BLOCO: NPS ATUAL + DISTRIBUIÇÃO & RESUMO DE KPIS -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:1.25rem;">
        <!-- Card 1: NPS Atual -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">NPS ATUAL</span>
            <span id="dashNpsSparkline"></span>
          </div>
          <div style="display:flex; align-items:baseline; gap:0.6rem; margin-top:0.35rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--text-title);" id="dashValNpsScore">—</span>
            <span class="badge-status passive" id="dashBadgeNpsStatus" style="font-size:0.72rem;">SEM DADOS</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;" id="dashNpsComparison">Volume de respostas</div>
        </div>

        <!-- Card 2: Volume & Avaliações -->
        <div class="glass-card p-3">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">AVALIAÇÕES</span>
            <span id="dashResSparkline"></span>
          </div>
          <div style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--text-title); margin-top:0.35rem;" id="dashValTotalResponses">0</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;" id="dashResComparison">Respostas coletadas</div>
        </div>

        <!-- Card 3: Promotores -->
        <div class="glass-card p-3">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">PROMOTORES</span>
          <div style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--color-promoter); margin-top:0.35rem;" id="dashValPromoters">0%</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;">Notas 9 e 10</div>
        </div>

        <!-- Card 4: Detratores -->
        <div class="glass-card p-3">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">DETRATORES</span>
          <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:0.35rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--color-detractor);" id="dashValDetractors">0</span>
            <span style="font-size:0.78rem; color:var(--text-muted);" id="dashOpenCasesCount">0 abertos</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;">Notas 0 a 6</div>
        </div>

        <!-- Card 5: Evolução dos Alunos Summary -->
        <div class="glass-card p-3" id="dashCardStudentEvolution" style="cursor:pointer;" title="Clique para abrir a Evolução dos Alunos">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">EVOLUÇÃO DOS ALUNOS</span>
            <span style="font-size:0.85rem; color:var(--gold-primary); font-weight:700;">→</span>
          </div>
          <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:0.35rem;">
            <span style="font-size:1.8rem; font-weight:800; font-family:var(--font-title); color:var(--gold-primary);" id="dashValTrackedStudents">0</span>
            <span style="font-size:0.85rem; font-weight:700; color:var(--color-promoter);" id="dashValAvgEvolutionDelta">+0.0</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;" id="dashStudentEvolutionSubtitle">Alunos acompanhados</div>
        </div>
      </div>

      <!-- TERCEIRO BLOCO: GRÁFICO PRINCIPAL & DISTRIBUIÇÃO -->
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:1.25rem; margin-bottom:1.25rem;">
        <!-- Experiência ao longo do tempo -->
        <div class="glass-card p-3" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div>
              <h3 class="section-title">Experiência ao longo do tempo</h3>
              <p class="section-subtitle">Trajetória da pontuação de satisfação NPS</p>
            </div>
          </div>
          <div id="npsMainChartContainer" style="height:200px; width:100%;"></div>
        </div>

        <!-- Distribuição NPS -->
        <div class="glass-card p-3" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 class="section-title" style="margin-bottom:1rem;">Distribuição das avaliações</h3>
            
            <div id="dashDonutContainer" style="position:relative; width:120px; height:120px; margin:0 auto 1.25rem auto;"></div>

            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-promoter); font-weight:600;">Promotores (9–10)</span>
                  <span id="distValPromoters" style="font-weight:700;">0%</span>
                </div>
                <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="dashBarPromoters" style="width:0%; height:100%; background:var(--color-promoter);"></div></div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-passive); font-weight:600;">Passivos (7–8)</span>
                  <span id="distValPassives" style="font-weight:700;">0%</span>
                </div>
                <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="dashBarPassives" style="width:0%; height:100%; background:var(--color-passive);"></div></div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
                  <span style="color:var(--color-detractor); font-weight:600;">Detratores (0–6)</span>
                  <span id="distValDetractors" style="font-weight:700;">0%</span>
                </div>
                <div style="height:6px; background:var(--bg-input); border-radius:999px; overflow:hidden;"><div id="dashBarDetractors" style="width:0%; height:100%; background:var(--color-detractor);"></div></div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.25rem; padding-top:0.85rem; border-top:1px solid var(--border-subtle); text-align:center;">
            <button type="button" class="btn-secondary btn-sm" id="btnDashViewQr" style="width:100%;">📱 Visualizar QR Code da Pesquisa</button>
          </div>
        </div>
      </div>

      <!-- QUARTO BLOCO: PRECISA DE ATENÇÃO -->
      <div id="dashAttentionBlock" class="glass-card mb-3" style="padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.2rem;" id="dashAttentionIcon">✓</span>
          <div>
            <span style="font-size:0.9rem; font-weight:700; color:var(--text-title);" id="dashAttentionTitle">Precisa de atenção</span>
            <span style="font-size:0.82rem; color:var(--text-muted); margin-left:0.5rem;" id="dashAttentionSubtitle">Nenhuma avaliação precisa de atenção no momento.</span>
          </div>
        </div>
        <button type="button" class="btn-secondary btn-sm" id="dashAttentionCta" style="display:none;">Ver Acompanhamentos →</button>
      </div>

      <!-- QUINTO BLOCO: EXPERIÊNCIA POR PONTO DE CONTATO & VISÃO DA EXPERIÊNCIA -->
      <div style="display:grid; grid-template-columns: 1fr 340px; gap:1.25rem; margin-bottom:1.25rem;">
        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Experiência por ponto de contato</h3>
          <div id="touchpointRankingList" style="display:flex; flex-direction:column; gap:0.85rem;"></div>
        </div>

        <div class="glass-card p-3">
          <h3 class="section-title" style="margin-bottom:0.85rem;">Visão da experiência</h3>
          <div id="operationalInsightsList" style="display:flex; flex-direction:column; gap:0.75rem;"></div>
        </div>
      </div>

      <!-- TABELA DE RESPOSTAS RECENTES -->
      <div class="glass-card p-3">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <div>
            <h3 class="section-title">Últimas avaliações registradas</h3>
            <p class="section-subtitle">Feedback factual coletado dos alunos</p>
          </div>
          <button type="button" class="btn-ghost btn-sm" id="btnDashViewAllResponses">Ver todas as respostas →</button>
        </div>

        <div class="table-responsive" id="dashResponsesTableContainer">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cliente / Aluno</th>
                <th>Nota</th>
                <th>Unidade</th>
                <th>Origem</th>
                <th>Comentário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody id="dashRecentResponsesBody"></tbody>
          </table>
        </div>

        <div id="dashEmptyState" class="empty-state-card" style="display:none;">
          <div class="empty-state-icon">📱</div>
          <h4 class="empty-state-title">Ainda não há avaliações</h4>
          <p class="empty-state-desc">Receba sua primeira avaliação disponibilizando seu QR Code na recepção ou utilizando um tablet totem.</p>
          <button type="button" class="btn-primary-gold btn-sm" id="btnEmptyStateQr">📱 Ver QR Code da Pesquisa</button>
        </div>
      </div>
    </section>
  `;
}
