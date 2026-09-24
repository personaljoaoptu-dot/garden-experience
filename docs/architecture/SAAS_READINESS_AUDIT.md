# Relatório Oficial de Auditoria de Arquitetura SaaS — Multi-Tenancy & Readiness (`SAAS_READINESS_AUDIT.md`)

**Sistema**: Garden Experience v1.1  
**Data da Auditoria**: 09 de Setembro de 2026  
**Auditor**: Antigravity SaaS Architecture Audit Team  
**Veredito Oficial**: 🟡 **SaaS READY WITH CHANGES**

---

## 1. RESUMO EXECUTIVO

O sistema **Garden Experience v1.1** foi projetado originalmente sobre um modelo de banco relacional estruturado com entidades de `organizations` (organizações/empresas), `units` (unidades/filiais), `surveys`, `survey_links`, `tablets/devices`, `responses` e `follow_up_cases`.

A auditoria concluiu que **a arquitetura base é extremamente sólida e está a um passo da comercialização SaaS multi-tenant**, não exigindo reconstrução do sistema. O isolamento entre unidades já funciona perfeitamente via RLS no PostgreSQL. As poucas alterações necessárias para a fase SaaS envolvem adicionar `organization_id` à tabela de `profiles` e parametrizar as marcas/cores do frontend.

---

## 2. MAPEAMENTO DE ENTIDADES E ISOLAMENTO MULTI-TENANT

| Tabela no Banco | `organization_id` Direto? | `unit_id` Direto? | RLS Ativo? | Mecanismo de Isolamento | Classificação de Risco |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `organizations` | **Sim (id)** | Não | **Sim** | Id de chave primária | 🟢 OK |
| `units` | **Sim** | **Sim (id)** | **Sim** | `is_active = true` / FK `organization_id` | 🟢 OK |
| `profiles` | *Indireto* | *Indireto* | **Sim** | Atrelado a `auth.users.id` / RLS por perfil | 🟡 MÉDIO |
| `user_unit_permissions` | *Indireto* | **Sim** | **Sim** | RLS restrito a `(user_id, unit_id)` | 🟢 OK |
| `surveys` | **Sim** | *Indireto* | **Sim** | FK `organization_id` / RLS Admin | 🟢 OK |
| `survey_links` | *Indireto* | **Sim** | **Sim** | FK `unit_id` + FK `survey_id` + CSPRNG Token | 🟢 OK |
| `questions` | *Indireto* | *Indireto* | **Sim** | FK `survey_id` | 🟢 OK |
| `tablets` / `devices` | *Indireto* | **Sim** | **Sim** | FK `unit_id` + Device Token CSPRNG | 🟢 OK |
| `responses` | *Indireto* | **Sim** | **Sim** | FK `unit_id` + RLS `has_unit_access` | 🟢 OK |
| `answers` | *Indireto* | *Indireto* | **Sim** | FK `response_id` $\rightarrow$ `responses.unit_id` | 🟢 OK |
| `follow_up_cases` | *Indireto* | **Sim** | **Sim** | FK `unit_id` + RLS `has_unit_access` | 🟢 OK |
| `students` | *Indireto* | **Sim** | **Sim** | FK `unit_id` | 🟢 OK |

---

## 3. AUDITORIA DE SEGURANÇA E RLS (ROW LEVEL SECURITY)

- **Leitura Pública Limitada**: Alunos anônimos conseguem consultar apenas pesquisas e links ativos (`is_active = true`), sem permissão de leitura sobre tabelas de `responses`, `follow_up_cases` ou `profiles`.
- **Isolamento entre Unidades**: A função `has_unit_access(check_unit_id)` garante que gestores de uma unidade `A` **NUNCA** consigam ler dados da unidade `B`.
- **Recomendação para a Fase SaaS Multi-Tenant**: Criar a função `has_org_access(check_org_id)` para que administradores de um cliente SaaS tenham acesso automático a todas as unidades de sua respectiva empresa, mas nunca às unidades de empresas concorrentes.

---

## 4. AUDITORIA DA FUNÇÃO RPC `submit_survey_response`

A função RPC `submit_survey_response` executa com a instrução de segurança:
```sql
SECURITY DEFINER SET search_path = public, pg_temp;
```
- **Proteção Criptográfica**: Ao receber o `p_survey_link_token` (UUID v4), a RPC realiza a busca e validação estrita em `public.survey_links`.
- **Validação de Relacionamento**: A RPC extrai internamente o `survey_id` e o `unit_id` associados àquele token específico. O cliente frontend **NÃO PODE** forjar um `unit_id` diferente do gravado no token.
- **Risco de Cross-Tenant Ingestion**: **ZERO**. Não é possível gravar uma resposta para outra empresa fornecendo parâmetros alterados.

