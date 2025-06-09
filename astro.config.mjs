// @ts-check
import { defineConfig, envField } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: "https://mytocalc.com",
  output: "server",
  integrations: [solidJs()],
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
    },
  },
});