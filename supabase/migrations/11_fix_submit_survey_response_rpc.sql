-- Migration 11: Fix submit_survey_response RPC schema alignment
-- Adjusts INSERT statements in public.responses and public.follow_up_cases to match actual table columns

CREATE OR REPLACE FUNCTION public.submit_survey_response(
    p_survey_link_token text,
    p_unit_code text,
    p_origin response_origin,
    p_nps_score integer,
    p_comment text DEFAULT NULL::text,
    p_student_identifier text DEFAULT NULL::text,
    p_consent_accepted boolean DEFAULT true,
    p_consent_version text DEFAULT '1.0'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_org_id UUID;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
BEGIN
    -- 1. Validar NPS Score (0 a 10)
    IF p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- 2. Resolver Survey, Unidade e Organização no Backend
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
        SELECT id, organization_id INTO v_unit_id, v_org_id 
        FROM public.units 
        WHERE code = p_unit_code AND is_active = true;

        IF v_unit_id IS NULL THEN
            RAISE EXCEPTION 'Unidade inválida ou inativa.';
        END IF;

        -- Busca Pesquisa Ativa para a Organização
        SELECT id INTO v_survey_id 
        FROM public.surveys 
        WHERE organization_id = v_org_id AND is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1;

        IF v_survey_id IS NULL THEN
            SELECT id INTO v_survey_id 
            FROM public.surveys 
            WHERE is_active = true 
            ORDER BY created_at DESC 
            LIMIT 1;
        END IF;
    END IF;

    -- 3. Registrar resposta (somente colunas existentes em public.responses)
    INSERT INTO public.responses (
        organization_id, survey_id, unit_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_org_id, v_survey_id, v_unit_id, p_origin, p_nps_score, p_student_identifier,
        jsonb_build_object(
            'consent_accepted', p_consent_accepted,
            'consent_version', p_consent_version,
            'consent_at', now()
        )
    ) RETURNING id INTO v_response_id;

    -- 4. Gravar resposta individual NPS se houver pergunta cadastrada
    SELECT id INTO v_question_nps_id 
    FROM public.questions 
    WHERE survey_id = v_survey_id AND question_type = 'nps' 
    LIMIT 1;

    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric) 
        VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- 5. Gravar comentário individual se preenchido
    IF p_comment IS NOT NULL AND TRIM(p_comment) <> '' THEN
        SELECT id INTO v_question_text_id 
        FROM public.questions 
        WHERE survey_id = v_survey_id AND question_type = 'text' 
        LIMIT 1;

        IF v_question_text_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text) 
            VALUES (v_response_id, v_question_text_id, TRIM(p_comment));
        END IF;
    END IF;

    -- 6. Se nota <= 6 (Detrator), criar automaticamente follow_up_case
    -- (utilizando apenas colunas existentes em public.follow_up_cases)
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            organization_id, response_id, unit_id, status, priority
        ) VALUES (
            v_org_id, v_response_id, v_unit_id, 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$function$;
