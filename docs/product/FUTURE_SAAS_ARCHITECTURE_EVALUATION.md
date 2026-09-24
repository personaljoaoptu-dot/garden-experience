# GARDEN EXPERIENCE — AVALIAÇÃO DE ARQUITETURA FUTURA SaaS

## ANÁLISE DE COMPATIBILIDADE E EXPANSÃO FUTURA (SEM ALTERAÇÃO DE CÓDIGO)

---

### 1. ESTRUTURA DE PLANOS, ASSINATURAS E LIMITES

A arquitetura atual baseada em `organization_id` (multi-tenant com isolamento RLS no Supabase) é totalmente compatível com o modelo SaaS de planos e subscrições:

```text
organization
  └── plan_id (FK -> plans.id)
       └── subscription (status: active, trial, canceled; current_period_end)
            └── limits (max_units, max_devices, max_surveys, max_monthly_responses)
```

#### Modelo de Dados Proposto (DML/DDL Futuro)
- `plans`: `id`, `name` ('Starter', 'Pro', 'Enterprise'), `price_monthly`, `max_units`, `max_devices`, `max_responses_per_month`.
- `subscriptions`: `id`, `organization_id`, `plan_id`, `status`, `stripe_subscription_id` / `asaas_id`, `current_period_end`.
- `usage_counters`: Tabela agregada por mês (`organization_id`, `month_year`, `responses_count`).

---

### 2. COMPATIBILIDADE COM INTEGRAÇÕES EXTERNAS

#### A. EVO / Pacto (Sistemas de Gestão de Academias)
- **Mecanismo**: Inbound Webhooks (`POST /api/webhooks/evo/checkin`).
- **Fluxo**: Quando o aluno realiza check-in na catraca, a API envia evento para disparar pesquisa via WhatsApp ou registrar token temporário.
- **Prontidão**: A tabela de `responses` possui o campo `origin` (atualmente 'tablet', 'qr_code', 'direct_link'), podendo receber 'evo_webhook' sem alteração de schema.

#### B. WhatsApp Business API Oficial (Meta Cloud API)
- **Mecanismo**: Supabase Edge Functions (`send-whatsapp-hsm`).
- **Fluxo**: Ao gerar um caso de detractor (NPS ≤ 6), o sistema dispara mensagem modelo (HSM) para o aluno e notificação para o gestor.
- **Prontidão**: O módulo `Central de Respostas` possui o gerador de links `wa.me` que pode ser chaveado para chamada direta de API quando o canal oficial for ativado.

#### C. E-mail Transacional (Resend / SendGrid / Supabase SMTP)
- **Mecanismo**: Supabase Auth SMTP / Edge Functions (`send-email-invite`).
- **Fluxo**: Envio de convites de novos usuários e notificações de alerta imediato quando um detractor responde à pesquisa.

#### D. Inteligência Artificial (IA / LLM Summarization & Sentiment Analysis)
- **Mecanismo**: Background Job (Supabase Edge Function + OpenAI / Claude API).
- **Fluxo**: Agrupamento mensal de comentários de texto livre para categorizar tópicos (ex: "Limpeza de vestiário", "Ar condicionado", "Manutenção de esteiras") e classificar o sentimento de 0 a 100%.

#### E. Billing Automático (Stripe / Asaas)
- **Mecanismo**: Checkout hospedado e escuta de webhooks de fatura (`invoice.paid`, `customer.subscription.deleted`).
- **Fluxo**: Atualização automática da coluna `status` na tabela `subscriptions`, bloqueando temporariamente o acesso do tenant em caso de inadimplência.

---

### 3. CONCLUSÃO DA AVALIAÇÃO DE ARQUITETURA

> O Garden Experience v1.2 foi construído com desacoplamento rigoroso entre a camada visual, o gerenciador de estado (`DataManager`) e as rotas de banco de dados (`Supabase`). **Nenhuma reestruturação drástica de schema será necessária** para adotar planos comerciais, cobrança automática ou integrações externas no futuro.
