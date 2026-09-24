# Arquitetura Técnica — Construtor de Pesquisas & Pontos de Contato Configuráveis (`SURVEY_BUILDER_ARCHITECTURE.md`)

**Sistema**: Garden Experience v1.2 — Dynamic Survey Builder & Touchpoints  
**Data**: 09 de Setembro de 2026  
**Status**: 🟡 **PROPOSTA DE ARQUITETURA SUBMETIDA PARA REVISÃO**

---

## 1. VISÃO GERAL DA EVOLUÇÃO ESTRUTURAL

Esta evolução transforma o módulo de pesquisas rígido do Garden Experience em um **Construtor Dinâmico de Pesquisas e Gestor de Pontos de Contato (Touchpoints)** 100% configurável via interface administrativa, totalmente preparado para SaaS multi-tenant.

O administrador da academia (ou cliente SaaS) poderá criar seções, cadastrar pontos de contato (ex: Recepção, Professores, Limpeza, Equipamentos), definir escalas (1–5, 0–10, etc.), ordenar perguntas e associar às pesquisas e unidades sem alterar nenhuma linha de código.

---

## 2. HIERARQUIA CONCEITUAL DAS ENTIDADES

```text
Organization (Empresa / Cliente SaaS)
  └── Units (Unidades / Filiais)
       └── Surveys (Pesquisas de Satisfação)
            ├── Sections (Seções: "Experiência Geral", "Atendimento", "Estrutura")
            │    ├── Touchpoints (Pontos de Contato: "Recepção", "Professores")
            │    │    └── Questions (Perguntas em escala 1-5, estrelas, etc.)
            │    └── Questions (Pergunta NPS 0-10, comentário texto)
            └── Settings (Anonimato, consentimento LGPD, expiração)
```

---

## 3. AUDITORIA E REUTILIZAÇÃO DO BANCO DE DADOS POSTGRESQL

| Tabela Existente | Status | Ação / Alteração Necessária | Impacto em Respostas Históricas |
| :--- | :--- | :--- | :--- |
| `organizations` | 🟢 Reutilizar | Nenhuma alteração | Zero impacto |
| `units` | 🟢 Reutilizar | Nenhuma alteração | Zero impacto |
| `surveys` | 🟢 Reutilizar | Nenhuma alteração | Zero impacto |
| `survey_sections` | 🆕 Nova Tabela | Armazena seções ordenadas da pesquisa (`title`, `description`, `order_index`) | Zero impacto (Totalmente compatível) |
| `touchpoints` | 🆕 Nova Tabela | Armazena pontos de contato (`name`, `category`, `evaluation_type`, `scale_min`, `scale_max`, `is_active`) | Zero impacto |
| `questions` | 🟡 Alterar | Adicionar `section_id` (FK), `touchpoint_id` (FK), `allow_comment` e `is_active` | Zero impacto (Campos opcionais adicionados) |
| `survey_links` | 🟢 Reutilizar | Mantém tokens CSPRNG UUID v4 e roteamento `/p/{token}` | Zero impacto |
| `tablets` / `devices` | 🟢 Reutilizar | Mantém credenciais de dispositivo e modo Kiosk | Zero impacto |
| `responses` | 🟢 Reutilizar | Registra o cabeçalho do aluno (NPS Score, Unidade, Origem, Consentimento) | Zero impacto |
| `answers` | 🟡 Alterar | Adicionar `touchpoint_id` (FK) para viabilizar agregação rápida no Dashboard | Zero impacto (Respostas anteriores mantêm `touchpoint_id = NULL`) |
| `follow_up_cases` | 🟢 Reutilizar | Auto-criação mantida quando Nota NPS $\le 6$ | Zero impacto |

---

## 4. NOVO ESQUEMA DE MIGRAÇÃO SQL (`05_survey_builder.sql`)

