<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE } from '../api'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('user')
const loading = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Email and password are required.'; return }
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value, name: name.value, role: role.value })
    })
    const json = await res.json()
    if (!res.ok || !json?.ok) throw new Error(json?.detail || 'Signup failed')
    localStorage.setItem('hs_token', json.token)
    localStorage.setItem('hs_user', JSON.stringify(json.user))
    router.push({ name: 'scan' })
  } catch (e) {
    error.value = e?.message || 'Signup failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth auth--signup">
    <div class="card">
      <h1>Create Account</h1>
      <form @submit.prevent="submit">
        <label>Name (optional)<input id="signup-name" name="name" type="text" v-model="name" autocomplete="name" /></label>
        <label>Email<input id="signup-email" name="email" type="email" v-model="email" autocomplete="email" required /></label>
        <label>Password<input id="signup-password" name="password" type="password" v-model="password" autocomplete="new-password" required /></label>
        <label>Role
          <select id="signup-role" name="role" v-model="role">
            <option value="user">User</option>
            <option value="itn">ITN</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div class="actions">
          <button type="submit" :disabled="loading">{{ loading ? 'Creating…' : 'Sign Up' }}</button>
          <button type="button" class="secondary" @click="router.push({ name: 'login' })">Log In</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <p class="muted">Already have an account? <router-link :to="{ name: 'login' }">Log in</router-link>.</p>
    </div>
  </section>
</template>

<style scoped>
.auth { display: grid; place-items: center; padding: 3rem 1rem; }
.card { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 12px 30px rgba(2,6,23,.08); }
h1 { margin: 0 0 1rem; font-size: 1.5rem; }
form { display: grid; gap: .8rem; }
label { display: grid; gap: .25rem; font-weight: 700; color: #0B1F3B; }
input, select { padding: .6rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
.actions { display: flex; gap: .6rem; align-items: center; }
button { margin-top: .3rem; padding: .7rem 1rem; border-radius: 8px; background: #0B1F3B; color: #fff; font-weight: 800; border: none; cursor: pointer; }
button.secondary { background: #ffffff; color: #0B1F3B; border: 1px solid #cbd5e1; }
.error { color: #b91c1c; font-weight: 600; margin: .5rem 0 0; }
.muted { color: #475569; margin-top: .8rem; }
</style>
