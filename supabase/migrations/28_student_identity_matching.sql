-- =============================================================================
-- 28_student_identity_matching.sql
-- Enhances submit_survey_response to unify a student's evaluations across time
-- whether they identify by Email, Phone/WhatsApp (normalized digits), or Name.
-- =============================================================================

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
    v_link_id UUID := NULL;
    v_tablet_id UUID := NULL;
    v_tablet_name TEXT := NULL;
    v_response_id UUID;
    v_student_id UUID := NULL;
    v_nps_question_id UUID;
    v_text_question_id UUID;
    v_tp_key TEXT;
    v_tp_val INTEGER;
    v_origin_enum public.response_origin;
    v_category_enum public.nps_category_type;
    v_metadata JSONB;
    v_clean_phone TEXT;
BEGIN
    IF p_survey_link_token IS NULL OR trim(p_survey_link_token) = '' THEN
        RAISE EXCEPTION 'Token da pesquisa ou do dispositivo é obrigatório para envio.';
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

    -- 1A. Validate active survey link token & unit
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

    -- 1B. If not found in survey_links, check public.tablets (device_token)
    IF v_link_id IS NULL THEN
        SELECT
            t.id,
            t.device_name,
            t.unit_id,
            u.organization_id,
            (SELECT s2.id FROM public.surveys s2 WHERE s2.organization_id = u.organization_id AND s2.is_active = true ORDER BY s2.created_at DESC LIMIT 1)
        INTO v_tablet_id, v_tablet_name, v_unit_id, v_org_id, v_survey_id
        FROM public.tablets t
        JOIN public.units u ON u.id = t.unit_id
        WHERE t.device_token = trim(p_survey_link_token)
          AND t.is_active = true
          AND u.is_active = true
        LIMIT 1;

        IF v_tablet_id IS NOT NULL THEN
            v_origin_enum := 'tablet'::public.response_origin;
            UPDATE public.tablets SET last_ping = now() WHERE id = v_tablet_id;
        END IF;
    END IF;

    IF v_link_id IS NULL AND v_tablet_id IS NULL THEN
        RAISE EXCEPTION 'Token da pesquisa ou do dispositivo inválido, inativo ou expirado.';
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

        IF v_link_id IS NOT NULL THEN
            UPDATE public.survey_links SET survey_id = v_survey_id WHERE id = v_link_id;
        END IF;
    END IF;

    -- 2. Resolve or upsert Student contact info in public.students (by Email, Phone, or Name)
    v_clean_phone := regexp_replace(COALESCE(p_student_phone, ''), '\D', '', 'g');

    IF (p_student_identifier IS NOT NULL AND trim(p_student_identifier) <> '' AND lower(trim(p_student_identifier)) NOT IN ('anônimo', 'anonimo'))
       OR (p_student_email IS NOT NULL AND trim(p_student_email) <> '')
       OR (length(v_clean_phone) >= 8) THEN

        -- Match 1: By Email
        IF p_student_email IS NOT NULL AND trim(p_student_email) <> '' THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id
              AND lower(trim(email)) = lower(trim(p_student_email))
            LIMIT 1;
        END IF;

        -- Match 2: By Phone (normalized digits)
        IF v_student_id IS NULL AND length(v_clean_phone) >= 8 THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id
              AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_clean_phone
            LIMIT 1;
        END IF;

        -- Match 3: By Exact Name (when not anonymous)
        IF v_student_id IS NULL AND p_student_identifier IS NOT NULL AND trim(p_student_identifier) <> '' AND lower(trim(p_student_identifier)) NOT IN ('anônimo', 'anonimo') THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id
              AND lower(trim(name)) = lower(trim(p_student_identifier))
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
                email = COALESCE(NULLIF(trim(p_student_email), ''), email),
                name = CASE
                    WHEN p_student_identifier IS NOT NULL AND trim(p_student_identifier) <> '' AND lower(trim(p_student_identifier)) NOT IN ('anônimo', 'anonimo')
                    THEN trim(p_student_identifier)
                    ELSE name
                END,
                updated_at = now()
            WHERE id = v_student_id;
        END IF;
    END IF;

    -- 3. Build metadata JSONB with comment, contact info, touchpoint_ratings, tablet info, and consent
    v_metadata := jsonb_build_object(
        'comment', NULLIF(trim(p_comment), ''),
        'student_email', NULLIF(trim(p_student_email), ''),
        'student_phone', NULLIF(trim(p_student_phone), ''),
        'touchpoint_ratings', COALESCE(p_touchpoint_ratings, '{}'::jsonb),
        'survey_link_id', v_link_id,
        'tablet_id', v_tablet_id,
        'device_id', v_tablet_id,
        'device_name', v_tablet_name,
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
