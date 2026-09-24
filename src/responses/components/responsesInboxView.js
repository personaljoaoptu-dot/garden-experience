/**
 * 3-Column Responses Inbox & Communication Center Component
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass } from '../../surveys/services/npsService.js';
import { replaceDynamicVariables } from '../../communication/services/variableEngine.js';
import { showConfirmationModal } from '../../shared/modals/confirmModal.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';

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
  } else if (store.inboxFilter === 'pending_case') {
    const pendingResIds = store.followUpCases.filter(c => c.status === 'pending' || c.status === 'in_progress').map(c => c.responseId);
    items = items.filter(r => pendingResIds.includes(r.id));
  } else if (store.inboxFilter === 'resolved_case') {
    const resolvedResIds = store.followUpCases.filter(c => c.status === 'resolved').map(c => c.responseId);
    items = items.filter(r => resolvedResIds.includes(r.id));
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
    listContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">Nenhuma resposta encontrada.</div>';
    if (detailPane) {
      detailPane.innerHTML = '<div style="color:var(--text-muted); text-align:center; margin-top:3rem;">Nenhuma resposta para exibir com os filtros atuais.</div>';
    }
    return;
  }

  if (!store.selectedResponseId || !items.some(i => i.id === store.selectedResponseId)) {
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
      <div class="inbox-item-top">
        <span class="inbox-student-name">${escapeHtml(item.student || 'Anônimo')}</span>
        <span class="badge-status ${catClass}">NPS ${item.npsScore}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(unitName)} • ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="inbox-item-comment-snippet">"${escapeHtml(item.comment || 'Sem comentário preenchido.')}"</div>
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
    <div class="detail-header-card">
      <div>
        <h2 class="detail-student-title">${escapeHtml(selectedItem.student || 'Anônimo')}</h2>
        <div class="detail-meta-row">
          <span>Unidade: <strong>${escapeHtml(unitName)}</strong></span>
          <span>Canal: <strong>${escapeHtml(selectedItem.origin.toUpperCase())}</strong></span>
          <span>E-mail: <strong>${escapeHtml(selectedItem.email || 'Não informado')}</strong></span>
          <span>Telefone: <strong>${escapeHtml(selectedItem.phone || 'Não informado')}</strong></span>
        </div>
      </div>
      <span class="badge-status ${catClass}" style="font-size:1.1rem; padding:0.5rem 1.2rem; font-weight:700;">NPS ${selectedItem.npsScore}</span>
    </div>

    ${linkedCase ? `
      <div class="glass-card mb-3" style="border-color:var(--color-detractor-border); background:var(--color-detractor-bg); padding:0.85rem 1rem;">
        <div style="display:flex; justify-space-between; align-items:center;">
          <h4 style="color:var(--color-detractor); font-size:0.9rem; font-weight:700; margin:0;">⚠️ CASO DE DETRATOR VINCULADO (${linkedCase.id})</h4>
          <span class="badge-status ${linkedCase.status === 'pending' ? 'pending' : linkedCase.status === 'in_progress' ? 'in_progress' : 'resolved'}">${linkedCase.status === 'pending' ? 'Pendente' : linkedCase.status === 'in_progress' ? 'Em Tratativa' : 'Resolvido'}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-main); margin-top:0.3rem;">Responsável: <strong>${escapeHtml(linkedCase.assignedUser)}</strong> • Prioridade: <strong>${linkedCase.priority.toUpperCase()}</strong></p>
      </div>
    ` : ''}

    <div class="detail-quick-actions-bar">
      <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-right:0.3rem;">AÇÕES RÁPIDAS:</span>
      
      ${(!linkedCase || linkedCase.status !== 'resolved') ? `
        <button type="button" class="btn-action-pill primary" id="btnQuickAssign">👤 Assumir Resposta</button>
        <button type="button" class="btn-action-pill" id="btnQuickResolve" style="border-color:var(--color-promoter); color:var(--color-promoter);">✅ Resolver Atendimento</button>
      ` : `<span style="font-size:0.8rem; color:var(--color-promoter); font-weight:600; padding:0.3rem 0.6rem; background:var(--color-promoter-bg); border-radius:6px;">✓ Caso Resolvido</span>`}

      <button type="button" class="btn-action-pill" id="btnQuickWhatsapp">💬 WhatsApp</button>
      <button type="button" class="btn-action-pill" id="btnQuickEmail">✉️ E-mail</button>
      <button type="button" class="btn-action-pill" id="btnQuickInternalNote">📝 Nota Interna</button>
    </div>

    <div class="mb-3">
      <div class="detail-section-title">COMENTÁRIO DO ALUNO</div>
      <div class="detail-comment-quote">"${escapeHtml(selectedItem.comment || 'Nenhum comentário em texto foi preenchido nesta avaliação.')}"</div>
    </div>

    <div class="comm-tabs-container">
      <div class="detail-section-title" style="margin-bottom:0.75rem;">CENTRAL DE COMUNICAÇÃO & ATENDIMENTO</div>
      <div class="comm-tabs-header">
        <button class="comm-tab-btn ${store.activeCommTab === 'internal' ? 'active' : ''}" id="btnTabCommInternal">📝 Nota Interna</button>
        <button class="comm-tab-btn ${store.activeCommTab === 'email' ? 'active' : ''}" id="btnTabCommEmail">✉️ E-mail ${selectedItem.email ? '🟢' : '⚪'}</button>
        <button class="comm-tab-btn ${store.activeCommTab === 'whatsapp' ? 'active' : ''}" id="btnTabCommWhatsapp">💬 WhatsApp ${selectedItem.phone ? '🟢' : '⚪'}</button>
      </div>

      <div id="paneCommInternal" class="comm-tab-pane ${store.activeCommTab === 'internal' ? 'active' : ''}">
        <label style="font-size:0.8rem; color:var(--text-muted);">Comentário interno da equipe (NÃO enviado ao aluno):</label>
        <textarea id="inputInternalNote" class="textarea-input mt-2" rows="3" placeholder="Ex: Entrar em contato com o gerente da unidade..."></textarea>
        <div class="mt-2 text-right" style="display:flex; justify-content:flex-end;">
          <button class="btn-primary-gold btn-sm" id="btnSaveInternalNote">💾 Salvar Nota Interna</button>
        </div>
      </div>

      <div id="paneCommEmail" class="comm-tab-pane ${store.activeCommTab === 'email' ? 'active' : ''}">
        ${!selectedItem.email ? `
          <div style="padding:1rem; background:rgba(255,255,255,0.03); border-radius:8px; color:var(--text-muted); font-size:0.85rem; text-align:center;">
            ✉️ <strong>E-mail não informado pelo aluno</strong> (Resposta Anônima).
          </div>
        ` : `
          <div class="template-picker-bar">
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">Mensagem Padrão:</span>
            <select id="selectEmailTemplate" class="select-input template-select-box">
              <option value="">-- Selecionar Resposta Pronta --</option>
              ${store.messageTemplates.filter(t => t.isActive).map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
            <button class="btn-secondary-gold btn-sm" id="btnApplyTemplate">Usar Template</button>
          </div>
          <div class="filter-group mb-2"><label>Para:</label><input type="text" id="inputEmailTo" class="text-input" value="${escapeHtml(selectedItem.email)}" readonly></div>
          <div class="filter-group mb-2"><label>Assunto:</label><input type="text" id="inputEmailSubject" class="text-input" placeholder="Assunto do e-mail..."></div>
          <div class="filter-group mb-2"><label>Mensagem:</label><textarea id="inputEmailBody" class="textarea-input" rows="5" placeholder="Escreva a resposta ao aluno..."></textarea></div>
          <div style="display:flex; justify-content:space-between; align-items:center;" class="mt-2">
            <span class="provider-status-badge warning">⚠️ Provider Transacional Pendente (EMAIL_PROVIDER_REQUIRED)</span>
            <button class="btn-primary-gold btn-sm" id="btnSendEmail">✉️ Registrar E-mail Enviado</button>
          </div>
        `}
      </div>

      <div id="paneCommWhatsapp" class="comm-tab-pane ${store.activeCommTab === 'whatsapp' ? 'active' : ''}">
        ${!selectedItem.phone ? `
          <div style="padding:1rem; background:rgba(255,255,255,0.03); border-radius:8px; color:var(--text-muted); font-size:0.85rem; text-align:center;">
            💬 <strong>Telefone não informado pelo aluno.</strong>
          </div>
        ` : `
          <div class="provider-status-badge info mb-2">🟢 Telefone informado: ${escapeHtml(selectedItem.phone)} (WhatsApp Direto)</div>
          <div class="filter-group mb-2"><label>Mensagem WhatsApp:</label><textarea id="inputWhatsappBody" class="textarea-input" rows="4" placeholder="Escreva a mensagem para o WhatsApp..."></textarea></div>
          <div style="display:flex; justify-content:space-between; align-items:center;" class="mt-2">
            <span style="font-size:0.75rem; color:var(--text-muted);">* Ação abre link wa.me/ e copia o texto.</span>
            <div class="btn-group-row">
              <button class="btn-outline-gold btn-sm" id="btnCopyWaMsg">📋 Copiar Mensagem</button>
              <button class="btn-primary-gold btn-sm" id="btnOpenWa">💬 Abrir no WhatsApp Web</button>
            </div>
          </div>
        `}
      </div>
    </div>

    <div>
      <div class="detail-section-title" style="margin-top:1rem;">HISTÓRICO DE COMUNICAÇÃO & ATIVIDADES</div>
      <div class="timeline-container" id="inboxTimelineContainer"></div>
    </div>
  `;

  attachDetailHandlers(selectedItem);
  renderTimelineForResponse(selectedItem.id);
}

function attachDetailHandlers(selectedItem) {
  document.getElementById('btnQuickAssign')?.addEventListener('click', () => {
    let caseItem = store.followUpCases.find(c => c.responseId === selectedItem.id);
    if (!caseItem) {
      caseItem = {
        id: 'c_' + Date.now(),
        responseId: selectedItem.id,
        unitCode: selectedItem.unitCode,
        student: selectedItem.student || 'Anônimo',
        npsScore: selectedItem.npsScore,
        comment: selectedItem.comment || '',
        status: 'in_progress',
        priority: selectedItem.npsScore <= 6 ? 'high' : 'medium',
        assignedUser: 'Você (Gestor)',
        createdAt: new Date().toISOString()
      };
      store.followUpCases.push(caseItem);
    } else {
      caseItem.status = 'in_progress';
      caseItem.assignedUser = 'Você (Gestor)';
    }
    renderResponsesInbox();
    showToast('✓ Atendimento atribuído a você com sucesso!', 'info');
  });

  document.getElementById('btnQuickResolve')?.addEventListener('click', () => {
    showConfirmationModal({
      icon: '✅',
      title: 'Resolver Atendimento',
      message: `Deseja marcar o atendimento de ${selectedItem.student || 'Anônimo'} como Resolvido?`,
      onConfirm: () => {
        let caseItem = store.followUpCases.find(c => c.responseId === selectedItem.id);
        if (!caseItem) {
          caseItem = {
            id: 'c_' + Date.now(),
            responseId: selectedItem.id,
            unitCode: selectedItem.unitCode,
            student: selectedItem.student || 'Anônimo',
            npsScore: selectedItem.npsScore,
            comment: selectedItem.comment || '',
            status: 'resolved',
            priority: 'low',
            assignedUser: 'Você (Gestor)',
            createdAt: new Date().toISOString()
          };
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

  document.getElementById('btnTabCommInternal')?.addEventListener('click', () => { store.activeCommTab = 'internal'; renderResponsesInbox(); });
  document.getElementById('btnTabCommEmail')?.addEventListener('click', () => { store.activeCommTab = 'email'; renderResponsesInbox(); });
  document.getElementById('btnTabCommWhatsapp')?.addEventListener('click', () => { store.activeCommTab = 'whatsapp'; renderResponsesInbox(); });

  document.getElementById('btnApplyTemplate')?.addEventListener('click', () => {
    const tplId = document.getElementById('selectEmailTemplate')?.value;
    if (!tplId) return alert('Por favor, selecione uma mensagem padrão.');
    const tpl = store.messageTemplates.find(t => t.id === tplId);
    if (tpl) {
      const activeOrg = store.getActiveOrg();
      document.getElementById('inputEmailSubject').value = replaceDynamicVariables(tpl.subject || '', selectedItem, activeOrg, store.UNITS);
      document.getElementById('inputEmailBody').value = replaceDynamicVariables(tpl.body || '', selectedItem, activeOrg, store.UNITS);
    }
  });

  document.getElementById('btnSaveInternalNote')?.addEventListener('click', () => {
    const noteText = document.getElementById('inputInternalNote')?.value;
    if (!noteText || !noteText.trim()) return alert('Digite a nota interna.');

    store.communicationLogs.unshift({
      id: 'log_' + Date.now(),
      responseId: selectedItem.id,
      channel: 'internal',
      direction: 'internal',
      subject: 'Nota Interna',
      body: noteText.trim(),
      status: 'sent',
      createdBy: 'Você (Gestor)',
      createdAt: new Date().toISOString()
    });
    renderResponsesInbox();
    showToast('✓ Nota interna registrada!', 'success');
  });

  document.getElementById('btnSendEmail')?.addEventListener('click', () => {
    const subject = document.getElementById('inputEmailSubject')?.value;
    const body = document.getElementById('inputEmailBody')?.value;
    if (!body || !body.trim()) return alert('Digite a mensagem.');

    store.communicationLogs.unshift({
      id: 'log_' + Date.now(),
      responseId: selectedItem.id,
      channel: 'email',
      direction: 'outbound',
      recipient: selectedItem.email,
      subject: subject || 'Atendimento',
      body: body.trim(),
      status: 'draft',
      createdBy: 'Você (Gestor)',
      createdAt: new Date().toISOString()
    });
    renderResponsesInbox();
    showToast('✓ E-mail gravado no histórico (Rascunho / Provider Pendente)', 'info');
  });

  document.getElementById('btnCopyWaMsg')?.addEventListener('click', () => {
    const body = document.getElementById('inputWhatsappBody')?.value || '';
    if (!body.trim()) return alert('Digite a mensagem.');
    navigator.clipboard.writeText(body);
    showToast('✓ Mensagem copiada para a área de transferência!', 'info');
  });

  document.getElementById('btnOpenWa')?.addEventListener('click', () => {
    const body = document.getElementById('inputWhatsappBody')?.value || '';
    const cleanPhone = (selectedItem.phone || '').replace(/\D/g, '');
    const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(body)}`;

    store.communicationLogs.unshift({
      id: 'log_' + Date.now(),
      responseId: selectedItem.id,
      channel: 'whatsapp',
      direction: 'outbound',
      recipient: selectedItem.phone,
      subject: 'WhatsApp Direct Link',
      body: body || 'Mensagem enviada via wa.me/',
      status: 'sent',
      createdBy: 'Você (Gestor)',
      createdAt: new Date().toISOString()
    });

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
    container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:0.5rem 0;">Nenhuma comunicação registrada ainda.</div>';
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const iconDot = log.channel === 'internal' ? '📝' : log.channel === 'email' ? '✉️' : '💬';
    const statusText = log.status === 'draft' ? '⏳ Rascunho / Provider Pendente' : '✓ Registrado';

    item.innerHTML = `
      <div class="timeline-icon-dot">${iconDot}</div>
      <div class="timeline-header">
        <span class="timeline-author">${escapeHtml(log.createdBy)} • <span style="color:var(--gold-primary); font-size:0.78rem;">${log.channel.toUpperCase()}</span></span>
        <span class="timeline-time">${new Date(log.createdAt).toLocaleString()}</span>
      </div>
      ${log.subject ? `<div class="timeline-subject">${escapeHtml(log.subject)}</div>` : ''}
      <div class="timeline-body">${escapeHtml(log.body)}</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem; text-align:right;">Status: ${statusText}</div>
    `;
    container.appendChild(item);
  });
}
