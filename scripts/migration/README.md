# Migration Scripts

This directory contains one-off scripts for migrating data from FunSona v1 to v2.

## Planned Scripts

1. `export-valid-quizzes.ts`
   - Connects to old Supabase project.
   - Iterates all published quizzes.
   - Validates structure (has questions, valid images, etc.).
   - Exports valid quizzes to `quizzes-export.json`.

2. `import-quizzes.ts`
   - Reads `quizzes-export.json`.
   - Calls v2 API or inserts directly into new Supabase project.
   - Regenerates slugs if conflicts exist.

3. `migrate-users.ts` (optional)
   - Exports real users (not bots) from v1.
   - Imports into v2 via Supabase Auth admin API.

## Usage

```bash
cd scripts/migration
pnpm install
# Set OLD_SUPABASE_URL and OLD_SUPABASE_SERVICE_ROLE_KEY in .env
npx tsx export-valid-quizzes.ts
```
