<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { API_BASE } from '../../api'

// Circular Quick Scan with submit to backend (multi-image support)
const fileInput = ref(null)
const dragOver = ref(false)
const files = ref([])
const submitting = ref(false)
const imageUrl = ref('')
const imgEl = ref(null)
const infoMaxHeight = ref(null)
const resultText = ref('')
const resultJson = ref(null)

const hasResult = computed(() => !!(resultText.value || resultJson.value))

const parseMaybeJSON = (text) => { try { return JSON.parse(text) } catch { return null } }
const extractJSON = (text) => {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) { const p = parseMaybeJSON(fenced[1]); if (p) return p }
  const s = text.indexOf('{'); const e = text.lastIndexOf('}')
  if (s !== -1 && e !== -1 && e > s) { const cand = text.slice(s, e+1); const p = parseMaybeJSON(cand); if (p) return p }
  return null
}
const toKeyLabel = (k) => String(k).replace(/[\-_]+/g,' ').toUpperCase()

const collectText = (val, out) => {
  if (val === null || val === undefined) return
  if (Array.isArray(val)) {
    for (const item of val) collectText(item, out)
    return
  }
  const t = typeof val
  if (t === 'string' || t === 'number' || t === 'boolean') {
    const s = String(val).trim()
    if (s) out.push(s)
    return
  }
  if (t === 'object') {
    for (const v of Object.values(val)) collectText(v, out)
  }
}

const titleText = computed(() => {
  const obj = resultJson.value
  if (obj && typeof obj === 'object' && obj.title) return String(obj.title)
  return ''
})

const keywords = computed(() => {
  const obj = resultJson.value
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj.keywords)) return obj.keywords
    if (Array.isArray(obj.tags)) return obj.tags
  }
  return []
})

const lines = computed(() => {
  const obj = resultJson.value
  if (obj && typeof obj === 'object') {
    const out = []
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'title' || k === 'keywords' || k === 'tags') continue
      collectText(v, out)
    }
    return out
  }
  if (resultText.value) return [resultText.value]
  return []
})

const syncHeights = () => {
  if (imgEl.value) {
    infoMaxHeight.value = imgEl.value.clientHeight || null
  }
}

const onResize = () => syncHeights()
onMounted(async () => {
  window.addEventListener('resize', onResize)
  // Load available analysis questions
  try {
    const r = await fetch(`${API_BASE}/api/questions`)
    const j = await r.json()
    if (j && Array.isArray(j.items)) {
      questionItems.value = j.items
      if (j.default) selectedQuestionId.value = j.default
    }
  } catch {}
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

// Surveys history state
const showSurveys = ref(false)
const surveysLoading = ref(false)
const surveysError = ref('')
const surveys = ref([])

const fetchSurveys = async () => {
  surveysLoading.value = true
  surveysError.value = ''
  try {
    const token = localStorage.getItem('hs_token')
    if (!token) { window.location.href = '/login'; return }
    const headers = { 'Authorization': `Bearer ${token}` }
    const res = await fetch(`${API_BASE}/api/scans`, { headers })
    const json = await res.json()
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load scans')
    const ids = (json.items || []).map(it => it.id).slice(0, 12)
    const detailPromises = ids.map(id => fetch(`${API_BASE}/api/scans/${encodeURIComponent(id)}`, { headers }).then(r => r.json()))
    const details = await Promise.all(detailPromises)
    surveys.value = details.filter(j => j?.ok && j.scan).map(j => j.scan).map(scan => ({
      id: scan.id,
      when: scan.created_at,
      question_id: scan.question_id,
      model: scan.model,
      images: Array.isArray(scan.results) ? scan.results.map(r => r.image_b64 ? `data:image/*;base64,${r.image_b64}` : null).filter(Boolean) : [],
      text: (() => {
        const txt = (Array.isArray(scan.results) && scan.results[0] && scan.results[0].response) ? scan.results[0].response : ''
        // Prefer original text; fallback to extracted JSON pretty text
        const obj = extractJSON(txt) || parseMaybeJSON(txt)
        if (obj && typeof obj === 'object') {
          const out = []
          collectText(obj, out)
          return out.join('\n')
        }
        return txt
      })(),
    }))
  } catch (e) {
    surveysError.value = e?.message || 'Failed to load scans'
  } finally {
    surveysLoading.value = false
  }
}

const openSurveys = async () => {
  const target = !showSurveys.value
  showSurveys.value = target
  if (target && !surveys.value.length && !surveysLoading.value) await fetchSurveys()
}

// Questions (prompts) selector
const questionItems = ref([])
const selectedQuestionId = ref('rics_analyze')
// Provider selector: 'ollama' (local llava) or 'openai' (API key)
const selectedProvider = ref('ollama')

const onClick = () => {
  const token = localStorage.getItem('hs_token')
  if (!token) { window.location.href = '/login'; return }
  fileInput.value?.click()
}
const onChange = (e) => { const list = Array.from(e?.target?.files || []); if (list.length) files.value = [...files.value, ...list] }
const onDrop = (e) => { e.preventDefault(); dragOver.value = false; const token = localStorage.getItem('hs_token'); if (!token) { window.location.href = '/login'; return } const list = Array.from(e.dataTransfer?.files||[]); if (list.length) files.value = [...files.value, ...list] }
const onDragOver = (e) => { e.preventDefault(); dragOver.value = true }
const onDragLeave = () => { dragOver.value = false }

const fileToDataUrl = (file) => new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file) })

