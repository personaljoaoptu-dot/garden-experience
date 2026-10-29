-- =============================================================================
-- 32_transfer_response_unit.sql
-- RPC transfer_response_unit with SECURITY DEFINER
-- Allows moving a survey response, follow_up_case, and student to the correct unit
-- =============================================================================

CREATE OR REPLACE FUNCTION public.transfer_response_unit(
    p_response_id UUID,
    p_target_unit_id UUID,
    p_target_unit_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unit_code TEXT := p_target_unit_code;
    v_unit_name TEXT;
    v_student_id UUID;
BEGIN
    -- Verify target unit exists and fetch its code and name
    SELECT code, name INTO v_unit_code, v_unit_name
    FROM public.units
    WHERE id = p_target_unit_id;

    IF v_unit_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unidade de destino não encontrada.');
    END IF;

    -- Fetch student_id from response
    BEGIN
        SELECT student_id INTO v_student_id
        FROM public.responses
        WHERE id = p_response_id;
    EXCEPTION WHEN OTHERS THEN
        v_student_id := NULL;
    END;

    -- Update responses table (unit_id)
    UPDATE public.responses
    SET unit_id = p_target_unit_id
    WHERE id = p_response_id;

    -- Update linked follow_up_cases if any
    UPDATE public.follow_up_cases
    SET unit_id = p_target_unit_id
    WHERE response_id = p_response_id;

    -- Update communication logs if any
    UPDATE public.communication_logs
    SET unit_id = p_target_unit_id
    WHERE response_id = p_response_id;

    -- Update student record if linked
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students
        SET unit_id = p_target_unit_id
        WHERE id = v_student_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'unit_id', p_target_unit_id,
        'unit_code', v_unit_code,
        'unit_name', v_unit_name
    );
END;
$$;
