# GARDEN EXPERIENCE — FRESH TENANT END-TO-END FLOW (ZERO-DATA VERIFIED)

## Overview
This document details the complete zero-to-one operational flow of onboarding a new commercial customer into Garden Experience SaaS without any pre-existing sample data, hardcoded fallbacks, or synthetic mock data.

---

## 1. Onboarding & Account Provisioning

1. **Account Registration**:
   - User navigates to the portal and clicks `Criar Conta` in `#modalAuth`.
   - Fields: Name (`Carlos Oliveira`), Email (`admin@academiateste.com.br`), Password (`******`), Confirm Password.
   - Output: Account created and logged into session.
2. **Organization Creation**:
   - User clicks `+ Novo Cliente` or completes onboarding wizard.
   - Fields: Corporate Name (`Academia Teste Comercial LTDA`), Trade Name (`Academia Teste Comercial`), Email (`contato@academiateste.com.br`).
   - Output: Organization initialized with clean zero-data state (`org_...`).

---

## 2. Zero-Data Dashboard Initial State

Immediately following organization creation, the active tenant dashboard renders:

| Metric | Display Value | Status |
| :--- | :--- | :--- |
| **NPS Score** | `—` | Zero-Data Empty State |
| **Respostas** | `0` | Clean |
| **Promotores** | `0 (0%)` | Clean |
| **Passivos** | `0 (0%)` | Clean |
| **Detratores** | `0 (0%)` | Clean |
| **Pontos de Contato** | `—` | `⚪ Sem Avaliações` |
| **Acompanhamentos** | `0` | Empty Inbox Banner |
| **Dispositivos** | `0` | Unregistered |

*Zero Fake Data Enforcement*: No mock students (e.g. Carlos Silva), no hardcoded NPS +34, no fake 9 responses, no synthetic averages (e.g. 3.8).

---

## 3. Configuration & Infrastructure Setup

1. **Unit Setup**:
   - User navigates to `Configurações` -> `Unidades` and clicks `+ Nova Unidade`.
   - Creates `Unidade Centro` (`Status: Ativa`).
2. **User Setup**:
   - User navigates to `Configurações` -> `Usuários e Permissões` and clicks `+ Adicionar Usuário`.
   - Invites `Gestor Centro` (`gestor@academiateste.com.br`) with role `Gestor` scoped to `Unidade Centro`.
3. **Survey & Touchpoints**:
   - Generic template `Pesquisa de Satisfação Geral` is generated with 4 core touchpoints (Atendimento Recepção, Professores, Limpeza, Equipamentos). Initial scores display `— (Sem avaliações)`.
4. **Device Registration**:
   - User navigates to `Dispositivos` and clicks `+ Adicionar Dispositivo`.
   - Registers `Tablet Recepção Centro`. Platform generates cryptographically secure token `dev_tok_...`.
5. **QR Code Generation**:
   - User navigates to `QR Codes` and clicks `+ Novo QR Code`.
   - Selects `Unidade Centro` and `Pesquisa Geral`. Generator outputs token UUID `qr_tok_...` and visual canvas code.

---

## 4. Live Response Submission & Automated Workflow Verification

1. **Public Survey Submission**:
   - Kiosk/QR link loaded: `/surveys/{survey_id}/kiosk?token=qr_tok_...`
   - Student submits score **4 (Detractor)** with comment: `"Aparelho de musculação quebrado há duas semanas."`
2. **Dynamic Dashboard Update**:
   - Dashboard recalculates instantly:
     - **Respostas**: `1`
     - **Promotores**: `0 (0%)`
     - **Passivos**: `0 (0%)`
     - **Detratores**: `1 (100%)`
     - **NPS Score**: `-100`
3. **Automated Detractor Case Creation**:
   - Case `#1001` created automatically in `Acompanhamentos` with status `Novo (Pendente)`.
4. **Case Resolution & Communication**:
   - Manager clicks `Assumir Acompanhamento`.
   - Click `WhatsApp` prepares pre-filled template message for student.
   - Manager marks case as `Resolvido`. Dashboard metrics remain accurate and log updated.

---

## 5. Automated Verification Test Suite

The automated test script `node scratch/verify_fresh_tenant_e2e.js` executes this exact flow:
- **STEP 1**: Pilot Tenant initialized zero-data (0 responses, 0 cases, NPS `—`).
- **STEP 2**: Fresh Tenant initialized zero-data (0 responses, 0 cases, NPS `—`).
- **STEP 3**: Submission of NPS 4 detractor response updates fresh tenant metrics to 1 response, NPS -100, 1 case.
- **STEP 4**: Tenant switching verified: Pilot maintains 0 responses, Fresh maintains 1 response (0 cross-tenant data leakage).
- **STEP 5**: Page refresh maintains active tenant state cleanly.

**Result: PASS 100%**
