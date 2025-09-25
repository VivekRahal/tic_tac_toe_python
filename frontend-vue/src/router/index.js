import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/Landing.vue'
import Login from '../pages/Login.vue'
import Signup from '../pages/Signup.vue'
import Scan from '../pages/Scan.vue'
import Dark from '../pages/Dark.vue'
import Dashboard from '../pages/Dashboard.vue'

const routes = [
  { path: '/', name: 'home', component: Landing },
  { path: '/scan', name: 'scan', component: Scan, meta: { requiresAuth: true } },
  { path: '/dark', name: 'dark', component: Dark },
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: Login },
  { path: '/signup', name: 'signup', component: Signup },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } },
})

router.beforeEach((to) => {
  if (to.meta?.requiresAuth) {
    const token = localStorage.getItem('hs_token')
    if (!token) return { name: 'login' }
  }
})

export default router
