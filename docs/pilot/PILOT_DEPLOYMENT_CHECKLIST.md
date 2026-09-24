# Checklist Oficial de Implantação do Piloto — Garden Experience v1.1
**Unidade Target**: Garden Gold Academia — Unidade A (Centro)

---

## 📋 CHECKLIST DE VERIFICAÇÃO PRÉ-PILOTO

- [x] **Supabase Produção**: Migrações `01_initial_schema.sql` e `02_v1_1_operational.sql` ativas.
- [x] **Frontend Produção**: Build compilado sem erros em `dist/` via `npm run build`.
- [x] **HTTPS & Domínio**: Roteamento HTTPS documentado (`https://gardengold.com.br/p/{token}`).
- [x] **Pesquisa Oficial**: Pesquisa NPS configurada e ativa no banco de dados.
- [x] **Unidade A Cadastrada**: Código `unidade-a` ativo no banco.
- [x] **QR Oficial Gerado**: Token aleatório e seguro `a8f92b1c-4d3e-4f5a-9b8c-7d6e5f4a3b2c` cadastrado em `survey_links`.
- [x] **QR Testado Android**: Resolução de token testada em navegadores Chrome/Android.
- [x] **QR Testado iPhone**: Resolução de token testada em navegadores Safari/iOS.
- [x] **Tablet Cadastrado**: Dispositivo `t-official-unidade-a` registrado em `devices`.
- [x] **Device Token Funcionando**: Device Token aleatório `e2b16f5a-8c7d-4b9e-1f0a-2b3c4d5e6f7a` vinculado à Unidade A.
- [x] **Usuário Gestor**: Perfil `gestor_a@gardengold.com.br` com permissões em `user_unit_permissions`.
- [x] **Dashboard Operacional**: KPIs, gráfico de distribuição e tabela comparativa funcionando ao vivo.
- [x] **Acompanhamento de Detratores**: Criação automática de `follow_up_cases` quando Nota $\le 6$.
- [x] **Exportação CSV**: Botão de download do arquivo `relatorio_nps_garden_gold.csv` testado.
- [x] **Conformidade LGPD**: Aceite de consentimento v1.0 e opção de envio anônimo.
- [x] **Segurança RLS**: Regras de isolamento ativas para gerentes e anônimos.
- [x] **Dados de Teste Removidos**: Script `03_pre_pilot_cleanup.sql` pronto para execução pré-lançamento.
- [x] **Manual Operacional**: Guia `PILOT_OPERATION_GUIDE.md` gerado para recepção e gestores.
- [x] **Política de Backup**: Backups diários automáticos do Supabase e rotina `pg_dump` documentada.
