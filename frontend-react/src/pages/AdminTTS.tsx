import * as React from 'react'
import { resolveApiBase } from '../utils/apiBase'

type Voice = { id: string; name: string }

export default function AdminTTS(){
  const API_BASE = resolveApiBase()
  const [voices, setVoices] = React.useState<Voice[]>([])
  const [config, setConfig] = React.useState<any>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const token = localStorage.getItem('hs_token')

  React.useEffect(()=>{
    (async () => {
      try{
        const [vc, cf] = await Promise.all([
          fetch(`${API_BASE}/api/tts/voices`).then(r=>r.ok?r.json():null).catch(()=>null),
          fetch(`${API_BASE}/api/tts/config`).then(r=>r.ok?r.json():null).catch(()=>null),
        ])
        const list = Array.isArray(vc?.voices) ? vc.voices : []
        setVoices(list.map((v:any)=>({ id: String(v.voice_id||''), name: String(v.name||'') })).filter((v:Voice)=>v.id && v.name))
        setConfig(cf?.config || {})
      } finally { setLoading(false) }
    })()
  }, [])

  const update = (k:string, v:any) => setConfig((c:any)=>({ ...c, [k]: v }))

  const save = async () => {
    setSaving(true)
    try{
      const res = await fetch(`${API_BASE}/api/tts/config`, { method:'PUT', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(config) })
      if (!res.ok) throw new Error('Save failed')
      alert('Saved')
    } catch(e:any){ alert(e.message || 'Failed to save') }
    finally{ setSaving(false) }
  }

  if (loading) return <div className="mx-auto w-[min(900px,92vw)] py-10 text-white/90">Loading…</div>
  return (
    <div className="mx-auto w-[min(900px,92vw)] py-10 text-white/90">
      <h1 className="text-2xl font-bold mb-4">TTS Admin</h1>
      <div className="grid gap-4">
        <div className="rounded-xl border border-white/20 bg-white/10 p-4">
          <div className="mb-2 font-semibold">Default Voice</div>
          <div className="flex gap-2 items-center">
            <select className="rounded-lg bg-white/10 text-white border border-white/20 px-3 py-2" value={config.default_voice_id || ''} onChange={e=>update('default_voice_id', e.target.value)}>
              <option value="">(use name)</option>
              {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input className="rounded-lg bg-white/10 text-white border border-white/20 px-3 py-2 flex-1" placeholder="Default voice name (fallback)" value={config.default_voice_name || ''} onChange={e=>update('default_voice_name', e.target.value)} />
          </div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 grid gap-3">
          <div className="font-semibold">Effects</div>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!config.effects_enabled} onChange={e=>update('effects_enabled', e.target.checked)} /> Enable FX</label>
          <div className="grid gap-2">
            <label className="flex items-center gap-2">Stability <input type="range" min={0} max={1} step={0.01} value={config.stability ?? 0.5} onChange={e=>update('stability', parseFloat(e.target.value))} /> <span className="w-10 text-right">{(config.stability ?? 0.5).toFixed(2)}</span></label>
            <label className="flex items-center gap-2">Similarity <input type="range" min={0} max={1} step={0.01} value={config.similarity_boost ?? 0.75} onChange={e=>update('similarity_boost', parseFloat(e.target.value))} /> <span className="w-10 text-right">{(config.similarity_boost ?? 0.75).toFixed(2)}</span></label>
            <label className="flex items-center gap-2">Style <input type="range" min={0} max={1} step={0.01} value={config.style ?? 0.2} onChange={e=>update('style', parseFloat(e.target.value))} /> <span className="w-10 text-right">{(config.style ?? 0.2).toFixed(2)}</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!config.use_speaker_boost} onChange={e=>update('use_speaker_boost', e.target.checked)} /> Speaker boost</label>
          </div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 grid gap-3">
          <div className="font-semibold">Behaviours</div>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!config.auto_intro_on_load} onChange={e=>update('auto_intro_on_load', e.target.checked)} /> Auto-intro on load</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!config.auto_read_summary} onChange={e=>update('auto_read_summary', e.target.checked)} /> Auto-read summary</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!config.auto_read_keywords} onChange={e=>update('auto_read_keywords', e.target.checked)} /> Include keywords</label>
          <textarea className="rounded-lg bg-white/10 text-white border border-white/20 px-3 py-2 min-h-[80px]" placeholder="Intro text" value={config.intro_text || ''} onChange={e=>update('intro_text', e.target.value)} />
        </div>
        <div>
          <button disabled={saving} onClick={save} className="rounded-xl bg-white/20 px-4 py-2 border border-white/30 hover:bg-white/30">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
