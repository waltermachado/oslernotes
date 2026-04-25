## Arquitetura (separação total)

- Frontend: Vite/React, deploy estático na Vercel.
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions).
- Chamadas do frontend para APIs do sistema usam Supabase Edge Functions via `VITE_API_BASE_URL` (gateway `api`), e Supabase Auth direto no client.

## Vercel (Frontend)

### Build

- Build Command: `npm run build`
- Output Directory: `dist`
- Rotas: SPA fallback em [vercel.json](file:///Users/waltermachado/Desktop/Projeto%20Trae/OslerNotes%202.0/vercel.json)

### Variáveis (Vercel)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` = `https://<project-ref>.supabase.co/functions/v1`

## Supabase (Backend)

### Migrations

- Migrations ficam em `supabase/migrations/`.
- Deploy automatizado via GitHub Actions em [.github/workflows/supabase-deploy.yml](file:///Users/waltermachado/Desktop/Projeto%20Trae/OslerNotes%202.0/.github/workflows/supabase-deploy.yml).

### Edge Function (gateway)

- Função: `supabase/functions/api`
- Endpoints atendidos:
  - `/api/patients/*`
  - `/api/queue/*`
  - `/api/health`

### Secrets (Supabase)

Configurar via CLI:

```bash
supabase link --project-ref <project-ref>
supabase secrets set \
  --project-ref <project-ref> \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  PUBLIC_APP_URL="https://<seu-app>.vercel.app" \
  CORS_ORIGIN="https://<seu-app>.vercel.app"
```

## CI/CD

### GitHub → Vercel

- Recomendada a integração nativa da Vercel com o repositório GitHub (deploy automático em push).
- Garanta que as variáveis acima estão configuradas em Production/Preview.

### GitHub → Supabase

Crie secrets no GitHub (Settings → Secrets and variables → Actions):

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`

## Segurança

- Nunca versionar `.env` (usar `.env.example`).
- `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas como secret no Supabase (Edge Functions) e/ou em ambientes server-side.
- `VITE_SUPABASE_ANON_KEY` é pública por definição, mas deve ser tratada como identificador de projeto (não usar para privilégios).
