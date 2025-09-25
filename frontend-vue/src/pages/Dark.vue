<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { API_BASE } from '../api'

const router = useRouter()
const fileInput = ref(null)
const submitting = ref(false)

const onClick = () => fileInput.value?.click()

const onChange = async (e) => {
  const list = Array.from(e?.target?.files || [])
  if (!list.length || submitting.value) return
  const token = localStorage.getItem('hs_token')
  if (!token) { router.replace({ name: 'login' }); return }
  submitting.value = true
  try {
    const fd = new FormData()
    for (const f of list) fd.append('files', f)
    fd.append('question_id', 'rics_analyze')
    fd.append('provider', (localStorage.getItem('hs_engine') || 'ollama'))
    await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: fd, headers: { 'Authorization': `Bearer ${token}` } })
    router.replace({ name: 'scan' })
  } catch {}
  finally { submitting.value = false }
}
</script>

<template>
  <div class="dark-stage">
    <input ref="fileInput" class="hidden-input" type="file" accept="image/*" multiple @change="onChange" />
    <button class="dark-orb" :class="{ running: submitting }" type="button" @click="onClick" aria-label="">
      <span class="orb-core" aria-hidden="true"></span>
      <span class="orb-glow" aria-hidden="true"></span>
      <span class="orb-ring" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style scoped>
.hidden-input { position: absolute; left: -9999px; }
.dark-stage { position: fixed; inset: 0; background: radial-gradient(1200px 800px at 50% 40%, #0a0f1a 0%, #05070b 55%, #000 100%); display: grid; place-items: center; overflow: hidden; }
.dark-stage::before { content: ""; position: absolute; inset: -10%; background: radial-gradient(800px 400px at 30% 20%, rgba(25,60,120,.12), transparent 60%), radial-gradient(900px 500px at 70% 80%, rgba(90,20,160,.12), transparent 60%); filter: blur(20px); }

.dark-orb { position: relative; width: clamp(180px, 26vmin, 320px); height: clamp(180px, 26vmin, 320px); border-radius: 9999px; border: 0; background: linear-gradient(180deg, #0b1020 0%, #0a0d18 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 25px 80px rgba(0,0,0,.65); cursor: pointer; outline: none; }
.dark-orb:hover { filter: saturate(1.08); }
.dark-orb:active { transform: translateY(1px); }
.orb-core { position: absolute; inset: 10%; border-radius: 9999px; background: radial-gradient(circle at 40% 35%, #0e1630 0%, #0a1228 50%, #070e20 100%); box-shadow: 0 12px 40px rgba(14,22,48,.45), inset 0 0 80px rgba(18, 90, 220, .18); }
.orb-glow { position: absolute; inset: -6%; border-radius: 9999px; background: conic-gradient(from 0deg, rgba(24,120,255,.0), rgba(24,120,255,.35), rgba(140,0,255,.0)); filter: blur(30px); animation: spin 10s linear infinite; }
.orb-ring { position: absolute; inset: 2%; border-radius: 9999px; background: conic-gradient(from 0deg, rgba(255,255,255,.08) 0 12%, transparent 12% 40%, rgba(255,255,255,.08) 40% 52%, transparent 52% 100%); mask: radial-gradient(circle at center, transparent 58%, black 59%); opacity: .7; animation: ring 2.4s ease-in-out infinite; }
.dark-orb.running .orb-ring { animation-duration: 1.1s; }

@keyframes spin { to { transform: rotate(360deg) } }
@keyframes ring { 0%,100% { transform: rotate(0deg); filter: blur(0) } 50% { transform: rotate(12deg); filter: blur(0.3px) } }
</style>

