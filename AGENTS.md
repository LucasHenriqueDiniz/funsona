# FunSona v2

Plataforma de quizzes SEO-first, hospedada na Cloudflare com Supabase.

## Stack

- **Frontend**: Astro 5 + React islands + Tailwind CSS v4 → Cloudflare Pages
- **API**: Hono + TypeScript → Cloudflare Worker
- **Banco/Auth**: Supabase (Postgres + Auth via API)
- **Cache**: Cloudflare KV + Cache API
- **Imagens**: Supabase Storage
- **Pagamentos**: Stripe

## Estrutura

```
FunSona-v2/
├── apps/
│   ├── web/         # Astro app (Cloudflare Pages)
│   └── api/         # Hono Worker (Cloudflare Worker)
├── packages/
│   └── shared/      # Zod schemas + TypeScript types
├── supabase/
│   └── migrations/  # SQL puro (Supabase CLI)
├── scripts/
│   └── migration/   # Scripts one-off
└── docs/            # Documentação técnica para agentes
    ├── architecture.md  # Decisões técnicas e diagramas
    ├── product.md       # Requisitos e escopo
    ├── roadmap.md       # Milestones e versões
    └── research.md      # Investigações e benchmarks
```

## Comandos

```bash
# Instalar dependências
pnpm install

# Dev (todos)
pnpm dev

# Dev individual
pnpm --filter web dev
pnpm --filter api dev

# Build
pnpm build

# Deploy
pnpm --filter web deploy
pnpm --filter api deploy

# Supabase
pnpm db:migrate    # push migrations
pnpm db:reset      # reset local db
```

## Regras de Implementação

1. **SEO first**: páginas públicas devem ser Astro Server Components ou SSG. Use React islands (`client:load`, `client:visible`) apenas para interatividade (play, forms, modais).
2. **Nunca conecte diretamente ao Postgres**: use `supabase-js` (anon key no browser, service role no Worker). Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no browser.
3. **RLS via SQL migrations**: policies vão em `supabase/migrations/`. Nunca defina policies em arquivos `.ts`.
4. **Shared package**: toda validação Zod e tipos compartilhados vão em `packages/shared/`. Nunca duplique schemas entre apps.
5. **i18n**: suporte pt/en/es via Astro i18n routing. `defaultLocale: "pt"`, `prefixDefaultLocale: false`.
6. **Zero fake data**: não implemente seeding de dados fake em produção. Seeds são apenas para dev local.
7. **Agent References**: antes de implementar features, consulte `docs/product.md` (requisitos) e `docs/architecture.md` (decisões técnicas). Veja `docs/roadmap.md` para saber o que é da versão atual.

## Agent Notes

- Use `pnpm` em todos os comandos. Não use `npm` ou `yarn`.
- O projeto é um monorepo. Use `--filter <workspace>` para comandos em app/package específico.
- Nunca edite `node_modules/`. O projeto não usa Next.js.
- Cache de aplicação usa Cloudflare KV, não Postgres.
- O middleware Astro (`apps/web/src/middleware.ts`) protege rotas `/profile/me`, `/quiz/new`, `/settings` verificando sessão via API.
- O auth flow usa cookie `FunSona_session` (httpOnly, JWT). O Worker valida o JWT com `jose`.
- **Supabase Storage**: Bucket `quiz-images` deve ser público. MIME types permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Max file size: 5MB. RLS: INSERT para autenticados, SELECT público.

## Environment Variables

### `apps/web/.env` (browser/public)
```bash
PUBLIC_API_URL=http://localhost:8787/api
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

### `apps/api/.dev.vars` (Worker secrets — nunca exponha no browser)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=generate-a-256-bit-secret-here
ENVIRONMENT=development
```

## Documentação para Agentes

| Arquivo | Quando consultar |
|---|---|---|
| `docs/architecture.md` | Antes de mudar stack, adicionar nova integração, ou decisões de infraestrutura |
| `docs/product.md` | Para saber se uma feature está no escopo, requisitos funcionais, ou métricas de sucesso |
| `docs/roadmap.md` | Para saber o que implementar agora vs depois. Não implemente features de versões futuras sem aprovação. |
| `docs/research.md` | Para contexto de decisões já tomadas (benchmarks, alternativas avaliadas) |
