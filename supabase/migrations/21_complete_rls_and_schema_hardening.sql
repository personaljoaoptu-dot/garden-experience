-- ============================================================================
-- MIGRATION 21: Complete End-to-End Schema, Foreign Keys, RPC & RLS Hardening
-- ============================================================================

-- 1. Add missing columns to public.organizations and public.students for Settings & Evolution persistence
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Ensure all users in organization_members have a corresponding profile row,
--    then add explicit FK from organization_members(user_id) -> profiles(id) for PostgREST joins
INSERT INTO public.profiles (id, email, full_name, role, organization_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin'::user_role,
  om.organization_id
FROM public.organization_members om
JOIN auth.users u ON u.id = om.user_id
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_profile_fkey'
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Fix corrupted UTF-8 survey title if present
UPDATE public.surveys
SET title = 'Pesquisa de Satisfação NPS'
WHERE title LIKE 'Pesquisa de Satisfa%o NPS';

-- 4. Multi-tenant RLS policies for tablets (Devices), surveys, questions, survey_links, students
DROP POLICY IF EXISTS "Org members manage tablets" ON public.tablets;
CREATE POLICY "Org members manage tablets"
ON public.tablets
FOR ALL
USING (
  unit_id IN (
    SELECT u.id FROM public.units u
    WHERE u.organization_id IN (SELECT public.get_user_organization_ids())
  )
)
WITH CHECK (
  unit_id IN (
    SELECT u.id FROM public.units u
    WHERE u.organization_id IN (SELECT public.get_user_organization_ids())
  )
);

DROP POLICY IF EXISTS "Org members manage surveys" ON public.surveys;
CREATE POLICY "Org members manage surveys"
ON public.surveys
FOR ALL
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
)
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Org members manage survey sections" ON public.survey_sections;
CREATE POLICY "Org members manage survey sections"
ON public.survey_sections
FOR ALL
USING (
  survey_id IN (
    SELECT s.id FROM public.surveys s
    WHERE s.organization_id IN (SELECT public.get_user_organization_ids())
  )
)
WITH CHECK (
  survey_id IN (
    SELECT s.id FROM public.surveys s
    WHERE s.organization_id IN (SELECT public.get_user_organization_ids())
  )
);

DROP POLICY IF EXISTS "Public view active questions" ON public.questions;
CREATE POLICY "Public view active questions"
ON public.questions
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Org members manage questions" ON public.questions;
CREATE POLICY "Org members manage questions"
ON public.questions
FOR ALL
USING (
  survey_id IN (
    SELECT s.id FROM public.surveys s
    WHERE s.organization_id IN (SELECT public.get_user_organization_ids())
  )
)
WITH CHECK (
  survey_id IN (
    SELECT s.id FROM public.surveys s
    WHERE s.organization_id IN (SELECT public.get_user_organization_ids())
  )
);

DROP POLICY IF EXISTS "Org members manage survey links" ON public.survey_links;
CREATE POLICY "Org members manage survey links"
ON public.survey_links
FOR ALL
USING (
  unit_id IN (
    SELECT u.id FROM public.units u
    WHERE u.organization_id IN (SELECT public.get_user_organization_ids())
  )
)
WITH CHECK (
  unit_id IN (
    SELECT u.id FROM public.units u
    WHERE u.organization_id IN (SELECT public.get_user_organization_ids())
  )
);

DROP POLICY IF EXISTS "Users can read students in authorized organization" ON public.students;
DROP POLICY IF EXISTS "Users can insert students in authorized organization" ON public.students;
DROP POLICY IF EXISTS "Users can update students in authorized organization" ON public.students;
DROP POLICY IF EXISTS "Users can delete students in authorized organization" ON public.students;
DROP POLICY IF EXISTS "Org members manage students" ON public.students;

CREATE POLICY "Org members manage students"
ON public.students
FOR ALL
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
)
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids())
);

