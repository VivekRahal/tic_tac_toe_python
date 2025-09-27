import * as React from 'react'

type Props = {
  apiBase: string
}

type Voice = { id: string; name: string }

const BTN_SIZE = 48

export default function ButterflyTTS({ apiBase }: Props) {
  const [voices, setVoices] = React.useState<Voice[]>([])
  const [voiceName, setVoiceName] = React.useState('Rachel')
  const [voiceId, setVoiceId] = React.useState('')
  const [dragging, setDragging] = React.useState(false)
  const [pos, setPos] = React.useState<{x:number;y:number}>(() => {
    const raw = localStorage.getItem('hs_tts_pos')
    if (raw) try { return JSON.parse(raw) } catch {}
    // default bottom-right corner
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    return { x: Math.max(8, w - BTN_SIZE - 16), y: Math.max(8, h - BTN_SIZE - 16) }
  })
  const [tooltip, setTooltip] = React.useState('Ask me to read your summary')
  const cacheRef = React.useRef<Record<string,string>>({})
  const audioRef = React.useRef<HTMLAudioElement|null>(null)
  const [speaking, setSpeaking] = React.useState(false)

  const persistPos = (p:{x:number;y:number}) => localStorage.setItem('hs_tts_pos', JSON.stringify(p))

  React.useEffect(() => {
    // Load config and voices (best-effort)
    fetch(`${apiBase}/api/tts/config`).then(async r => {
      if (!r.ok) return
      const j = await r.json().catch(()=>null)
      const cfg = j?.config || null
      if (cfg) {
        if (cfg.default_voice_name) setVoiceName(String(cfg.default_voice_name))
        if (cfg.default_voice_id) setVoiceId(String(cfg.default_voice_id))
      }
    }).catch(()=>{})
    
    // Fetch voices
    fetch(`${apiBase}/api/tts/voices`).then(async r => {
      if (!r.ok) return
      const j = await r.json().catch(() => null)
      const list = Array.isArray(j?.voices) ? j.voices : []
      const mapped = list.map((v: any) => ({ id: String(v.voice_id||''), name: String(v.name||'') })).filter((v:Voice) => v.id && v.name)
      if (mapped.length) {
        setVoices(mapped)
        const match = mapped.find(v => v.name.toLowerCase() === 'rachel') || mapped[0]
        setVoiceId(prev => prev || match.id)
        setVoiceName(prev => prev || match.name)
      }
    }).catch(()=>{})
    const onEnvelope = (e:any) => {
      // Optionally auto-read when new result arrives
      const data = e?.detail || null
      if (!data) return
      const summary = data?.raws && Array.isArray(data.raws) ? data.raws[0] : (data?.raw||'')
      // Do not auto-read huge texts
      if (summary) speak(summary.slice(0, 800))
    }
    window.addEventListener('hs_envelope_updated', onEnvelope as any)
    const onSetVoice = (e:any) => {
      const d = e?.detail || {}
      if (d.voice_id) setVoiceId(String(d.voice_id))
      if (d.voice_name) setVoiceName(String(d.voice_name))
    }
    window.addEventListener('hs_tts_set_voice', onSetVoice as any)
    return () => {
      window.removeEventListener('hs_envelope_updated', onEnvelope as any)
      window.removeEventListener('hs_tts_set_voice', onSetVoice as any)
    }
  }, [apiBase])

  const speak = async (text: string) => {
    if (!text) return
    const key = `${voiceId||voiceName}|${text}`
    const cached = cacheRef.current[key]
    if (cached) {
      playUrl(cached)
      return
    }
    try {
      const res = await fetch(`${apiBase}/api/tts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, voice_id: voiceId || voiceName }) })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      cacheRef.current[key] = url
      playUrl(url)
    } catch (e) {
      setTooltip('TTS unavailable. Check API key.')
    }
  }

  const playUrl = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio()
    const el = audioRef.current!
    el.src = url
    el.onplaying = () => setSpeaking(true)
    el.onpause = () => setSpeaking(false)
    el.onended = () => setSpeaking(false)
    el.onerror = () => setSpeaking(false)
    el.play().catch(()=>{ setSpeaking(false) })
  }

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    const startX = e.clientX, startY = e.clientY
    const origin = { ...pos }
    const move = (ev: MouseEvent) => {
      const nx = origin.x + (ev.clientX - startX)
      const ny = origin.y + (ev.clientY - startY)
      const p = { x: Math.max(4, Math.min(window.innerWidth - BTN_SIZE - 4, nx)), y: Math.max(4, Math.min(window.innerHeight - BTN_SIZE - 4, ny)) }
      setPos(p)
    }
    const up = () => { setDragging(false); persistPos(pos); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const intro = () => {
    const msg = (
      'Welcome to UK Survey AI — I’ll guide you through checking a UK home using photos and a simple step-by-step flow. ' +
      'Start a survey by entering the address, choosing the property type/age, and selecting a RICS level (L1, L2, or L3). ' +
      'Upload clear photos of key areas — exterior, corners for damp, bathrooms and kitchen seals, windows, roofline, and boiler or consumer unit — then hit Run Analysis. ' +
      'I’ll produce a RICS-style dashboard with traffic-light risks, plain‑English findings, and suggested actions, optionally with cost ranges. ' +
      'When you’re happy, export PDF or copy link, and later you can re‑upload new photos to compare runs and track improvements.'
    )
    speak(msg)
  }

  const summarizeLatest = () => {
    try {
      const env = JSON.parse(localStorage.getItem('hs_last_envelope')||'{}')
      const raw = Array.isArray(env?.raws) ? (env.raws[0]||'') : (env?.raw||'')
      const parsed = extractJSON(raw)
      const summary = parsed?.summary || raw
      const keywords = Array.isArray(parsed?.keywords) ? ` Keywords: ${parsed.keywords.slice(0,8).join(', ')}` : ''
      speak(String(summary||'').slice(0, 800) + keywords)
    } catch {}
  }

  return (
    <div style={{ position:'fixed', left: pos.x, top: pos.y, zIndex: 50 }}>
      {/* Local styles for flutter/blink while speaking */}
      <style>{`
        @keyframes butterfly-flutter { 0% { transform: translateY(-1px) rotate(-3deg) scale(1.0);} 50% { transform: translateY(1px) rotate(0deg) scale(1.03);} 100% { transform: translateY(-1px) rotate(3deg) scale(1.0);} }
        @keyframes butterfly-glow { 0% { box-shadow: 0 6px 22px rgba(255,255,255,0.18);} 50% { box-shadow: 0 10px 26px rgba(255,255,255,0.28);} 100% { box-shadow: 0 6px 22px rgba(255,255,255,0.18);} }
        @keyframes butterfly-blink { 0%,100% { opacity: 1; } 50% { opacity: .85; } }
      `}</style>
      <button
        aria-label="Voice assistant"
        title={tooltip}
        onMouseDown={onMouseDown}
        onMouseEnter={() => { if (!speaking) playFx('hover') }}
        onClick={(e)=>{ e.stopPropagation(); playFx('tap'); intro() }}
        onDoubleClick={(e)=>{ e.stopPropagation(); summarizeLatest() }}
        className={`rounded-full shadow-xl border border-white/20 bg-gradient-to-br from-fuchsia-500/80 to-sky-400/80 hover:from-fuchsia-500 hover:to-sky-400 text-white ${speaking ? '' : ''}`}
        style={{ width: BTN_SIZE, height: BTN_SIZE, display:'grid', placeItems:'center', cursor: dragging ? 'grabbing' : 'grab', backdropFilter:'blur(6px)', animation: speaking ? 'butterfly-flutter 0.9s ease-in-out infinite alternate, butterfly-glow 1.6s ease-in-out infinite' : undefined }}
      >
        {/* Butterfly glyph */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: speaking ? 'butterfly-blink 1.4s ease-in-out infinite' : undefined }}>
          <path d="M12 12c1.5-3.5 4-6 7-7-1 3-3.5 5.5-7 7Zm0 0c-1.5-3.5-4-6-7-7 1 3 3.5 5.5 7 7Zm0 0c1.5 3.5 4 6 7 7-1-3-3.5-5.5-7-7Zm0 0c-1.5 3.5-4 6-7 7 1-3 3.5-5.5 7-7Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {/* No inline controls for end users; admin page controls the defaults */}
    </div>
  )
}

function extractJSON(text: string){
  try { const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fenced) return JSON.parse(fenced[1]) } catch {}
  try { const s=text.indexOf('{'); const e=text.lastIndexOf('}'); if (s!==-1 && e!==-1 && e>s) return JSON.parse(text.slice(s,e+1)) } catch {}
  return null
}

// Minimal FX via WebAudio (sine/triangle bleeps)
function playFx(kind: 'start'|'end'|'hover'|'tap'){
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = kind === 'hover' ? 'triangle' : 'sine'
    let f1 = 880, f2 = 660, dur = 0.12
    if (kind === 'start') { f1 = 740; f2 = 880; dur = 0.18 }
    if (kind === 'end') { f1 = 620; f2 = 440; dur = 0.16 }
    if (kind === 'tap') { f1 = 980; f2 = 820; dur = 0.09 }
    osc.frequency.setValueAtTime(f1, now)
    osc.frequency.exponentialRampToValueAtTime(f2, now + dur)
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.start(now)
    osc.stop(now + dur + 0.02)
    setTimeout(()=>ctx.close(), Math.ceil((dur+0.1)*1000))
  } catch {}
}
