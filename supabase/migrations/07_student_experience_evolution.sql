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

ALTER TABLE students ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE CASCADE;

-- 2. ADD STUDENT_ID RELATIONSHIPS (NULLABLE) TO RESPONSES, CASES & COMM LOGS
ALTER TABLE responses ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE follow_up_cases ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- 3. INDEXES FOR PERFORMANCE AND TENANT LOOKUPS
CREATE INDEX IF NOT EXISTS idx_students_org ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_unit ON students(unit_id);
CREATE INDEX IF NOT EXISTS idx_students_evo_id ON students(external_evo_id);

CREATE INDEX IF NOT EXISTS idx_responses_student ON responses(student_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_responses_org_created ON responses(organization_id, created_at);
EXCEPTION WHEN undefined_column THEN null; END $$;

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
ALTER TABLE responses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION verify_response_student_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.student_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
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
