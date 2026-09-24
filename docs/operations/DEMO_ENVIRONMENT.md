# GARDEN EXPERIENCE — DEMO ENVIRONMENT SPECIFICATION

## Overview
The `Garden Experience Demo` environment (`org_demo`) is a dedicated sandbox context designed exclusively for commercial sales presentations and executive product walkthroughs.

---

## 1. Demo Mode Identification & UI Indicators

When `Garden Experience Demo` is selected in the top organization selector (`#selectActiveOrg`):

1. **Top Header Badge**: Displays `🟣 MODO DEMONSTRAÇÃO` next to the company selector.
2. **Dashboard Demonstration Banner**: Displays a prominent top banner `#demoModeBanner`:
   > **🟣 MODO DEMONSTRAÇÃO COMERCIAL** — Este ambiente contém dados de demonstração fictícios e controlados para apresentação de produto.

---

## 2. Controlled Demonstration Dataset Metrics

The Demo environment features a rich dataset of 248 controlled responses to showcase full operational capabilities (charts, response inbox, detractors, touchpoint breakdown, and communication templates):

| Metric | Target Value | Percentage / Calculation |
| :--- | :--- | :--- |
| **NPS Score** | `+72` | Excellent (Zone of Excellence) |
| **Total Respostas** | `248` | Full statistical sample |
| **Promotores (9-10)** | `186` | `75.0%` |
| **Passivos (7-8)** | `37` | `15.0%` |
| **Detratores (0-6)** | `25` | `10.0%` |
| **Unidades Demo** | `2` | `Unidade Flagship Paulistano`, `Unidade Shopping Moema` |
| **Dispositivos Demo** | `2` | `Totem Recepção Paulistano`, `Tablet Catraca Moema` |
| **Casos em Acompanhamento** | `5` | Active cases across New, In Progress, and Resolved |

---

## 3. Strict Non-Leakage & Isolation Rules

- **Context Scoping**: All demo data is strictly tied to `organization_id: "org_demo"`.
- **Company Selector Security**: Selecting `Garden Experience Demo` loads only demo data. Switching to `Garden Gold Academia (Piloto)` or a commercial customer (e.g. `Academia XYZ`) completely removes all demo responses and metrics from the screen.
- **Zero Cross-Contamination**: New responses submitted under a commercial customer tenant are never saved into `org_demo`, and demo responses never populate a customer dashboard.
