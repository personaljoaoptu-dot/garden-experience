/**
 * Touchpoints View Component
 * Complete Administrative CRUD for Touchpoints with Supabase Persistence.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';
import { touchpointsRepository } from '../repositories/touchpointsRepository.js';
import { syncStoreWithSupabase } from '../../core/services/dataSyncService.js';

let isInitialized = false;

export function setupTouchpointsCategoryFilters() {
  const filterBtns = document.querySelectorAll('[data-tp-category]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      store.touchpointCategoryFilter = btn.getAttribute('data-tp-category');
      renderTouchpointCards();
    });
  });

  const btnNew = document.getElementById('btnNewTouchpoint');
  if (btnNew) {
    btnNew.onclick = () => openTouchpointModal(null);
  }

  const btnCancel = document.getElementById('btnCancelTouchpointModal');
  if (btnCancel) {
    btnCancel.onclick = closeTouchpointModal;
  }

  if (!isInitialized) {
    const form = document.getElementById('formTouchpoint');
    if (form) {
      form.addEventListener('submit', handleTouchpointSubmit);
    }
    isInitialized = true;
  }
}

export function openTouchpointModal(touchpoint = null) {
  const modal = document.getElementById('modalTouchpoint');
  if (!modal) return;

  const titleEl = document.getElementById('modalTouchpointTitle');
  const inputId = document.getElementById('inputTouchpointId');
  const inputName = document.getElementById('inputTouchpointName');
  const selectCat = document.getElementById('selectTouchpointCategory');
  const inputDesc = document.getElementById('inputTouchpointDescription');
  const selectStatus = document.getElementById('selectTouchpointStatus');
  const containerUnits = document.getElementById('containerTouchpointUnits');

  if (titleEl) titleEl.textContent = touchpoint ? '✏️ Editar Ponto de Contato' : '📍 Novo Ponto de Contato';
  if (inputId) inputId.value = touchpoint ? touchpoint.id : '';
  if (inputName) inputName.value = touchpoint ? touchpoint.name : '';
  if (selectCat) selectCat.value = touchpoint ? touchpoint.category : 'Atendimento';
  if (inputDesc) inputDesc.value = touchpoint ? (touchpoint.description || '') : '';
  if (selectStatus) selectStatus.value = touchpoint ? (touchpoint.isActive ? 'true' : 'false') : 'true';

  // Render unit checkboxes
  if (containerUnits) {
    const activeOrg = store.getActiveOrg();
    const units = activeOrg?.units || [];
    const selectedUnitIds = touchpoint?.unitIds || [];

    if (units.length === 0) {
      containerUnits.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Nenhuma unidade cadastrada.</span>';
    } else {
      containerUnits.innerHTML = units.map(u => {
        const isChecked = selectedUnitIds.includes(u.id);
        return `
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.82rem; color:var(--text-title); margin-bottom:0.35rem; cursor:pointer;">
            <input type="checkbox" class="chk-tp-unit" value="${u.id}" ${isChecked ? 'checked' : ''}>
            <span>${escapeHtml(u.name)} (${escapeHtml(u.code)})</span>
          </label>
        `;
      }).join('');
    }
  }

  modal.style.display = 'flex';
}

export function closeTouchpointModal() {
  const modal = document.getElementById('modalTouchpoint');
  if (modal) modal.style.display = 'none';
}

async function handleTouchpointSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('inputTouchpointId')?.value;
  const name = document.getElementById('inputTouchpointName')?.value?.trim();
  const category = document.getElementById('selectTouchpointCategory')?.value;
  const description = document.getElementById('inputTouchpointDescription')?.value?.trim();
  const isActive = document.getElementById('selectTouchpointStatus')?.value === 'true';

  const unitCheckboxes = document.querySelectorAll('.chk-tp-unit:checked');
  const unitIds = Array.from(unitCheckboxes).map(cb => cb.value);

  if (!name) {
    alert('O nome do ponto de contato é obrigatório.');
    return;
  }
  if (!category) {
    alert('A categoria é obrigatória.');
    return;
  }

  const activeOrgId = store.activeOrgId;
  if (!activeOrgId) {
    alert('Organização ativa não encontrada.');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    let res;
    if (id) {
      res = await touchpointsRepository.updateTouchpoint({
        id,
        organizationId: activeOrgId,
        name,
        category,
        description,
        isActive,
        unitIds
      });
    } else {
      res = await touchpointsRepository.createTouchpoint({
        organizationId: activeOrgId,
        name,
        category,
        description,
        isActive,
        unitIds
      });
    }

    if (res.error) {
      alert(`Não foi possível salvar o Ponto de Contato: ${res.error.message}`);
      return;
    }

    // Refresh store from Supabase
    await syncStoreWithSupabase();
    closeTouchpointModal();
    renderTouchpointCards();
  } catch (err) {
    alert(`Erro inesperado ao salvar Ponto de Contato: ${err.message}`);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

export function renderTouchpointCards() {
  const container = document.getElementById('touchpointsCardsGrid');
  if (!container) return;
  container.innerHTML = '';

  let tps = store.touchpoints || [];
  if (store.touchpointCategoryFilter && store.touchpointCategoryFilter !== 'all') {
    tps = tps.filter(t => t.category === store.touchpointCategoryFilter);
  }

  if (tps.length === 0) {
    container.innerHTML = `
      <div class="glass-card text-center py-5" style="grid-column: 1 / -1; padding: 3rem 1.5rem;">
        <div style="font-size:2.5rem; margin-bottom:1rem;">📍</div>
        <h3 style="font-size:1.1rem; color:var(--text-title); font-weight:600;">Pontos de contato ainda não cadastrados.</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem; max-width:420px; margin-left:auto; margin-right:auto;">
          Cadastre pontos de contato operacionais para avaliar atendimento, limpeza, equipamentos e estrutura das suas unidades.
        </p>
        <button class="btn-primary-gold btn-sm mt-4" id="btnEmptyNewTouchpoint">
          + Novo Ponto de Contato
        </button>
      </div>
    `;

    container.querySelector('#btnEmptyNewTouchpoint')?.addEventListener('click', () => openTouchpointModal(null));
    return;
  }

  tps.forEach(tp => {
    const card = document.createElement('div');
    card.className = 'glass-card touchpoint-card mb-3';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'space-between';

    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3 style="font-size:1.05rem; font-weight:700; color:var(--text-title); margin-bottom:0.25rem;">${escapeHtml(tp.name)}</h3>
            <div style="font-size:0.8rem; color:var(--text-muted);">
              <strong>${escapeHtml(tp.category)}</strong> • <span style="color:var(--gold-primary);">${escapeHtml(tp.units)}</span>
            </div>
            ${tp.description ? `<p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.5rem;">${escapeHtml(tp.description)}</p>` : ''}
          </div>
          <span class="badge-status ${tp.isActive ? 'resolved' : 'pending'}">${tp.isActive ? '🟢 Ativo' : '⚪ Inativo'}</span>
        </div>
      </div>
      <div style="margin-top:1.2rem; pt-3; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
        <button class="btn-outline-gold btn-sm btn-toggle-tp-card" style="font-size:0.78rem;">${tp.isActive ? 'Desativar' : 'Ativar'}</button>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn-outline-gold btn-sm btn-edit-tp-card" style="font-size:0.78rem;">✏️ Editar</button>
          <button class="btn-outline-gold btn-sm btn-delete-tp-card" style="font-size:0.78rem; color:#ef4444; border-color:rgba(239, 68, 68, 0.4);">🗑️ Excluir</button>
        </div>
      </div>
    `;

    // Toggle status button
    card.querySelector('.btn-toggle-tp-card')?.addEventListener('click', async (e) => {
      const btn = e.target;
      btn.disabled = true;
      const targetState = !tp.isActive;

      const res = await touchpointsRepository.updateTouchpointStatus(tp.id, targetState, store.activeOrgId);
      if (!res.success) {
        alert(res.error || 'Não foi possível salvar a alteração. Verifique a conexão.');
        btn.disabled = false;
        return;
      }

      await syncStoreWithSupabase();
      renderTouchpointCards();
    });

    // Edit button
    card.querySelector('.btn-edit-tp-card')?.addEventListener('click', () => {
      openTouchpointModal(tp);
    });

    // Delete button
    card.querySelector('.btn-delete-tp-card')?.addEventListener('click', async () => {
      if (!confirm(`Deseja realmente excluir o Ponto de Contato "${tp.name}"?`)) return;

      const res = await touchpointsRepository.deleteTouchpoint(tp.id, store.activeOrgId);
      if (!res.success) {
        alert(res.error || 'Não foi possível excluir o ponto de contato.');
        return;
      }

      await syncStoreWithSupabase();
      renderTouchpointCards();
    });

    container.appendChild(card);
  });
}
