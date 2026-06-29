import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${cmd} ${args.join(" ")}\n${result.stdout || ""}\n${result.stderr || ""}`
    );
  }

  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function checkFile(pathname) {
  const full = resolve(root, pathname);
  if (!existsSync(full)) {
    throw new Error(`Missing required file: ${pathname}`);
  }
  return readFileSync(full, "utf8");
}

function checkWebProdEnv() {
  const raw = checkFile("apps/web/.env.production");
  const required = [
    "PUBLIC_API_URL",
    "PUBLIC_SITE_URL",
    "PUBLIC_SUPABASE_URL",
    "PUBLIC_SUPABASE_ANON_KEY",
    "PUBLIC_GOOGLE_ANALYTICS_ID",
    "PUBLIC_GOOGLE_ADSENSE_CLIENT",
  ];

  const missing = required.filter((key) => {
    const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
    return !match || !match[1].trim();
  });

  if (missing.length) {
    throw new Error(`apps/web/.env.production missing values: ${missing.join(", ")}`);
  }
}

function checkApiEnvContract() {
  const wrangler = checkFile("apps/api/wrangler.toml");
  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "JWT_SECRET",
  ];

  const missing = required.filter((key) => !wrangler.includes(key));
  if (missing.length) {
    throw new Error(`apps/api/wrangler.toml contract missing secret names: ${missing.join(", ")}`);
  }
}

function checkSeoStructure() {
  const quizPage = checkFile("apps/web/src/pages/quiz/[slug].astro");
  const layout = checkFile("apps/web/src/layouts/Layout.astro");
  const sitemap = checkFile("apps/web/src/pages/sitemap.xml.ts");
  const robots = checkFile("apps/web/src/pages/robots.txt.ts");

  const quizChecks = [
    "canonical",
    "application/ld+json",
    '"@type": "Quiz"',
    "title",
    "description",
  ];
  const layoutChecks = ["og:", "twitter:", "canonical"];
  const sitemapChecks = ["sitemap", "quizzes"];
  const robotsChecks = ["Sitemap:", "User-agent:"];

  const missingQuiz = quizChecks.filter((token) => !quizPage.includes(token));
  const missingLayout = layoutChecks.filter((token) => !layout.includes(token));
  const missingSitemap = sitemapChecks.filter((token) => !sitemap.includes(token));
  const missingRobots = robotsChecks.filter((token) => !robots.includes(token));

  const issues = [
    ...missingQuiz.map((x) => `quiz/[slug].astro missing "${x}"`),
    ...missingLayout.map((x) => `Layout.astro missing "${x}"`),
    ...missingSitemap.map((x) => `sitemap.xml.ts missing "${x}"`),
    ...missingRobots.map((x) => `robots.txt.ts missing "${x}"`),
  ];

  if (issues.length) {
    throw new Error(`SEO structure checks failed:\n- ${issues.join("\n- ")}`);
  }
}

function checkMigrationSync() {
  const output = run("supabase", ["db", "push", "--dry-run"]);
  if (output.includes("Would push these migrations:")) {
    throw new Error("Supabase has pending migrations (db push --dry-run is not empty).");
  }
}

function main() {
  const steps = [
    ["lint", () => run("pnpm", ["lint"])],
    ["typecheck", () => run("pnpm", ["typecheck"])],
    ["build", () => run("pnpm", ["build"])],
    ["migration sync", checkMigrationSync],
    ["web env completeness", checkWebProdEnv],
    ["api secret contract", checkApiEnvContract],
    ["seo structure", checkSeoStructure],
  ];

  for (const [label, fn] of steps) {
    process.stdout.write(`Checking ${label}...\n`);
    fn();
  }

  process.stdout.write("Production readiness gates passed.\n");
  process.stdout.write(
    "Manual follow-up: verify Supabase security advisor and production smoke matrix in docs/production-readiness.md.\n"
  );
}

try {
  main();
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Readiness check failed.\n${msg}\n`);
  process.exit(1);
}
