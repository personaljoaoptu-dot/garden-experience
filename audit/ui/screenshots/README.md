# GARDEN EXPERIENCE — VISUAL AUDIT SCREENSHOTS INDEX V1.4.6

Index e documentação técnica das capturas visuais da interface real do **Garden Experience** para auditoria externa de UI/UX.

---

## 📅 METADADOS DA CAPTURA (V1.4.6 VISUAL PRODUCT POLISH)

- **Data da Captura**: 2026-09-25
- **Navegador**: Microsoft Edge (Chromium Engine v134)
- **Método de Captura**: Automação Headless via Chrome DevTools Protocol (CDP - Node.js) em `scripts/capture_audit.js`
- **Resoluções**:
  - **Desktop**: `1920 × 1080` (Full HD)
  - **Tablet**: `1280 × 800` (WXGA)
- **Origem Efetiva dos Dados**: Supabase (PostgreSQL / REST API). **Capturas realizadas com dados provenientes do Supabase, sem fallback de dados demo.**
- **Seleção da Tela 03**: Mecanismo dinâmico via query parameter `?view=mod-responses&auditResponse=sup_resp_901` (ID de resposta real obtido dinamicamente no Supabase)
- **Garantia de Renderização Real**: Validação assíncrona por polling no DOM (`Runtime.evaluate`), confirmando conexão ativa com o Supabase via ping real, ausência de `DEFAULT_*` (dados mock/demo), presença de organização/unidades/respostas/casos reais e montagem dos componentes/charts antes da captura.
- **Segurança & LGPD**: Nenhuma credencial privada, senha, token de serviço ou PII sensível exposto nas imagens.

---

## 🖼️ MATRIZ DE CAPTURAS

| Tela | Desktop (`1920×1080`) | Tablet (`1280×800`) | Mecanismo / Seleção |
| :--- | :--- | :--- | :--- |
| **01. Dashboard Executivo** | [desktop/01-dashboard.png](desktop/01-dashboard.png) | [tablet/01-dashboard.png](tablet/01-dashboard.png) | `?view=mod-dash` |
| **02. Respostas (Inbox Geral)** | [desktop/02-respostas.png](desktop/02-respostas.png) | [tablet/02-respostas.png](tablet/02-respostas.png) | `?view=mod-responses` |
| **03. Detalhe da Resposta (Master-Detail)** | [desktop/03-resposta-detalhe.png](desktop/03-resposta-detalhe.png) | [tablet/03-resposta-detalhe.png](tablet/03-resposta-detalhe.png) | `?view=mod-responses&auditResponse=sup_resp_901` |
| **04. Acompanhamentos (Detratores)** | [desktop/04-acompanhamentos.png](desktop/04-acompanhamentos.png) | [tablet/04-acompanhamentos.png](tablet/04-acompanhamentos.png) | `?view=mod-cases` |
| **05. Relatórios Executivos** | [desktop/05-relatorios.png](desktop/05-relatorios.png) | [tablet/05-relatorios.png](tablet/05-relatorios.png) | `?view=mod-reports` |
| **06. Pesquisas & Form Builder** | [desktop/06-pesquisas.png](desktop/06-pesquisas.png) | [tablet/06-pesquisas.png](tablet/06-pesquisas.png) | `?view=mod-surveys` |
| **07. Pontos de Contato (Touchpoints)** | [desktop/07-pontos-de-contato.png](desktop/07-pontos-de-contato.png) | [tablet/07-pontos-de-contato.png](tablet/07-pontos-de-contato.png) | `?view=mod-touchpoints` |
| **08. Dispositivos (Tablets Totem)** | [desktop/08-dispositivos.png](desktop/08-dispositivos.png) | [tablet/08-dispositivos.png](tablet/08-dispositivos.png) | `?view=mod-devices` |
| **09. Configurações & Preferências** | [desktop/09-configuracoes.png](desktop/09-configuracoes.png) | [tablet/09-configuracoes.png](tablet/09-configuracoes.png) | `?view=mod-config` |

---

## 🔍 OBSERVAÇÕES TÉCNICAS RELEVANTES

1. **Renderização Fidedigna & Supabase Source of Truth**: As capturas foram realizadas com dados provenientes do Supabase, sem qualquer fallback de dados demo/mock.
2. **Seleção Dinâmica de Registro Real (Tela 03)**: O parâmetro `auditResponse=sup_resp_901` foi determinado em tempo de execução através da consulta assíncrona às respostas reais vindas do Supabase. O ID `resp_001` de demonstração não é utilizado.
3. **Validação Estrita de Captura**: O script `scripts/capture_audit.js` encerra com erro imediato caso o Supabase esteja desconectado (`isSupabaseConnected === false`), caso registros de fallback (`DEFAULT_*`) sejam detectados no Store, se algum seletor da interface não for renderizado ou se a imagem PNG não for gravada com sucesso.
