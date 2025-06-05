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
      mode: 'development',
      base: '/',
      scope: '/',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MytoCalc',
        short_name: 'MytoCalc',
        theme_color: '#2563eb',
        description: 'Онлайн-калькулятор мита та ПДВ для імпортних посилок в Україну.',
        lang: 'uk',
        start_url: '/?utm_source=pwa',
        scope:'/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}'],
      },
      devOptions: {
        enabled: true,
        navigateFallbackAllowlist: [/^\/$/],
      },
    })
  ],
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.toml',
    },
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});