# Production Readiness

This runbook defines go/no-go gates for FunSona production deploys.

## 1) Release Gates (must pass)

1. Code quality gate:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

2. Infra gate:
- `supabase db push --dry-run` must return no pending migrations.

3. Security gate:
- Supabase advisors (`security`) must have no open issues unless an explicit waiver is recorded.

4. SEO gate:
- Quiz pages expose per-slug title, description, canonical, OG/Twitter metadata and JSON-LD `Quiz`.
- `robots.txt` and `sitemap.xml` resolve and include public routes.

5. Runtime gate:
- Authenticated and anonymous flows pass smoke tests listed below.

## 2) Automated Readiness Check

Run:

```bash
pnpm release:ready
```

This verifies:
- lint/typecheck/build
- migration sync dry-run
- required web production env keys
- api secret contract presence in worker config
- SEO structural checks in source files

## 3) Smoke Test Matrix (production-like)

Anonymous checks:
- Open homepage, explore page, one quiz slug page, `robots.txt`, `sitemap.xml`.
- Verify source HTML has title/description/canonical/OG/Twitter tags.

Authenticated checks:
- Login/register/OAuth callback.
- Create quiz with cover + tags, publish, open slug page.
- Play quiz and confirm result write.
- Like/unlike quiz.
- Add/delete comment.
- Upload and replace avatar/banner.

Data integrity checks (SQL spot checks):
- `quiz_results` only has canonical `result_type` and matching `quiz_type`.
- `quizzes.tags` matches `quiz_tags` / `tags` sync function output.
- Profile media source/path consistency has zero contradictions.

SEO checks:
- Newly published quiz appears in sitemap generation.
- OG image endpoint for quiz slug returns an image.

## 4) Monitoring and Rollback

Monitor:
- API 4xx/5xx rates
- Worker runtime exceptions
- Supabase query errors
- Stripe webhook errors (if enabled)

Rollback triggers:
- login/session breakage
- result-write failures
- missing SEO metadata on quiz pages
- sustained error spike for 15+ minutes

Rollback method:
1. redeploy previous Cloudflare Worker (`api`)
2. redeploy previous Cloudflare Pages build (`web`)
3. pause further DB migrations until root cause is resolved

## 5) Security Waivers

All waivers must include:
- finding id/name
- rationale
- expiration date
- owner

Current default policy:
- `unused_index` performance findings are non-blocking.
- security findings are blocking unless explicitly waived.
