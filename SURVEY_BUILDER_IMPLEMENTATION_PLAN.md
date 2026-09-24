# Plano de Implementação — Construtor de Pesquisas Dinâmico & Pontos de Contato (`SURVEY_BUILDER_IMPLEMENTATION_PLAN.md`)

Transformar o módulo de pesquisas rígido do **Garden Experience v1.1** em um **Construtor de Pesquisas Dinâmico e Gestor de Pontos de Contato (Touchpoints)** configurável via painel administrativo, totalmente preparado para expansão SaaS multi-tenant.

---

## User Review Required

> [!IMPORTANT]
> **GARANTIA DE PRESERVAÇÃO DE DADOS HISTÓRICOS & COMPATIBILIDADE**:  
> 1. Todas as respostas anteriores coletadas no piloto da Unidade A serão **100% preservadas**.  
> 2. O script de migração SQL `05_survey_builder.sql` não executa nenhuma operação destrutiva (`DROP` ou `DELETE`).  
> 3. O fluxo do aluno no celular e no totém tablet permanecerá simples, rápido (menos de 15 segundos) e com auto-reset de 5 segundos.

---

## Open Questions

> [!NOTE]
> Não há perguntas bloqueantes. A proposta segue integralmente as especificações da hierarquia `Organization -> Units -> Surveys -> Sections -> Touchpoints -> Questions`.

---

## Proposed Changes

### Banco de Dados & Supabase SQL

#### [NEW] [05_survey_builder.sql](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/garden-experience/supabase/migrations/05_survey_builder.sql)
- Criar a tabela `touchpoints` (`id`, `organization_id`, `name`, `description`, `category`, `evaluation_type`, `scale_min`, `scale_max`, `is_active`).
- Criar a tabela `survey_sections` (`id`, `survey_id`, `title`, `description`, `order_index`, `is_active`).
- Adicionar colunas `section_id`, `touchpoint_id`, `allow_comment` e `is_active` na tabela `questions`.
- Adicionar coluna `touchpoint_id` na tabela `answers`.
- Criar tabela de associação `unit_touchpoints`.
- Atualizar a função RPC `submit_survey_response` para versão `v2` aceitando payload JSON com avaliações de pontos de contato.
- Aplicar políticas RLS para `touchpoints` e `survey_sections`.

---

### Aplicação Frontend (`src/main.js` & `index.html`)

#### [MODIFY] [index.html](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/garden-experience/index.html)
- Reorganizar a barra de navegação do painel administrativo separando as abas de negócio:
  - 📊 **Dashboard**
  - 📝 **Pesquisas & Construtor**
  - ⭐ **Pontos de Contato**
  - 📱 **QR Codes & Links**
  - 📟 **Dispositivos / Tablets**
  - ⚠️ **Follow-up (Detratores)**
  - 📈 **Relatórios & CSV**
  - ⚙️ **Configurações & Modo Técnico** (Isolando funcionalidades de desenvolvimento/simulação).
- Criar interface visual do **Construtor de Pesquisas** (Criação de Seções, reordenação de perguntas e vínculo de touchpoints).
- Criar interface de **Gestão de Pontos de Contato** (Tabela com filtros, cadastro de nome, categoria, escala 1-5, status e associação por unidades).

#### [MODIFY] [src/main.js](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/garden-experience/src/main.js)
- Implementar classe `TouchpointManager` e `SurveyBuilderManager` para gerenciar a reordenação, ativação/desativação e vinculação de seções e pontos de contato.
- Atualizar o cálculo do **Dashboard** para incluir:
  - **KPI de NPS Score Geral** (+0)
  - **KPI de Nota Média Geral dos Pontos de Contato** (ex: 4.5 / 5.0)
  - **Ranking dos Pontos de Contato** (Recepção 4.8, Professores 4.7, Limpeza 4.1, Equipamentos 3.8 com destaque automático para notas $< 4.0$).
- Atualizar o fluxo público do aluno no celular e no tablet para renderizar dinamicamente as seções da pesquisa e os botões de avaliação touch dos pontos de contato.

---

## Verification Plan

### Automated Tests
- Executar build de produção para verificar sintaxe e compilação em `dist/`:
  ```bash
  cmd /c npm run build
  ```

### Manual Verification
1. **Teste do Construtor de Pesquisas**:
   - Acessar a aba **Pesquisas**, criar uma nova seção "Atendimento", adicionar o ponto de contato "Atendimento da Recepção" com escala 1–5 e reordenar.
2. **Teste de Pontos de Contato**:
   - Acessar a aba **Pontos de Contato**, cadastrar "Vestiários", alterar o status para Inativo e verificar soft delete (histórico preservado).
3. **Teste do Fluxo Público do Aluno**:
   - Escanear o QR Code da Unidade A, responder NPS 10, avaliar os pontos de contato (Recepção 5, Professores 5, Limpeza 4, Equipamentos 3), enviar e confirmar gravação no Supabase.
4. **Teste de Detrator e Follow-Up**:
   - Responder NPS 4 no totem tablet. Confirmar que a resposta grava as notas dos pontos de contato e abre instantaneamente um `follow_up_case` com status Pendente.
5. **Teste do Dashboard & Ranking**:
   - Verificar atualização do KPI da Nota Média Geral dos Pontos de Contato e a ordenação do Ranking com destaque vermelho para notas $< 4.0$.
