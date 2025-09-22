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
          <QuickScan />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scan-hero { padding: 1.2rem 0 0; }
.container { max-width: 100%; width: 100%; margin: 0; }
h1 { margin: 0 0 .3rem; font-size: 1.6rem; color: #0B1F3B; }
.muted { color: #475569; }
.scan-body { padding: .2rem 0 1.4rem; }
</style>
