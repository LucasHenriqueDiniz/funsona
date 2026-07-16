// One-off backfill: recompute quiz slugs with the fixed transliteration
// logic and, for any that change, record an old->new redirect and update
// the slug. Safe to re-run (idempotent) — already-correct slugs are skipped.
//
// Usage:
//   node scripts/backfill-quiz-slugs.mjs            # dry run, prints old -> new mapping only
//   node scripts/backfill-quiz-slugs.mjs --apply     # applies the changes
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Keep in sync with apps/api/src/routes/quizzes.ts slugify()
const TRANSLITERATION_MAP = {
  á: "a", à: "a", â: "a", ã: "a", ä: "a", å: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", õ: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n", ý: "y", ÿ: "y",
};

function slugify(title) {
  const transliterated = title
    .toLowerCase()
    .replace(/[áàâãäåéèêëíìîïóòôõöúùûüçñýÿ]/g, (char) => TRANSLITERATION_MAP[char] ?? char);

  const slug = transliterated
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || `quiz-${Math.random().toString(36).slice(2, 8)}`;
}

async function main() {
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("id, slug, title")
    .eq("status", "PUBLISHED");

  if (error) {
    console.error("Failed to load quizzes:", error.message);
    process.exit(1);
  }

  const existingSlugs = new Set(quizzes.map((q) => q.slug));
  const changes = [];

  for (const quiz of quizzes) {
    // Preserve any timestamp/uniqueness suffix already on the slug — only
    // re-derive the human-readable portion (everything before the last
    // "-<base36 timestamp>" segment, if present) to avoid churn on the
    // uniqueness suffix itself.
    const suffixMatch = quiz.slug.match(/-([0-9a-z]{6,})$/);
    const suffix = suffixMatch ? suffixMatch[0] : "";
    const base = suffix ? quiz.slug.slice(0, -suffix.length) : quiz.slug;

    const recomputedBase = slugify(quiz.title);
    if (recomputedBase === base) continue; // already correct

    let candidate = `${recomputedBase}${suffix}`;
    let attempt = 2;
    while (existingSlugs.has(candidate) && candidate !== quiz.slug) {
      candidate = `${recomputedBase}-${attempt}${suffix}`;
      attempt += 1;
    }

    existingSlugs.add(candidate);
    changes.push({ id: quiz.id, title: quiz.title, oldSlug: quiz.slug, newSlug: candidate });
  }

  if (changes.length === 0) {
    console.log("No slugs need correction.");
    return;
  }

  console.log(`${changes.length} slug(s) would change:\n`);
  for (const change of changes) {
    console.log(`  ${change.oldSlug}  ->  ${change.newSlug}   (${change.title})`);
  }

  if (!APPLY) {
    console.log("\nDry run only — re-run with --apply to write these changes.");
    return;
  }

  console.log("\nApplying changes...");
  for (const change of changes) {
    const { error: redirectError } = await supabase.from("quiz_slug_redirects").insert({
      old_slug: change.oldSlug,
      quiz_id: change.id,
      new_slug: change.newSlug,
    });
    if (redirectError) {
      console.error(`  Failed to insert redirect for ${change.oldSlug}:`, redirectError.message);
      continue;
    }

    const { error: updateError } = await supabase
      .from("quizzes")
      .update({ slug: change.newSlug })
      .eq("id", change.id);
    if (updateError) {
      console.error(`  Failed to update slug for ${change.id}:`, updateError.message);
      continue;
    }

    console.log(`  OK: ${change.oldSlug} -> ${change.newSlug}`);
  }
}

main();
