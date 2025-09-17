import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './assets/styles.css'
import tilt from './directives/tilt.js'

const app = createApp(App)

app.use(router)
app.directive('tilt', tilt)
app.mount('#app')
