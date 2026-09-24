# Plano Oficial de Hospedagem e Publicação em Produção — Garden Experience v1.1
**Documento**: `PRODUCTION_HOSTING_PLAN.md`  
**Unidade Alvo**: Garden Gold Academia — Unidade A (Centro)  
**Data**: 09 de Setembro de 2026

---

## 1. PLATAFORMA RECOMENDADA

Recomendamos **Vercel** ou **Netlify** (com **Cloudflare Pages** como 3ª opção equivalente).

### Motivos da Recomendação:
- **Suporte Nativo a SPA Routing**: Encaminhamento automático de `/p/{token}` para `/index.html` sem erro 404.
- **Certificado SSL/TLS Automático (HTTPS)**: Emissão e renovação automática de certificado HTTPS gratuito (Let's Encrypt / Cloudflare Edge SSL).
- **Zero Risco aos Serviços de E-mail da Academia**: O deploy em subdomínio isolado não afeta MX, SPF, DKIM ou DMARC do domínio principal.
- **Deploy Simplificado via CLI**: Publicação com comando único (`npx vercel --prod` ou `npx netlify deploy --prod`).
- **CDN Global de Baixa Latência**: Carregamento instantâneo em celular no 4G/5G ou tablet na recepção.

---

## 2. RECOMENDAÇÃO DE DOMÍNIO E ISOLAMENTO DE DNS

> ⚠️ **REGRA CRÍTICA DE SEGURANÇA DE REDE**:  
> **NÃO APONTAR O DOMÍNIO RAIZ (`gardengold.com.br`)**.  
> O domínio raiz pode estar hospedando o site institucional da academia, servidor de e-mails da recepção ou sistema interno.

### Subdomínio Exclusivo Recomendado:
```text
https://experiencia.gardengold.com.br
```

### URL Pública Oficial para o QR Code da Unidade A:
```text
https://experiencia.gardengold.com.br/p/755969f2-dc7d-4e91-9fd3-138009b41677
```

---

## 3. REGISTROS DNS NECESSÁRIOS (APENAS SUBDOMÍNIO)

Para conectar o subdomínio `experiencia.gardengold.com.br`, a equipe de TI da academia precisa adicionar **APENAS UM REGISTRO CNAME** no painel de controle do DNS (Registro.br, Cloudflare ou GoDaddy):

| Tipo | Nome / Subdomínio | Valor / Destino | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `experiencia` | `cname.vercel-dns.com` *(ou `your-app.netlify.app`)* | 3600 (Auto) |

*Nota*: Não alterar nenhum registro A, MX, TXT, SPF ou DKIM da academia.

---

## 4. CONFIGURAÇÃO DE HTTPS & CERTIFICADO SSL

- **Provisionamento**: Automático assim que o registro CNAME propagar (geralmente entre 5 a 15 minutos).
- **Forçar HTTPS**: O provedor redirecionará automaticamente todo o tráfego HTTP para HTTPS (HTTP/2 habilitado).
- **Sem Mixed Content**: Todas as chamadas para o Supabase utilizam `https://`.

---

## 5. CONFIGURAÇÃO DE ROUTING SPA (PREVENÇÃO DE ERRO 404 EM `/p/{token}`)

Como a aplicação é uma Single Page Application (SPA), a requisição direta de um aluno abrindo a URL `https://experiencia.gardengold.com.br/p/755969f2-dc7d-4e91-9fd3-138009b41677` exige que o servidor web responda `/index.html` mantendo o código HTTP 200.

O projeto já inclui os arquivos de configuração necessários na pasta raiz:

### A. Para Vercel (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/p/:path*", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### B. Para Netlify e Cloudflare Pages (`public/_redirects`):
```text
/p/*  /index.html  200
/*    /index.html  200
```

---

## 6. VARIÁVEIS DE AMBIENTE DE PRODUÇÃO

Configurar no painel do provedor de hospedagem:

| Variável | Valor de Produção | Descrição |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://sua-instancia.supabase.co` | Endpoint público do Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1Ni...` | Chave pública anônima do cliente |

*Confirmação de Segurança*: A chave `SERVICE_ROLE_KEY` **NÃO** deve ser adicionada às variáveis do frontend.

---

## 7. PROCEDIMENTO PASSO A PASSO PARA O DEPLOY DE PRODUÇÃO

### Opção A — Deploy via Vercel CLI (Recomendado):
1. No terminal do projeto, executar:
   ```bash
   npx vercel --prod
   ```
2. Vincular o domínio `experiencia.gardengold.com.br` no painel da Vercel em *Settings > Domains*.

### Opção B — Deploy via Netlify CLI:
1. No terminal do projeto, executar:
   ```bash
   npx netlify deploy --prod --dir=dist
   ```
2. Adicionar o domínio `experiencia.gardengold.com.br` no painel do Netlify em *Domain Management*.

---

## 8. PROCEDIMENTO DE ROLLBACK (RECUPERAÇÃO DE EMERGÊNCIA)

Se qualquer alteração causar indisponibilidade durante o piloto:
1. **Pela CLI**: Executar `npx vercel rollback` ou acessar a lista de deploys no painel do Netlify/Vercel.
2. **1-Clique**: Selecionar a compilação anterior homologada e clicar em *"Promote to Production"*. O tráfego será redirecionado para a versão anterior em menos de 5 segundos.
