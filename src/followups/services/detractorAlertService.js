/**
 * Realtime Detractor Alert Service (SaaS Live Alerting)
 * Provides instant visual banner, Web Audio chime, and Desktop Push notifications
 * whenever a Detractor (NPS <= 6) evaluation arrives in real time.
 */

import { store } from '../../app/app-state/store.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function playDetractorAlertSound() {
  if (typeof window === 'undefined') return;
  try {
    const soundEnabled = localStorage.getItem('garden_alert_sound_enabled') !== 'false';
    if (!soundEnabled) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two-tone executive alert chime (A5 -> E5)
    [880, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.15, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.3);
    });
  } catch (_) {}
}

export function triggerDesktopNotification(record) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      const score = record.nps_score ?? record.npsScore ?? 0;
      const meta = (record.metadata && typeof record.metadata === 'object') ? record.metadata : {};
      const student = meta.student_name || record.student_identifier || 'Aluno(a)';
      const comment = record.comment ? `"${record.comment}"` : 'Sem comentário em texto.';

      const notif = new Notification(`🚨 Alerta de Detrator (Nota ${score}/10)`, {
        body: `${student}: ${comment}`,
        icon: '/logo-garden-gold.jpg'
      });

      notif.onclick = () => {
        window.focus();
        if (record.id) {
          store.selectedResponseId = record.id;
          document.querySelector('[data-mod="mod-responses"]')?.click();
        }
      };
    }
  } catch (_) {}
}

export function showRealtimeDetractorBanner(record) {
  if (typeof document === 'undefined') return;

  const score = Number(record.nps_score ?? record.npsScore ?? 0);
  const meta = (record.metadata && typeof record.metadata === 'object') ? record.metadata : {};
  const student = meta.student_name || record.student_identifier || record.student || 'Anônimo';
  const phone = meta.phone || record.phone || '';
  const comment = record.comment || '';

  playDetractorAlertSound();
  triggerDesktopNotification(record);

  let container = document.getElementById('realtimeDetractorAlertContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'realtimeDetractorAlertContainer';
    container.style.cssText = 'position:fixed; top:1.25rem; right:1.25rem; z-index:9999; max-width:390px; width:calc(100vw - 2.5rem); display:flex; flex-direction:column; gap:0.75rem;';
    document.body.appendChild(container);
  }

  const card = document.createElement('div');
  card.style.cssText = 'background:rgba(20, 24, 33, 0.98); border:2px solid #ef4444; border-radius:14px; padding:1.1rem 1.2rem; box-shadow:0 16px 40px rgba(0,0,0,0.65); color:#fff; font-family:var(--font-main, sans-serif);';
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
      <div style="display:flex; align-items:center; gap:0.45rem;">
        <span style="font-size:1.2rem;">🚨</span>
        <strong style="font-size:0.9rem; color:#f87171; text-transform:uppercase; letter-spacing:0.03em;">Alerta de Detrator ao Vivo</strong>
      </div>
      <button type="button" class="btn-close-detractor-banner" style="background:none; border:none; color:#8b949e; font-size:1rem; cursor:pointer; padding:0;">✕</button>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
      <strong style="font-size:0.95rem; color:#fff;">${escapeHtml(student)}</strong>
      <span class="badge-status detractor" style="font-size:0.78rem; font-weight:800;">Nota ${score}/10</span>
    </div>

    <div style="font-size:0.82rem; color:#cbd5e1; background:rgba(255,255,255,0.04); padding:0.55rem 0.7rem; border-radius:8px; margin-bottom:0.85rem; font-style:italic;">
      ${comment ? `"${escapeHtml(comment)}"` : 'Sem comentário escrito.'}
    </div>

    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
      <button type="button" class="btn-primary-gold btn-sm btn-open-detractor-inbox" style="flex:1; padding:0.45rem 0.65rem; font-size:0.78rem; font-weight:700;">
        ✉️ Responder na Central
      </button>
      ${phone ? `
        <button type="button" class="btn-secondary btn-sm btn-wa-detractor-banner" style="padding:0.45rem 0.65rem; font-size:0.78rem; font-weight:700; color:#10b981; border-color:rgba(16,185,129,0.4);">
          💬 WhatsApp
        </button>
      ` : ''}
    </div>
  `;

  card.querySelector('.btn-close-detractor-banner')?.addEventListener('click', () => {
    card.remove();
  });

  card.querySelector('.btn-open-detractor-inbox')?.addEventListener('click', () => {
    if (record.id) {
      store.selectedResponseId = record.id;
    }
    document.querySelector('[data-mod="mod-responses"]')?.click();
    card.remove();
  });

  card.querySelector('.btn-wa-detractor-banner')?.addEventListener('click', () => {
    let digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    const activeOrg = store.getActiveOrg();
    const orgName = activeOrg?.tradeName || activeOrg?.name || 'Garden Gold Academia';
    const firstName = student !== 'Anônimo' ? student.split(' ')[0] : 'aluno(a)';
    const msg = `Olá, ${firstName}! Tudo bem? Aqui é da gestão da ${orgName}. Acabamos de receber sua avaliação (nota ${score}/10) e gostaríamos de conversar com você para entendermos como podemos melhorar sua experiência imediatamente.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    card.remove();
  });

  container.prepend(card);
}
