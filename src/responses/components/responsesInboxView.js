/**
 * Experience Inbox Component Logic & Rendering
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass } from '../../surveys/services/npsService.js';
import { showConfirmationModal } from '../../shared/modals/confirmModal.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { openStudentEvolutionDetail } from '../../students/components/studentEvolutionView.js';

export function setupResponsesInbox() {
  const filterBtns = document.querySelectorAll('[data-inbox-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      store.inboxFilter = btn.getAttribute('data-inbox-filter');
      renderResponsesInbox();
    });
  });

  const searchInput = document.getElementById('inputResponsesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.inboxSearchQuery = e.target.value.toLowerCase().trim();
      renderResponsesInbox();
    });
  }
}

export function renderResponsesInbox() {
  const listContainer = document.getElementById('inboxItemsList');
  const countBadge = document.getElementById('inboxListCountBadge');
  const detailPane = document.getElementById('inboxDetailPane');

  if (!listContainer) return;
  listContainer.innerHTML = '';

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  let items = [...store.localResponses];

  if (unitFilter !== 'all') {
    items = items.filter(r => r.unitCode === unitFilter);
  }

  if (store.inboxFilter === 'promoter') {
    items = items.filter(r => r.npsScore >= 9);
  } else if (store.inboxFilter === 'passive') {
    items = items.filter(r => r.npsScore >= 7 && r.npsScore <= 8);
  } else if (store.inboxFilter === 'detractor') {
    items = items.filter(r => r.npsScore <= 6);
  } else if (store.inboxFilter === 'no_comment') {
    items = items.filter(r => !r.comment || !r.comment.trim());
  }

  if (store.inboxSearchQuery) {
    const q = store.inboxSearchQuery;
    items = items.filter(r => 
      (r.student && r.student.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q))
    );
  }

  if (countBadge) countBadge.textContent = `${items.length} itens`;

  if (!items.length) {
    listContainer.innerHTML = `
      <div class="empty-state-card" style="padding:2rem 1rem;">
        <div class="empty-state-icon">📥</div>
        <h4 class="empty-state-title">Nenhuma resposta encontrada</h4>
        <p class="empty-state-desc">Nenhum feedback corresponde aos filtros selecionados.</p>
      </div>
    `;
    if (detailPane) {
      detailPane.innerHTML = `
        <div class="empty-state-card" style="margin-top:4rem;">
          <div class="empty-state-icon">🔍</div>
          <h4 class="empty-state-title">Selecione uma resposta</h4>
          <p class="empty-state-desc">Escolha um item da lista ao lado para visualizar os detalhes da avaliação.</p>
        </div>
      `;
    }
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const auditResponseId = urlParams.get('auditResponse');
  if (auditResponseId && items.some(i => i.id === auditResponseId)) {
    store.selectedResponseId = auditResponseId;
  } else if (!store.selectedResponseId || !items.some(i => i.id === store.selectedResponseId)) {
    store.selectedResponseId = items[0].id;
  }

  items.forEach(item => {
    const u = store.UNITS.find(unit => unit.code === item.unitCode);
    const unitName = u ? u.name : item.unitCode;
    const catClass = getNpsCategoryClass(item.npsScore);
    const isSelected = item.id === store.selectedResponseId;

    const div = document.createElement('div');
    div.className = `inbox-item-card ${isSelected ? 'selected' : ''}`;
    div.style.cssText = `padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); cursor: pointer; border-left: 3px solid ${isSelected ? 'var(--gold-primary)' : 'transparent'}; background: ${isSelected ? 'var(--gold-subtle)' : 'transparent'}; transition: all 0.15s ease;`;
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
        <span style="font-weight:600; font-size:0.88rem; color:var(--text-title);">${escapeHtml(item.student || 'Anônimo')}</span>
        <span class="nps-badge ${catClass}" style="font-size:0.75rem;">${item.npsScore}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.35rem;">${escapeHtml(unitName)} • ${new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
      <div style="font-size:0.8rem; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">"${escapeHtml(item.comment || 'Sem comentário escrito.')}"</div>
    `;

    div.addEventListener('click', () => {
      store.selectedResponseId = item.id;
      renderResponsesInbox();
    });

    listContainer.appendChild(div);
  });

  const selectedItem = items.find(i => i.id === store.selectedResponseId);
  if (selectedItem && detailPane) {
    renderDetailPane(detailPane, selectedItem);
  }
}

function renderDetailPane(detailPane, selectedItem) {
  const u = store.UNITS.find(unit => unit.code === selectedItem.unitCode);
  const unitName = u ? u.name : selectedItem.unitCode;
  const catClass = getNpsCategoryClass(selectedItem.npsScore);
  const linkedCase = store.followUpCases.find(c => c.responseId === selectedItem.id);

  detailPane.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem;">
      <div>
        <h2 style="font-size:1.3rem; font-weight:700; color:var(--text-title); margin:0 0 0.25rem 0;">${escapeHtml(selectedItem.student || 'Anônimo')}</h2>
        <div style="display:flex; gap:1rem; font-size:0.82rem; color:var(--text-muted); flex-wrap:wrap;">
          <span>Unidade: <strong style="color:var(--text-main);">${escapeHtml(unitName)}</strong></span>
          <span>Origem: <strong style="color:var(--text-main);">${escapeHtml(selectedItem.origin.toUpperCase())}</strong></span>
          <span>E-mail: <strong style="color:var(--text-main);">${escapeHtml(selectedItem.email || 'Não informado')}</strong></span>
        </div>
      </div>
      <span class="nps-badge ${catClass}" style="font-size:1.2rem; padding:0.4rem 1.1rem;">NPS ${selectedItem.npsScore}</span>
    </div>

    ${linkedCase ? `
      <div class="glass-card mb-3" style="border-color:var(--color-detractor-border); background:var(--color-detractor-bg); padding:0.75rem 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--color-detractor); font-size:0.82rem; font-weight:700;">⚠️ ACOMPANHAMENTO VINCULADO</span>
          <span class="badge-status ${linkedCase.status === 'pending' ? 'pending' : linkedCase.status === 'in_progress' ? 'in_progress' : 'resolved'}">${linkedCase.status === 'pending' ? 'Pendente' : linkedCase.status === 'in_progress' ? 'Em Tratativa' : 'Resolvido'}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-main); margin-top:0.25rem;">Responsável: <strong>${escapeHtml(linkedCase.assignedUser)}</strong></p>
      </div>
    ` : ''}

    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem; margin-bottom:1.25rem;">
      ${(!linkedCase || linkedCase.status !== 'resolved') ? `
        <button type="button" class="btn-primary-gold btn-sm" id="btnQuickResolve">✅ Resolver atendimento</button>
      ` : `<span class="badge-status promoter" style="font-size:0.8rem;">✓ Atendimento Resolvido</span>`}

      ${selectedItem.studentId ? `
        <button type="button" class="btn-secondary btn-sm" id="btnViewStudentEvolution" style="font-weight:600;">📈 Ver jornada</button>
      ` : `<span style="font-size:0.75rem; color:var(--text-dim); padding:0.35rem 0.6rem; border-radius:var(--radius-md); background:var(--bg-input);">🔒 Resposta Anônima</span>`}

      <button type="button" class="btn-ghost btn-sm" id="btnQuickWhatsapp">💬 WhatsApp</button>
      <button type="button" class="btn-ghost btn-sm" id="btnQuickEmail">✉️ E-mail</button>
    </div>

    <div style="margin-bottom:1.25rem;">
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.35rem;">COMENTÁRIO DO CLIENTE</div>
      <div style="padding:1rem; background:var(--bg-card-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-style:italic; font-size:0.9rem; color:var(--text-main);">"${escapeHtml(selectedItem.comment || 'Nenhum comentário em texto foi preenchido nesta avaliação.')}"</div>
    </div>

    <div style="margin-bottom:1.25rem;">
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">CENTRAL DE COMUNICAÇÃO</div>
      
      <div id="paneCommInternal" class="comm-tab-pane ${store.activeCommTab === 'internal' ? 'active' : ''}">
        <textarea id="inputInternalNote" class="textarea-input" rows="3" placeholder="Escreva uma nota interna para a equipe..."></textarea>
        <div style="margin-top:0.5rem; text-align:right;"><button class="btn-primary-gold btn-sm" id="btnSaveInternalNote">💾 Salvar Nota Interna</button></div>
      </div>

      <div id="paneCommEmail" class="comm-tab-pane ${store.activeCommTab === 'email' ? 'active' : ''}">
        ${!selectedItem.email ? `<p style="font-size:0.85rem; color:var(--text-muted);">E-mail não informado.</p>` : `
          <div style="margin-bottom:0.5rem;"><input type="text" id="inputEmailSubject" class="text-input" placeholder="Assunto do e-mail..."></div>
          <div style="margin-bottom:0.5rem;"><textarea id="inputEmailBody" class="textarea-input" rows="4" placeholder="Escreva a resposta ao aluno..."></textarea></div>
          <div style="text-align:right;"><button class="btn-primary-gold btn-sm" id="btnSendEmail">✉️ Registrar E-mail Enviado</button></div>
        `}
      </div>

      <div id="paneCommWhatsapp" class="comm-tab-pane ${store.activeCommTab === 'whatsapp' ? 'active' : ''}">
        ${!selectedItem.phone ? `<p style="font-size:0.85rem; color:var(--text-muted);">Telefone não informado.</p>` : `
          <textarea id="inputWhatsappBody" class="textarea-input" rows="3" placeholder="Mensagem WhatsApp..." style="margin-bottom:0.5rem;"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
            <button class="btn-secondary btn-sm" id="btnCopyWaMsg">📋 Copiar Mensagem</button>
            <button class="btn-primary-gold btn-sm" id="btnOpenWa">💬 Abrir WhatsApp Web</button>
          </div>
        `}
      </div>
    </div>

    <div>
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem;">HISTÓRICO DE ATENDIMENTO</div>
      <div class="timeline-container" id="inboxTimelineContainer"></div>
    </div>
  `;

  attachDetailHandlers(selectedItem);
  renderTimelineForResponse(selectedItem.id);
}

function attachDetailHandlers(selectedItem) {
  document.getElementById('btnViewStudentEvolution')?.addEventListener('click', () => {
    if (selectedItem.studentId) {
      openStudentEvolutionDetail(selectedItem.studentId);
    }
  });

  document.getElementById('btnQuickResolve')?.addEventListener('click', () => {
    showConfirmationModal({
      icon: '✅',
      title: 'Resolver Atendimento',
      message: `Marcar atendimento de ${selectedItem.student || 'Anônimo'} como Resolvido?`,
      onConfirm: () => {
        let caseItem = store.followUpCases.find(c => c.responseId === selectedItem.id);
        if (!caseItem) {
          caseItem = { id: 'c_' + Date.now(), responseId: selectedItem.id, unitCode: selectedItem.unitCode, student: selectedItem.student || 'Anônimo', npsScore: selectedItem.npsScore, comment: selectedItem.comment || '', status: 'resolved', priority: 'low', assignedUser: 'Você (Gestor)', createdAt: new Date().toISOString() };
          store.followUpCases.push(caseItem);
        } else {
          caseItem.status = 'resolved';
          caseItem.resolvedAt = new Date().toISOString();
        }
        renderResponsesInbox();
        updateDashboard();
        showToast('✓ Caso marcado como resolvido!', 'success');
      }
    });
  });

  document.getElementById('btnQuickWhatsapp')?.addEventListener('click', () => { store.activeCommTab = 'whatsapp'; renderResponsesInbox(); });
  document.getElementById('btnQuickEmail')?.addEventListener('click', () => { store.activeCommTab = 'email'; renderResponsesInbox(); });

  document.getElementById('btnSaveInternalNote')?.addEventListener('click', () => {
    const noteText = document.getElementById('inputInternalNote')?.value;
    if (!noteText || !noteText.trim()) return alert('Digite a nota.');
    store.communicationLogs.unshift({ id: 'log_' + Date.now(), responseId: selectedItem.id, channel: 'internal', direction: 'internal', subject: 'Nota Interna', body: noteText.trim(), status: 'sent', createdBy: 'Você (Gestor)', createdAt: new Date().toISOString() });
    renderResponsesInbox();
    showToast('✓ Nota interna salva!', 'success');
  });

  document.getElementById('btnSendEmail')?.addEventListener('click', () => {
    const subject = document.getElementById('inputEmailSubject')?.value;
    const body = document.getElementById('inputEmailBody')?.value;
    if (!body || !body.trim()) return alert('Digite a mensagem.');
    store.communicationLogs.unshift({ id: 'log_' + Date.now(), responseId: selectedItem.id, channel: 'email', direction: 'outbound', recipient: selectedItem.email, subject: subject || 'Atendimento', body: body.trim(), status: 'draft', createdBy: 'Você (Gestor)', createdAt: new Date().toISOString() });
    renderResponsesInbox();
    showToast('✓ E-mail registrado!', 'info');
  });

  document.getElementById('btnCopyWaMsg')?.addEventListener('click', () => {
    const body = document.getElementById('inputWhatsappBody')?.value || '';
    if (!body.trim()) return alert('Digite a mensagem.');
    navigator.clipboard.writeText(body);
    showToast('✓ Mensagem copiada!', 'info');
  });

  document.getElementById('btnOpenWa')?.addEventListener('click', () => {
    const body = document.getElementById('inputWhatsappBody')?.value || '';
    const cleanPhone = (selectedItem.phone || '').replace(/\D/g, '');
    const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(body)}`;
    store.communicationLogs.unshift({ id: 'log_' + Date.now(), responseId: selectedItem.id, channel: 'whatsapp', direction: 'outbound', recipient: selectedItem.phone, subject: 'WhatsApp Direct Link', body: body || 'Mensagem via wa.me/', status: 'sent', createdBy: 'Você (Gestor)', createdAt: new Date().toISOString() });
    window.open(waUrl, '_blank');
    renderResponsesInbox();
  });
}

function renderTimelineForResponse(responseId) {
  const container = document.getElementById('inboxTimelineContainer');
  if (!container) return;
  container.innerHTML = '';

  const logs = store.communicationLogs.filter(l => l.responseId === responseId);

  if (!logs.length) {
    container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem 0;">Nenhuma comunicação registrada ainda.</div>';
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const iconDot = log.channel === 'internal' ? '📝' : log.channel === 'email' ? '✉️' : '💬';

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
        <span>${iconDot} ${escapeHtml(log.createdBy)} (${log.channel.toUpperCase()})</span>
        <span>${new Date(log.createdAt).toLocaleString()}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-main); margin-top:0.25rem;">${escapeHtml(log.body)}</div>
    `;
    container.appendChild(item);
  });
}
