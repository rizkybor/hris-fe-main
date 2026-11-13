import countUp from '@/directives/countUp'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/css/main.css'

import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { i18n, loadLocaleMessages } from './i18n'

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
