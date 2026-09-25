/**
 * Experience Inbox Component Logic & Rendering
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass } from '../../surveys/services/npsService.js';
import { replaceDynamicVariables } from '../../communication/services/variableEngine.js';
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
      <div style="padding:3rem 1rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">
        <div style="font-size:2rem;" class="mb-2">📥</div>
        Nenhuma resposta encontrada.
      </div>
    `;
    if (detailPane) {
      detailPane.innerHTML = `
        <div style="color:var(--text-muted); text-align:center; margin-top:5rem;">
          Nenhuma resposta para exibir com os filtros atuais.
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
    div.innerHTML = `
      <div class="inbox-item-top" style="display:flex; justify-content:space-between; align-items:center;">
        <span class="inbox-student-name" style="font-weight:700; font-size:0.88rem;">${escapeHtml(item.student || 'Anônimo')}</span>
        <span class="badge-status ${catClass}">${item.npsScore}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); margin:0.2rem 0;">${escapeHtml(unitName)} • ${new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
      <div class="inbox-item-comment-snippet" style="font-size:0.8rem; color:var(--text-main); line-clamp:2;">"${escapeHtml(item.comment || 'Sem comentário preenchido.')}"</div>
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
    <div class="detail-header-card" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem;">
      <div>
        <h2 class="detail-student-title" style="font-size:1.3rem; font-weight:700; color:var(--text-title); margin:0;">${escapeHtml(selectedItem.student || 'Anônimo')}</h2>
        <div class="detail-meta-row" style="display:flex; gap:1rem; font-size:0.82rem; color:var(--text-muted); margin-top:0.3rem;">
          <span>Unidade: <strong style="color:var(--text-main);">${escapeHtml(unitName)}</strong></span>
          <span>Canal: <strong style="color:var(--text-main);">${escapeHtml(selectedItem.origin.toUpperCase())}</strong></span>
          <span>E-mail: <strong style="color:var(--text-main);">${escapeHtml(selectedItem.email || 'Não informado')}</strong></span>
        </div>
      </div>
      <span class="badge-status ${catClass}" style="font-size:1.1rem; padding:0.4rem 1rem; font-weight:700;">NPS ${selectedItem.npsScore}</span>
    </div>

    ${linkedCase ? `
      <div class="glass-card mb-3" style="border-color:var(--color-detractor-border); background:var(--color-detractor-bg); padding:0.75rem 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--color-detractor); font-size:0.85rem; font-weight:700;">⚠️ CASO DE DETRATOR VINCULADO</span>
          <span class="badge-status ${linkedCase.status === 'pending' ? 'pending' : linkedCase.status === 'in_progress' ? 'in_progress' : 'resolved'}">${linkedCase.status === 'pending' ? 'Pendente' : linkedCase.status === 'in_progress' ? 'Em Tratativa' : 'Resolvido'}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-main); margin-top:0.25rem;">Responsável: <strong>${escapeHtml(linkedCase.assignedUser)}</strong></p>
      </div>
    ` : ''}

    <div class="detail-quick-actions-bar mb-3" style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
      ${(!linkedCase || linkedCase.status !== 'resolved') ? `
        <button type="button" class="btn-primary-gold btn-sm" id="btnQuickAssign">👤 Assumir Resposta</button>
        <button type="button" class="btn-outline-gold btn-sm" id="btnQuickResolve">✅ Resolver Atendimento</button>
      ` : `<span style="font-size:0.8rem; color:var(--color-promoter); font-weight:600;">✓ Atendimento Resolvido</span>`}

      ${selectedItem.studentId || (selectedItem.student && selectedItem.student !== 'Anônimo') ? `
        <button type="button" class="btn-outline-gold btn-sm" id="btnViewStudentEvolution" style="font-weight:700;">📈 Ver Evolução do Aluno</button>
      ` : `<span style="font-size:0.75rem; color:var(--text-dim); padding:0.25rem 0.5rem; border-radius:4px; background:rgba(255,255,255,0.04);">🔒 Resposta Anônima</span>`}

      <button type="button" class="btn-outline-gold btn-sm" id="btnQuickWhatsapp">💬 WhatsApp</button>
      <button type="button" class="btn-outline-gold btn-sm" id="btnQuickEmail">✉️ E-mail</button>
      <button type="button" class="btn-outline-gold btn-sm" id="btnQuickInternalNote">📝 Nota Interna</button>
    </div>

    <div class="mb-3">
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem;">COMENTÁRIO DO ALUNO</div>
      <div class="detail-comment-quote" style="padding:1rem; background:var(--bg-card-hover); border-radius:8px; font-style:italic; font-size:0.9rem;">"${escapeHtml(selectedItem.comment || 'Nenhum comentário em texto foi preenchido nesta avaliação.')}"</div>
    </div>

    <div class="comm-tabs-container">
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">CENTRAL DE COMUNICAÇÃO</div>
      
      <div id="paneCommInternal" class="comm-tab-pane ${store.activeCommTab === 'internal' ? 'active' : ''}">
        <textarea id="inputInternalNote" class="textarea-input mt-2" rows="3" placeholder="Nota interna da equipe..."></textarea>
        <div class="mt-2 text-right"><button class="btn-primary-gold btn-sm" id="btnSaveInternalNote">💾 Salvar Nota Interna</button></div>
      </div>

      <div id="paneCommEmail" class="comm-tab-pane ${store.activeCommTab === 'email' ? 'active' : ''}">
        ${!selectedItem.email ? `<p style="font-size:0.85rem; color:var(--text-muted);">E-mail não informado.</p>` : `
          <div class="filter-group mb-2"><input type="text" id="inputEmailSubject" class="text-input" placeholder="Assunto do e-mail..."></div>
          <div class="filter-group mb-2"><textarea id="inputEmailBody" class="textarea-input" rows="4" placeholder="Escreva a resposta ao aluno..."></textarea></div>
          <div class="text-right"><button class="btn-primary-gold btn-sm" id="btnSendEmail">✉️ Registrar E-mail Enviado</button></div>
        `}
      </div>

      <div id="paneCommWhatsapp" class="comm-tab-pane ${store.activeCommTab === 'whatsapp' ? 'active' : ''}">
        ${!selectedItem.phone ? `<p style="font-size:0.85rem; color:var(--text-muted);">Telefone não informado.</p>` : `
          <textarea id="inputWhatsappBody" class="textarea-input mb-2" rows="3" placeholder="Mensagem WhatsApp..."></textarea>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
            <button class="btn-outline-gold btn-sm" id="btnCopyWaMsg">📋 Copiar Mensagem</button>
            <button class="btn-primary-gold btn-sm" id="btnOpenWa">💬 Abrir no WhatsApp Web</button>
          </div>
        `}
      </div>
    </div>

    <div class="mt-3">
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">HISTÓRICO</div>
      <div class="timeline-container" id="inboxTimelineContainer"></div>
    </div>
  `;

  attachDetailHandlers(selectedItem);
  renderTimelineForResponse(selectedItem.id);
}

function attachDetailHandlers(selectedItem) {
  document.getElementById('btnViewStudentEvolution')?.addEventListener('click', () => {
    const activeOrg = store.getActiveOrg();
    const student = (activeOrg?.students || []).find(s => s.id === selectedItem.studentId || s.name === selectedItem.student);
    openStudentEvolutionDetail(student?.id || selectedItem.studentId || selectedItem.student);
  });

  document.getElementById('btnQuickAssign')?.addEventListener('click', () => {
    let caseItem = store.followUpCases.find(c => c.responseId === selectedItem.id);
    if (!caseItem) {
      caseItem = { id: 'c_' + Date.now(), responseId: selectedItem.id, unitCode: selectedItem.unitCode, student: selectedItem.student || 'Anônimo', npsScore: selectedItem.npsScore, comment: selectedItem.comment || '', status: 'in_progress', priority: selectedItem.npsScore <= 6 ? 'high' : 'medium', assignedUser: 'Você (Gestor)', createdAt: new Date().toISOString() };
      store.followUpCases.push(caseItem);
    } else {
      caseItem.status = 'in_progress';
      caseItem.assignedUser = 'Você (Gestor)';
    }
    renderResponsesInbox();
    showToast('✓ Atendimento atribuído a você!', 'info');
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
  document.getElementById('btnQuickInternalNote')?.addEventListener('click', () => { store.activeCommTab = 'internal'; renderResponsesInbox(); document.getElementById('inputInternalNote')?.focus(); });

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
