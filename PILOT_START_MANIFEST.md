# Manifesto Oficial de Início do Piloto Real — Garden Experience v1.1
**Documento**: `PILOT_START_MANIFEST.md`  
**Unidade Target**: Garden Gold Academia — Unidade A (Centro)  
**Data de Início**: 09 de Setembro de 2026  
**Período de Observação**: 7 a 14 dias  
**Status**: 🟢 **OFFICIALLY STARTED**

---

## 1. PARÂMETROS DO PILOTO REAL

- **Unidade de Operação**: Garden Gold Academia — Unidade A (Centro)
- **ID de Banco da Unidade**: `11111111-1111-1111-1111-111111111111`
- **Canal 1 (QR Code Público)**:
  - Token CSPRNG: `755969f2-dc7d-4e91-9fd3-138009b41677`
  - URL Resolvida: `https://gardengold.com.br/p/755969f2-dc7d-4e91-9fd3-138009b41677`
  - Materiais: Cartazes A4/A5 de alta resolução (`PILOT_QR_UNIT_A_PRINT.png` / `PILOT_QR_UNIT_A_PRINT.html`).
- **Canal 2 (Totem Tablet Recepção)**:
  - Dispositivo: `Tablet Recepção Centro (Unidade A)`
  - Masked Fingerprint: `7f2a...976a`
  - Configuração: Modo Kiosk touch com auto-reset de 5 segundos.
- **Gestor Responsável**: `gestor_a@gardengold.com.br`

---

## 2. REGRAS DE CONDUÇÃO DO PILOTO

1. **Estabilidade de Código**: **NENHUM DEPLOY DE FUNCIONALIDADES NOVAS** durante os 14 dias de observação.
2. **Privacidade LGPD**: Os logs operacionais registram estritamente **métricas agregadas** (NPS Score, quantidade de respostas, canais e tempo de atendimento dos detratores). Dados pessoais sensíveis dos alunos **NÃO SÃO COPIADOS** para relatórios em markdown.
3. **Acompanhamento de Detratores**: Notas $\le 6$ geram automaticamente `follow_up_cases` com prioridade Alta na aba do gestor da Unidade A.
