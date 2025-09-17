import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/Landing.vue'

const routes = [
  { path: '/', name: 'home', component: Landing },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } },
})

export default router
