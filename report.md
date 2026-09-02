# Bug Report - FunSona v2

## Context
This report consolidates the FunSona v2 source review, listing the bugs, security problems and inconsistencies found during the inspection.

## Critical Bugs

### 1. Mismatch between `apiFetch` and the API Routes
**Where:** `apps/web/src/lib/api.ts` and the API routes (`apps/api/src/routes/*`)

**Description:** the `apiFetch` function on the frontend expects the response to carry `error` and `data` as top-level properties, but the API routes return a `{ success, data, error, meta }` wrapper. That makes checks like `if (res.error)` fail.

**Impact:** any component using `apiFetch` (e.g. `og/[slug].ts`) handles errors incorrectly.

**Example in `apps/web/src/pages/og/[slug].ts`:**
```typescript
if (!res || res.error || !res.data) { // res.error is undefined
  return new Response("Quiz not found", { status: 404 });
}
```

**Fix:** either make `apiFetch` unwrap the `error` field from the wrapper, or change the API routes to return a different shape. The first option is less invasive.

### 2. Incorrect Use of `.single()` on Queries That May Return Nothing
**Where:** `apps/api/src/routes/quizzes.ts` (lines 263, 310, 346, 475)

**Description:** using `.single()` without guaranteeing there is a row raises an exception when the record does not exist.

**Impact:** the application can crash on an invalid slug, a missing quiz, or a like that is not found.

**Fix:** replace it with `.maybe().first()`, or check that the result exists before reading it.

### 3. Duplicated `attempts_count` Increment for Authenticated Users
**Where:** `apps/api/src/routes/quizzes.ts` (line 409) and the `handle_quiz_result` trigger (migration `003_functions.sql`)

**Description:** the trigger increments `attempts_count` and `completions_count` when a result is inserted. The `POST /:id/results` route also calls `increment_quiz_attempts` after the insert, so it happens twice.

**Impact:** play counts come out inflated for authenticated users.

**Fix:** drop the `increment_quiz_attempts` call from the route, since the trigger already handles it. For anonymous users (user_id NULL) the trigger does not fire, so the call should remain only on that path.

### 4. Missing `search_vector` Column
**Where:** `apps/api/src/routes/quizzes.ts` (line 128)

**Description:** the `.textSearch("search_vector", ...)` query assumes a `search_vector` column of type `tsvector` exists. Migration 001_schema.sql does not create it.

**Impact:** full-text search does not work.

**Fix:** add the `search_vector` column and a GIN index on the `quizzes` table, plus a function that keeps it up to date from the relevant fields (title, description, tags).

## Security and Configuration Problems

### 5. Possible CORS Problem in the Astro Middleware
**Where:** `apps/web/src/middleware.ts`

**Description:** the fetch to `/api/auth/me` does not include credentials by default. In development (frontend and API on different ports) the httpOnly `FunSona_session` cookie may not be sent, which invalidates the session.

**Impact:** users can be redirected to login even while authenticated.

**Fix:** make the fetch pass `credentials: "include"`, or adjust the API's CORS configuration to allow the cookie to be shared.

### 6. Login Does Not Check Whether the Email Is Verified
**Where:** `apps/api/src/routes/auth.ts` (lines 117-124)

**Description:** the `/login` route grants access even when the email has not been verified.

**Impact:** depending on the security requirements, this can allow unauthorized access.

**Fix:** check `email_verified` in Supabase Auth before issuing a token.

### 7. Inconsistent Maximum Length for `handle`
**Where:** `apps/api/src/routes/auth.ts` (the `normalizeHandle` function) and `@FunSona/shared` (the schema)

**Description:** `normalizeHandle` truncates at 24 characters, but the schema allows up to 30. That can reject valid handles.

**Impact:** users can fail to register handles of 25-30 characters that would fall within the 30 limit after normalization.

**Fix:** either make `normalizeHandle` truncate at 30 characters, or lower the schema to 24.

### 8. RLS May Not Be Enabled Correctly
**Where:** `supabase/migrations/002_rls.sql`

**Description:** the policies are created, but RLS still has to be turned on for the tables in Supabase. The policies also assume `auth.uid()` is available, which requires Supabase configuration.

**Impact:** row-level security may not actually be active, exposing data.

**Fix:** verify that RLS is enabled and that the policies are being applied.

## Other Problems

### 9. Error Handling in `apiFetch`
**Where:** `apps/web/src/lib/api.ts`

**Description:** when the response is not JSON (e.g. a 500 with an HTML body), `res.json().catch(() => null)` returns `null`, and the error surfaced is just `HTTP ${res.status}` with no detail.

**Impact:** server errors are harder to diagnose.

**Fix:** consider logging the non-JSON body, or returning a more descriptive message.

### 10. Possible Information Leak in `robots.txt`
**Where:** `apps/web/src/pages/robots.txt.ts`

**Description:** `robots.txt` allows every public page but blocks `/api/` and `/quiz/*/play`. The `/quiz/*/play` pattern may not match the real route, which is `/quiz/[slug]/play`.

**Impact:** play pages may be indexed unintentionally.

**Fix:** adjust the pattern to `/quiz/*/play` (already correct) or use `/quiz/*/play` (regex). Check the real route.

### 11. Sitemap Pagination Limit
**Where:** `apps/web/src/pages/sitemap.xml.ts`

**Description:** the sitemap fetches up to 200 pages of quizzes, at 200 items per page. Anything past 40,000 quizzes is left out.

**Impact:** SEO can suffer once there are many quizzes.

**Fix:** raise `maxPages` and `limit` if needed, or paginate the sitemap itself (though large sitemaps are awkward).

## Priority Recommendations

1. **Fix immediately:** items 1, 2 and 3 (critical to basic operation).
2. **Fix soon:** item 4 (search) and 5 (CORS).
3. **Review the requirements:** items 6, 7, 8 (security and configuration).
4. **Improvements:** items 9, 10, 11 (optimizations).

## Next Steps

1. **Plan the implementation:** spell out the changes needed for each bug.
2. **Run tests:** make sure the fixes do not break existing behaviour.
3. **Review migrations:** plan the schema additions (the `search_vector` column) without losing data.
4. **Test in the development environment:** validate the auth, search and play-count flows.

---
*Report generated on: 2026-05-23*
