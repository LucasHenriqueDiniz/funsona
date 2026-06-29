import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://funsona.com",
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
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
