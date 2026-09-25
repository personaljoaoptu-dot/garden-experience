# GARDEN EXPERIENCE — VISUAL AUDIT SCREENSHOTS INDEX V1.1

Index e documentação técnica das capturas visuais da interface real do **Garden Experience** para auditoria externa de UI/UX.

---

## 📅 METADADOS DA CAPTURA (V1.1 HARDENED)

- **Data da Captura**: 2026-09-25
- **Navegador**: Microsoft Edge (Chromium Engine v134)
- **Método de Captura**: Automação Headless via Chrome DevTools Protocol (CDP - Node.js) em `scripts/capture_audit.js`
- **Resoluções**:
  - **Desktop**: `1920 × 1080` (Full HD)
  - **Tablet**: `1280 × 800` (WXGA)
- **Commit de Referência**: `7da4d4f934bb9caa28c0cd26e1df51fc400c8496`
- **Seleção da Tela 03**: Mecanismo determinístico via query parameter `?view=mod-responses&auditResponse=resp_001`
- **Garantia de Renderização Real**: Validação assíncrona por polling no DOM (`Runtime.evaluate`), confirmando inicialização do app shell, carregamento dos dados/Store e montagem dos componentes/charts antes da captura de cada imagem.
- **Segurança & LGPD**: Nenhuma credencial privada, senha, token de serviço ou PII sensível exposto nas imagens.

---

## 🖼️ MATRIZ DE CAPTURAS

| Tela | Desktop (`1920×1080`) | Tablet (`1280×800`) | Mecanismo / Seleção |
| :--- | :--- | :--- | :--- |
| **01. Dashboard Executivo** | [desktop/01-dashboard.png](desktop/01-dashboard.png) | [tablet/01-dashboard.png](tablet/01-dashboard.png) | `?view=mod-dash` |
| **02. Respostas (Inbox Geral)** | [desktop/02-respostas.png](desktop/02-respostas.png) | [tablet/02-respostas.png](tablet/02-respostas.png) | `?view=mod-responses` |
| **03. Detalhe da Resposta (Master-Detail)** | [desktop/03-resposta-detalhe.png](desktop/03-resposta-detalhe.png) | [tablet/03-resposta-detalhe.png](tablet/03-resposta-detalhe.png) | `?view=mod-responses&auditResponse=resp_001` |
| **04. Acompanhamentos (Detratores)** | [desktop/04-acompanhamentos.png](desktop/04-acompanhamentos.png) | [tablet/04-acompanhamentos.png](tablet/04-acompanhamentos.png) | `?view=mod-cases` |
| **05. Relatórios Executivos** | [desktop/05-relatorios.png](desktop/05-relatorios.png) | [tablet/05-relatorios.png](tablet/05-relatorios.png) | `?view=mod-reports` |
| **06. Pesquisas & Form Builder** | [desktop/06-pesquisas.png](desktop/06-pesquisas.png) | [tablet/06-pesquisas.png](tablet/06-pesquisas.png) | `?view=mod-surveys` |
| **07. Pontos de Contato (Touchpoints)** | [desktop/07-pontos-de-contato.png](desktop/07-pontos-de-contato.png) | [tablet/07-pontos-de-contato.png](tablet/07-pontos-de-contato.png) | `?view=mod-touchpoints` |
| **08. Dispositivos (Tablets Totem)** | [desktop/08-dispositivos.png](desktop/08-dispositivos.png) | [tablet/08-dispositivos.png](tablet/08-dispositivos.png) | `?view=mod-devices` |
| **09. Configurações & Preferências** | [desktop/09-configuracoes.png](desktop/09-configuracoes.png) | [tablet/09-configuracoes.png](tablet/09-configuracoes.png) | `?view=mod-config` |

---

## 🔍 OBSERVAÇÕES TÉCNICAS RELEVANTES

1. **Renderização Fidedigna**: As capturas representam a aplicação real executada em servidor local sem elementos mockados ou edições manuais.
2. **Seleção Determinística (Tela 03)**: O parâmetro `auditResponse=resp_001` seleciona a resposta do aluno no Inbox de Experiência e abre o painel lateral com os detalhes completos (badge NPS 3, dados de contato, banner de detrator vinculado, botões de ação rápida, citação do comentário e linha do tempo de atendimento).
3. **Validação Estrita de Captura**: O script `scripts/capture_audit.js` encerra com erro imediato caso o servidor não responda, algum seletor da interface não seja renderizado, a tela apresente overlays de erro ou algum arquivo PNG não seja gerado com tamanho válido.
