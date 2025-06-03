// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJs(),
    AstroPWA({
      srcDir: "public",
      filename: "sw.js",
      registerType: "autoUpdate",
      manifest: {},
      devOptions: {
        enabled: true
      }
    })
  ],
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()],
  },
});