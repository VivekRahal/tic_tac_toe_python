<script setup>
import { ref } from 'vue'

// Circular Quick Scan with submit to backend (multi-image support)
const fileInput = ref(null)
const dragOver = ref(false)
const files = ref([])
const submitting = ref(false)

const onClick = () => fileInput.value?.click()
const onChange = (e) => { const list = Array.from(e?.target?.files || []); if (list.length) files.value = [...files.value, ...list] }
const onDrop = (e) => { e.preventDefault(); dragOver.value = false; const list = Array.from(e.dataTransfer?.files||[]); if (list.length) files.value = [...files.value, ...list] }
const onDragOver = (e) => { e.preventDefault(); dragOver.value = true }
const onDragLeave = () => { dragOver.value = false }

const fileToDataUrl = (file) => new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file) })

const submit = async () => {
  if (!files.value.length || submitting.value) return
  submitting.value = true
  try {
    const fd = new FormData()
    for (const f of files.value) fd.append('files', f)
    fd.append('question_id', 'rics_analyze')
    const res = await fetch('http://127.0.0.1:8000/api/scan', { method: 'POST', body: fd })
    const json = await res.json()
    if (Array.isArray(json?.raws)) {
      localStorage.setItem('hs_last_raws', JSON.stringify(json.raws))
      if (json.raws[0]) localStorage.setItem('hs_last_raw', json.raws[0])
    } else if (typeof json?.raw === 'string') {
      localStorage.setItem('hs_last_raw', json.raw)
    }
    localStorage.setItem('hs_last_envelope', JSON.stringify(json))
    const urls = []
    for (const f of files.value) urls.push(await fileToDataUrl(f))
    if (urls.length) { localStorage.setItem('hs_last_image', urls[0]); localStorage.setItem('hs_images', JSON.stringify(urls)) }
    window.location.href = '/report-dashboard.html'
  } catch (e) {
    alert('Upload failed. Make sure backend is running on :8000')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section id="quick-scan" class="quickscan quickscan--minimal" aria-labelledby="qs-title">
    <div class="container">
      <div class="center">
        <h2 id="qs-title" class="sr-only">Quick Scan</h2>
        <input id="qs-input" ref="fileInput" class="hidden-input" type="file" accept="image/*" capture="environment" multiple @change="onChange" />
        <div
          class="circle"
          tabindex="0"
          role="button"
          aria-label="Quick Scan"
          @click="onClick"
          @drop="onDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <span class="circle__text">Quick Scan</span>
          <div v-if="dragOver" class="circle__overlay" aria-hidden="true">Drop</div>
        </div>
        <div class="file-meta" v-if="files.length && !submitting">{{ files.length }} file(s) selected</div>
        <button v-if="files.length" class="submit" type="button" :disabled="submitting" @click="submit">Submit</button>
        <div v-if="submitting" class="loading"><div class="spinner" aria-hidden="true"></div><span>Analyzing {{ files.length }} image(s)…</span></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 0 1rem 1.8rem; }
.center { display: grid; place-items: center; }
.hidden-input { position: absolute; left: -9999px; }
.circle { position: relative; width: 280px; height: 280px; border-radius: 9999px; background: linear-gradient(180deg, #f7fbff 0%, #eff6ff 100%); border: 2px dashed rgba(15,23,42,.15); display: grid; place-items: center; cursor: pointer; box-shadow: 0 12px 30px rgba(2,6,23,.08); transition: transform .2s ease, box-shadow .2s ease; }
.circle:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(2,6,23,.12); }
.circle:focus-visible { outline: 3px solid #0B1F3B; outline-offset: 3px; }
.circle__text { font-weight: 900; color: #0B1F3B; letter-spacing: .02em; }
.circle__overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(237, 246, 255, .92); color: #0B1F3B; border-radius: 9999px; border: 2px dashed rgba(15,23,42,.25); font-weight: 800; }
.file-meta { margin-top: .4rem; color: #334155; font-size: .9rem; }
.submit { margin-top: .8rem; padding: .7rem 1rem; border-radius: 999px; background: #0B1F3B; color: #fff; font-weight: 800; border: none; cursor: pointer; }
.submit:disabled { opacity: .6; cursor: not-allowed; }
.loading { margin-top: .8rem; display: inline-flex; gap: .6rem; align-items: center; color: #0B1F3B; font-weight: 800; }
.spinner { width: 18px; height: 18px; border-radius: 50%; border: 3px solid rgba(11,31,59,.2); border-top-color: #0B1F3B; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
