# Plano Final de Deploy de Produção — Garden Experience v1.1
**Documento**: `FINAL_PRODUCTION_DEPLOYMENT_PLAN.md`  
**Unidade Alvo**: Garden Gold Academia — Unidade A (Centro)  
**Data**: 09 de Setembro de 2026

---

## 📋 PASSO A PASSO DA EXECUÇÃO DE DEPLOY

1. **Validação do Build Local**:
   - Compilação realizada com sucesso na pasta `dist/` com `public/_redirects` e `vercel.json`.

2. **Apontamento de CNAME**:
   - Equipe de TI da academia adiciona o CNAME `experiencia.gardengold.com.br` no DNS.

3. **Publicação do Bundle**:
   - Publicar a pasta `dist/` na plataforma de hospedagem escolhida (Vercel, Netlify ou Cloudflare Pages).

4. **Regeneração do QR Code de Produção com Subdomínio Definitivo**:
   - Assim que o CNAME for ativado, o QR Code público será gerado apontando para:
     `https://experiencia.gardengold.com.br/p/755969f2-dc7d-4e91-9fd3-138009b41677`

5. **Configuração do Totem Tablet na Recepção**:
   - Abrir o navegador Chrome no tablet da Unidade A e acessar:
     `https://experiencia.gardengold.com.br/#tab-kiosk`
   - O dispositivo se autentica via `device_token` seguro e fixa a Unidade A.

6. **Validação E2E com Rede 4G/5G Externa**:
   - Escanear o QR Code de teste em um iPhone e em um Android desconectados da Wi-Fi interna da academia para testar a comunicação HTTPS pública via Supabase.