-- 5. Create delete_tablet RPC for safe device deletion with history check
CREATE OR REPLACE FUNCTION public.delete_tablet(
  p_tablet_id UUID,
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_org_id UUID;
  v_dep_count INTEGER := 0;
BEGIN
  SELECT u.organization_id INTO v_unit_org_id
  FROM public.tablets t
  JOIN public.units u ON u.id = t.unit_id
  WHERE t.id = p_tablet_id;

  IF v_unit_org_id IS NULL OR v_unit_org_id <> p_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dispositivo não encontrado nesta organização.');
  END IF;

  SELECT count(*) INTO v_dep_count
  FROM public.responses r
  WHERE r.organization_id = p_org_id
    AND (r.metadata->>'tablet_id' = p_tablet_id::text OR r.metadata->>'device_id' = p_tablet_id::text);

  IF v_dep_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blockedByHistory', true,
      'error', 'Este dispositivo possui respostas vinculadas e não pode ser excluído.'
    );
  END IF;

  DELETE FROM public.tablets WHERE id = p_tablet_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Upgrade submit_survey_response RPC to automatically link/create student in public.students
CREATE OR REPLACE FUNCTION public.submit_survey_response(
    p_survey_link_token VARCHAR,
    p_unit_code VARCHAR DEFAULT NULL,
    p_origin response_origin DEFAULT 'link'::response_origin,
    p_nps_score INTEGER DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier VARCHAR DEFAULT NULL,
    p_student_email VARCHAR DEFAULT NULL,
    p_student_phone VARCHAR DEFAULT NULL,
    p_touchpoint_ratings JSONB DEFAULT NULL,
    p_consent_accepted BOOLEAN DEFAULT false,
    p_consent_version VARCHAR DEFAULT '1.0'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_survey_id UUID;
    v_unit_id UUID;
    v_org_id UUID;
    v_student_id UUID := NULL;
    v_response_id UUID;
    v_question_nps_id UUID;
    v_question_text_id UUID;
    v_case_id UUID;
    v_clean_identifier TEXT := NULLIF(TRIM(COALESCE(p_student_identifier, '')), '');
    v_clean_email TEXT := NULLIF(LOWER(TRIM(COALESCE(p_student_email, ''))), '');
    v_clean_phone TEXT := NULLIF(TRIM(COALESCE(p_student_phone, '')), '');
    v_meta JSONB;
BEGIN
    -- 1. Token é estritamente OBRIGATÓRIO (Zero fallback)
    IF p_survey_link_token IS NULL OR TRIM(p_survey_link_token) = '' THEN
        RAISE EXCEPTION 'Token da pesquisa é obrigatório.';
    END IF;

    -- 2. Validar limite do NPS Score (0 a 10)
    IF p_nps_score IS NULL OR p_nps_score < 0 OR p_nps_score > 10 THEN
        RAISE EXCEPTION 'Nota NPS deve estar entre 0 e 10.';
    END IF;

    -- 3. Resolver Survey, Unidade e Organização EXCLUSIVAMENTE pelo TOKEN
    SELECT
        sl.survey_id,
        sl.unit_id,
        u.organization_id
    INTO
        v_survey_id,
        v_unit_id,
        v_org_id
    FROM public.survey_links sl
    JOIN public.units u ON u.id = sl.unit_id
    JOIN public.surveys s ON s.id = sl.survey_id
    WHERE sl.token = TRIM(p_survey_link_token)
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
      AND u.is_active = true
      AND s.is_active = true
      AND u.organization_id = s.organization_id;

    IF v_survey_id IS NULL THEN
        RAISE EXCEPTION 'Link de pesquisa inválido, desativado ou expirado.';
    END IF;

    -- 4. Resolver ou criar registro em public.students se o aluno se identificou
    IF v_clean_identifier IS NOT NULL
       AND LOWER(v_clean_identifier) NOT IN ('anônimo', 'anonimo', 'tablet totem') THEN

        IF v_clean_email IS NOT NULL THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id AND LOWER(email) = v_clean_email
            LIMIT 1;
        END IF;

        IF v_student_id IS NULL AND v_clean_phone IS NOT NULL THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id AND phone = v_clean_phone
            LIMIT 1;
        END IF;

        IF v_student_id IS NULL THEN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE organization_id = v_org_id AND LOWER(TRIM(name)) = LOWER(v_clean_identifier)
            LIMIT 1;
        END IF;

        IF v_student_id IS NULL THEN
            INSERT INTO public.students (organization_id, unit_id, name, email, phone, status)
            VALUES (v_org_id, v_unit_id, v_clean_identifier, v_clean_email, v_clean_phone, 'active')
            RETURNING id INTO v_student_id;
        ELSE
            UPDATE public.students
            SET
                unit_id = COALESCE(unit_id, v_unit_id),
                email = COALESCE(v_clean_email, email),
                phone = COALESCE(v_clean_phone, phone),
                updated_at = now()
            WHERE id = v_student_id;
        END IF;
    END IF;

    v_meta := jsonb_build_object(
        'comment', p_comment,
        'student_email', p_student_email,
        'student_phone', p_student_phone,
        'touchpoint_ratings', p_touchpoint_ratings,
        'consent_accepted', p_consent_accepted,
        'consent_version', p_consent_version,
        'consent_at', now()
    );

    -- 5. Gravar resposta com tenant, unidade e student_id
    INSERT INTO public.responses (
        organization_id, survey_id, unit_id, student_id, origin, nps_score, student_identifier, metadata
    ) VALUES (
        v_org_id, v_survey_id, v_unit_id, v_student_id, p_origin, p_nps_score, p_student_identifier, v_meta
    ) RETURNING id INTO v_response_id;

    -- 6. Gravar resposta individual NPS se houver pergunta cadastrada na pesquisa
    SELECT id INTO v_question_nps_id
    FROM public.questions
    WHERE survey_id = v_survey_id AND question_type = 'nps'
    LIMIT 1;

    IF v_question_nps_id IS NOT NULL THEN
        INSERT INTO public.answers (response_id, question_id, answer_numeric)
        VALUES (v_response_id, v_question_nps_id, p_nps_score);
    END IF;

    -- 7. Gravar comentário em texto se fornecido
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

    -- 8. Se nota <= 6 (Detrator), criar automaticamente caso em follow_up_cases
    IF p_nps_score <= 6 THEN
        INSERT INTO public.follow_up_cases (
            organization_id, response_id, unit_id, status, priority
        ) VALUES (
            v_org_id, v_response_id, v_unit_id, 'pending'::case_status, 'high'::case_priority
        ) RETURNING id INTO v_case_id;
    END IF;

    RETURN v_response_id;
END;
$$;

-- 7. Backfill public.students for existing identified responses
DO $$
DECLARE
    r RECORD;
    v_st_id UUID;
BEGIN
    FOR r IN
        SELECT id, organization_id, unit_id, student_identifier,
               metadata->>'student_email' AS email,
               metadata->>'student_phone' AS phone
        FROM public.responses
        WHERE student_id IS NULL
          AND student_identifier IS NOT NULL
          AND TRIM(student_identifier) <> ''
          AND LOWER(TRIM(student_identifier)) NOT IN ('anônimo', 'anonimo', 'tablet totem')
    LOOP
        v_st_id := NULL;
        SELECT id INTO v_st_id
        FROM public.students
        WHERE organization_id = r.organization_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(r.student_identifier))
        LIMIT 1;

        IF v_st_id IS NULL THEN
            INSERT INTO public.students (organization_id, unit_id, name, email, phone, status)
            VALUES (r.organization_id, r.unit_id, TRIM(r.student_identifier), r.email, r.phone, 'active')
            RETURNING id INTO v_st_id;
        END IF;

        UPDATE public.responses SET student_id = v_st_id WHERE id = r.id;
    END LOOP;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
