/**
 * Experience Inbox Component Logic & Rendering
 * Clean, action-oriented Customer Response Center with 1-click WhatsApp and Email reply flows.
 */

import { store } from '../../app/app-state/store.js';
import { getNpsCategoryClass } from '../../surveys/services/npsService.js';
import { showConfirmationModal } from '../../shared/modals/confirmModal.js';
import { showToast } from '../../shared/feedback/toast.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { updateDashboard } from '../../dashboard/components/dashboardView.js';
import { openStudentEvolutionDetail } from '../../students/components/studentEvolutionView.js';
import { resolveTouchpointMeta } from '../../students/components/studentTouchpointEvolution.js';
import { communicationRepository } from '../../communication/repositories/communicationRepository.js';
import { followupsRepository } from '../../followups/repositories/followupsRepository.js';
import {
  getOrganizationEmailConfig,
  saveOrganizationEmailConfig,
  isDirectEmailConfigured,
  sendDirectCustomerEmail
} from '../../followups/services/directEmailService.js';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getMonthKey(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ymKey) {
  const [yStr, mStr] = (ymKey || '').split('-');
  const y = parseInt(yStr, 10);
  const mIdx = parseInt(mStr, 10) - 1;
  if (isNaN(y) || isNaN(mIdx) || mIdx < 0 || mIdx > 11) return ymKey;
  return `${MONTH_NAMES_PT[mIdx]}/${y}`;
}

function populateInboxMonthSelect() {
  const selectEl = document.getElementById('inboxFilterMonth');
  if (!selectEl) return;
  const currentVal = selectEl.value || 'all';
  const now = new Date();
  const currentYm = getMonthKey(now);
  const prevYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const monthCounts = {};
  (store.localResponses || []).forEach(r => {
    if (!r.createdAt) return;
    const d = new Date(r.createdAt);
    if (!isNaN(d.getTime())) {
      const ym = getMonthKey(d);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }
  });

  const monthSet = new Set([currentYm, prevYm, ...Object.keys(monthCounts)]);
  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  let html = `<option value="all">📊 Todos os Meses (${(store.localResponses || []).length})</option>`;
  sortedMonths.forEach(ym => {
    const cnt = monthCounts[ym] || 0;
    if (ym === currentYm) {
      html += `<option value="current_month">📅 ${formatMonthLabel(ym)} — Mês Atual (${cnt})</option>`;
    } else if (ym === prevYm) {
      html += `<option value="prev_month">📅 ${formatMonthLabel(ym)} — Mês Anterior (${cnt})</option>`;
    } else {
      html += `<option value="month:${ym}">📁 ${formatMonthLabel(ym)} (${cnt})</option>`;
    }
  });

  selectEl.innerHTML = html;
  if (Array.from(selectEl.options).some(o => o.value === currentVal)) {
    selectEl.value = currentVal;
  }
}

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
    searchInput.value = '';
    store.inboxSearchQuery = '';
    searchInput.addEventListener('input', (e) => {
      if (searchInput.hasAttribute('readonly')) {
        searchInput.value = '';
        store.inboxSearchQuery = '';
        return;
      }
      store.inboxSearchQuery = e.target.value.toLowerCase().trim();
      renderResponsesInbox();
    });
  }

  const monthSelect = document.getElementById('inboxFilterMonth');
  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      renderResponsesInbox();
    });
  }
}

function buildDefaultSubject(item, orgName) {
  const score = Number(item.npsScore);
  if (score <= 6) {
    return `Queremos ouvir você e melhorar sua experiência — ${orgName}`;
  }
  if (score <= 8) {
    return `Obrigado pela sua avaliação! Como podemos chegar ao 10? — ${orgName}`;
  }
  return `Muito obrigado pela sua nota ${score}/10! ✨ — ${orgName}`;
}

function buildDefaultMessage(item, orgName, unitName) {
  const studentName = item.student && item.student !== 'Anônimo' ? item.student.split(' ')[0] : 'aluno(a)';
  const score = Number(item.npsScore);

  if (score <= 6) {
    return `Olá, ${studentName}! Tudo bem?\n\nAqui é da Gestão de Experiência da ${orgName} (Unidade ${unitName}). Recebemos a sua avaliação (nota ${score}/10) e agradecemos muito a sua transparência.\n\nSentimos muito que a sua experiência não tenha atingido o padrão de excelência que buscamos todos os dias. Já estamos verificando os pontos sinalizados com a coordenação da unidade e gostaríamos muito de ouvir você pessoalmente ou por aqui para resolvermos isso da melhor forma.\n\nPodemos conversar rapidinho?\n\nAtenciosamente,\nEquipe de Experiência — ${orgName} (${unitName})`;
  }
  if (score <= 8) {
    return `Olá, ${studentName}! Tudo bem?\n\nAqui é da equipe da ${orgName} (Unidade ${unitName}). Muito obrigado por dedicar um tempinho para avaliar a nossa academia com a nota ${score}/10!\n\nSua opinião vale ouro para nós. Conta pra gente: qual detalhe nos nossos treinos, equipamentos ou atendimento podemos aprimorar para conquistarmos uma nota 10 na sua próxima avaliação?\n\nUm grande abraço e excelentes treinos!\nEquipe ${orgName} (${unitName})`;
  }
  return `Olá, ${studentName}! Tudo bem?\n\nAqui é da equipe da ${orgName} (Unidade ${unitName}). Passando para agradecer de coração pela sua nota ${score}/10 em nossa pesquisa de satisfação! 🏆✨\n\nFicamos muito felizes em saber que você está tendo uma excelente experiência de treino conosco. Continue contando sempre com toda a nossa equipe para alcançar seus melhores resultados!\n\nBons treinos! 💪🔥\nEquipe ${orgName} (${unitName})`;
}

