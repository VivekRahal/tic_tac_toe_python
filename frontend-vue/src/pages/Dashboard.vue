<script setup>
import NavBar from '../components/landing/NavBar.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const items = ref([])
const loading = ref(true)
const error = ref('')

const fetchScans = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('hs_token')
    if (!token) { router.replace({ name: 'login' }); return }
    const res = await fetch('http://127.0.0.1:8000/api/scans', { headers: { 'Authorization': `Bearer ${token}` } })
    const json = await res.json()
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load scans')
    items.value = json.items || []
  } catch (e) {
    error.value = e?.message || 'Failed to load scans'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchScans())
</script>

<template>
  <div>
    <div class="background" aria-hidden="true"></div>
    <div class="app" role="application">
      <NavBar />
      <section class="dash-hero">
        <div class="container">
          <h1>Your Survey History</h1>
          <p class="muted">All your Quick Scans are saved here for future reference.</p>
        </div>
      </section>
      <section class="dash-body">
        <div class="container">
          <div v-if="loading" class="loading">Loading…</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else>
            <div v-if="!items.length" class="empty">No scans yet. Try Quick Scan!</div>
            <ul v-else class="scan-list">
              <li v-for="it in items" :key="it.id" class="scan-item">
                <div class="row">
                  <div class="info">
                    <div class="title">{{ new Date(it.created_at).toLocaleString() }}</div>
                    <div class="meta">Question: <strong>{{ it.question_id }}</strong> • Model: {{ it.model }} • Images: {{ it.images_count }}</div>
                  </div>
                  <div class="actions">
                    <router-link class="btn btn--small" :to="{ name: 'scan', query: { id: it.id } }">Open</router-link>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dash-hero { padding: 1.2rem 1rem 0; }
.container { max-width: 1100px; margin: 0 auto; }
h1 { margin: 0 0 .3rem; font-size: 1.6rem; color: #0B1F3B; }
.muted { color: #475569; }
.dash-body { padding: .4rem 1rem 1.4rem; }
.loading, .error, .empty { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 14px; padding: 1rem; box-shadow: 0 8px 24px rgba(2,6,23,.06); }
.scan-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .8rem; }
.scan-item { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 14px; padding: .9rem; box-shadow: 0 8px 24px rgba(2,6,23,.06); }
.row { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
.title { font-weight: 800; color: #0B1F3B; }
.meta { color: #475569; font-size: .95rem; }
.btn { border: none; border-radius: 8px; padding: .5rem .8rem; font-weight: 700; cursor: pointer; text-decoration: none; background: #0B1F3B; color: #fff; }
.btn.btn--small { font-size: .95rem; }
</style>

