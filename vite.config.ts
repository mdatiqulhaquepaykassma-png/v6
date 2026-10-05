import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

function swMetadataPlugin() {
  const buildTimestamp = Date.now();
  const buildHash = Math.random().toString(36).substring(2, 10) + buildTimestamp.toString(36);
  const metadata = {
    build_timestamp: buildTimestamp,
    build_hash: `build-${buildHash}`,
    version: `v3.2.0-${buildTimestamp}`,
    generated_at: new Date(buildTimestamp).toISOString(),
  };

  return {
    name: 'sw-metadata-generator',
    buildStart() {
      try {
        const publicDir = path.resolve(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(publicDir, 'sw-metadata.json'),
          JSON.stringify(metadata, null, 2)
        );
      } catch (err) {
        console.error('Failed to write sw-metadata.json to public:', err);
      }
    },
    generateBundle(this: any) {
      this.emitFile({
        type: 'asset',
        fileName: 'sw-metadata.json',
        source: JSON.stringify(metadata, null, 2),
      });
    },
    configureServer(server: any) {
      server.middlewares.use('/sw-metadata.json', (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.end(JSON.stringify(metadata, null, 2));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      swMetadataPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'sw-metadata.json'],
        manifest: {
          id: '/',
          name: 'APEX CASINO: Dragon Tiger P2P',
          short_name: 'APEX Casino',
          description: 'High-stakes Dragon Tiger P2P arena with real-time multiplayer rooms, transparency charter, and secure wallet integration.',
          theme_color: '#0a0d14',
          background_color: '#07090e',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,json}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/ws/, /^\/sw-metadata\.json/],
          runtimeCaching: [
            {
              // Aggressive Cache-First strategy for game audio, cards, background textures & icons
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|mp3|wav|ogg|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'apex-game-media-v1',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // CacheFirst for external web fonts (Google Fonts / CDN)
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'apex-google-fonts-v1',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // NetworkOnly for /api/ and /sw-metadata.json to ensure 100% fresh deployment checks
              urlPattern: /(?:\/api\/.*|\/sw-metadata\.json)$/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      ...(process.env.ANALYZE === 'true'
        ? [
            visualizer({
              filename: 'stats.html',
              title: 'Apex Casino - Dependencies & Bundle Stats',
              open: false,
              gzipSize: true,
              brotliSize: true,
              template: 'treemap',
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      target: 'esnext',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler')) {
                return 'vendor-react-core';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-framer-motion';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
                return 'vendor-recharts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide-icons';
              }
              if (id.includes('canvas-confetti')) {
                return 'vendor-confetti';
              }
              if (id.includes('@google/genai') || id.includes('zod')) {
                return 'vendor-ai';
              }
              if (id.includes('workbox') || id.includes('idb')) {
                return 'vendor-pwa';
              }
              return 'vendor-utils';
            }
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
