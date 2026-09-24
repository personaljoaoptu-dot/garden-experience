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
