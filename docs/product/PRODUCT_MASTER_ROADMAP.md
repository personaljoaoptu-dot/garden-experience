# GARDEN EXPERIENCE — SAAS PRODUCT MASTER ROADMAP

## Vision & Release Strategy

This roadmap details the planned release progression for **Garden Experience** from **Commercial SaaS Baseline v1.0** through enterprise scale.

```text
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │   Release 1.0   │  ───► │      V1.1       │  ───► │      V1.2       │  ───► │      V1.3       │
  │ Baseline SaaS   │       │ Ops & Self-Serv │       │ Management Pro  │       │ CX & Readiness  │
  └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 1. RELEASE ATUAL — V1.3 CONCLUÍDA (HOMOLOGADO PARA OPERAÇÃO COMERCIAL)

- [x] **Multi-Tenancy Scoping**: Strict data isolation by `organization_id` with RLS.
- [x] **Zero-Data State**: Clean initial dashboard rendering `NPS: —`, `Média: —`, `Respostas: 0`.
- [x] **Mathematical Integrity**: Placeholder removal for zero-data states (`—` for NPS, averages, and period trends).
- [x] **7-Step Onboarding Wizard**: Guided account creation without pre-populated synthetic mock data.
- [x] **Survey & Touchpoint Builder**: Section management, touchpoint rating cards, active/inactive toggles.
- [x] **Device & Token Rotation**: Cryptographically generated secure UUID v4 tokens (`dev_tok_...`).
- [x] **Interactive QR Code Generator**: HTML5 Canvas rendering, printable preview, and kiosk survey URLs.
- [x] **Automated Detractor Workflow**: Automatic case creation for NPS ≤ 6 with notes, assignment, and status resolution.
- [x] **Real Database Persistence**: Organization, Units, Devices, Touchpoints, and Surveys synchronized to Supabase.
- [x] **Date Range Validation**: Friendly toast preventing `StartDate > EndDate` selection.
- [x] **Transparent Auth Notifications**: Explicit warning when email invitation requires custom SMTP setup.
- [x] **Theme Engine**: ☀️ Light, 🌙 Dark, and 🖥️ System modes with persistent saving.

---

## 2. RECOMENDAÇÕES FUTURAS DE UX & PRODUTO (P2 / P3 — APENAS RECOMENDADO)

### P2 — Melhorias de Usabilidade e Acompanhamento Visual
- [ ] **Checklist Visual de Setup do Tenant**:
  - Exibir barra de progresso no primeiro acesso ("3 de 5 etapas concluídas: Organização ✓, Unidades ✓, Pesquisa ✓, Dispositivo ⭕").
- [ ] **Gerador de Relatórios em PDF Executivo**:
  - Exportação direta de relatório executivo em PDF estilizado para apresentações.
- [ ] **Metas por Ponto de Contato**:
  - Configuração de metas individuais por touchpoint (ex: Meta 4.5 ★ para Recepção).

### P3 — Automações Avançadas e Conectores
- [ ] **WhatsApp Business Cloud API Oficial**:
  - Disparo nativo de HSM sem dependência do aplicativo WhatsApp.
- [ ] **Webhooks para Sistemas de Academias (EVO / Pacto)**:
  - Disparo automático de pesquisas pós check-in.
- [ ] **Faturamento e Cobrança Automática (Stripe / Asaas)**:
  - Gestão autônoma de planos e assinaturas recorrentes.

---

**STATUS DO ROADMAP: HOMOLOGADO E PRONTO PARA COMERCIALIZAÇÃO V1.3**
