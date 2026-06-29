# Research

Investigações e benchmarks já realizados. Não repita pesquisas listadas aqui a menos que dados estejam desatualizados.

## SEO Benchmarks (2025-01)

| Competidor | Lighthouse Perf | Lighthouse SEO | Notas |
|---|---|---|---|
| QuizPanda | 45 | 85 | Heavy JS, slow LCP |
| Quizur | 55 | 80 | Decente mas UX antigo |
| Sporcle | 60 | 90 | Bom SEO, muitos ads |
| Kahoot | 70 | 95 | Excelente, mas não é UGC |

**Meta do FunSona**: 80+ Performance, 95+ SEO, 100 Best Practices.

## Astro vs Next.js para SEO

- Astro gera menos JS por padrão (0kb se sem islands).
- `output: "server"` com Cloudflare adapter dá SSR no edge.
- `client:*` directives controlam hidratação com precisão.
- **Decisão**: Astro é melhor para apps content-heavy, SEO-first. Não revisite a menos que precisemos de features exclusivas do Next.js.

## Supabase Auth em Workers

- `supabase-js` funciona em Cloudflare Workers.
- Fluxo OAuth: callback handled by Worker → exchange code → set httpOnly cookie.
- JWT verification no Worker com `jose` (Web Crypto API).
- Não precisa de `next/headers` ou `cookies()`.
- **Decisão**: Manter auth no Worker com cookies. Não revisite.

## Cloudflare KV Limits

- Max key: 512 bytes
- Max value: 25 MB
- Max read: 120,000 req/min (free tier)
- Bom para: trending quizzes, leaderboard snapshots, search suggestions
- Ruim para: user sessions (use cookies), relational data, consistent data
- **Decisão**: KV substitui tabelas de cache do Postgres. Não revisite.

## Stripe em Workers

- Pacote `stripe` funciona com Node.js compat flag no Workers.
- Webhook verification precisa do body raw (`c.req.raw.text()` no Hono).
- Checkout sessions criadas no Worker, redirecionamento para Stripe hosted page.
- **Decisão**: Manter Stripe no Worker. Não revisite.

## Alternativas Avaliadas e Rejeitadas

### D1 (Cloudflare) em vez de Supabase Postgres
- Rejeitado: SQLite não tem full-text search nativo, JSONB limitado, sem triggers complexos, single-writer.
- **Status**: Não revisite a menos que Supabase fique indisívelmente caro.

### Remix em vez de Astro
- Rejeitado: Remix hidrata página inteira. Astro é mais enxuto para conteúdo.
- **Status**: Não revisite a menos que precisemos de features exclusivas do Remix.

### Clerk em vez de Supabase Auth
- Rejeitado: Clerk é pago e adiciona vendor extra. Supabase Auth é gratuito e integrado.
- **Status**: Não revisite.

## Notas de Pesquisa Ativas

- **OG Image Generation**: Avaliar `@vercel/og` equivalente para Cloudflare (provavelmente `@cloudflare/pages-plugin-vercel-og` ou gerar SVG → PNG com resvg-wasm).
- **AdSense Approval**: Necessário ter conteúdo real, política de privacidade, termos de uso, e CLS < 0.1.
- **i18n SEO**: Hreflang tags, sitemap por locale, conteúdo traduzido (não apenas UI).