```sql
-- ====================================================================
-- MIGRATION 05: SURVEY BUILDER & TOUCHPOINTS ENGINE
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
ALTER TABLE public.questions 
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.survey_sections(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS touchpoint_id UUID REFERENCES public.touchpoints(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS allow_comment BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 4. ADICIONAR COLUNA NA TABELA ANSWERS PARA RANKING DE PONTOS DE CONTATO
ALTER TABLE public.answers 
    ADD COLUMN IF NOT EXISTS touchpoint_id UUID REFERENCES public.touchpoints(id) ON DELETE SET NULL;

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

CREATE POLICY "Leitura pública de touchpoints ativos" ON public.touchpoints FOR SELECT USING (is_active = true);
CREATE POLICY "Leitura pública de seções ativas" ON public.survey_sections FOR SELECT USING (is_active = true);
CREATE POLICY "Gestores e Admins leem todos os touchpoints" ON public.touchpoints FOR SELECT USING (true);
CREATE POLICY "Administradores gerenciam touchpoints" ON public.touchpoints FOR ALL USING (public.is_admin());
CREATE POLICY "Administradores gerenciam seções" ON public.survey_sections FOR ALL USING (public.is_admin());
```

---

## 5. ATUALIZAÇÃO DA RPC `submit_survey_response` (ATÔMICA & DINÂMICA)

A função RPC `submit_survey_response` será atualizada para aceitar um payload JSON com as respostas dos pontos de contato e perguntas individuais:

```sql
CREATE OR REPLACE FUNCTION submit_survey_response_v2(
    p_survey_link_token TEXT,
    p_unit_code TEXT,
    p_origin response_origin,
    p_nps_score INT,
    p_comment TEXT DEFAULT NULL,
    p_student_identifier TEXT DEFAULT NULL,
    p_answers_json JSONB DEFAULT '[]'::jsonb, -- Array de [{question_id, touchpoint_id, numeric_val, text_val}]
    p_consent_accepted BOOLEAN DEFAULT true,
    p_consent_version TEXT DEFAULT '1.0'
)
RETURNS UUID AS $$
-- Executa gravação atômica da resposta NPS, respostas por ponto de contato e auto-criação de follow_up_case se nota <= 6.
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

---

## 6. ARQUITETURA DAS TELAS ADMINISTRATIVAS & REORGANIZAÇÃO DE NAVEGAÇÃO

Separaremos completamente as áreas de **negócio/operação** das telas **técnicas/desenvolvimento**:

### Menu de Navegação Principal:
1. 📊 **Dashboard**: KPIs de NPS Score, Nota Média Geral dos Pontos de Contato, Tabela Comparativa por Unidade, Ranking de Pontos de Contato (destaque automático para notas $< 4.0$) e Feed de Comentários.
2. 📝 **Pesquisas**: Construtor visual de pesquisas com criação de Seções ("Experiência Geral", "Atendimento", "Estrutura"), reordenação de perguntas e adição de Touchpoints.
3. ⭐ **Pontos de Contato**: Tabela de gerenciamento de Touchpoints (Nome, Categoria, Escala 1-5, Status Ativo/Inativo, Unidades associadas e modal de cadastro).
4. 📱 **QR Codes & Links**: Gestão de links públicos e download de cartazes para impressão.
5. 📟 **Dispositivos / Tablets**: Gestão e inclusão de totens de recepção com credencial mascarada.
6. ⚠️ **Follow-up (Detratores)**: Gestão de casos de acompanhamento com filtro de status e prioridades.
7. 📈 **Relatórios & CSV**: Exportação consolidada com filtros por período, unidade, pesquisa e ponto de contato.
8. ⚙️ **Configurações & Modo Técnico**: Área isolada contendo documentação do banco, visualizador de código SQL, políticas RLS e simuladores de desenvolvimento.

---

## 7. GARANTIAS DE PRESERVAÇÃO DE DADOS E HISTÓRICO

1. **Soft Delete Mandatório**: NENHUM Ponto de Contato ou Pergunta com respostas vinculadas poderá ser excluído fisicamente (`DELETE`). Eles receberão `is_active = false`.
2. **Preservação Retroativa**: Relatórios do passado continuarão exibindo a nota média calculada de um ponto de contato inativado no presente.
3. **Fluxo do Aluno Preservado**: A experiência do aluno continuará extremamente rápida e intuitiva (NPS 0-10, avaliação touch dos pontos de contato em estrelas/escala 1-5, comentário opcional e agradecimento com auto-reset em 5 segundos no totém).
