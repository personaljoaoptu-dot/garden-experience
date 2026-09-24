/**
 * Environmental Configuration & Validation
 * Centralizes environment variable extraction for Vite / Supabase.
 */

export const env = {
  SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  IS_DEV: import.meta.env?.DEV ?? true,
  IS_PROD: import.meta.env?.PROD ?? false
};

export function validateEnv() {
  const missing = [];
  if (!env.SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.warn(
      `[Env Config Warning] Modulo Supabase rodando em modo desacoplado / local fallback. Variáveis ausentes: ${missing.join(', ')}.`
    );
  }
  return missing.length === 0;
}
