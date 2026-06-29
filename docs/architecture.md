# Architecture

Decisões técnicas e estrutura do sistema. Consulte este arquivo antes de mudar stack ou adicionar integrações.

## Diagrama

```
Browser → Cloudflare CDN → Cloudflare Pages (Astro SSR)
                                    │
                                    ▼
                           Cloudflare Worker (Hono API)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
                Supabase       Cloudflare KV      Stripe
                (Postgres)      (Cache)           (Payments)
```

## Decisões

### Astro + Cloudflare Pages (Frontend)

- **Por que Astro**: Gera HTML estático por padrão. React islands (`client:load`) só onde precisa de interatividade. Melhor para SEO que Next.js ou Remix.
- **Adapter**: `@astrojs/cloudflare` com `output: "server"` para SSR no edge.
- **Imagens**: Supabase Storage. Upload direto do browser via `supabase-js`, transformações básicas via query params (`?width=800`).
- **i18n**: Astro i18n routing nativo. `pt` default, sem prefixo na URL default.

### Hono + Cloudflare Worker (API)

- **Por que Hono**: Ultraleve (<20kb), roda nativo em Workers, middleware pattern familiar, type-safe.
- **Auth**: Supabase Auth com PKCE. O Worker gerencia cookies httpOnly (`FunSona_session`). JWT verificado com `jose` (Web Crypto API).
- **CORS**: Origins permitidas dinamicamente. Dev permite qualquer origin. Produção filtra por domínio do FunSona.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `JWT_SECRET` nunca tocam o browser. Vivem apenas em `wrangler.toml` / `.dev.vars`.

### Supabase (Banco + Auth)

- **Por que Supabase (e não Cloudflare D1)**: Postgres tem full-text search nativo (`to_tsvector`), JSONB avançado para quiz content, triggers PL/pgSQL para XP/streaks/leaderboard, e auth embutido. D1 é SQLite e perde todas essas features.
- **Conexão**: Apenas via `supabase-js` (PostgREST). Nunca via connection string direta.
- **RLS**: Definido em migrations SQL puras (`002_rls.sql`). A API valida ownership antes de escrever; RLS é a última linha de defesa.
- **Migrations**: `supabase/migrations/001_schema.sql`, `002_rls.sql`, `003_functions.sql`, `004_indexes.sql`. Ordem importa.

### Cloudflare KV (Cache)

- **Uso**: Trending quizzes (TTL 1h), leaderboard snapshots (TTL 15min), search suggestions.
- **Não use para**: Sessões de usuário (use cookies), dados relacionais (use Postgres), dados que precisam de consistência forte.

### Supabase Storage (Imagens)

- **Bucket**: `quiz-images` — upload direto do browser via `supabase-js` com RLS.
- **Transformações**: Básicas via query params (`?width=800`). Para o MVP, transformações simples são suficientes.
- **Por que não Cloudinary**: Remove um vendor extra. Supabase Storage já está na stack, com RLS integrado.

### Stripe (Pagamentos)

- **Checkout Sessions**: Criadas no Worker. Redireciona para Stripe hosted checkout.
- **Webhooks**: Endpoint `/api/stripe/webhook` no Worker. Verifica assinatura com `stripe.webhooks.constructEvent`.
- **Premium gates**: Verificação de `profiles.is_premium` no Worker antes de entregar features premium.

## Conventions

- **API responses**: Sempre `{ success: boolean, data?: T, error?: string, meta?: object }`.
- **Database tables**: snake_case. TypeScript types: camelCase (convertido pelo `supabase-js`).
- **File naming**: Components React: PascalCase. Utilities: camelCase. Constants: UPPER_SNAKE_CASE.
- **Error handling**: Nunca exponha stack traces ou secrets ao cliente. Log no Worker, mensagem genérica ao client.
