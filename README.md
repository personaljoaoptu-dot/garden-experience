# Garden Experience — Sistema NPS & Pesquisas de Satisfação
**Cliente**: Garden Gold Academia  
**Versão**: MVP 1.0.0 (Fase P0/P1 Refatorada & Segura)

O **Garden Experience** é a plataforma oficial da **Garden Gold Academia** para medição contínua de satisfação do aluno e NPS por unidade, substituindo ferramentas de terceiros por uma arquitetura segura, responsiva e pronta para produção.

---

## 🏛️ Decisão de Arquitetura & Fonte de Verdade (Requirement 6)

### 1. Fonte Única de Regras de Negócio: PostgreSQL & Supabase RPC
Todas as validações críticas (validar se a unidade e pesquisa estão ativas, calcular categoria do NPS, isolar acesso por gestor via RLS) são executadas **diretamente no banco PostgreSQL** via **RPC `submit_survey_response`** e funções **`SECURITY DEFINER` protegidas com `SET search_path = public, pg_temp;`**.

### 2. Aplicações de Interface:
- **Aplicação Web Oficial (Alunos & Dashboard Admin)**: Desenvolvida sobre a arquitetura Web responsiva em `index.html` + `src/main.js` com Vite, garantindo carregamento instantâneo em celulares sem necessidade de download de assets pesados.
- **Aplicação Tablet Kiosk (Totém Recepção)**: Modo totém sensível ao toque com roteamento seguro por dispositivo (`device_token`), autoreset em 5s e limpeza completa do formulário da memória.
- **Aplicação Flutter (`flutter_app/`)**: Mantida como base de compilação para empacotamento nativo em APK Android para instâncias de tablets que exijam instalação via Play Store/MDM.

---

## 🔒 Segurança, RLS & Proteção contra Vulnerabilidades

### A. Proteção contra XSS (Cross-Site Scripting)
Todo o texto fornecido por alunos (comentários, nomes) é sanitizado via manipulação segura do DOM (`textContent` em vez de `innerHTML`). Entradas maliciosas como `<script>alert('xss')</script>` são renderizadas estritamente como texto inofensivo.

### B. Isolamento de Unidades por RLS (Row Level Security)
- **Administrador**: Acesso global a todas as 4 unidades (`Garden Gold Unidades A, B, C, D`).
- **Gestor da Unidade**: Acesso restrito via função `has_unit_access(unit_id)` conectada às permissões de `user_unit_permissions`.
- **Pesquisa Pública (Alunos/Anônimos)**: Submissão através de RPC controlada `submit_survey_response`. Sem permissão de SELECT/UPDATE/DELETE em tabelas administrativas.

### C. QR Code Seguro com Tokens Revogáveis (`survey_links`)
- Elimina URLs vulneráveis/previsíveis (`/pesquisa/nps/unidade-a`).
- Utiliza a rota de token único `/p/{token}`.
- O aluno **NÃO escolhe a unidade manualmente** ao escanear o QR Code; a unidade é inferida estritamente a partir do token.

### D. LGPD & Consentimento
- Suporte a submissão totalmente anônima.
- Termos de privacidade com registro de `consent_accepted`, `consent_version` (v1.0) e `consent_at`.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- Node.js v18+ instalado.

### 2. Execução do Servidor Web
```bash
# Entrar na pasta do projeto
cd C:\Users\Admin\.gemini\antigravity-ide\scratch\garden-experience

# Executar servidor Vite (ou usar cmd /c no Windows)
cmd /c npx vite --host --port 3000
```
Acesse no seu navegador: `http://localhost:3000/`.

---

## 🗄️ Execução das Migrações no Supabase

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Abra o **SQL Editor**.
3. Execute o conteúdo de `supabase/migrations/01_initial_schema.sql`.

---

## 🧪 Testes de Segurança & NPS Realizados

1. **Teste RLS**: Confirmado que requisições do Gestor A não retornam dados da Unidade B.
2. **Teste XSS**: Injetado payload `<script>alert('XSS')</script>` no campo de comentário. Confirmado que o texto foi tratado como string simples e o alerta **NÃO** disparou.
3. **Teste de Cálculo NPS**:
   - 7 Promotores + 2 Neutros + 1 Detrator $\rightarrow$ NPS = **+60**.
   - 30 Promotores + 40 Neutros + 30 Detratores $\rightarrow$ NPS = **0**.
