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
