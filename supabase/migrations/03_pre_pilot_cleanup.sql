-- ====================================================================
-- GARDEN EXPERIENCE V1.1 — PRE-PILOT DATA CLEANUP SCRIPT
-- Cleans test responses and follow-up cases before live launch.
-- PRESERVES: organizations, units, surveys, survey_links, tablets, RLS policies.
-- ====================================================================

-- 1. LIMPEZA DE DADOS DE TESTE (RESPOSTAS E CASOS)
DELETE FROM public.answers;
DELETE FROM public.follow_up_cases;
DELETE FROM public.responses;

-- 2. RESET DE SEQUÊNCIAS / AUXILIARES SE NECESSÁRIO
-- Nenhuma sequência truncada para manter integridade de UUIDs

-- 3. CONFIRMAÇÃO DA ESTRUTURA OFICIAL DA UNIDADE A
INSERT INTO public.units (id, organization_id, name, code, address, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold — Unidade A', 'unidade-a', 'Av. Principal, 1000 - Centro', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 4. CRIAÇÃO DO LINK / QR CODE OFICIAL DA UNIDADE A
INSERT INTO public.survey_links (id, token, survey_id, unit_id, is_active) VALUES
('l-official-unidade-a', 'token-official-unidade-a-2026', 's1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 5. DISPOSITIVO TABLET OFICIAL DA RECEPÇÃO UNIDADE A
INSERT INTO public.tablets (id, unit_id, device_name, device_token, is_active) VALUES
('t-official-unidade-a', '11111111-1111-1111-1111-111111111111', 'Tablet Recepção Centro (Unidade A)', 'device-token-official-unidade-a-2026', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;