export function renderResponsesInbox() {
  const listContainer = document.getElementById('inboxItemsList');
  const countBadge = document.getElementById('inboxListCountBadge');
  const detailPane = document.getElementById('inboxDetailPane');
  const searchInput = document.getElementById('inputResponsesSearch');

  if (searchInput && searchInput.hasAttribute('readonly') && searchInput.value) {
    searchInput.value = '';
    store.inboxSearchQuery = '';
  }

  if (!listContainer) return;
  listContainer.innerHTML = '';

  populateInboxMonthSelect();

  const unitFilter = document.getElementById('filterUnit')?.value || 'all';
  const monthFilter = document.getElementById('inboxFilterMonth')?.value || 'all';
  let items = [...store.localResponses];

  if (unitFilter !== 'all') {
    items = items.filter(r => r.unitCode === unitFilter);
  }

  if (monthFilter !== 'all') {
    const now = new Date();
    let targetYm = null;
    if (monthFilter === 'current_month') {
      targetYm = getMonthKey(now);
    } else if (monthFilter === 'prev_month') {
      targetYm = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    } else if (monthFilter.startsWith('month:')) {
      targetYm = monthFilter.replace('month:', '');
    }
    if (targetYm) {
      items = items.filter(r => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        return !isNaN(d.getTime()) && getMonthKey(d) === targetYm;
      });
    }
  }

  if (store.inboxFilter === 'promoter') {
    items = items.filter(r => r.npsScore >= 9);
  } else if (store.inboxFilter === 'passive') {
    items = items.filter(r => r.npsScore >= 7 && r.npsScore <= 8);
  } else if (store.inboxFilter === 'detractor') {
    items = items.filter(r => r.npsScore <= 6);
  } else if (store.inboxFilter === 'unreplied') {
    items = items.filter(r => !store.communicationLogs.some(l => l.responseId === r.id));
  } else if (store.inboxFilter === 'no_comment') {
    items = items.filter(r => !r.comment || !r.comment.trim());
  }

  if (store.inboxSearchQuery) {
    const q = store.inboxSearchQuery;
    items = items.filter(r =>
      (r.student && r.student.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q))
    );
  }

  if (countBadge) countBadge.textContent = `${items.length} ${items.length === 1 ? 'avaliação' : 'avaliações'}`;

  if (!items.length) {
    listContainer.innerHTML = `
      <div class="empty-state-card" style="padding:2rem 1rem;">
        <div class="empty-state-icon">📥</div>
        <h4 class="empty-state-title">Nenhuma resposta encontrada</h4>
        <p class="empty-state-desc">Nenhum feedback corresponde aos filtros selecionados.</p>
        ${(store.inboxSearchQuery || (store.inboxFilter && store.inboxFilter !== 'all')) ? `
          <button type="button" id="btnResetInboxFilters" class="btn-outline-gold btn-sm" style="margin-top:0.75rem;">
            🔄 Limpar Filtros e Mostrar Todas
          </button>
        ` : ''}
      </div>
    `;
    document.getElementById('btnResetInboxFilters')?.addEventListener('click', () => {
      store.inboxSearchQuery = '';
      store.inboxFilter = 'all';
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('[data-inbox-filter]').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-inbox-filter') === 'all');
      });
      renderResponsesInbox();
    });
    if (detailPane) {
      detailPane.innerHTML = `
        <div class="empty-state-card" style="margin-top:3rem;">
          <div class="empty-state-icon">🔍</div>
          <h4 class="empty-state-title">Selecione uma avaliação</h4>
          <p class="empty-state-desc">Escolha um cliente na lista ao lado para ver a nota e responder por WhatsApp ou E-mail.</p>
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
    const hasLogs = store.communicationLogs.some(l => l.responseId === item.id);
    const linkedCase = store.followUpCases.find(c => c.responseId === item.id);
    const isResolved = linkedCase?.status === 'resolved';

    const isTabletOrigin = item.origin === 'tablet' || item.origin === 'kiosk';
    const originBadgeHtml = isTabletOrigin
      ? '<span style="color:var(--gold-primary); background:rgba(229,185,63,0.12); padding:2px 6px; border-radius:4px;">📱 Totem</span>'
      : '<span style="color:var(--text-muted); background:var(--bg-card); border:1px solid var(--border-subtle); padding:1px 6px; border-radius:4px;">📷 QR Code</span>';

    const div = document.createElement('div');
    div.className = `inbox-item-card ${isSelected ? 'selected' : ''}`;
    div.style.cssText = `padding: 0.9rem 1rem; border-radius: 10px; border: 1px solid ${isSelected ? 'var(--gold-primary)' : 'var(--border-subtle)'}; cursor: pointer; border-left: 4px solid ${isSelected ? 'var(--gold-primary)' : 'transparent'}; background: ${isSelected ? 'var(--gold-soft)' : 'var(--bg-card-surface)'}; transition: all 0.15s ease;`;
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem; gap:0.5rem;">
        <span style="font-weight:700; font-size:0.9rem; color:var(--text-title); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.student || 'Anônimo')}</span>
        <span class="nps-badge ${catClass}" style="font-size:0.75rem; flex-shrink:0;">Nota ${item.npsScore}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.74rem; color:var(--text-muted); margin-bottom:0.4rem;">
        <span>📍 ${escapeHtml(unitName)}</span>
        <span>${new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
      </div>
      <div style="font-size:0.8rem; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:0.4rem;">
        ${item.comment ? `"${escapeHtml(item.comment)}"` : '<span style="color:var(--text-dim); font-style:italic;">Sem comentário em texto</span>'}
      </div>
      <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap; font-size:0.7rem;">
        ${originBadgeHtml}
        ${item.phone ? '<span style="color:#10b981; background:rgba(16,185,129,0.1); padding:2px 6px; border-radius:4px;">📱 WhatsApp</span>' : ''}
        ${item.email ? '<span style="color:#60a5fa; background:rgba(96,165,250,0.1); padding:2px 6px; border-radius:4px;">✉️ E-mail</span>' : ''}
        ${hasLogs ? '<span style="color:var(--gold-primary); background:rgba(229,185,63,0.12); padding:2px 6px; border-radius:4px;">✓ Respondido</span>' : ''}
        ${isResolved ? '<span style="color:#10b981; background:rgba(16,185,129,0.12); padding:2px 6px; border-radius:4px;">✅ Resolvido</span>' : ''}
      </div>
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
  const activeOrg = store.getActiveOrg();
  const orgName = activeOrg?.tradeName || activeOrg?.name || 'Garden Gold Academia';
  const u = store.UNITS.find(unit => unit.code === selectedItem.unitCode);
  const unitName = u ? u.name : selectedItem.unitCode;
  const catClass = getNpsCategoryClass(selectedItem.npsScore);
  const linkedCase = store.followUpCases.find(c => c.responseId === selectedItem.id);

  // Default tab to 'whatsapp' (or 'email' if user only provided email and no phone)
  if (!store.activeCommTab || !['whatsapp', 'email', 'internal'].includes(store.activeCommTab)) {
    store.activeCommTab = (!selectedItem.phone && selectedItem.email) ? 'email' : 'whatsapp';
  }
  const activeTab = store.activeCommTab;

  const defaultMessage = buildDefaultMessage(selectedItem, orgName, unitName);
  const defaultSubject = buildDefaultSubject(selectedItem, orgName);

  const categoryLabel =
    selectedItem.npsScore >= 9
      ? 'Promotor (9–10)'
      : selectedItem.npsScore >= 7
        ? 'Neutro / Passivo (7–8)'
        : 'Detrator (0–6)';

  const isSelectedTablet = selectedItem.origin === 'tablet' || selectedItem.origin === 'kiosk';
  const originText = isSelectedTablet ? '📱 Totem / Tablet' : '📷 QR Code / Link';

  detailPane.innerHTML = `
    <!-- 1. Top Customer Summary Card -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; padding-bottom:1.25rem; border-bottom:1px solid var(--border-subtle); margin-bottom:1.25rem;">
      <div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.4rem;">
          <h2 style="font-size:1.35rem; font-weight:700; color:var(--text-title); margin:0;">${escapeHtml(selectedItem.student || 'Anônimo')}</h2>
          <span class="nps-badge ${catClass}" style="font-size:0.9rem; padding:0.3rem 0.85rem;">Nota ${selectedItem.npsScore}/10 • ${categoryLabel}</span>
          ${linkedCase?.status === 'resolved' ? '<span class="badge-status resolved">✅ Atendimento Concluído</span>' : ''}
        </div>
        <div style="display:flex; gap:1.1rem; font-size:0.82rem; color:var(--text-muted); flex-wrap:wrap; margin-top:0.35rem;">
          <span>📍 Unidade: <strong style="color:var(--text-main);">${escapeHtml(unitName)}</strong></span>
          <span>📅 Data: <strong style="color:var(--text-main);">${new Date(selectedItem.createdAt).toLocaleString('pt-BR')}</strong></span>
          <span>📡 Canal: <strong style="color:var(--gold-primary);">${originText}</strong></span>
          <span>📱 WhatsApp: <strong style="color:${selectedItem.phone ? '#10b981' : 'var(--text-dim)'};">${escapeHtml(selectedItem.phone || 'Não informado no formulário')}</strong></span>
          <span>✉️ E-mail: <strong style="color:${selectedItem.email ? '#60a5fa' : 'var(--text-dim)'};">${escapeHtml(selectedItem.email || 'Não informado no formulário')}</strong></span>
        </div>
      </div>

      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        ${selectedItem.studentId ? `
          <button type="button" class="btn-outline-gold btn-sm" id="btnViewStudentEvolution">📈 Ver Evolução do Aluno</button>
        ` : ''}
        ${(!linkedCase || linkedCase.status !== 'resolved') ? `
          <button type="button" class="btn-primary-gold btn-sm" id="btnQuickResolve">✅ Concluir Atendimento</button>
        ` : ''}
      </div>
    </div>

    <!-- 2. Customer Feedback & Touchpoints -->
    <div style="display:grid; grid-template-columns: 1fr; gap:1rem; margin-bottom:1.5rem;">
      <div style="padding:1rem 1.2rem; background:var(--bg-card-surface); border:1px solid var(--border-subtle); border-radius:10px;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--gold-primary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">💬 Comentário deixado pelo cliente</div>
        <div style="font-size:0.95rem; color:var(--text-title); line-height:1.5;">
          ${selectedItem.comment ? `"${escapeHtml(selectedItem.comment)}"` : '<span style="color:var(--text-muted); font-style:italic;">O cliente avaliou apenas com a nota numérica e não deixou comentário por escrito.</span>'}
        </div>
      </div>
      ${renderTouchpointRatingsBlock(selectedItem)}
    </div>

    <!-- 3. Direct Reply Hub (WhatsApp & E-mail Tabs) -->
    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:1.25rem; margin-bottom:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
        <div>
          <h3 style="font-size:1rem; font-weight:700; color:var(--text-title); margin:0;">Responder ao Cliente</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:0.15rem 0 0 0;">Escolha o canal abaixo para enviar uma mensagem no WhatsApp ou disparar o E-mail automaticamente.</p>
        </div>

        <!-- Channel Selector Tabs -->
        <div style="display:flex; gap:0.4rem; background:rgba(13,17,23,0.65); padding:0.3rem; border-radius:10px; border:1px solid var(--border-subtle);">
          <button type="button" id="tabReplyWhatsapp" style="padding:0.45rem 0.9rem; border-radius:7px; border:none; font-size:0.82rem; font-weight:700; cursor:pointer; background:${activeTab === 'whatsapp' ? '#10b981' : 'transparent'}; color:${activeTab === 'whatsapp' ? '#0d1117' : 'var(--text-muted)'}; transition:all 0.15s;">
            💬 Enviar WhatsApp
          </button>
          <button type="button" id="tabReplyEmail" style="padding:0.45rem 0.9rem; border-radius:7px; border:none; font-size:0.82rem; font-weight:700; cursor:pointer; background:${activeTab === 'email' ? 'var(--gold-primary)' : 'transparent'}; color:${activeTab === 'email' ? '#0d1117' : 'var(--text-muted)'}; transition:all 0.15s;">
            ✉️ Responder por E-mail
          </button>
          <button type="button" id="tabReplyInternal" style="padding:0.45rem 0.9rem; border-radius:7px; border:none; font-size:0.82rem; font-weight:700; cursor:pointer; background:${activeTab === 'internal' ? 'rgba(255,255,255,0.14)' : 'transparent'}; color:${activeTab === 'internal' ? '#ffffff' : 'var(--text-muted)'}; transition:all 0.15s;">
            📝 Nota Interna
          </button>
        </div>
      </div>

      <!-- Quick Template Buttons (for WhatsApp & Email) -->
      <div id="replyTemplatePillsRow" style="display:${activeTab === 'internal' ? 'none' : 'flex'}; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.9rem;">
        <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.25rem;">Modelos rápidos:</span>
        <button type="button" class="btn-outline-gold btn-sm" data-tpl="auto" style="font-size:0.74rem; padding:0.25rem 0.6rem;">✨ Sugestão Automática (Nota ${selectedItem.npsScore})</button>
        <button type="button" class="btn-outline-gold btn-sm" data-tpl="detractor" style="font-size:0.74rem; padding:0.25rem 0.6rem;">🤝 Recuperar Detrator (0–6)</button>
        <button type="button" class="btn-outline-gold btn-sm" data-tpl="passive" style="font-size:0.74rem; padding:0.25rem 0.6rem;">💡 Engajar Neutro (7–8)</button>
        <button type="button" class="btn-outline-gold btn-sm" data-tpl="promoter" style="font-size:0.74rem; padding:0.25rem 0.6rem;">🎉 Agradecer Promotor (9–10)</button>
      </div>

      <!-- TAB 1: WHATSAPP -->
      <div id="paneCommWhatsapp" style="display:${activeTab === 'whatsapp' ? 'block' : 'none'};">
        <div style="margin-bottom:0.85rem;">
          <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
            Número do WhatsApp do Cliente (com DDD):
          </label>
          <input type="text" id="inputWhatsappPhone" class="text-input" value="${escapeHtml(selectedItem.phone || '')}" placeholder="Ex: (11) 99999-9999 — Digite o número caso o aluno não tenha preenchido">
        </div>

        <div style="margin-bottom:0.85rem;">
          <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
            Mensagem de WhatsApp:
          </label>
          <textarea id="inputWhatsappBody" class="textarea-input" rows="4" placeholder="Escreva a mensagem para o WhatsApp do cliente...">${escapeHtml(defaultMessage)}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:0.6rem; flex-wrap:wrap;">
          <button type="button" class="btn-outline-gold btn-sm" id="btnCopyWaMsg">📋 Copiar Texto</button>
          <button type="button" class="btn-primary-gold btn-sm" id="btnOpenWa" style="background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; border:none; padding:0.6rem 1.2rem; font-weight:700;">
            📲 Enviar Mensagem no WhatsApp
          </button>
        </div>
      </div>

      <!-- TAB 2: EMAIL (Disparo Automático estilo WeHelp) -->
      <div id="paneCommEmail" style="display:${activeTab === 'email' ? 'block' : 'none'};">
        <!-- Status / Config Bar -->
        <div id="emailDirectStatusBar" style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap; padding:0.6rem 0.9rem; background:rgba(212,175,55,0.07); border:1px solid rgba(212,175,55,0.22); border-radius:8px; margin-bottom:0.85rem;">
          <div id="emailDirectStatusText" style="font-size:0.78rem; color:var(--text-main);">
            ⚡ <strong>Disparo Instantâneo:</strong> O e-mail é enviado direto pela plataforma em 1 clique, sem precisar abrir o Gmail.
          </div>
          <button type="button" id="btnToggleEmailConfig" class="btn-outline-gold btn-sm" style="font-size:0.73rem; padding:0.25rem 0.65rem;">
            ⚙️ Configurar Remetente
          </button>
        </div>

        <!-- Inline Sender Configuration Drawer (1-time setup per organization) -->
        <div id="emailDirectConfigDrawer" style="display:none; padding:1rem; background:rgba(13,17,23,0.85); border:1px solid var(--gold-primary); border-radius:10px; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-bottom:0.65rem;">
            <div>
              <div style="font-size:0.86rem; font-weight:700; color:var(--gold-primary);">⚙️ Configurar E-mail de Disparo Automático (Única Vez)</div>
              <div style="font-size:0.76rem; color:var(--text-muted); margin-top:0.15rem; line-height:1.4;">
                Para o sistema disparar os e-mails automaticamente em 1 clique (como na WeHelp), informe seu Gmail e uma <strong>Senha de App de 16 letras do Google</strong>:
              </div>
            </div>
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" class="btn-outline-gold btn-sm" style="font-size:0.73rem; padding:0.3rem 0.65rem; text-decoration:none; white-space:nowrap; flex-shrink:0;">
              🔑 Gerar Senha de App no Google ↗
            </a>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap:0.65rem; margin-bottom:0.75rem;">
            <div>
              <label style="font-size:0.74rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Nome da Academia / Remetente</label>
              <input type="text" id="cfgEmailSenderName" class="text-input" value="${escapeHtml(orgName || 'Garden Experience')}" placeholder="Ex: Garden Experience">
            </div>
            <div>
              <label style="font-size:0.74rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Seu E-mail (Gmail / Remetente)</label>
              <input type="email" id="cfgEmailSenderAddress" class="text-input" value="${escapeHtml(store.currentUser?.email || '')}" placeholder="Ex: contato@suaempresa.com">
            </div>
            <div>
              <label style="font-size:0.74rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Senha de App do Google (16 letras)</label>
              <input type="text" id="cfgEmailSmtpPass" autocomplete="off" spellcheck="false" style="-webkit-text-security:disc;" class="text-input" placeholder="xxxx xxxx xxxx xxxx">
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <span style="font-size:0.72rem; color:var(--text-muted);">
              💡 Dica: No link do Google acima, digite <strong>"Garden"</strong>, clique em Criar e cole o código de 16 letras. Fica salvo para toda a equipe!
            </span>
            <button type="button" id="btnSaveEmailConfig" class="btn-primary-gold btn-sm" style="padding:0.45rem 0.95rem; font-weight:700;">
              💾 Salvar Remetente Automático
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.75rem; margin-bottom:0.85rem;">
          <div>
            <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
              E-mail do Cliente:
            </label>
            <input type="email" id="inputEmailRecipient" class="text-input" value="${escapeHtml(selectedItem.email || '')}" placeholder="Ex: cliente@email.com">
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
              Assunto do E-mail:
            </label>
            <input type="text" id="inputEmailSubject" class="text-input" value="${escapeHtml(defaultSubject)}" placeholder="Assunto do e-mail...">
          </div>
        </div>

        <div style="margin-bottom:0.85rem;">
          <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
            Mensagem do E-mail:
          </label>
          <textarea id="inputEmailBody" class="textarea-input" rows="4" placeholder="Escreva a resposta por e-mail para o aluno...">${escapeHtml(defaultMessage)}</textarea>
        </div>

        <div id="emailDirectFeedbackBox" style="display:none; padding:0.65rem 0.9rem; border-radius:8px; font-size:0.82rem; font-weight:600; margin-bottom:0.75rem;"></div>

        <div style="display:flex; justify-content:flex-end; align-items:center; gap:0.6rem; flex-wrap:wrap;">
          <button type="button" class="btn-outline-gold btn-sm" id="btnCopyEmailMsg">📋 Copiar Texto</button>
          <button type="button" class="btn-primary-gold btn-sm" id="btnSendDirectEmail" style="padding:0.65rem 1.35rem; font-weight:700; font-size:0.86rem;">
            🚀 Enviar E-mail Agora
          </button>
        </div>
      </div>

      <!-- TAB 3: INTERNAL NOTE -->
      <div id="paneCommInternal" style="display:${activeTab === 'internal' ? 'block' : 'none'};">
        <div style="margin-bottom:0.85rem;">
          <label style="font-size:0.78rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.3rem;">
            Anotação Interna da Equipe (visível apenas para gestores):
          </label>
          <textarea id="inputInternalNote" class="textarea-input" rows="3" placeholder="Registre aqui o que foi conversado ou alinhado internamente sobre este caso..."></textarea>
        </div>
        <div style="text-align:right;">
          <button type="button" class="btn-primary-gold btn-sm" id="btnSaveInternalNote">💾 Salvar Nota Interna</button>
        </div>
      </div>
    </div>

    <!-- 4. Timeline History -->
    <div>
      <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.6rem;">
        📋 Histórico de Contatos Realizados neste Atendimento
      </div>
      <div class="timeline-container" id="inboxTimelineContainer"></div>
    </div>
  `;

  attachDetailHandlers(selectedItem, orgName, unitName);
  renderTimelineForResponse(selectedItem.id);
}

function renderTouchpointRatingsBlock(selectedItem) {
  const ratings = selectedItem?.touchpointRatings;
  if (!ratings || typeof ratings !== 'object' || Object.keys(ratings).length === 0) return '';

  const observations = selectedItem?.touchpointObservations || {};
  const entries = Object.entries(ratings).filter(([, val]) => val !== undefined && val !== null && !isNaN(Number(val)));
  if (!entries.length) return '';

  const itemsHtml = entries.map(([tpKey, val], idx) => {
    const score = Math.min(10, Math.max(0, Math.round(Number(val))));
    const meta = resolveTouchpointMeta(tpKey, store.touchpoints, idx + 1);
    const obs = observations[tpKey];
    const scoreColor = score >= 9 ? '#10b981' : score >= 7 ? 'var(--gold-primary)' : '#ef4444';
    return `
      <div style="padding:0.65rem 0.85rem; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); font-size:0.82rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <div>
            <span style="color:var(--text-title); font-weight:600; display:block;">${escapeHtml(meta.name)}</span>
            <span style="font-size:0.7rem; color:var(--text-muted);">📍 ${escapeHtml(meta.category)}</span>
          </div>
          <span style="color:${scoreColor}; font-weight:800; font-size:0.95rem; flex-shrink:0;">${score}<span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">/10</span></span>
        </div>
        ${obs ? `<div style="margin-top:0.4rem; font-size:0.78rem; color:var(--text-title); font-style:italic; background:rgba(255,255,255,0.04); padding:4px 8px; border-radius:5px; border-left:2px solid var(--gold-primary);">💬 "${escapeHtml(obs)}"</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div>
      <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.4rem;">📍 Avaliação por Ponto de Contato (0 a 10)</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.5rem;">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function attachDetailHandlers(selectedItem, orgName, unitName) {
  document.getElementById('btnViewStudentEvolution')?.addEventListener('click', () => {
    if (selectedItem.studentId) {
      openStudentEvolutionDetail(selectedItem.studentId);
    }
  });

  // Tab switchers
  document.getElementById('tabReplyWhatsapp')?.addEventListener('click', () => {
    store.activeCommTab = 'whatsapp';
    renderResponsesInbox();
  });
  document.getElementById('tabReplyEmail')?.addEventListener('click', () => {
    store.activeCommTab = 'email';
    renderResponsesInbox();
  });
  document.getElementById('tabReplyInternal')?.addEventListener('click', () => {
    store.activeCommTab = 'internal';
    renderResponsesInbox();
  });

  // Template pills
  document.querySelectorAll('[data-tpl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tplType = btn.getAttribute('data-tpl');
      let mockScore = selectedItem.npsScore;
      if (tplType === 'detractor') mockScore = 4;
      if (tplType === 'passive') mockScore = 8;
      if (tplType === 'promoter') mockScore = 10;

      const text = buildDefaultMessage({ ...selectedItem, npsScore: mockScore }, orgName, unitName);
      const subject = buildDefaultSubject({ ...selectedItem, npsScore: mockScore }, orgName);
      const waBox = document.getElementById('inputWhatsappBody');
      const emBox = document.getElementById('inputEmailBody');
      const subBox = document.getElementById('inputEmailSubject');
      if (waBox) waBox.value = text;
      if (emBox) emBox.value = text;
      if (subBox) subBox.value = subject;
      showToast('✨ Modelo de mensagem e assunto aplicados!', 'info');
    });
  });

  // Resolve case handler
  document.getElementById('btnQuickResolve')?.addEventListener('click', () => {
    showConfirmationModal({
      icon: '✅',
      title: 'Concluir Atendimento',
      message: `Marcar o atendimento de ${selectedItem.student || 'Anônimo'} como Resolvido?`,
      onConfirm: async () => {
        let caseItem = store.followUpCases.find(c => c.responseId === selectedItem.id);
        const currentUserName = store.currentUser?.name || 'Você (Gestor)';
        const currentUserId = store.currentUser?.id || null;
        const unitObj = store.UNITS.find(u => u.code === selectedItem.unitCode);
        const resolvedUnitId = selectedItem.unitId || unitObj?.id || null;

        if (!caseItem) {
          caseItem = {
            id: 'c_' + Date.now(),
            responseId: selectedItem.id,
            unitId: resolvedUnitId,
            unitCode: selectedItem.unitCode,
            studentId: selectedItem.studentId || null,
            student: selectedItem.student || 'Anônimo',
            npsScore: selectedItem.npsScore,
            comment: selectedItem.comment || '',
            status: 'resolved',
            priority: 'low',
            assignedUserId: currentUserId,
            assignedUser: currentUserName,
            createdAt: new Date().toISOString()
          };
          store.followUpCases.push(caseItem);

          if (store.isSupabaseConnected && store.activeOrgId && resolvedUnitId) {
            const created = await followupsRepository.createCase({
              organizationId: store.activeOrgId,
              responseId: selectedItem.id,
              unitId: resolvedUnitId,
              studentId: selectedItem.studentId || null,
              status: 'resolved',
              priority: 'low',
              assignedUserId: currentUserId
            });
            if (created?.id) caseItem.id = created.id;
          }
        } else {
          caseItem.status = 'resolved';
          caseItem.resolvedAt = new Date().toISOString();
          caseItem.assignedUser = currentUserName;
          if (store.isSupabaseConnected && caseItem.id && !String(caseItem.id).startsWith('c_')) {
            await followupsRepository.updateCaseStatus(caseItem.id, 'resolved', caseItem.assignedUserId || currentUserId);
          }
        }
        renderResponsesInbox();
        updateDashboard();
        showToast('✓ Atendimento marcado como concluído!', 'success');
      }
    });
  });

  // Helper to record communication log in store + Supabase
  const logCommunication = async ({ channel, direction = 'outbound', recipient, subject, body }) => {
    const linkedCase = store.followUpCases.find(c => c.responseId === selectedItem.id);
    const unitObj = store.UNITS.find(u => u.code === selectedItem.unitCode);
    const newLog = {
      id: 'log_' + Date.now(),
      responseId: selectedItem.id,
      caseId: linkedCase && !String(linkedCase.id).startsWith('c_') ? linkedCase.id : null,
      studentId: selectedItem.studentId || null,
      channel,
      direction,
      recipient: recipient || null,
      subject: subject || 'Atendimento',
      body: body.trim(),
      status: 'sent',
      createdBy: store.currentUser?.name || 'Gestor',
      createdAt: new Date().toISOString()
    };
    store.communicationLogs.unshift(newLog);

    if (store.isSupabaseConnected && store.activeOrgId) {
      const saved = await communicationRepository.saveCommunicationLog({
        organization_id: store.activeOrgId,
        unit_id: selectedItem.unitId || unitObj?.id || null,
        response_id: selectedItem.id,
        follow_up_case_id: newLog.caseId,
        student_id: newLog.studentId,
        channel,
        direction,
        recipient: newLog.recipient,
        subject: newLog.subject,
        body: newLog.body,
        status: 'sent'
      });
      if (saved?.data?.id) newLog.id = saved.data.id;
    }
    renderTimelineForResponse(selectedItem.id);
  };

  // WHATSAPP ACTIONS
  document.getElementById('btnCopyWaMsg')?.addEventListener('click', () => {
    const body = document.getElementById('inputWhatsappBody')?.value || '';
    if (!body.trim()) {
      showToast('⚠️ Digite uma mensagem antes de copiar.', 'warning');
      return;
    }
    navigator.clipboard.writeText(body);
    showToast('✓ Mensagem copiada para a área de transferência!', 'success');
  });

  document.getElementById('btnOpenWa')?.addEventListener('click', async () => {
    const phoneVal = document.getElementById('inputWhatsappPhone')?.value.trim() || '';
    const body = document.getElementById('inputWhatsappBody')?.value.trim() || '';
    const cleanPhone = phoneVal.replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      showToast('⚠️ Informe o número de WhatsApp com DDD no campo acima para abrir a conversa.', 'warning');
      document.getElementById('inputWhatsappPhone')?.focus();
      return;
    }

    selectedItem.phone = phoneVal;
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(body)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    await logCommunication({
      channel: 'whatsapp',
      direction: 'outbound',
      recipient: phoneVal,
      subject: 'Mensagem via WhatsApp',
      body: body || 'Contato iniciado via WhatsApp'
    });

    showToast('📲 Conversa aberta no WhatsApp e registrada no histórico!', 'success');
  });

  // EMAIL ACTIONS (WeHelp-style 1-click automatic dispatch)
  document.getElementById('btnCopyEmailMsg')?.addEventListener('click', () => {
    const subject = document.getElementById('inputEmailSubject')?.value || '';
    const body = document.getElementById('inputEmailBody')?.value || '';
    navigator.clipboard.writeText(`${subject}\n\n${body}`);
    showToast('✓ Assunto e mensagem copiados!', 'success');
  });

  const refreshEmailStatusBanner = async () => {
    const statusTextEl = document.getElementById('emailDirectStatusText');
    const statusBarEl = document.getElementById('emailDirectStatusBar');
    const nameInput = document.getElementById('cfgEmailSenderName');
    const emailInput = document.getElementById('cfgEmailSenderAddress');
    const passInput = document.getElementById('cfgEmailSmtpPass');

    const cfg = await getOrganizationEmailConfig(store.activeOrgId);
    if (cfg) {
      if (nameInput && cfg.sender_name) nameInput.value = cfg.sender_name;
      if (emailInput && cfg.sender_email) emailInput.value = cfg.sender_email;
      if (passInput && cfg.smtp_pass) passInput.value = cfg.smtp_pass;
    }

    if (isDirectEmailConfigured(cfg)) {
      if (statusTextEl) {
        statusTextEl.innerHTML = `🟢 <strong>Disparo Automático Ativo:</strong> Enviando diretamente como <strong>${escapeHtml(cfg.sender_name || orgName)} &lt;${escapeHtml(cfg.sender_email)}&gt;</strong>`;
      }
      if (statusBarEl) {
        statusBarEl.style.background = 'rgba(16,185,129,0.08)';
        statusBarEl.style.borderColor = 'rgba(16,185,129,0.28)';
      }
    } else {
      if (statusTextEl) {
        statusTextEl.innerHTML = `⚡ <strong>Disparo Instantâneo:</strong> Configure seu remetente (1 única vez) para enviar e-mails direto em 1 clique.`;
      }
    }
  };

  refreshEmailStatusBanner();

  document.getElementById('btnToggleEmailConfig')?.addEventListener('click', () => {
    const drawer = document.getElementById('emailDirectConfigDrawer');
    if (!drawer) return;
    drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btnSaveEmailConfig')?.addEventListener('click', async () => {
    const senderName = document.getElementById('cfgEmailSenderName')?.value.trim() || orgName || 'Garden Experience';
    const senderEmail = document.getElementById('cfgEmailSenderAddress')?.value.trim() || '';
    const smtpPass = document.getElementById('cfgEmailSmtpPass')?.value.replace(/\s+/g, '') || '';

    if (!senderEmail || !senderEmail.includes('@')) {
      showToast('⚠️ Informe o seu e-mail remetente (ex: seuemail@gmail.com).', 'warning');
      document.getElementById('cfgEmailSenderAddress')?.focus();
      return;
    }
    if (!smtpPass || smtpPass.length < 8) {
      showToast('⚠️ Cole a Senha de App de 16 letras gerada no Google.', 'warning');
      document.getElementById('cfgEmailSmtpPass')?.focus();
      return;
    }

    const saveBtn = document.getElementById('btnSaveEmailConfig');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Salvando...';
    }

    try {
      await saveOrganizationEmailConfig({
        organization_id: store.activeOrgId,
        sender_name: senderName,
        sender_email: senderEmail,
        smtp_pass: smtpPass,
      });
      await refreshEmailStatusBanner();
      const drawer = document.getElementById('emailDirectConfigDrawer');
      if (drawer) drawer.style.display = 'none';
      showToast('✅ Remetente configurado! Agora seus e-mails serão disparados automaticamente em 1 clique.', 'success');
    } catch (err) {
      showToast(`⚠️ ${err.message || 'Erro ao salvar configuração.'}`, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Salvar Remetente Automático';
      }
    }
  });

  document.getElementById('btnSendDirectEmail')?.addEventListener('click', async () => {
    const recipient = document.getElementById('inputEmailRecipient')?.value.trim() || '';
    const subject = document.getElementById('inputEmailSubject')?.value.trim() || 'Retorno sobre sua avaliação';
    const body = document.getElementById('inputEmailBody')?.value.trim() || '';
    const feedbackBox = document.getElementById('emailDirectFeedbackBox');

    if (!recipient || !recipient.includes('@')) {
      showToast('⚠️ Informe o e-mail do cliente no campo acima antes de enviar.', 'warning');
      document.getElementById('inputEmailRecipient')?.focus();
      return;
    }
    if (!body) {
      showToast('⚠️ Digite a mensagem do e-mail.', 'warning');
      document.getElementById('inputEmailBody')?.focus();
      return;
    }

    // Check if user filled the inline drawer inputs right now
    const drawerEmail = document.getElementById('cfgEmailSenderAddress')?.value.trim() || '';
    const drawerPass = document.getElementById('cfgEmailSmtpPass')?.value.replace(/\s+/g, '') || '';
    const drawerName = document.getElementById('cfgEmailSenderName')?.value.trim() || orgName || 'Garden Experience';

    let cfg = await getOrganizationEmailConfig(store.activeOrgId);
    if (!isDirectEmailConfigured(cfg) && drawerEmail && drawerPass.length >= 8) {
      cfg = await saveOrganizationEmailConfig({
        organization_id: store.activeOrgId,
        sender_name: drawerName,
        sender_email: drawerEmail,
        smtp_pass: drawerPass,
      });
      await refreshEmailStatusBanner();
    }

    if (!isDirectEmailConfigured(cfg)) {
      const drawer = document.getElementById('emailDirectConfigDrawer');
      if (drawer) drawer.style.display = 'block';
      document.getElementById('cfgEmailSmtpPass')?.focus();
      showToast('⚙️ Configure seu e-mail e a Senha de App (1 única vez) no quadro acima para disparar automaticamente!', 'warning');
      return;
    }

    const sendBtn = document.getElementById('btnSendDirectEmail');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Enviando e-mail automaticamente...';
    }
    if (feedbackBox) {
      feedbackBox.style.display = 'none';
    }

    try {
      selectedItem.email = recipient;
      await sendDirectCustomerEmail({
        toEmail: recipient,
        studentName: selectedItem.student || 'Cliente',
        subject,
        message: body,
        organizationId: store.activeOrgId,
        configOverride: cfg,
      });

      await logCommunication({
        channel: 'email',
        direction: 'outbound',
        recipient,
        subject,
        body,
      });

      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.style.background = 'rgba(16,185,129,0.12)';
        feedbackBox.style.border = '1px solid rgba(16,185,129,0.35)';
        feedbackBox.style.color = '#10b981';
        feedbackBox.innerHTML = `✅ E-mail enviado automaticamente para <strong>${escapeHtml(recipient)}</strong>!`;
      }

      showToast(`🚀 E-mail enviado automaticamente para ${recipient}!`, 'success');
      renderResponsesInbox();
    } catch (err) {
      if (err.code === 'MISSING_EMAIL_CREDENTIALS') {
        const drawer = document.getElementById('emailDirectConfigDrawer');
        if (drawer) drawer.style.display = 'block';
      }
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.style.background = 'rgba(239,68,68,0.12)';
        feedbackBox.style.border = '1px solid rgba(239,68,68,0.35)';
        feedbackBox.style.color = '#f87171';
        feedbackBox.innerHTML = `⚠️ ${escapeHtml(err.message || 'Falha ao disparar o e-mail. Verifique a Senha de App do Google.')}`;
      }
      showToast(`⚠️ ${err.message || 'Falha ao enviar e-mail.'}`, 'error');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = '🚀 Enviar E-mail Agora';
      }
    }
  });

  // INTERNAL NOTE ACTION
  document.getElementById('btnSaveInternalNote')?.addEventListener('click', async () => {
    const noteText = document.getElementById('inputInternalNote')?.value || '';
    if (!noteText.trim()) {
      showToast('⚠️ Digite a anotação interna antes de salvar.', 'warning');
      return;
    }

    await logCommunication({
      channel: 'internal',
      direction: 'internal',
      recipient: null,
      subject: 'Nota Interna',
      body: noteText.trim()
    });

    const noteInput = document.getElementById('inputInternalNote');
    if (noteInput) noteInput.value = '';
    showToast('✓ Nota interna salva no histórico!', 'success');
  });
}

function renderTimelineForResponse(responseId) {
  const container = document.getElementById('inboxTimelineContainer');
  if (!container) return;
  container.innerHTML = '';

  const logs = store.communicationLogs.filter(l => l.responseId === responseId);

  if (!logs.length) {
    container.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); padding:0.75rem 1rem; background:rgba(255,255,255,0.015); border:1px dashed var(--border-subtle); border-radius:8px;">Nenhum contato registrado ainda para esta avaliação.</div>';
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.style.cssText = 'padding:0.85rem 1rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:8px; margin-bottom:0.5rem;';
    const channelLabel =
      log.channel === 'whatsapp'
        ? '💬 WhatsApp Enviado'
        : log.channel === 'email'
          ? '✉️ E-mail Enviado'
          : '📝 Nota Interna';

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-muted); margin-bottom:0.35rem; flex-wrap:wrap; gap:0.5rem;">
        <span><strong style="color:var(--gold-primary);">${channelLabel}</strong> • por ${escapeHtml(log.createdBy || 'Gestor')}${log.recipient ? ` para <strong>${escapeHtml(log.recipient)}</strong>` : ''}</span>
        <span>${new Date(log.createdAt).toLocaleString('pt-BR')}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--text-main); white-space:pre-wrap; line-height:1.45;">${escapeHtml(log.body)}</div>
    `;
    container.appendChild(item);
  });
}
