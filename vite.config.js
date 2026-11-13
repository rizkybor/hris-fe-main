import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The app version shown in the UI comes from package.json only.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Preloads the saved language's message chunk alongside the entry script.
const localePreload = () => ({
  name: 'hris-locale-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const urls = {}
      for (const chunk of Object.values(ctx.bundle || {})) {
        const m = chunk.type === 'chunk' && chunk.name?.match(/^locale-([\w-]+)$/)
        if (m) urls[m[1]] = '/' + chunk.fileName
      }
      if (!urls.id) return html
      const js = `(function(){var u=${JSON.stringify(urls)},l;try{l=localStorage.getItem("hris-locale")}catch(e){}var k=document.createElement("link");k.rel="modulepreload";k.href=u[l]||u.id;document.head.appendChild(k)})()`
      return [{ tag: 'script', children: js, injectTo: 'head-prepend' }]
    },
  },
})

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    // Locales compiled at build time (runtime-only vue-i18n in production).
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
      runtimeOnly: true,
      compositionOnly: true,
      fullInstall: true,
      // Messages are plain text, but don't fail the build on HTML-like text.
      strictMessage: false,
      escapeHtml: false,
    }),
    localePreload(),
    // Installable app. The service worker caches only the app's own files;
    // API responses (HR / finance data) are never cached.
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-32x32.png'],
      manifest: {
        id: '/',
        name: 'HRIS+ · Jendela Cakra Digital',
        short_name: 'HRIS+',
        description: 'Back office PT Jendela Cakra Digital: absensi, tugas, proyek, keuangan, dan SDM.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F5F7FA',
        theme_color: '#FFFFFF',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        // Heavy, rarely used parts load on first use instead (cached below).
        globIgnores: [
          '**/og-image.png', '**/idcard-*.png', '**/template-letter-*.png', '**/fonts/Anton-*',
          '**/jspdf*.js', '**/html2canvas*.js', '**/FlowchartEditor-*.js', '**/purify.es-*.js',
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/(assets|fonts|images)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'app-extras', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        // One chunk per language (locale-id / locale-en).
        manualChunks(id) {
          const m = id.match(/\/src\/locales\/([\w-]+)\//)
          if (m) return `locale-${m[1]}`
        },
      },
    },
  },
})