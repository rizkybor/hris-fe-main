import countUp from '@/directives/countUp'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/css/main.css'

import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { i18n, loadLocaleMessages } from './i18n'

// vue3-apexcharts's own onMounted hook calls its internal init() (async,
// returns the chart's render() promise) without awaiting or catching it --
// if a chart's container unmounts right after mount (e.g. a dashboard
// widget's loading state settling quickly), render() rejects with this
// exact, harmless "Element not found" and nothing in the library catches
// it, surfacing as an uncaught rejection with no way to fix it from our
// component code. Narrowly swallow only this specific rejection so real
// errors still surface normally.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof Error && event.reason.message === 'Element not found') {
    event.preventDefault()
  }
})

const app = createApp(App)
// Stat numbers count up when they appear (see directives/countUp.js).
app.directive('count-up', countUp)
app.use(i18n)

app.use(createPinia())
app.use(router)

initTheme()
// Mount once the active language's messages are in (one small chunk).
loadLocaleMessages(i18n.global.locale.value).finally(() => app.mount('#app'))
