/**
 * Security & Sanitization Utilities
 * Prevents Cross-Site Scripting (XSS) attacks by escaping untrusted HTML input.
 */

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeInput(input) {
  if (!input) return '';
  return String(input).trim();
}
