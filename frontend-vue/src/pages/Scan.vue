<script setup>
import NavBar from '../components/landing/NavBar.vue'
import QuickScan from '../components/landing/QuickScan.vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  const token = localStorage.getItem('hs_token')
  if (!token) router.replace({ name: 'login' })
})
</script>

<template>
  <div>
    <div class="background" aria-hidden="true"></div>
    <div class="app" role="application">
      <NavBar />
      <section class="scan-hero">
        <div class="container">
          <h1>Quick Scan</h1>
          <p class="muted">Upload one or more images to analyze issues and get recommended actions.</p>
        </div>
      </section>
      <section class="scan-body">
        <div class="container">
          <div class="card">
            <QuickScan />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scan-hero { padding: 1.2rem 1rem 0; }
.container { max-width: 1100px; margin: 0 auto; }
h1 { margin: 0 0 .3rem; font-size: 1.6rem; color: #0B1F3B; }
.muted { color: #475569; }
.scan-body { padding: .2rem 1rem 1.4rem; }
.card { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 14px; padding: 1rem; box-shadow: 0 8px 24px rgba(2,6,23,.06); }
</style>
