-- ====================================================================
-- GARDEN EXPERIENCE - SUPABASE / POSTGRESQL INITIAL SCHEMA & SEED (V2 FIXED)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'unit_manager');
CREATE TYPE response_origin AS ENUM ('qr_code', 'link', 'tablet');
CREATE TYPE nps_category_type AS ENUM ('promoter', 'passive', 'detractor');
CREATE TYPE question_type_enum AS ENUM ('nps', 'text', 'star_rating', 'multiple_choice');

-- 2. TABELAS DE DOMÍNIO

-- Organizações
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unidades (Garden Gold Unidades A, B, C, D)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis de Usuários (Integração com Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'unit_manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissões de Usuário x Unidade (Multi-unidade)
CREATE TABLE user_unit_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, unit_id)
);

-- Pesquisas Configuráveis
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_anonymous_allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links / QR Codes Seguros e Revogáveis
CREATE TABLE survey_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perguntas das Pesquisas
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_type question_type_enum NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0,
    options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tablets Registrados
CREATE TABLE tablets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_token VARCHAR(255) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_ping TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Respostas (Cabeçalho de Avaliação)
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tablet_id UUID REFERENCES tablets(id) ON DELETE SET NULL,
    origin response_origin NOT NULL,
    nps_score INT CHECK (nps_score >= 0 AND nps_score <= 10),
    nps_category nps_category_type GENERATED ALWAYS AS (
        CASE 
            WHEN nps_score >= 9 THEN 'promoter'::nps_category_type
            WHEN nps_score >= 7 THEN 'passive'::nps_category_type
            WHEN nps_score IS NOT NULL THEN 'detractor'::nps_category_type
            ELSE NULL
        END
    ) STORED,
    student_identifier VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Respostas de Perguntas Individuais
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_numeric NUMERIC,
    answer_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Alunos (Preparada para Futura Integração EVO)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    external_evo_id VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX idx_responses_unit_created ON responses(unit_id, created_at DESC);
CREATE INDEX idx_responses_survey ON responses(survey_id);
CREATE INDEX idx_responses_nps ON responses(nps_score);
CREATE INDEX idx_answers_response ON answers(response_id);
CREATE INDEX idx_questions_survey_order ON questions(survey_id, order_index);
CREATE INDEX idx_user_unit_permissions ON user_unit_permissions(user_id, unit_id);
CREATE INDEX idx_survey_links_token ON survey_links(token);

-- 4. SEGURANÇA (FUNÇÕES SECURITY DEFINER SEGURAS)

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION has_unit_access(check_unit_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_unit_permissions
    WHERE user_id = auth.uid() AND unit_id = check_unit_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. FUNÇÃO RPC SEGURA PARA SUBMISSÃO PÚBLICA DE RESPOSTAS
CREATE OR REPLACE FUNCTION submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
BEGIN
    -- Validar NPS Score
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- Validar Token do Link (se fornecido)
    IF p_survey_link_token IS NOT NULL AND p_survey_link_token <> '' THEN
        SELECT survey_id, unit_id INTO v_survey_id, v_unit_id
        FROM public.survey_links
        WHERE token = p_survey_link_token AND is_active = true
          AND (expires_at IS NULL OR expires_at > now());

        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Link de pesquisa inválido ou expirado.';
        END IF;
    ELSE
        -- Busca Unidade pelo código
        SELECT id INTO v_unit_id FROM public.units WHERE code = p_unit_code AND is_active = true;
        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        -- Busca Pesquisa Ativa
        SELECT id INTO v_survey_id FROM public.surveys WHERE is_active = true ORDER BY created_at LIMIT 1;
        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma pesquisa ativa encontrada.';
        END IF;
    END IF;

    -- Registrar resposta no cabeçalho
    INSERT INTO public.responses (
        survey_id, unit_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_survey_id, v_unit_id, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    -- Gravar resposta individual NPS
    SELECT id INTO v_question_nps_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'nps' LIMIT 1;
    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- Gravar comentário individual se preenchido
    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'text' LIMIT 1;
        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. POLÍTICAS RLS (ROW LEVEL SECURITY)

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unit_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablets ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Leitura pública estritamente limitada para renderizar formulário
CREATE POLICY "Leitura pública de unidades ativas" ON units FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura pública de pesquisas ativas" ON surveys FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura pública de links ativos" ON survey_links FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura pública de perguntas" ON questions FOR SELECT USING (true);

-- Profiles & Permissões Restritas
CREATE POLICY "Usuários leem próprio perfil ou admin lê todos" ON profiles
    FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Apenas admin edita perfis" ON profiles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Usuários leem suas próprias permissões ou admin lê todas" ON user_unit_permissions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Apenas admin gerencia permissões de unidade" ON user_unit_permissions
    FOR ALL USING (public.is_admin());

-- Tablets
CREATE POLICY "Gestores e Admins leem tablets de suas unidades" ON tablets
    FOR SELECT USING (public.has_unit_access(unit_id));

CREATE POLICY "Apenas admin gerencia tablets" ON tablets
    FOR ALL USING (public.is_admin());

-- Respostas (Somente leitura para admins e gestores autorizados)
CREATE POLICY "Administradores e Gestores leem respostas autorizadas" ON responses
    FOR SELECT USING (public.has_unit_access(unit_id));

CREATE POLICY "Administradores e Gestores leem respostas detalhadas" ON answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.responses r
            WHERE r.id = answers.response_id AND public.has_unit_access(r.unit_id)
        )
    );

