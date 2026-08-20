import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";

// Cloudflare Pages injects wrangler.toml [vars] into process.env before Vite
// runs, and its env-var pipeline prepends a UTF-8 BOM (U+FEFF) to the value.
// Vite's env loading keeps an already-set process.env var as-is (it doesn't
// fall back to .env.production for a key the OS environment already has), so
// that BOM survives straight into the client bundle. It silently fails
// Clerk's publishable-key format check (`^pk_(test|live)_`), which made
// Clerk construct a malformed script URL and never initialize.
if (process.env.PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY.replace(
    /^﻿/,
    ""
  ).trim();
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
  integrations: [react(), clerk()],
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
