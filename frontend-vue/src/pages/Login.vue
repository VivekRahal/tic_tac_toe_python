<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE } from '../api'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const suggestSignup = ref(false)

const submit = async () => {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Email and password are required.'; return }
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    const json = await res.json()
    if (!res.ok || !json?.ok) {
      if (res.status === 401) {
        suggestSignup.value = true
        throw new Error('Invalid email or password.')
      }
      throw new Error(json?.detail || 'Login failed')
    }
    localStorage.setItem('hs_token', json.token)
    localStorage.setItem('hs_user', JSON.stringify(json.user))
    router.push({ name: 'scan' })
  } catch (e) {
    error.value = e?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

const googleSignIn = () => {
  // Redirect to backend OAuth start; backend will send us back to /login with token
  window.location.href = `${API_BASE}/api/auth/google/start?next=/scan`
}

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const next = params.get('next') || '/scan'
    if (token) {
      localStorage.setItem('hs_token', token)
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        const json = await res.json()
        if (json?.ok) {
          // Claims are not returned in response model; fall back to decode or leave user minimal
          // For simplicity, store a minimal user entry; backend token includes name/email in claims
          // Optionally, in future call a /profile endpoint.
          const claims = json?.claims || null
          if (claims && (claims.email || claims.name)) {
            localStorage.setItem('hs_user', JSON.stringify({ email: claims.email, name: claims.name, role: claims.role || 'user' }))
          }
        }
      } catch {}
      // Clean URL and go
      window.history.replaceState({}, document.title, window.location.pathname)
      router.push({ path: next })
    }
  } catch {}
})
</script>

<template>
  <section class="auth auth--login">
    <div class="card">
      <h1>Log In</h1>
      <form @submit.prevent="submit">
        <label>Email<input id="login-email" name="email" type="email" v-model="email" autocomplete="email" required /></label>
        <label>Password<input id="login-password" name="password" type="password" v-model="password" autocomplete="current-password" required /></label>
        <button type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Log In' }}</button>
        <button class="google" type="button" @click="googleSignIn">
          <span class="gicon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.602 33.658 29.197 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.5 6.053 28.973 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c10.493 0 19-8.507 19-19 0-1.262-.131-2.496-.389-3.717z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.814C14.655 16.018 18.955 13 24 13c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.5 6.053 28.973 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.113 0 9.787-1.953 13.305-5.148l-6.147-5.2C29.102 35.091 26.687 36 24 36c-5.176 0-9.571-3.317-11.156-7.946l-6.537 5.038C9.62 39.556 16.322 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.088 3.087-3.293 5.652-6.147 7.148l.002-.001 6.147 5.2C37.145 41.265 43 36.5 43 27c0-1.262-.131-2.496-.389-3.717z"/>
            </svg>
          </span>
          <span>Sign in with Google</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="suggestSignup && !loading" class="muted">Don’t have an account? <router-link :to="{ name: 'signup' }">Sign up</router-link>.</p>
      </form>
      <p class="muted">No account? <router-link :to="{ name: 'signup' }">Create one</router-link>.</p>
    </div>
  </section>
  
</template>

<style scoped>
.auth { display: grid; place-items: center; padding: 3rem 1rem; }
.card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 12px 30px rgba(2,6,23,.08); }
h1 { margin: 0 0 1rem; font-size: 1.5rem; }
form { display: grid; gap: .8rem; }
label { display: grid; gap: .25rem; font-weight: 700; color: #0B1F3B; }
input { padding: .6rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
button { margin-top: .3rem; padding: .7rem 1rem; border-radius: 8px; background: #0B1F3B; color: #fff; font-weight: 800; border: none; cursor: pointer; }
.google { background: #fff; color: #0B1F3B; border: 1px solid #cbd5e1; display: inline-flex; gap: .5rem; align-items: center; }
.gicon { display: inline-grid; place-items: center; width: 18px; height: 18px; }
.error { color: #b91c1c; font-weight: 600; margin: .5rem 0 0; }
.muted { color: #475569; margin-top: .8rem; }
</style>