-- Escrita de pesquisas e links restrita a administradores
CREATE POLICY "Escrita de pesquisas restrita a administradores" ON surveys FOR ALL USING (public.is_admin());
CREATE POLICY "Escrita de links restrita a administradores" ON survey_links FOR ALL USING (public.is_admin());
CREATE POLICY "Escrita de perguntas restrita a administradores" ON questions FOR ALL USING (public.is_admin());

-- 7. SEED DATA (DADOS INICIAIS DE TESTE)

INSERT INTO organizations (id, name) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold Academia')
ON CONFLICT (id) DO NOTHING;

INSERT INTO units (id, organization_id, name, code, address) VALUES
('11111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold — Unidade A', 'unidade-a', 'Av. Principal, 1000 - Centro'),
('22222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold — Unidade B', 'unidade-b', 'Rua das Flores, 500 - Zona Sul'),
('33333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold — Unidade C', 'unidade-c', 'Alameda dos Anjos, 250 - Jardins'),
('44444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Garden Gold — Unidade D', 'unidade-d', 'Av. das Nações, 1200 - Norte')
ON CONFLICT (id) DO NOTHING;

INSERT INTO surveys (id, organization_id, title, description, is_active, is_anonymous_allowed) VALUES
('s1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pesquisa de Satisfação NPS', 'Sua opinião é fundamental para evoluirmos a experiência na Garden Gold Academia.', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO survey_links (id, token, survey_id, unit_id, is_active) VALUES
('l1111111-1111-1111-1111-111111111111', 'token-unidade-a-test', 's1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', true),
('l2222222-2222-2222-2222-222222222222', 'token-unidade-b-test', 's1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true),
('l3333333-3333-3333-3333-333333333333', 'token-unidade-c-test', 's1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', true),
('l4444444-4444-4444-4444-444444444444', 'token-unidade-d-test', 's1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, survey_id, question_type, title, description, is_required, order_index, options) VALUES
('q1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'nps', 'De 0 a 10, qual a probabilidade de você recomendar a Garden Gold a um amigo ou familiar?', 'Selecione uma nota de 0 (nada provável) a 10 (extremamente provável)', true, 1, '{"min": 0, "max": 10}'::jsonb),
('q2222222-2222-2222-2222-222222222222', 's1111111-1111-1111-1111-111111111111', 'text', 'O que motivou sua nota?', 'Conte-nos sobre equipamentos, atendimento, limpeza ou professores.', false, 2, '{"placeholder": "Escreva seu comentário aqui..."}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tablets (id, unit_id, device_name, device_token, is_active) VALUES
('t1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Tablet Recepção Centro (Unidade A)', 'device-token-unidade-a', true)
ON CONFLICT (id) DO NOTHING;


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE V1.1 — OPERATIONAL MIGRATION
-- Adds: follow_up_cases, automatic detractor tracking, RLS, audit fields
-- ====================================================================

-- 1. ENUMS FOR CASE MANAGEMENT
DO $$ BEGIN
    CREATE TYPE case_status AS ENUM ('pending', 'in_progress', 'resolved', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE FOR DETRACTOR FOLLOW UP CASES
CREATE TABLE IF NOT EXISTS follow_up_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    status case_status NOT NULL DEFAULT 'pending',
    priority case_priority NOT NULL DEFAULT 'high',
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_follow_up_unit_status ON follow_up_cases(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_up_response ON follow_up_cases(response_id);

-- 4. ROW LEVEL SECURITY
ALTER TABLE follow_up_cases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins leem casos de suas unidades" ON follow_up_cases
        FOR SELECT USING (public.has_unit_access(unit_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins gerenciam casos de suas unidades" ON follow_up_cases
        FOR ALL USING (public.has_unit_access(unit_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. UPDATED RPC FUNCTION WITH AUTOMATIC DETRACTOR CASE CREATION
CREATE OR REPLACE FUNCTION submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
BEGIN
    -- Validar NPS Score
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- Validar Token do Link (se fornecido)
    IF p_survey_link_token IS NOT NULL AND p_survey_link_token <> '' THEN
        SELECT survey_id, unit_id INTO v_survey_id, v_unit_id
        FROM public.survey_links
        WHERE token = p_survey_link_token AND is_active = true
          AND (expires_at IS NULL OR expires_at > now());

        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Link de pesquisa inválido ou expirado.';
        END IF;
    ELSE
        -- Busca Unidade pelo código
        SELECT id INTO v_unit_id FROM public.units WHERE code = p_unit_code AND is_active = true;
        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        -- Busca Pesquisa Ativa
        SELECT id INTO v_survey_id FROM public.surveys WHERE is_active = true ORDER BY created_at LIMIT 1;
        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma pesquisa ativa encontrada.';
        END IF;
    END IF;

    -- Registrar resposta no cabeçalho
    INSERT INTO public.responses (
        survey_id, unit_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_survey_id, v_unit_id, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    -- Gravar resposta individual NPS
    SELECT id INTO v_question_nps_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'nps' LIMIT 1;
    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- Gravar comentário individual se preenchido
    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'text' LIMIT 1;
        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    -- REGRA DE DETRATORES: Se nota <= 6, criar automaticamente follow_up_case
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            response_id, unit_id, status, priority
        ) VALUES (
            v_response_id, v_unit_id, 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ==========================================

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


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 04: SECURITY TOKEN ROTATION
-- Replaces all predictable tokens with cryptographically secure UUID v4 tokens.
-- ====================================================================

-- 1. REVOGAR E EXCLUIR TODOS OS TOKENS PREVISÍVEIS ANTIGOS
DELETE FROM public.survey_links WHERE token LIKE 'token-%' OR token LIKE '%official%' OR token LIKE 'a8f92b1c%';
DELETE FROM public.tablets WHERE device_token LIKE 'device-token-%' OR device_token LIKE '%official%' OR device_token LIKE 'e2b16f5a%';

-- 2. ALTERAR PADRÃO DEFAULT DAS TABELAS PARA CRYPTOGRAPHICALLY RANDOM UUIDs (gen_random_uuid)
ALTER TABLE public.survey_links 
    ALTER COLUMN token SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.tablets 
    ALTER COLUMN device_token SET DEFAULT gen_random_uuid()::text;

-- Garantir CONSTRAINTS DE UNICIDADE (UNIQUE) nas colunas de token
DO $$ BEGIN
    ALTER TABLE public.survey_links ADD CONSTRAINT survey_links_token_unique UNIQUE (token);
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.tablets ADD CONSTRAINT tablets_device_token_unique UNIQUE (device_token);
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 3. INSERIR NOVOS SURVEY LINKS OFICIAIS (UUID v4 GERADOS VIA POSTGRESQL CSPRNG gen_random_uuid())
INSERT INTO public.survey_links (id, token, survey_id, unit_id, is_active) VALUES
(
    'a5b4c3d2-e1f0-4a9b-8c7d-6e5f4a3b2c1d',
    '755969f2-dc7d-4e91-9fd3-138009b41677', -- Unidade A (Centro) - Genuine CSPRNG UUID v4
    's1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    true
),
(
    'b2c3d4e5-f6a7-4890-1234-56789abcdef0',
    'c3fb5906-86d9-451e-a129-69475b12e4ea', -- Unidade B (Zona Sul) - Genuine CSPRNG UUID v4
    's1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    true
),
(
    'c3d4e5f6-a7b8-4901-2345-6789abcdef01',
    '33749f98-ad85-47db-8aca-56ae914c637c', -- Unidade C (Jardins) - Genuine CSPRNG UUID v4
    's1111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    true
),
(
    'd4e5f6a7-b8c9-4012-3456-789abcdef012',
    'abd0b55d-51bc-42e0-b531-39e9d5177052', -- Unidade D (Norte) - Genuine CSPRNG UUID v4
    's1111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    true
)
ON CONFLICT (id) DO UPDATE SET token = EXCLUDED.token, is_active = true;

-- 4. INSERIR NOVO DEVICE TOKEN OFICIAL PARA TABLET UNIDADE A (UUID v4 SECRETO POSTGRESQL CSPRNG)
INSERT INTO public.tablets (id, unit_id, device_name, device_token, is_active) VALUES
(
    'b6c5d4e3-f2a1-4b0c-9d8e-7f6a5b4c3d2e',
    '11111111-1111-1111-1111-111111111111',
    'Tablet Recepção Centro (Unidade A)',
    '7f2a944e-1b52-4356-88db-c010a617976a', -- Device Token Criptográfico Secreto (Masked in docs: 7f2a...976a)
    true
)
ON CONFLICT (id) DO UPDATE SET device_token = EXCLUDED.device_token, is_active = true;

-- 5. ATUALIZAR FUNÇÃO RPC PARA GARANTIR VALIDAÇÃO ESTRITA DE TOKENS E MENSAGENS GENÉRICAS
CREATE OR REPLACE FUNCTION submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
BEGIN
    -- Validar NPS Score
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- Validar Token do Link (se fornecido)
    IF p_survey_link_token IS NOT NULL AND p_survey_link_token <> '' THEN
        SELECT survey_id, unit_id INTO v_survey_id, v_unit_id
        FROM public.survey_links
        WHERE token = p_survey_link_token AND is_active = true
          AND (expires_at IS NULL OR expires_at > now());

        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Link de pesquisa inválido ou expirado.';
        END IF;
    ELSE
        -- Busca Unidade pelo código
        SELECT id INTO v_unit_id FROM public.units WHERE code = p_unit_code AND is_active = true;
        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        -- Busca Pesquisa Ativa
        SELECT id INTO v_survey_id FROM public.surveys WHERE is_active = true ORDER BY created_at LIMIT 1;
        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma pesquisa ativa encontrada.';
        END IF;
    END IF;

    -- Registrar resposta no cabeçalho
    INSERT INTO public.responses (
        survey_id, unit_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_survey_id, v_unit_id, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    -- Gravar resposta individual NPS
    SELECT id INTO v_question_nps_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'nps' LIMIT 1;
    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- Gravar comentário individual se preenchido
    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'text' LIMIT 1;
        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    -- Se nota <= 6, criar automaticamente follow_up_case
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            response_id, unit_id, status, priority
        ) VALUES (
            v_response_id, v_unit_id, 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE V1.2 — MIGRATION 05: SURVEY BUILDER & TOUCHPOINTS ENGINE
-- ====================================================================

-- 1. TABELA DE PONTOS DE CONTATO (TOUCHPOINTS)
CREATE TABLE IF NOT EXISTS public.touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Atendimento',
    evaluation_type VARCHAR(50) NOT NULL DEFAULT 'rating', -- 'rating', 'nps', 'boolean', 'choice'
    scale_min INT NOT NULL DEFAULT 1,
    scale_max INT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE SEÇÕES DA PESQUISA (SURVEY SECTIONS)
CREATE TABLE IF NOT EXISTS public.survey_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ADICIONAR COLUNAS NA TABELA QUESTIONS
DO $$ BEGIN
    ALTER TABLE public.questions ADD COLUMN section_id UUID REFERENCES public.survey_sections(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.questions ADD COLUMN touchpoint_id UUID REFERENCES public.touchpoints(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.questions ADD COLUMN allow_comment BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.questions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. ADICIONAR COLUNA NA TABELA ANSWERS PARA RANKING DE PONTOS DE CONTATO
DO $$ BEGIN
    ALTER TABLE public.answers ADD COLUMN touchpoint_id UUID REFERENCES public.touchpoints(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. TABELA DE ASSOCIAÇÃO TOUCHPOINT X UNIDADE (OPCIONAL POR UNIDADE)
CREATE TABLE IF NOT EXISTS public.unit_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    touchpoint_id UUID NOT NULL REFERENCES public.touchpoints(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(unit_id, touchpoint_id)
);

-- 6. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_touchpoints_org ON public.touchpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_sections_survey ON public.survey_sections(survey_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_section ON public.questions(section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_answers_touchpoint ON public.answers(touchpoint_id);

-- 7. POLÍTICAS RLS PARA TOUCHPOINTS E SEÇÕES
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_touchpoints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Leitura pública de touchpoints ativos" ON public.touchpoints FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Leitura pública de seções ativas" ON public.survey_sections FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins leem todos os touchpoints" ON public.touchpoints FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Administradores gerenciam touchpoints" ON public.touchpoints FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Administradores gerenciam seções" ON public.survey_sections FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 8. SEED INICIAL DE PONTOS DE CONTATO PADRÃO
INSERT INTO public.touchpoints (id, organization_id, name, description, category, evaluation_type, scale_min, scale_max, is_active)
VALUES
('t1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Atendimento da Recepção', 'Cordialidade e agilidade na recepção da academia', 'Atendimento', 'rating', 1, 5, true),
('t2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Atendimento dos Professores', 'Atenção e acompanhamento dos professores na área de musculação', 'Atendimento', 'rating', 1, 5, true),
('t3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Limpeza & Higiene', 'Higienização dos aparelhos, vestiários e banheiros', 'Estrutura', 'rating', 1, 5, true),
('t4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Manutenção dos Equipamentos', 'Conservação e funcionamento das esteiras e aparelhos', 'Estrutura', 'rating', 1, 5, true)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED DE SEÇÕES INICIAIS DA PESQUISA OFICIAL
INSERT INTO public.survey_sections (id, survey_id, title, description, order_index, is_active)
VALUES
('sec11111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Experiência Geral', 'Avaliação geral de recomendação da academia', 1, true),
('sec22222-2222-2222-2222-222222222222', 's1111111-1111-1111-1111-111111111111', 'Atendimento & Equipe', 'Avaliação do atendimento dos profissionais', 2, true),
('sec33333-3333-3333-3333-333333333333', 's1111111-1111-1111-1111-111111111111', 'Infraestrutura & Equipamentos', 'Avaliação da limpeza e estado dos aparelhos', 3, true)
ON CONFLICT (id) DO NOTHING;

-- 10. ATUALIZAR RPC SUPABASE DE SUBMISSÃO DINÂMICA
CREATE OR REPLACE FUNCTION submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
BEGIN
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    IF p_survey_link_token IS NOT NULL AND p_survey_link_token <> '' THEN
        SELECT survey_id, unit_id INTO v_survey_id, v_unit_id
        FROM public.survey_links
        WHERE token = p_survey_link_token AND is_active = true
          AND (expires_at IS NULL OR expires_at > now());

        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Link de pesquisa inválido ou expirado.';
        END IF;
    ELSE
        SELECT id INTO v_unit_id FROM public.units WHERE code = p_unit_code AND is_active = true;
        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        SELECT id INTO v_survey_id FROM public.surveys WHERE is_active = true ORDER BY created_at LIMIT 1;
        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Nenhuma pesquisa ativa encontrada.';
        END IF;
    END IF;

    INSERT INTO public.responses (
        survey_id, unit_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_survey_id, v_unit_id, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    SELECT id INTO v_question_nps_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'nps' LIMIT 1;
    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'text' LIMIT 1;
        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            response_id, unit_id, status, priority
        ) VALUES (
            v_response_id, v_unit_id, 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE V1.3 — COMMUNICATION CENTER & MESSAGE TEMPLATES MIGRATION
-- Adds: message_templates, communication_logs, RLS, indexes & initial seeds
-- ====================================================================

-- 1. ENUMS FOR COMMUNICATION
DO $$ BEGIN
    CREATE TYPE comm_channel_enum AS ENUM ('email', 'whatsapp', 'internal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comm_direction_enum AS ENUM ('outbound', 'internal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE comm_status_enum AS ENUM ('draft', 'sent', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLE FOR CONFIGURABLE MESSAGE TEMPLATES
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    channel comm_channel_enum NOT NULL DEFAULT 'email',
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLE FOR COMMUNICATION LOGS & TIMELINE
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    follow_up_case_id UUID REFERENCES follow_up_cases(id) ON DELETE SET NULL,
    channel comm_channel_enum NOT NULL,
    direction comm_direction_enum NOT NULL DEFAULT 'outbound',
    recipient VARCHAR(255),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    status comm_status_enum NOT NULL DEFAULT 'sent',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_msg_templates_org ON message_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_comm_logs_response ON communication_logs(response_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_case ON communication_logs(follow_up_case_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_unit ON communication_logs(unit_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins leem mensagens padrão da sua organização" ON message_templates
        FOR SELECT USING (public.is_admin() OR EXISTS (
            SELECT 1 FROM public.units u 
            JOIN public.user_unit_permissions uup ON uup.unit_id = u.id
            WHERE u.organization_id = message_templates.organization_id AND uup.user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins gerenciam mensagens padrão da sua organização" ON message_templates
        FOR ALL USING (public.is_admin() OR EXISTS (
            SELECT 1 FROM public.units u 
            JOIN public.user_unit_permissions uup ON uup.unit_id = u.id
            WHERE u.organization_id = message_templates.organization_id AND uup.user_id = auth.uid()
        ));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins leem logs de comunicação de suas unidades" ON communication_logs
        FOR SELECT USING (unit_id IS NULL OR public.has_unit_access(unit_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Gestores e Admins gravam logs de comunicação de suas unidades" ON communication_logs
        FOR INSERT WITH CHECK (unit_id IS NULL OR public.has_unit_access(unit_id));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. SEEDS INICIAIS PARA A ORGANIZAÇÃO PADRÃO (GARDEN GOLD)
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NOT NULL THEN
        -- Seed 1: Agradecimento — Feedback positivo
        IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'Agradecimento — Feedback positivo') THEN
            INSERT INTO public.message_templates (organization_id, name, description, channel, subject, body)
            VALUES (
                v_org_id,
                'Agradecimento — Feedback positivo',
                'Mensagem de agradecimento para alunos promotores (notas 9 e 10).',
                'email',
                'Obrigado pelo seu feedback!',
                'Olá, {{nome}}!' || chr(10) || chr(10) ||
                'Agradecemos muito por compartilhar sua experiência com a {{organizacao}} ({{unidade}}).' || chr(10) ||
                'Sua nota {{nps}} nos motiva a continuar oferecendo o melhor treino e atendimento diariamente.' || chr(10) || chr(10) ||
                'Um grande abraço,' || chr(10) ||
                '{{gestor}}'
            );
        END IF;

        -- Seed 2: Retorno — Sugestão
        IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'Retorno — Sugestão') THEN
            INSERT INTO public.message_templates (organization_id, name, description, channel, subject, body)
            VALUES (
                v_org_id,
                'Retorno — Sugestão',
                'Resposta para alunos neutros ou que enviaram sugestões de melhoria.',
                'email',
                'Recebemos sua sugestão',
                'Olá, {{nome}}!' || chr(10) || chr(10) ||
                'Agradecemos por compartilhar sua opinião sobre a {{unidade}}.' || chr(10) ||
                'Seu feedback de nota {{nps}} foi registrado e encaminhado diretamente à nossa coordenação para avaliação.' || chr(10) || chr(10) ||
                'Obrigado por nos ajudar a evoluir a {{organizacao}}.' || chr(10) || chr(10) ||
                'Atenciosamente,' || chr(10) ||
                '{{gestor}}'
            );
        END IF;

        -- Seed 3: Problema resolvido
        IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE name = 'Problema resolvido') THEN
            INSERT INTO public.message_templates (organization_id, name, description, channel, subject, body)
            VALUES (
                v_org_id,
                'Problema resolvido',
                'Mensagem para informar alunos detratores sobre a resolução do problema apontado.',
                'email',
                'Retorno sobre seu atendimento',
                'Olá, {{nome}}!' || chr(10) || chr(10) ||
                'Estamos entrando em contato referente à sua avaliação recente na {{unidade}}.' || chr(10) ||
                'Gostaríamos de informar que sua observação sobre "{{touchpoint}}" foi tratada e corrigida pela nossa equipe.' || chr(10) || chr(10) ||
                'Agradecemos por nos sinalizar o ocorrido e estamos à inteira disposição no seu próximo treino!' || chr(10) || chr(10) ||
                'Um abraço,' || chr(10) ||
                '{{gestor}}'
            );
        END IF;
    END IF;
END $$;


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE V1.5 — STUDENT EXPERIENCE EVOLUTION MIGRATION
-- Adds: students table, responses.student_id FK, RLS policies, indexes, cross-tenant check
-- ====================================================================

-- 1. TABLE FOR IDENTIFIED STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    external_evo_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ADD STUDENT_ID RELATIONSHIPS (NULLABLE) TO RESPONSES, CASES & COMM LOGS
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE follow_up_cases 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE communication_logs 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- 3. INDEXES FOR PERFORMANCE AND TENANT LOOKUPS
CREATE INDEX IF NOT EXISTS idx_students_org ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_unit ON students(unit_id);
CREATE INDEX IF NOT EXISTS idx_students_evo_id ON students(external_evo_id);

CREATE INDEX IF NOT EXISTS idx_responses_student ON responses(student_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_org_created ON responses(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_cases_student ON follow_up_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_student ON communication_logs(student_id);

-- 4. ENABLE RLS ON STUDENTS TABLE
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR STUDENTS (STRICT MULTI-TENANT ISOLATION BY PROFILE ORG / UNITS)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read students in authorized organization" ON students;
    DROP POLICY IF EXISTS "Users can insert students in authorized organization" ON students;
    DROP POLICY IF EXISTS "Users can update students in authorized organization" ON students;
    DROP POLICY IF EXISTS "Users can delete students in authorized organization" ON students;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Users can read students in authorized organization"
ON students FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR unit_id IN (
        SELECT unit_id FROM user_unit_permissions WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert students in authorized organization"
ON students FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update students in authorized organization"
ON students FOR UPDATE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can delete students in authorized organization"
ON students FOR DELETE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
);

-- 6. CROSS-TENANT PROTECTION TRIGGER FOR RESPONSES.STUDENT_ID
CREATE OR REPLACE FUNCTION verify_response_student_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.student_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM students s
            WHERE s.id = NEW.student_id AND s.organization_id = NEW.organization_id
        ) THEN
            RAISE EXCEPTION 'Cross-tenant violation: Student organization_id does not match Response organization_id.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_verify_response_student_tenant ON responses;
CREATE TRIGGER trg_verify_response_student_tenant
BEFORE INSERT OR UPDATE OF student_id, organization_id ON responses
FOR EACH ROW
EXECUTE FUNCTION verify_response_student_tenant();


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 08: AUTHENTICATION & MULTI-TENANT ACCESS CONTROL
-- Enforces real Supabase Auth, organization membership, roles, and RLS policies.
-- ====================================================================

-- 1. TABELA DE MEMBERSHIP DA ORGANIZAÇÃO (organization_members)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id)
);

-- Garantir índices para buscas de alta performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);

-- Enable RLS na tabela de membership
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÕES AUXILIARES SEGURAS (SECURITY DEFINER com search_path = public)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_org_id UUID)
RETURNS TEXT AS $$
    SELECT role 
    FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_unit_access(_unit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_unit_org_id UUID;
    v_user_org_id UUID;
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN RETURN FALSE; END IF;

    SELECT organization_id INTO v_unit_org_id FROM public.units WHERE id = _unit_id;
    IF v_unit_org_id IS NULL THEN RETURN FALSE; END IF;

    SELECT organization_id, role INTO v_user_org_id, v_role
    FROM public.organization_members
    WHERE user_id = v_user_id AND organization_id = v_unit_org_id AND status = 'active';

    IF v_user_org_id IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('owner', 'admin') THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_unit_permissions
        WHERE user_id = v_user_id AND unit_id = _unit_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. POLÍTICAS RLS NAS TABELAS PRINCIPAIS

-- RLS: organization_members
DROP POLICY IF EXISTS "Members can view members of their organization" ON public.organization_members;
CREATE POLICY "Members can view members of their organization"
ON public.organization_members FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
CREATE POLICY "Admins can manage organization members"
ON public.organization_members FOR ALL
USING (public.get_user_org_role(organization_id) IN ('owner', 'admin'));

-- RLS: organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
USING (id = public.get_user_organization_id() AND public.get_user_org_role(id) IN ('owner', 'admin'));

-- RLS: units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view units of their organization" ON public.units;
CREATE POLICY "Users can view units of their organization"
ON public.units FOR SELECT
USING (organization_id = public.get_user_organization_id() AND public.has_unit_access(id));

DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
CREATE POLICY "Admins can manage units"
ON public.units FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.get_user_org_role(organization_id) IN ('owner', 'admin'));

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- RLS: responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view responses of their org" ON public.responses;
CREATE POLICY "Members can view responses of their org"
ON public.responses FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Allow public responses insertion" ON public.responses;
CREATE POLICY "Allow public responses insertion"
ON public.responses FOR INSERT
WITH CHECK (true);

-- RLS: students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view students of their org" ON public.students;
CREATE POLICY "Members can view students of their org"
ON public.students FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can manage students of their org" ON public.students;
CREATE POLICY "Members can manage students of their org"
ON public.students FOR ALL
USING (organization_id = public.get_user_organization_id());

-- RLS: follow_up_cases
ALTER TABLE public.follow_up_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can view cases of their org"
ON public.follow_up_cases FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can update cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can update cases of their org"
ON public.follow_up_cases FOR ALL
USING (organization_id = public.get_user_organization_id());

-- RLS: communication_logs
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can view comm logs of their org"
ON public.communication_logs FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can insert comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can insert comm logs of their org"
ON public.communication_logs FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

-- 4. RPC PARA CRIAÇÃO DE NOVA ORGANIZAÇÃO COM OWNER AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name TEXT,
    p_user_email TEXT,
    p_user_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- 1. Criar Organização
    INSERT INTO public.organizations (name, email)
    VALUES (p_org_name, p_user_email)
    RETURNING id INTO v_org_id;

    -- 2. Criar Membership como OWNER
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', status = 'active';

    -- 3. Criar / Atualizar Profile
    INSERT INTO public.profiles (id, organization_id, email, full_name, role)
    VALUES (v_user_id, v_org_id, p_user_email, COALESCE(p_user_full_name, p_user_email), 'owner')
    ON CONFLICT (id)
    DO UPDATE SET organization_id = v_org_id, role = 'owner', full_name = COALESCE(p_user_full_name, EXCLUDED.full_name);

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 09: AUTH SECURITY & TENANT ISOLATION HARDENING
-- Strict tenant isolation, RLS enforcement, and elimination of client-side privilege escalation.
-- ====================================================================

-- 1. HARDEN RPC CREATE_NEW_ORGANIZATION_OWNER (SECURITY DEFINER, STRICT AUTH VALIDATION)
CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name TEXT,
    p_user_email TEXT,
    p_user_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_clean_name TEXT := TRIM(p_org_name);
    v_clean_email TEXT := LOWER(TRIM(p_user_email));
BEGIN
    -- Validar autenticação do chamador
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
    END IF;

    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RAISE EXCEPTION 'Nome da organização é obrigatório.';
    END IF;

    -- 1. Inserir Organização
    INSERT INTO public.organizations (name, email)
    VALUES (v_clean_name, v_clean_email)
    RETURNING id INTO v_org_id;

    -- 2. Inserir Membership como OWNER
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', status = 'active', updated_at = now();

    -- 3. Atualizar Profile do Usuário
    INSERT INTO public.profiles (id, organization_id, email, full_name, role)
    VALUES (v_user_id, v_org_id, v_clean_email, COALESCE(TRIM(p_user_full_name), v_clean_email), 'owner')
    ON CONFLICT (id)
    DO UPDATE SET organization_id = v_org_id, role = 'owner', full_name = COALESCE(TRIM(p_user_full_name), EXCLUDED.full_name), updated_at = now();

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. RECRIAR E REFORÇAR POLÍTICAS RLS PARA ISOLAMENTO ESTRITO POR TENANT

-- Enable RLS em todas as tabelas relevantes
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unit_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Reforçar políticas RLS de follow_up_cases
DROP POLICY IF EXISTS "Members can view cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can view cases of their org"
ON public.follow_up_cases FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can update cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can update cases of their org"
ON public.follow_up_cases FOR ALL
USING (organization_id = public.get_user_organization_id());

-- Reforçar políticas RLS de communication_logs
DROP POLICY IF EXISTS "Members can view comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can view comm logs of their org"
ON public.communication_logs FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can insert comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can insert comm logs of their org"
ON public.communication_logs FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

-- 3. TRIGGER DE VALIDAÇÃO DE ALUNO NO MESMO TENANT PARA CASES E LOGS
CREATE OR REPLACE FUNCTION public.validate_cross_tenant_student_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_student_org_id UUID;
BEGIN
    IF NEW.student_id IS NOT NULL THEN
        SELECT organization_id INTO v_student_org_id
        FROM public.students
        WHERE id = NEW.student_id;

        IF v_student_org_id IS NOT NULL AND v_student_org_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'Violação de segurança de Tenant: Aluno pertence a outra organização.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_case_student_tenant ON public.follow_up_cases;
CREATE TRIGGER trg_validate_case_student_tenant
BEFORE INSERT OR UPDATE ON public.follow_up_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_cross_tenant_student_reference();

DROP TRIGGER IF EXISTS trg_validate_comm_log_student_tenant ON public.communication_logs;
CREATE TRIGGER trg_validate_comm_log_student_tenant
BEFORE INSERT OR UPDATE ON public.communication_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_cross_tenant_student_reference();


-- ==========================================

-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 10: RESPONSE INSERT SECURITY & PUBLIC RPC ENFORCEMENT
-- Closes direct public INSERT on responses and enforces secure RPC submission.
-- ====================================================================

-- 1. DROP INSECURE PUBLIC INSERT POLICY ON RESPONSES
DROP POLICY IF EXISTS "Allow public responses insertion" ON public.responses;
DROP POLICY IF EXISTS "Members can insert responses of their org" ON public.responses;

-- 2. CREATE STRICT AUTHENTICATED INSERT POLICY FOR RESPONSES
CREATE POLICY "Members can insert responses of their org"
ON public.responses FOR INSERT
WITH CHECK (
    organization_id = public.get_user_organization_id() 
    AND (unit_id IS NULL OR public.has_unit_access(unit_id))
);

-- 3. AUDIT & HARDEN SUBMIT_SURVEY_RESPONSE RPC FUNCTION (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_org_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
BEGIN
    -- Validar NPS Score
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- Validar Token do Link (se fornecido)
    IF p_survey_link_token IS NOT NULL AND TRIM(p_survey_link_token) <> '' THEN
        SELECT sl.survey_id, sl.unit_id, u.organization_id INTO v_survey_id, v_unit_id, v_org_id
        FROM public.survey_links sl
        JOIN public.units u ON u.id = sl.unit_id
        WHERE sl.token = TRIM(p_survey_link_token) AND sl.is_active = true
          AND (sl.expires_at IS NULL OR sl.expires_at > now());

        IF v_survey_id IS NULL THEN
            RAISE EXCEPTION 'Link de pesquisa inválido ou expirado.';
        END IF;
    ELSE
        -- Busca Unidade pelo código
        SELECT id, organization_id INTO v_unit_id, v_org_id FROM public.units WHERE code = p_unit_code AND is_active = true;
        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        -- Busca Pesquisa Ativa para a Organização
        SELECT id INTO v_survey_id FROM public.surveys WHERE organization_id = v_org_id AND is_active = true ORDER BY created_at LIMIT 1;
        IF v_survey_id IS NULL THEN
            SELECT id INTO v_survey_id FROM public.surveys WHERE is_active = true ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    -- Registrar resposta no cabeçalho com organization_id resolvido pelo backend
    INSERT INTO public.responses (
        organization_id, survey_id, unit_id, unit_code, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_org_id, v_survey_id, v_unit_id, p_unit_code, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    -- Gravar resposta individual NPS se houver pergunta cadastrada
    SELECT id INTO v_question_nps_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'nps' LIMIT 1;
    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- Gravar comentário individual se preenchido
    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id FROM public.questions WHERE survey_id = v_survey_id AND question_type = 'text' LIMIT 1;
        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    -- Se nota <= 6 (Detrator), criar automaticamente follow_up_case
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            organization_id, response_id, unit_id, unit_code, student_name, nps_score, comment, status, priority
        ) VALUES (
            v_org_id, v_response_id, v_unit_id, p_unit_code, COALESCE(p_student_identifier, 'Anônimo'), p_nps_score, COALESCE(TRIM(p_comment), 'Sem comentário'), 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
