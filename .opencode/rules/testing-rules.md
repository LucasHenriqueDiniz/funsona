# Testing Rules

## Philosophy

Testing is mandatory for critical paths. Do not ship without tests for:
- Auth flows (login, register, session)
- Quiz CRUD operations
- XP/streak calculation logic
- Payment webhooks

## Tools

- **API**: Vitest (runs in Node, simulates Worker environment with `miniflare` or `wrangler vitest-pool`).
- **Web**: Playwright for E2E critical paths.
- **Shared**: Vitest for pure function unit tests.

## Coverage Targets

- API routes: 70% minimum
- Shared utilities: 90% minimum
- Web E2E: login → create quiz → play quiz → view result

## Test File Location

Co-locate tests with source files:
```
src/routes/auth.ts
src/routes/auth.test.ts
```

## Mocking

- Supabase: mock `@supabase/supabase-js` client.
- Stripe: use Stripe test keys + webhook test fixtures.
- KV: use Miniflare's KV mock in unit tests.
