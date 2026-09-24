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
