import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import { ptBR } from "@clerk/localizations";
import tailwindcss from "@tailwindcss/vite";

// Cloudflare Pages' Git-integration build injects the project's variables
// (wrangler.toml [vars] and the dashboard's "Variables and secrets") into
// process.env before Vite runs, and that pipeline prepends a UTF-8 BOM
// (U+FEFF) to each value. Vite's loadEnv keeps an already-set process.env var
// over .env.production (vite 6.4.2, loadEnv: the process.env loop runs after
// the file loop), so the BOM goes straight into the bundle. It first broke
// PUBLIC_CLERK_PUBLISHABLE_KEY (Clerk checks `^pk_(test|live)_` and never
// initialized), then the three PUBLIC_ADSENSE_SLOT_* ids (AdSlot checks
// `^\d+$` and rendered no ad unit in production). Every PUBLIC_ var is
// inlined at build time, so every one is sanitized, not just the ones that
// have already bitten. See docs/research/2026-10-20-adsense-slot-missing-in-production.
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("PUBLIC_") && typeof value === "string") {
    process.env[key] = value.replace(/^\uFEFF/, "").trim();
  }
}

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://funsona.com",
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    react(),
    // Auth UI is fully custom (LoginForm/RegisterForm build their own forms
    // on top of window.Clerk — see lib/clerk-client.ts), so no prebuilt
    // Clerk widget renders and prefetching the @clerk/ui bundle would be
    // wasted bytes. Localization still applies to Clerk-generated texts
    // (verification emails, error longMessages). Options here are
    // JSON-serialized into the injected script, so only plain values work.
    clerk({
      localization: ptBR,
      prefetchUI: false,
    }),
  ],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  i18n: {
    defaultLocale: "pt",
    locales: ["pt", "en", "es"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
