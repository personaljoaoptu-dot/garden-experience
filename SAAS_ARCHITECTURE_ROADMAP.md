# Roadmap de Arquitetura Comercial SaaS — Garden Experience (`SAAS_ARCHITECTURE_ROADMAP.md`)

**Sistema**: Garden Experience  
**Data da Emissão**: 09 de Setembro de 2026

---

## 🗺️ ROADMAP DE EVOLUÇÃO EM 8 FASES

```text
[ FASE 1: PILOTO REAL ] ──> [ FASE 2: REDE GARDEN GOLD ] ──> [ FASE 3: MULTI-TENANT CORE ] ──> [ FASE 4: 1º CLIENTE EXTERNO ]
                                                                                                          │
[ FASE 8: CAMADA DE IA ] <── [ FASE 7: WHATSAPP ] <── [ FASE 6: INTEGRAÇÃO EVO ] <── [ FASE 5: BILLING & STRIPE ] ◄┘
```

---

### 🟢 FASE 1 — PILOTO REAL (FASE ATUAL V1.1)
- **Escopo**: 1 Unidade Piloto (Garden Gold — Unidade A • Centro).
- **Dispositivos**: 1 Totem Tablet na recepção.
- **Divulgação**: Cartazes A4/A5 com QR Code oficial UUID v4 (`755969f2-dc7d-4e91-9fd3-138009b41677`).
- **Duração**: 7 a 14 dias de observação com dados reais.

---

### 🟢 FASE 2 — EXPANSÃO GARDEN GOLD (4 UNIDADES)
- **Escopo**: Ativação das Unidades B (Zona Sul), C (Jardins) e D (Norte).
- **Funcionalidades**: Dashboard comparativo de NPS entre unidades, ranking de promotores/detratores e consolidação de relatórios CSV por gestor regional.

---

### 🔵 FASE 3 — PREPARAÇÃO DO CORE MULTI-TENANT SAAS
- **Banco de Dados**:
  - Adição de `organization_id` na tabela `profiles`.
  - Criação da função `has_org_access(check_org_id)` para autorizar administradores de empresas em todas as suas filiais.
  - Parametrização da constraint `UNIQUE(organization_id, code)` em `units`.
- **Frontend**:
  - Parametrização dinâmica de branding (nome da academia, logo e paleta de cores primárias carregados via `organization.settings`).

---

### 🔵 FASE 4 — ONBOARDING DO PRIMEIRO CLIENTE EXTERNO (BETA COMERCIAL)
- **Escopo**: Entrada da primeira rede de academias parceira (ex: "Academia Fitness Pro").
- **Validação**: Verificação de isolamento total de dados e garantia de que nenhum gestor da Fitness Pro veja dados da Garden Gold.

---

### 🟣 FASE 5 — CAMADA DE BILLING & ASSINATURAS
- **Integração**: Conexão desacoplada com gateway de pagamentos (Stripe / Asaas).
- **Módulos**: Planos por número de unidades (Starter: 1 unidade, Pro: 5 unidades, Enterprise: ilimitado) e controle de limites de respostas/mês.

---

### 🟣 FASE 6 — CAMADA DE INTEGRAÇÃO EVO (CONECTOR DESACOPLADO)
- **Arquitetura**: Módulo externo de sincronização via Webhooks/API.
- **Funcionalidade**: Importação automática da lista de alunos ativos e identificação do histórico de treino após resposta da pesquisa.

---

### 🟣 FASE 7 — CAMADA DE NOTIFICAÇÕES WHATSAPP
- **Arquitetura**: Módulo de mensageria assíncrona (RabbitMQ/BullMQ + Z-API/Evolution API).
- **Funcionalidade**: Envio de alerta instantâneo no WhatsApp do gestor da unidade sempre que um aluno responder com Nota NPS $\le 6$.

---

### 🟣 FASE 8 — CAMADA DE IA & ANÁLISE DE SENTIMENTO
- **Arquitetura**: Microsserviço de processamento de linguagem natural (LLM / Claude / Gemini API).
- **Funcionalidade**: Categorização automática de comentários dos alunos (ex: "Equipamentos", "Limpeza", "Atendimento", "Ar Condicionado") e análise de sentimento sem alterar o core da aplicação.
