-- =====================================================================
-- 23_fix_submit_survey_response_overload.sql
-- 1. Removes overloaded duplicate RPC functions (TEXT vs VARCHAR) that caused
--    PostgREST PGRST203 ambiguity error on customer survey submission.
-- 2. Aligns submit_survey_response with exact live database schema:
--    - public.students (name, email, phone, external_evo_id, status)
--    - public.responses (nps_category, student_identifier, metadata jsonb)
--    - public.answers (response_id, question_id, touchpoint_id, answer_text, answer_numeric)
--    - public.follow_up_cases (status = 'pending'::case_status, priority = case_priority)
-- 3. Backfills survey_links.survey_id and fixes unit name UTF-8 encoding.
-- =====================================================================

-- 1. Drop all overloaded signatures of submit_survey_response
DROP FUNCTION IF EXISTS public.submit_survey_response(
    text, text, public.response_origin, integer, text, text, text, text, jsonb, boolean, text
);

DROP FUNCTION IF EXISTS public.submit_survey_response(
    character varying, character varying, public.response_origin, integer, text, character varying, character varying, character varying, jsonb, boolean, character varying
);

DROP FUNCTION IF EXISTS public.submit_survey_response(
    text, text, text, integer, text, text, text, text, jsonb, boolean, text
);

-- Drop obsolete 3-arg overload of create_new_organization_owner
DROP FUNCTION IF EXISTS public.create_new_organization_owner(text, text, text);

-- 2. Clean up any double-encoded em-dashes in unit names
UPDATE public.units
SET name = replace(name, 'â€”', '—')
WHERE name LIKE '%â€”%';

-- 3. Ensure every organization has at least one active survey
INSERT INTO public.surveys (organization_id, title, description, is_active)
SELECT
    o.id,
    'Pesquisa Oficial de Experiência (NPS)',
    'Avaliação contínua de satisfação dos alunos e clientes.',
    true
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.surveys s WHERE s.organization_id = o.id AND s.is_active = true
);

-- 4. Heal any survey_links that have survey_id IS NULL
UPDATE public.survey_links sl
SET survey_id = (
    SELECT s.id
    FROM public.units u
    JOIN public.surveys s ON s.organization_id = u.organization_id AND s.is_active = true
    WHERE u.id = sl.unit_id
    ORDER BY s.created_at DESC
    LIMIT 1
)
WHERE sl.survey_id IS NULL;

