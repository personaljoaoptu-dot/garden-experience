# REGISTRO OFICIAL DE INCIDENTES TÉCNICOS E OPERACIONAIS DO PILOTO
**Documento**: `PILOT_INCIDENT_LOG.md`  
**Unidade Target**: Garden Gold Academia — Unidade A (Centro)

---

## 🚨 CLASSIFICAÇÃO DE SEVERIDADE

- 🟢 **BAIXO**: Dúvida operacional pontual ou ajuste estético menor sem prejuízo à coleta de dados.
- 🟡 **MÉDIO**: Lentidão temporária de conexão de rede Wi-Fi resolvida com reconexão automática.
- 🟠 **ALTO**: Indisponibilidade de um dos canais de coleta (QR Code ou Tablet) por mais de 30 minutos.
- 🔴 **CRÍTICO**: Indisponibilidade total do sistema, queda de banco de dados ou erro impeditivo de coleta de respostas.

---

## 📋 REGISTRO DE INCIDENTES OPERACIONAIS

| ID Incidente | Data/Hora | Unidade | Canal | Problema Detectado | Impacto | Ação Tomada / Resolução | Indisponibilidade | Severidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **INC-001** | 09/09 10:15 | Unidade A | Tablet | Oscilação no Wi-Fi da recepção | Baixo | Dispositivo reconectou automaticamente | < 1 min | 🟢 BAIXO |
| **INC-002** | 09/09 17:20 | Unidade A | Respostas | Provider de E-mail ausente ao tentar enviar e-mail | Baixo | Sinalizado badge `EMAIL_PROVIDER_REQUIRED`. Gravado log em rascunho sem falso positivo. | 0 min | 🟢 BAIXO |

---

> **Regra Absoluta do Piloto**: Nenhuma alteração de código ou banco é realizada em resposta a incidentes baixos/médios durante o piloto. Apenas erros **CRÍTICOS** de segurança ou paralisação total justificam intervenções emergenciais.
