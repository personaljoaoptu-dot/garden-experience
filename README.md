# Garden Experience — Customer Experience & NPS SaaS Platform

**Versão**: 1.4.0 (Clean SaaS Architecture)  
**Arquitetura**: Multi-Tenant, Security Definer RLS, Modular Components & Service Repositories  

O **Garden Experience** é uma plataforma SaaS profissional para medição contínua de satisfação do aluno/cliente, cálculo de NPS em tempo real por unidade, central de atendimento e acompanhamento automatizado de detratores.

---

## 🏛️ Arquitetura do Frontend

O projeto foi totalmente refatorado para uma arquitetura limpa e desacoplada:

```
UI / Componentes
    ↓
Application Services (npsService, variableEngine, etc.)
    ↓
Repositories (responsesRepository, unitsRepository, etc.)
    ↓
Supabase RPC & PostgreSQL RLS
```

### Estrutura de Diretórios (`src/`):

```
src/
├── app/
│   ├── bootstrap/    # Event loop & inicialização global
│   ├── router/       # Roteador de navegação e sidebar
│   └── app-state/    # Store reativo de estado global
├── auth/             # Componentes e serviços de autenticação
├── core/
│   ├── config/       # env.js & appConfig.js
│   ├── supabase/     # Client centralizado do Supabase
│   └── utils/        # Sanitizer XSS, validadores
├── dashboard/        # Métricas, NPS Gauge e cartões de visão geral
├── devices/          # Gestão de dispositivos e modo Kiosk/Tablet
├── followups/        # Acompanhamento de detratores (Tabela & Kanban)
├── organizations/    # Gestão multi-tenant & Wizard de Onboarding
├── qr/               # Gerador de QR Code com tokens dinâmicos
├── reports/          # Relatórios e exportação CSV
├── responses/        # Inbox 3 colunas, timeline e central de comunicação
├── settings/         # Configurações de conta, unidades e equipe
├── shared/           # Feedback Toasts e Modais reutilizáveis
├── styles/           # CSS modular (tokens, layout, componentes, utilities)
├── surveys/          # Formulário de pesquisa pública & Survey Builder
└── touchpoints/      # Cartões e rankings de pontos de contato
```

---

## 🚀 Como Executar Localmente

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Configuração de Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz com:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse no seu navegador: `http://localhost:3000/`.

### 4. Build para Produção
```bash
npm run build
npm run preview
```

---

## 🔒 Segurança e Isolamento Multi-Tenant

1. **Row Level Security (RLS)**: O isolamento entre organizações e unidades é garantido no banco PostgreSQL através de `SECURITY DEFINER` RPCs e tabelas protegidas.
2. **Sanitização XSS**: Todos os dados informados por usuários/alunos são sanitizados via `escapeHtml()` prevenindo injeções maliciosas.
3. **Tokens Únicos de QR Code**: As pesquisas públicas utilizam tokens revogáveis (`/p/:token`), impedindo a seleção manual fraudulenta de unidades.

---

## 📁 Documentação

Toda a documentação técnica foi estruturada em `docs/`:
- `docs/architecture/`: Visão de arquitetura e relatório de refatoração (`REFACTORING_REPORT.md`).
- `docs/product/`: Audits de produto, roadmap e guias de CX.
- `docs/security/`: Diretivas RLS e modelo de permissões.
- `docs/deployment/`: Checklists de deploy e produção.
- `docs/pilot/`: Relatórios e manifestos do projeto piloto.
