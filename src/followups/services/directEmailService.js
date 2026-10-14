import { supabase } from '../../core/supabase/client.js';
import { store } from '../../app/app-state/store.js';

const LOCAL_CACHE_KEY = 'garden_org_email_config_v1';

function getCachedConfig(orgId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_CACHE_KEY}_${orgId || 'default'}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setCachedConfig(orgId, config) {
  try {
    if (!config) return;
    localStorage.setItem(`${LOCAL_CACHE_KEY}_${orgId || 'default'}`, JSON.stringify(config));
  } catch (_) {}
}

export async function getOrganizationEmailConfig(organizationId) {
  const orgId = organizationId || store.activeOrgId;
  if (!orgId) return getCachedConfig('default');

  if (!supabase || !store.isSupabaseConnected) return getCachedConfig(orgId);

  try {
    const { data, error } = await supabase
      .from('organization_email_config')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!error && data) {
      setCachedConfig(orgId, data);
      return data;
    }
  } catch (_) {}

  return getCachedConfig(orgId);
}

export async function saveOrganizationEmailConfig(configInput = {}) {
  const orgId = configInput.organization_id || store.activeOrgId;
  if (!orgId) {
    throw new Error('Organização ativa não identificada.');
  }

  const payload = {
    organization_id: orgId,
    sender_name: String(configInput.sender_name || 'Garden Experience').trim(),
    sender_email: String(configInput.sender_email || '').trim(),
    reply_to_email: String(configInput.reply_to_email || configInput.sender_email || '').trim(),
    smtp_host: String(configInput.smtp_host || 'smtp.gmail.com').trim(),
    smtp_port: Number(configInput.smtp_port || 465),
    smtp_user: String(configInput.smtp_user || configInput.sender_email || '').trim(),
    smtp_pass: String(configInput.smtp_pass || '').replace(/\s+/g, ''),
    resend_api_key: String(configInput.resend_api_key || '').trim(),
    updated_at: new Date().toISOString(),
  };

  setCachedConfig(orgId, payload);

  if (supabase && store.isSupabaseConnected) {
    const { data, error } = await supabase
      .from('organization_email_config')
      .upsert(payload, { onConflict: 'organization_id' })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao salvar configuração de e-mail.');
    }
    setCachedConfig(orgId, data);
    return data;
  }

  return payload;
}

export function isDirectEmailConfigured(config) {
  if (!config) return false;
  const hasSmtp = Boolean(config.sender_email && config.smtp_pass);
  const hasResend = Boolean(config.resend_api_key);
  return hasSmtp || hasResend;
}

export async function sendDirectCustomerEmail({
  toEmail,
  studentName,
  subject,
  message,
  organizationId,
  configOverride = null,
}) {
  const orgId = organizationId || store.activeOrgId;
  const config = configOverride || (await getOrganizationEmailConfig(orgId)) || {};

  const requestBody = {
    toEmail: String(toEmail || '').trim(),
    studentName: String(studentName || '').trim(),
    subject: String(subject || '').trim(),
    message: String(message || '').trim(),
    senderName: config.sender_name || 'Garden Experience',
    senderEmail: config.sender_email || '',
    replyTo: config.reply_to_email || config.sender_email || '',
    smtpHost: config.smtp_host || 'smtp.gmail.com',
    smtpPort: Number(config.smtp_port || 465),
    smtpUser: config.smtp_user || config.sender_email || '',
    smtpPass: config.smtp_pass || '',
    resendApiKey: config.resend_api_key || '',
  };

  let response;
  try {
    response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (response.status === 404) {
      throw new Error('Fallback to production endpoint');
    }
  } catch (_) {
    response = await fetch('https://garden-experience-green.vercel.app/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    const err = new Error(data?.error || 'Não foi possível disparar o e-mail automaticamente.');
    err.code = data?.code || 'SEND_ERROR';
    throw err;
  }

  return data;
}