-- 5. Create single canonical submit_survey_response RPC matching live schema
CREATE OR REPLACE FUNCTION public.submit_survey_response(
    p_survey_link_token TEXT,
    p_unit_code TEXT DEFAULT NULL,
    p_origin TEXT DEFAULT 'qr_code',
    p_nps_score INTEGER DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_student_email TEXT DEFAULT NULL,
    p_student_phone TEXT DEFAULT NULL,
    p_touchpoint_ratings JSONB DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT false,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_unit_id UUID;
    v_survey_id UUID;
    v_link_id UUID;
    v_response_id UUID;
    v_student_id UUID := NULL;
    v_nps_question_id UUID;
    v_text_question_id UUID;
    v_tp_key TEXT;
    v_tp_val INTEGER;
    v_origin_enum public.response_origin;
    v_category_enum public.nps_category_type;
    v_metadata JSONB;
BEGIN
    IF p_survey_link_token IS NULL OR trim(p_survey_link_token) = '' THEN
        RAISE EXCEPTION 'Token da pesquisa é obrigatório para envio público.';
    END IF;

    IF p_nps_score IS NULL OR p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS inválida. Deve ser um valor entre 0 e 10.';
    END IF;

    -- Map text origin safely to response_origin enum
    IF p_origin IN ('qr_code', 'qr_web', 'qr') THEN
        v_origin_enum := 'qr_code'::public.response_origin;
    ELSIF p_origin IN ('tablet', 'kiosk') THEN
        v_origin_enum := 'tablet'::public.response_origin;
    ELSE
        v_origin_enum := 'link'::public.response_origin;
    END IF;

    -- Compute NPS category enum
    IF p_nps_score >= 9 THEN
        v_category_enum := 'promoter'::public.nps_category_type;
    ELSIF p_nps_score >= 7 THEN
        v_category_enum := 'passive'::public.nps_category_type;
    ELSE
        v_category_enum := 'detractor'::public.nps_category_type;
    END IF;

    -- 1. Validate active survey link token & unit
    SELECT
        sl.id,
        sl.unit_id,
        u.organization_id,
        COALESCE(
            sl.survey_id,
            (SELECT s2.id FROM public.surveys s2 WHERE s2.organization_id = u.organization_id AND s2.is_active = true ORDER BY s2.created_at DESC LIMIT 1)
        )
    INTO v_link_id, v_unit_id, v_org_id, v_survey_id
    FROM public.survey_links sl
    JOIN public.units u ON u.id = sl.unit_id
    WHERE sl.token = trim(p_survey_link_token)
      AND sl.is_active = true
      AND u.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
    LIMIT 1;

    IF v_link_id IS NULL THEN
        RAISE EXCEPTION 'Link da pesquisa inválido, inativo ou expirado.';
    END IF;

    -- Ensure an active survey exists if none was found
    IF v_survey_id IS NULL THEN
        INSERT INTO public.surveys (organization_id, title, description, is_active)
        VALUES (
            v_org_id,
            'Pesquisa Oficial de Experiência (NPS)',
            'Avaliação contínua de satisfação dos alunos e clientes.',
            true
        )
        RETURNING id INTO v_survey_id;

        UPDATE public.survey_links SET survey_id = v_survey_id WHERE id = v_link_id;
    END IF;

    -- 2. Resolve or upsert Student contact info in public.students
    IF (p_student_identifier IS NOT NULL AND trim(p_student_identifier) <> '' AND trim(p_student_identifier) <> 'Anônimo' AND trim(p_student_identifier) <> 'Anonimo')
       OR (p_student_email IS NOT NULL AND trim(p_student_email) <> '')
       OR (p_student_phone IS NOT NULL AND trim(p_student_phone) <> '') THEN

        IF p_student_email IS NOT NULL AND trim(p_student_email) <> '' THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id
              AND lower(email) = lower(trim(p_student_email))
            LIMIT 1;
        END IF;

        IF v_student_id IS NULL THEN
            INSERT INTO public.students (
                organization_id, unit_id, name, email, phone, status
            ) VALUES (
                v_org_id,
                v_unit_id,
                COALESCE(NULLIF(trim(p_student_identifier), ''), 'Anônimo'),
                NULLIF(trim(p_student_email), ''),
                NULLIF(trim(p_student_phone), ''),
                'active'
            )
            RETURNING id INTO v_student_id;
        ELSE
            UPDATE public.students
            SET phone = COALESCE(NULLIF(trim(p_student_phone), ''), phone),
                name = COALESCE(NULLIF(trim(p_student_identifier), ''), name),
                updated_at = now()
            WHERE id = v_student_id;
        END IF;
    END IF;

    -- 3. Build metadata JSONB with comment, contact info, touchpoint_ratings, and consent
    v_metadata := jsonb_build_object(
        'comment', NULLIF(trim(p_comment), ''),
        'student_email', NULLIF(trim(p_student_email), ''),
        'student_phone', NULLIF(trim(p_student_phone), ''),
        'touchpoint_ratings', COALESCE(p_touchpoint_ratings, '{}'::jsonb),
        'survey_link_id', v_link_id,
        'consent_accepted', COALESCE(p_consent_accepted, false),
        'consent_version', COALESCE(p_consent_version, '1.0')
    );

    -- 4. Insert Response into public.responses (nps_category is a generated column)
    INSERT INTO public.responses (
        organization_id,
        unit_id,
        survey_id,
        student_id,
        origin,
        nps_score,
        student_identifier,
        metadata
    ) VALUES (
        v_org_id,
        v_unit_id,
        v_survey_id,
        v_student_id,
        v_origin_enum,
        p_nps_score,
        COALESCE(NULLIF(trim(p_student_identifier), ''), 'Anônimo'),
        v_metadata
    ) RETURNING id INTO v_response_id;

    -- 5. Insert Answer rows into public.answers for NPS, open comment, and touchpoints
    SELECT id INTO v_nps_question_id
    FROM public.questions
    WHERE survey_id = v_survey_id AND question_type = 'nps'
    ORDER BY order_index ASC
    LIMIT 1;

    IF v_nps_question_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric, answer_text)
        VALUES (v_response_id, v_nps_question_id, p_nps_score, p_nps_score::text);
    END IF;

    IF p_comment IS NOT NULL AND trim(p_comment) <> '' THEN
        SELECT id INTO v_text_question_id
        FROM public.questions
        WHERE survey_id = v_survey_id AND question_type = 'text'
        ORDER BY order_index ASC
        LIMIT 1;

        IF v_text_question_id IS NOT NULL THEN
            INSERT INTO public.answers (response_id, question_id, answer_text)
            VALUES (v_response_id, v_text_question_id, trim(p_comment));
        END IF;
    END IF;

    IF p_touchpoint_ratings IS NOT NULL AND jsonb_typeof(p_touchpoint_ratings) = 'object' THEN
        FOR v_tp_key, v_tp_val IN
            SELECT key, (value::text)::integer FROM jsonb_each_text(p_touchpoint_ratings)
        LOOP
            BEGIN
                INSERT INTO public.answers (
                    response_id, touchpoint_id, answer_numeric, answer_text
                ) VALUES (
                    v_response_id, v_tp_key::uuid, v_tp_val, v_tp_val::text
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END IF;

    -- 6. Automatic Detractor Follow-up Case Creation (score <= 6)
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            organization_id,
            unit_id,
            response_id,
            student_id,
            status,
            priority
        ) VALUES (
            v_org_id,
            v_unit_id,
            v_response_id,
            v_student_id,
            'pending'::public.case_status,
            CASE WHEN p_nps_score <= 3 THEN 'urgent'::public.case_priority ELSE 'high'::public.case_priority END
        );
    END IF;

    RETURN v_response_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_survey_response(
    TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