const submit = async () => {
  if (!files.value.length || submitting.value) return
  const token = localStorage.getItem('hs_token')
  if (!token) { window.location.href = '/login'; return }
  submitting.value = true
  try {
    const fd = new FormData()
    for (const f of files.value) fd.append('files', f)
    fd.append('question_id', selectedQuestionId.value || 'rics_analyze')
    fd.append('provider', selectedProvider.value || 'ollama')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/api/scan`, { method: 'POST', body: fd, headers })
    const json = await res.json()
    if (!res.ok || json?.ok === false) {
      const msg = json?.detail || json?.error || 'Scan failed'
      throw new Error(msg)
    }
    const urls = []
    for (const f of files.value) urls.push(await fileToDataUrl(f))
    if (urls.length) {
      imageUrl.value = urls[0]
      await nextTick()
      if (imgEl.value) {
        if (imgEl.value.complete) syncHeights()
        else imgEl.value.onload = syncHeights
      }
    }
    // Keep storing for future pages if needed
    if (Array.isArray(json?.raws)) {
      localStorage.setItem('hs_last_raws', JSON.stringify(json.raws))
      if (json.raws[0]) localStorage.setItem('hs_last_raw', json.raws[0])
      resultText.value = json.raws[0] || ''
    } else if (typeof json?.raw === 'string') {
      localStorage.setItem('hs_last_raw', json.raw)
      resultText.value = json.raw
    }
    localStorage.setItem('hs_last_envelope', JSON.stringify(json))
    // Try to parse JSON for structured view
    resultJson.value = extractJSON(resultText.value) || parseMaybeJSON(resultText.value)

    // Ensure results are visible (hide surveys) and scroll to result
    showSurveys.value = false
    await nextTick()
    const anchor = document.getElementById('qs-result')
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Reset uploader state for a fresh start
    files.value = []
    if (fileInput.value) fileInput.value.value = ''
    dragOver.value = false
  } catch (e) {
    alert((e && e.message) ? e.message : 'Upload failed. Make sure backend is running on :8000')
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
        <div class="question">
          <label for="qs-question">Question</label>
          <select id="qs-question" v-model="selectedQuestionId">
            <option v-for="q in questionItems" :key="q.id" :value="q.id" :title="q.prompt">{{ q.id }}</option>
          </select>
        </div>
        <div class="provider">
          <label for="qs-provider">Engine</label>
          <select id="qs-provider" v-model="selectedProvider">
            <option value="ollama">LLaVA (local)</option>
            <option value="openai">OpenAI (API key)</option>
          </select>
        </div>
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
        <button
          v-if="files.length"
          class="fx-btn"
          :class="{ 'is-running': submitting }"
          type="button"
          :disabled="submitting"
          @click="submit"
        >
          <span class="fx-btn__glow" aria-hidden="true"></span>
          <span class="fx-btn__ring" aria-hidden="true"></span>
          <span class="fx-btn__label">{{ submitting ? 'Analyzing…' : 'Analyze Now' }}</span>
        </button>
        <div v-if="submitting" class="loading-alt" aria-live="polite">Analyzing {{ files.length }} image(s)…</div>
      </div>
    </div>
  </section>
  <section v-if="!hasResult" class="surveys-toggle">
    <div class="container">
      <button class="btn btn--outline" type="button" @click="openSurveys">Surveys {{ showSurveys ? '▼' : '▲' }}</button>
    </div>
  </section>
  <section v-if="hasResult" class="result" id="qs-result">
    <div class="container result__wrap">
      <div class="result__image">
        <img v-if="imageUrl" :src="imageUrl" alt="Uploaded image" ref="imgEl" />
      </div>
      <div class="result__info" :style="infoMaxHeight ? { maxHeight: infoMaxHeight + 'px', overflow: 'auto' } : {}">
        <h3 v-if="titleText" class="result__title">{{ titleText }}</h3>
        <ul class="compact-list" v-if="lines.length">
          <li v-for="(t, i) in lines" :key="i">{{ t }}</li>
        </ul>
        <div v-else class="plain-text"><p style="white-space: pre-wrap;">{{ resultText }}</p></div>
        <div v-if="keywords.length" class="kw-row">
          <span class="kw-chip" v-for="(kw, i) in keywords" :key="i">{{ kw }}</span>
        </div>
      </div>
    </div>
  </section>
  <section v-if="hasResult" class="surveys-toggle">
    <div class="container">
      <button class="btn btn--outline" type="button" @click="openSurveys">Surveys {{ showSurveys ? '▼' : '▲' }}</button>
    </div>
  </section>
  <section v-if="showSurveys" class="surveys">
    <div class="container">
      <h3 class="surveys__title">Your Surveys</h3>
      <div v-if="surveysLoading" class="surveys__loading">Loading…</div>
      <div v-else-if="surveysError" class="surveys__error">{{ surveysError }}</div>
      <div v-else class="surveys__grid">
        <article v-for="s in surveys" :key="s.id" class="survey">
          <div class="survey__thumbs">
            <img v-for="(im, idx) in s.images.slice(0,3)" :key="idx" :src="im" alt="scan image" />
          </div>
          <div class="survey__meta">
            <div class="survey__when">{{ new Date(s.when).toLocaleString() }}</div>
            <div class="survey__q">Q: {{ s.question_id }}</div>
          </div>
          <pre class="survey__text">{{ s.text }}</pre>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container { max-width: 100%; width: 100%; margin: 0; padding: 0 0 1.8rem; }
.center { display: grid; place-items: center; }
.hidden-input { position: absolute; left: -9999px; }
.circle { position: relative; width: 280px; height: 280px; border-radius: 9999px; background: linear-gradient(180deg, #f7fbff 0%, #eff6ff 100%); border: 2px dashed rgba(15,23,42,.15); display: grid; place-items: center; cursor: pointer; box-shadow: 0 12px 30px rgba(2,6,23,.08); transition: transform .2s ease, box-shadow .2s ease; }
.circle:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(2,6,23,.12); }
.circle:focus-visible { outline: 3px solid #0B1F3B; outline-offset: 3px; }
.circle__text { font-weight: 900; color: #0B1F3B; letter-spacing: .02em; }
.circle__overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(237, 246, 255, .92); color: #0B1F3B; border-radius: 9999px; border: 2px dashed rgba(15,23,42,.25); font-weight: 800; }
.file-meta { margin-top: .4rem; color: #334155; font-size: .9rem; }
/* Futuristic Analyze button */
.fx-btn { position: relative; margin-top: .8rem; padding: .9rem 1.4rem; border-radius: 14px; border: 0; color: #fff; font-weight: 900; letter-spacing: .02em; cursor: pointer; overflow: hidden; background: radial-gradient(120% 120% at 20% 20%, #3b82f6 0%, #1d4ed8 45%, #0b1f3b 100%); box-shadow: 0 12px 30px rgba(29,78,216,.35), inset 0 0 0 1px rgba(255,255,255,.08); transition: transform .08s ease, box-shadow .2s ease, filter .2s ease; }
.fx-btn:hover { box-shadow: 0 14px 36px rgba(29,78,216,.42), inset 0 0 0 1px rgba(255,255,255,.12); filter: saturate(1.08); }
.fx-btn:active { transform: translateY(1px); }
.fx-btn:disabled { cursor: not-allowed; opacity: .9; }
.fx-btn__label { position: relative; z-index: 2; }
.fx-btn__glow { position: absolute; inset: -40%; background: conic-gradient(from 0deg, rgba(59,130,246,.0), rgba(59,130,246,.65), rgba(14,165,233,.0)); filter: blur(22px); transform: rotate(0deg); animation: hue 6s linear infinite; opacity: .7; }
.fx-btn__ring { position: absolute; inset: 2px; border-radius: 12px; background: conic-gradient(from 0deg, transparent 0 40%, rgba(255,255,255,.25) 50%, transparent 60% 100%); mask: radial-gradient(circle at center, transparent 54%, black 55%); opacity: 0; }
.fx-btn.is-running .fx-btn__ring { opacity: 1; animation: spin 1s linear infinite; }
@keyframes hue { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.loading-alt { margin-top: .4rem; color: #0B1F3B; font-weight: 800; }
@media (prefers-reduced-motion: reduce) {
  .fx-btn__glow, .fx-btn__ring { animation: none; }
}
@keyframes spin { to { transform: rotate(360deg) } }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* Result layout */
.question { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .6rem; margin-bottom: .7rem; }
.question label { font-weight: 800; color: #0B1F3B; }
.question select { padding: .45rem .6rem; border: 1px solid #cbd5e1; border-radius: 8px; color: #0B1F3B; }
.result { padding: 0 1rem 2rem; }
.result__wrap { display: grid; grid-template-columns: minmax(260px, 420px) 1fr; gap: 16px; align-items: start; }
.result__image img { width: 100%; max-height: 420px; object-fit: contain; border-radius: 10px; box-shadow: 0 10px 24px rgba(2,6,23,.06); background: #fff; padding: 6px; border: 1px solid rgba(2,6,23,.06); }
.result__title { margin: 0 0 6px; font-size: 1.05rem; font-weight: 900; letter-spacing: .01em; color: #0B1F3B; }
.compact-list { list-style: disc; padding-left: 18px; margin: 0; display: grid; gap: 6px; font-size: .92rem; line-height: 1.35; }
.compact-list li { margin: 0; color: #0B1F3B; }
.plain-text { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 8px; padding: 10px; box-shadow: 0 6px 14px rgba(2,6,23,.04); color: #0B1F3B; font-size: .92rem; line-height: 1.35; }
/* Keywords row with colorful 3D chips */
.kw-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.kw-chip { display: inline-block; padding: 6px 10px; border-radius: 999px; color: #fff; font-weight: 800; font-size: .8rem; box-shadow: 0 6px 16px rgba(0,0,0,.12); transform: translateZ(0); }
.kw-chip:nth-child(6n+1) { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.kw-chip:nth-child(6n+2) { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
.kw-chip:nth-child(6n+3) { background: linear-gradient(135deg, #10b981, #059669); }
.kw-chip:nth-child(6n+4) { background: linear-gradient(135deg, #f59e0b, #d97706); }
.kw-chip:nth-child(6n+5) { background: linear-gradient(135deg, #ef4444, #dc2626); }
.kw-chip:nth-child(6n+6) { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.kw-chip:hover { filter: brightness(1.05); box-shadow: 0 10px 24px rgba(0,0,0,.16); }
/* Surveys panel */
.btn { border: 1px solid rgba(2,6,23,.12); background: #fff; color: #0B1F3B; border-radius: 8px; padding: .5rem .8rem; font-weight: 800; cursor: pointer; }
.btn--outline { background: #fff; }
.btn--block { display: block; width: 100%; margin-top: .6rem; }
.surveys { padding: .5rem 1rem 1.6rem; }
.surveys__title { margin: 0 0 .6rem; color: #0B1F3B; font-size: 1.1rem; font-weight: 900; }
.surveys__loading, .surveys__error { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 10px; padding: .8rem; color: #0B1F3B; }
.surveys__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.survey { background: #fff; border: 1px solid rgba(2,6,23,.06); border-radius: 10px; padding: .8rem; box-shadow: 0 6px 14px rgba(2,6,23,.04); display: grid; gap: .5rem; }
.survey__thumbs { display: inline-flex; gap: 6px; }
.survey__thumbs img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(2,6,23,.08); }
.survey__meta { display: flex; gap: 10px; flex-wrap: wrap; color: #475569; font-size: .85rem; }
.survey__when { font-weight: 800; color: #0B1F3B; }
.survey__text { margin: 0; white-space: pre-wrap; color: #0B1F3B; font-size: .9rem; line-height: 1.35; max-height: 180px; overflow: auto; border-top: 1px dashed rgba(2,6,23,.08); padding-top: .4rem; }
@media (max-width: 900px) { .result__wrap { grid-template-columns: 1fr; } .kv__row { grid-template-columns: 1fr; } }
</style>
<style scoped>
.surveys-toggle { padding: 0 1rem .6rem; }
/* Make Quick Scan sections full-bleed relative to the app gutter,
   without using viewport hacks that can get clipped by overflow rules. */
.quickscan, .result, .surveys, .surveys-toggle {
  width: calc(100% + var(--page-gutter) * 2);
  margin-left: calc(var(--page-gutter) * -1);
  margin-right: calc(var(--page-gutter) * -1);
}
/* But keep a small inner gutter so text isn’t cut at the edges */
.quickscan > .container,
.result > .container,
.surveys > .container,
.surveys-toggle > .container {
  padding-left: var(--page-gutter);
  padding-right: var(--page-gutter);
}
</style>
