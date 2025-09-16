import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles.css'
import tilt from './directives/tilt.js'

const app = createApp(App)

app.directive('tilt', tilt)
app.mount('#app')
