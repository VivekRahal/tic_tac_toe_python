<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

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
    const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
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
</script>

<template>
  <section class="auth auth--login">
    <div class="card">
      <h1>Log In</h1>
      <form @submit.prevent="submit">
        <label>Email<input type="email" v-model="email" autocomplete="email" required /></label>
        <label>Password<input type="password" v-model="password" autocomplete="current-password" required /></label>
        <button type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Log In' }}</button>
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
.error { color: #b91c1c; font-weight: 600; margin: .5rem 0 0; }
.muted { color: #475569; margin-top: .8rem; }
</style>
