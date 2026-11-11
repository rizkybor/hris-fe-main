// import { fileURLToPath, URL } from 'node:url'

// import { defineConfig } from 'vite'
// import vue from '@vitejs/plugin-vue'
// import vueJsx from '@vitejs/plugin-vue-jsx'
// import vueDevTools from 'vite-plugin-vue-devtools'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [
//     vue(),
//     vueJsx(),
//     vueDevTools(),
//   ],
//   resolve: {
//     alias: {
//       '@': fileURLToPath(new URL('./src', import.meta.url))
//     },
//   },
// })



import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

// The app version shown in the UI comes from package.json only.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Starts downloading the saved language's message chunk (locale-id /
// locale-en) in parallel with the entry script, so mounting doesn't wait
// for a second round trip.
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
    // Try passing an empty object as config or updating the package
    vueDevTools(), 
    // Compiles src/locales/**/*.json at build time, so production ships the
    // vue-i18n runtime without its message compiler and translations don't
    // get parsed in the browser.
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        // All namespaces of one language in a single chunk (locale-id / locale-en).
        manualChunks(id) {
          const m = id.match(/\/src\/locales\/([\w-]+)\//)
          if (m) return `locale-${m[1]}`
        },
      },
    },
  },
})