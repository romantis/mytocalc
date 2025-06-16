// @ts-check
import { defineConfig, envField } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://mytocalc.com",
  output: "server",
  integrations: [solidJs(), sitemap()],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: "wrangler.toml",
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      ALLOWED_ORIGINS: envField.string({ context: "server", access: "public" }),
      PUBLIC_MY_CONTACT_EMAIL: envField.string({ context: "client", access: "public" }),
    },
  },
  i18n: {
    locales: ["uk", "en"],
    defaultLocale: "uk",
    routing: { prefixDefaultLocale: false }, // / і /en/
  },
});