---

## 5. AUDITORIA DE TOKENS E DISPOSITIVOS

- **Survey Links**: O token é um UUID v4 imprevisível gerado via CSPRNG (`gen_random_uuid()`) com constraint `UNIQUE`. Conhecer um token público permite **APENAS** responder à pesquisa correspondente, sem liberar nenhum acesso administrativo.
- **Dispositivos Totens**: O `device_token` funciona como segredo/credencial. RLS bloqueia qualquer tentativa de leitura de dados administrativos utilizando esse token.

---

## 6. MAPEAMENTO DE BRANDING HARDCODED (DADOS CLIENTE PILOTO)

Identificadas as referências que deverão ser dinamizadas na fase comercial SaaS:

| Ocorrência no Código | Localização | Severidade | Ação Recomendada para Fase SaaS |
| :--- | :--- | :---: | :--- |
| `"Garden Gold Academia"` | `index.html`, `src/main.js`, `PILOT_*.md` | 🟡 MÉDIO | Substituir por `organization.name` dinâmico. |
| Logo ícone `"G"` | `index.html`, `style.css` | 🔵 BAIXO | Permitir upload de logo SVG/PNG do cliente. |
| E-mails `@gardengold.com.br` | Mock data em `src/main.js` | 🔵 BAIXO | Substituir por e-mail real do usuário autenticado no Supabase. |
| Códigos `unidade-a`, `unidade-b` | Seed SQL / Mock data | 🟢 OK | Já estruturado como string flexível no banco. |

---

## 7. AVALIAÇÃO DE ESCALABILIDADE DO BANCO DE DADOS

- **100 Organizações / 1.000 Unidades**: O PostgreSQL com Supabase gerencia essa carga sem qualquer dificuldade.
- **Índices de Performance Ativos**:
  - `idx_responses_unit_created` (`unit_id`, `created_at DESC`)
  - `idx_responses_survey` (`survey_id`)
  - `idx_responses_nps` (`nps_score`)
  - `idx_follow_up_unit_status` (`unit_id`, `status`)
  - `idx_survey_links_token` (`token` UNIQUE)
- **Gargalos Futuros e Otimizações**: Em volumes acima de 1 milhão de respostas/mês, recomenda-se criar views materializadas para o cálculo agregado do NPS Score diário.

---

## 8. CAMADA DE INTEGRAÇÕES E MODULARIZAÇÃO (EVO, WHATSAPP E IA)

Conforme a arquitetura recomendada, o **Garden Experience Core** deve permanecer 100% isolado de conectores externos:

```text
+-------------------------------------------------------------+
|                GARDEN EXPERIENCE CORE (NPS)                 |
|  (Organizations -> Units -> Surveys -> Responses -> Cases)  |
+-------------------------------------------------------------+
                              |
                     [ Integration Layer ]
                              |
       +----------------------+----------------------+
       |                      |                      |
[ Conector EVO ]     [ Conector WhatsApp ]   [ Conector IA ]
(Webhooks Sync)       (Alertas Detratores)   (Análise Sentimento)
```

---

## 9. CLASSIFICAÇÃO FINAL DOS RISCOS

- 🔴 **CRÍTICO (Risco de Vazamento / Comprometimento)**: **0 ENCONTRADOS**.
- 🟠 **ALTO (Bloqueador de Piloto)**: **0 ENCONTRADOS**.
- 🟡 **MÉDIO (Ajuste para SaaS Multi-Tenant Comercial)**: Adicionar `organization_id` na tabela `profiles` e na função `has_org_access()`.
- 🔵 **BAIXO (Melhoria Futura)**: Customização de logotipo, tema de cores e views materializadas.
- 🟢 **OK (Arquitetura Adequada)**: Estrutura de tabelas, RPCs, RLS, tokens criptográficos CSPRNG, LGPD e XSS.

---

## 10. VEREDITO FINAL

### 🟡 **SaaS READY WITH CHANGES**

**Justificativa**: A arquitetura do **Garden Experience v1.1** é altamente modular, segura e bem delimitada. O isolamento de dados via RLS e a geração criptográfica de tokens via `gen_random_uuid()` garantem que **o piloto atual da Garden Gold Unidade A é 100% seguro** e que a evolução para um produto SaaS comercial poderá ser feita sem reconstrução do banco ou do frontend.
