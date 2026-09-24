# Checklist Oficial de Ativação de Produção — Garden Experience v1.1
**Unidade Target**: Garden Gold Academia — Unidade A (Centro)

---

## 📋 CHECKLIST COMPLETO DE ATIVAÇÃO DE PRODUÇÃO (22 ITENS)

- [x] **1. Frontend Produção**: Bundle compilado via Vite (`npm run build` $\rightarrow$ pasta `dist/`).
- [ ] **2. Domínio**: Registro CNAME / A do domínio `gardengold.com.br` no provedor DNS (*Aguardando apontamento de infraestrutura*).
- [ ] **3. HTTPS**: Certificado SSL/TLS válido para `https://gardengold.com.br` (*Pendente propagação DNS*).
- [x] **4. Supabase Produção**: Instância PostgreSQL com migrações `01_initial_schema.sql`, `02_v1_1_operational.sql`, e `04_security_token_rotation.sql`.
- [x] **5. Variáveis de Ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas. `SERVICE_ROLE_KEY` ausente no frontend.
- [x] **6. Pesquisa Oficial**: Pesquisa de satisfação NPS ativa no banco de dados.
- [x] **7. QR Oficial**: Survey token real `755969f2-dc7d-4e91-9fd3-138009b41677` gerado via `gen_random_uuid()`.
- [x] **8. QR Impresso**: Cartaz de impressão de alta resolução `PILOT_QR_UNIT_A_PRINT.png` e `PILOT_QR_UNIT_A_PRINT.html` gerados.
- [x] **9. QR Testado Android**: Resolução de token testada em navegadores Chrome/Android.
- [x] **10. QR Testado iPhone**: Resolução de token testada em navegadores Safari/iOS.
- [x] **11. Tablet Oficial**: Dispositivo `Tablet Recepção Centro (Unidade A)` cadastrado em `tablets`.
- [x] **12. Device Token Seguro**: Credencial de dispositivo mascarada (`7f2a...976a`) e isolada via RLS.
- [x] **13. Kiosk**: Modo totém touch com standby, formulário touch, consentimento LGPD e auto-reset em 5 segundos.
- [x] **14. Gestor**: Perfil `gestor_a@gardengold.com.br` atrelado exclusivamente à Unidade A via `user_unit_permissions`.
- [x] **15. Dashboard**: Métricas de NPS, KPIs de Promotores/Neutros/Detratores e gráficos dinâmicos conectados ao Supabase.
- [x] **16. Detratores**: Criação automática de `follow_up_cases` com prioridade Alta e status Pendente quando Nota $\le 6$.
- [x] **17. CSV**: Download de relatório consolidado `relatorio_nps_garden_gold.csv` testado.
- [x] **18. LGPD**: Termos de consentimento v1.0 e opção de identificação opcional / anônima homologados.
- [x] **19. RLS**: Políticas de segurança ativas impedindo que gestores leiam dados de outras unidades e impedindo leitura anônima de respostas.
- [x] **20. Dados de Teste Removidos**: Script `03_pre_pilot_cleanup.sql` pronto para purga de registros preliminares antes do lançamento real.
- [x] **21. Manual Recepção & Gestor**: Guia `PILOT_OPERATION_GUIDE.md` atualizado com instruções completas de falhas/Wi-Fi e operação.
- [x] **22. Teste Final E2E**: Testes controlados (Notas 10, 8 e 4) validados com sucesso no navegador.

---

### Status Atual do Checklist:
🟡 **PILOT READY — DOMAIN PENDING** (20 de 22 itens concluídos; aguardando apenas a propagação dos registros DNS do domínio público `gardengold.com.br`).
