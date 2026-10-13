/**
 * Devices Page Renderer
 */

export function renderDevicesPage() {
  return `
    <section id="mod-devices" class="mod-pane">
      <div class="page-header-block" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div class="page-title-group">
          <h1>Gestão de Dispositivos (Tablets Kiosk)</h1>
          <p>Totens de recepção vinculados por token de dispositivo</p>
        </div>
        <button class="btn-primary-gold btn-sm" id="btnPageNewDevice">+ Novo Dispositivo</button>
      </div>

      <div class="glass-card panel-block">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome do Dispositivo</th>
                <th>Unidade Vinculada</th>
                <th>Identificador</th>
                <th>Status</th>
                <th>Última Atividade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="devicesTableBody"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}
