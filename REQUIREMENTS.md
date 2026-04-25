# Instruções para a Construção do OslerNotes

## 1. Contexto Geral do Projeto
O OslerNotes é um sistema de prontuário eletrônico em modelo SaaS voltado para clínicas médicas. Ele oferece uma solução multi-tenant para gestão de pacientes, filas de atendimento, e registros clínicos. O foco atual é a construção da fundação do sistema: autenticação, controle de acesso baseado em papéis (RBAC), interface de login e o painel de administração (Backoffice) para cadastro de novas clínicas.

## 2. Especificações Técnicas e Stack
- Frontend: React 18, TypeScript, Tailwind CSS, Lucide React (para ícones), React Router DOM, Vite.
- Backend/BFF: Node.js, Express, TypeScript (rodando na mesma base de código para servir a API localmente ou via Vercel Serverless).
- Banco de Dados & Autenticação: Supabase (PostgreSQL + Supabase Auth).
- Gerenciamento de Scripts: tsx para execução de scripts de setup e migrações em TypeScript.

## 3. Estrutura do Banco de Dados (Supabase PostgreSQL)
Você deve criar os seguintes scripts SQL de migração para definir a estrutura inicial (na pasta supabase/migrations/ ou scripts):

Tabela `clinicas`:
- Colunas: id (UUID, PK), nome, cnpj, endereco (JSONB), telefone, email, plano_assinatura (default 'bronze'), ativa (boolean), nome_responsavel, especialidade_principal, horario_funcionamento.
- Adicionar Row Level Security (RLS) permitindo leitura/escrita por usuários autenticados.

Tabela `usuarios` (Pública, sincronizada com Supabase Auth):
- Colunas: id (UUID, PK, referência a auth.users), clinica_id (UUID, FK, nullable para o super_admin), nome, email, papel (enum/check: 'super_admin', 'admin', 'medico', 'atendente'), ativo (boolean).
- Adicionar RLS garantindo que um usuário só veja dados da sua própria clínica (isolamento multi-tenant), com exceção do super_admin que pode ver tudo.
Atenção aos loops de recursão no RLS (Row Level Security). Evite consultar a própria tabela usuarios dentro das políticas RLS para descobrir o papel do usuário; use claims no JWT ou métodos que evitem recursão infinita.

## 4. Requisitos Funcionais Implementados

### 4.1. Scripts de Setup (Node/TypeScript)
Crie um script `scripts/create_super_admin.ts` que utilize o SDK do Supabase Admin para:
1. Criar um usuário no Supabase Auth com email super@oslernotes.com e senha super123.
2. Definir no user_metadata o papel role: 'super_admin'.
3. Inserir esse usuário na tabela pública usuarios com o papel super_admin.

### 4.2. API Backend (Express)
Crie rotas Express na pasta `api/routes/`:
- Auth (`/api/auth/login`): Recebe email e senha, autentica no Supabase, busca o papel do usuário na tabela usuarios e retorna os tokens e dados da sessão.
- Admin (`/api/admin/clinics`):
  - Middleware: Verificar se o token JWT pertence a um usuário com papel super_admin.
  - POST: Receber dados de uma nova clínica (nome, cnpj, responsável, etc.). Validar duplicidade. Criar a clínica na tabela clinicas. Gerar uma senha aleatória segura, criar o usuário "admin" da clínica no Supabase Auth e na tabela usuarios. (O envio de email de boas-vindas pode ser mockado via console.log).
  - GET: Listar todas as clínicas cadastradas para o dashboard do super admin.

### 4.3. Frontend - Interface de Login
Desenvolva uma página de Login (`src/pages/Login.tsx`) que seja estritamente fiel ao seguinte design visual:
- Tema: Dark Mode profundo. Fundo geral #0d1520, Fundo do Card #111926.
- Cabeçalho: Logo centralizada em um círculo branco (usar tag <img> apontando para /logo.png), título "OSLER" em branco, subtítulo "HEALTH SYSTEM" em verde (#16a34a ou similar) com letter-spacing largo, e texto "Portal Seguro para Profissionais de Saúde" em cinza claro.
- Formulário:
  - Input "E-mail ou CPF" com ícone de usuário (lucide-react) à esquerda.
  - Input "Senha" com ícone de cadeado à esquerda e botão de mostrar/esconder senha à direita.
  - Inputs devem ter fundo escuro (#1B2431), bordas sutis e outline azul ao focar.
  - Linha com Checkbox "Lembrar de mim" e link azul "Esqueceu a senha?".
  - Botão "Entrar" azul vibrante (#007AFF) cobrindo 100% da largura, com ícone de seta para a direita e estado de loading (spinner) ao enviar.
- Rodapé do Card: Dois selos informativos com ícones de check verdes ao lado dos textos sobre 2FA, LGPD e HIPAA.
- Rodapé da Página: Copyright em fonte bem pequena, uppercase e com letter-spacing.
- Integração: Ao submeter, deve fazer POST para /api/auth/login, salvar a sessão usando supabase.auth.setSession e redirecionar para /dashboard.

### 4.4. Frontend - Roteamento e Proteção (RBAC)
Crie um sistema de rotas usando react-router-dom:
- Contexto `AuthContext` para gerenciar o estado global do usuário logado.
- Componente `ProtectedRoute` que aceita um array de allowedRoles.
- Rotas definidas em `App.tsx`:
  - /login: Pública.
  - /dashboard: Redireciona com base no papel.
  - /backoffice: Protegida, exclusiva para super_admin.
  - /clinico: Protegida, para medico e admin.
  - /atendimento: Protegida, para atendente e admin.

### 4.5. Frontend - Painel do Super Admin
Crie uma tela básica em `/backoffice` que:
1. Liste as clínicas buscando da rota GET `/api/admin/clinics`.
2. Tenha um botão "Nova Clínica" que abre um Modal.
3. O Modal (`AddClinicModal.tsx`) deve conter um formulário completo (com react-hook-form) para os dados: Nome, CNPJ (com máscara), Telefones, Endereço (com máscara no CEP), Especialidade, Horário de Funcionamento, e Dados do Responsável (Nome e Email).
4. Ao salvar, faça POST para `/api/admin/clinics`.

## 5. Configuração de Ambiente
- Configurar o `vite.config.ts` com um proxy para redirecionar as chamadas iniciadas por /api para http://localhost:3005 (porta do backend Node).
- Configurar script dev no `package.json` usando concurrently para rodar simultaneamente:
  - Frontend: `vite --port 4000`
  - Backend: `nodemon api/server.ts`

## 6. Considerações Finais
O código deve ser modular, tipado adequadamente, com tratamento de erros na UI (mensagens de erro do login) e no backend (status HTTP corretos). Siga princípios de Clean Code e separe lógicas de API, componentes UI e contextos globais e páginas.
