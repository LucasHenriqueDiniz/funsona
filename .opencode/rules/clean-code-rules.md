# Clean Code Rules

1. **TypeScript Strict**: Enable strict mode. No `any` unless absolutely necessary (document why).
2. **Zod Everywhere**: Validate all external inputs (API body, query params, cookies) with Zod schemas from `packages/shared`.
3. **Explicit Returns**: Always specify return types on public functions.
4. **Error Handling**: Never swallow errors. Log and return meaningful messages to the client (without leaking internals).
5. **No Console in Production**: Use a proper logger in the API. Astro pages can use `console` only during dev.
6. **Async/Await**: No `.then()` chains. Use `async/await` consistently.
7. **Naming**:
   - Components: PascalCase (`QuizCard.tsx`)
   - Utilities: camelCase (`apiFetch.ts`)
   - Constants: UPPER_SNAKE_CASE
   - Database tables/columns: snake_case
8. **Comments**: Explain "why", not "what". The code should be self-documenting.
9. **Dead Code**: Remove unused imports, variables, and functions immediately.
10. **Magic Numbers**: No literal numbers/strings in logic. Use named constants.
