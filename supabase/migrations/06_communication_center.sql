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
