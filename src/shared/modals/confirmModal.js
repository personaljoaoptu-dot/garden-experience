/**
 * Reusable Confirmation Dialog Modal Component
 */

export function showConfirmationModal({ icon = '❓', title = 'Confirmar Ação', message = 'Deseja confirmar esta operação?', onConfirm = () => {} }) {
  const modal = document.getElementById('modalConfirmAction');
  if (!modal) {
    if (confirm(message)) {
      onConfirm();
    }
    return;
  }

  const iconEl = document.getElementById('modalConfirmIcon');
  const titleEl = document.getElementById('modalConfirmTitle');
  const msgEl = document.getElementById('modalConfirmMessage');
  const btnOk = document.getElementById('btnConfirmActionOk');
  const btnCancel = document.getElementById('btnConfirmActionCancel');

  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  modal.style.display = 'flex';

  const cleanup = () => {
    modal.style.display = 'none';
    if (btnOk) btnOk.replaceWith(btnOk.cloneNode(true));
    if (btnCancel) btnCancel.replaceWith(btnCancel.cloneNode(true));
  };

  if (btnCancel) {
    btnCancel.addEventListener('click', cleanup, { once: true });
  }

  if (btnOk) {
    btnOk.addEventListener('click', () => {
      cleanup();
      onConfirm();
    }, { once: true });
  }
}
