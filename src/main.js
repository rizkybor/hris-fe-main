import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/css/main.css'

import App from './App.vue'
import router from './router'

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

app.use(createPinia())
app.use(router)

app.mount('#app')
