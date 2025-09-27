import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Image as ImageIcon, ListChecks, ArrowRight, ShieldCheck, Droplets, FileText, Home, Sparkles, Volume2 } from 'lucide-react'
import AddressHeader from './components/AddressHeader'
import AdminTTS from './pages/AdminTTS'
import ButterflyTTS from './components/ButterflyTTS'
import AgentBar from './components/AgentBar'

const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000'

const pressable = 'pressable'
const glass = 'glass'
const soft3D = 'soft3d'

function Nav({ page, setPage, user, onSignOut }: { page: string, setPage: (p: string)=>void, user: any, onSignOut: ()=>void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initial = (user?.name || user?.email || '').trim().charAt(0).toUpperCase()
  return (
    <div className="sticky top-4 z-50 mx-auto mt-4 w-[min(1200px,92vw)]">
      <div className={`${glass} ${soft3D} rounded-2xl p-2`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/70 to-indigo-500/70 grid place-items-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm uppercase tracking-widest text-white/80">HomeSurvey AI</div>
              <div className="text-xs text-white/50">RICS‑aware UK House Survey</div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <NavButton icon={<Home className="h-4 w-4"/>} label="Home" active={page==='home'} onClick={()=>setPage('home')} />
            <NavButton icon={<Camera className="h-4 w-4"/>} label="Scan" active={page==='scan'} onClick={()=>setPage('scan')} />
            <NavButton icon={<ListChecks className="h-4 w-4"/>} label="Results" active={page==='result'} onClick={()=>setPage('result')} />
            {!user && (
              <button className={`ml-2 rounded-xl bg-white/20 px-3 py-2 text-sm ${pressable}`} onClick={() => setPage('login')}>Sign in</button>
            )}
            {user && (
              <div>
                <button aria-label="User menu" className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white font-bold" onClick={()=>setMenuOpen(v=>!v)}>
                  {initial || 'U'}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl text-sm" role="menu">
                    <button className="block w-full text-left px-3 py-2 hover:bg-white/15" onClick={()=>{ setPage('scan'); setMenuOpen(false) }}>Scan</button>
                    <button className="block w-full text-left px-3 py-2 hover:bg-white/15" onClick={()=>{ onSignOut(); setMenuOpen(false) }}>Sign out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }:{ icon: React.ReactNode, label: string, active?: boolean, onClick?: ()=>void }){
  return (
    <button onClick={onClick} className={`group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${pressable} ${active ? 'bg-white/20 text-white shadow-inner shadow-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
      <span className="grid place-items-center">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function HomePage({ goScan }:{ goScan: ()=>void }){
  return (
    <div className="mx-auto w-[min(1200px,92vw)] py-8 md:py-12">
      <div className={`grid items-center gap-8 rounded-3xl p-6 md:grid-cols-2 ${glass} ${soft3D}`}>
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow">RICS‑aware surveys, from a single photo.</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={goScan} className={`rounded-2xl bg-white/20 px-4 py-2 ${pressable}`}><Camera className="mr-2 inline h-4 w-4"/> Start a Scan</button>
            <button className={`rounded-2xl bg-white/10 px-4 py-2 border border-white/30 ${pressable}`}><FileText className="mr-2 inline h-4 w-4"/> Sample Report</button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs text-white/70">
            <ShieldCheck className="h-4 w-4" />
            <span>RICS‑informed prompts · Not a substitute for a qualified surveyor</span>
          </div>
        </div>
        <div className="relative">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.6}} className={`aspect-video w-full rounded-2xl ${glass} ${soft3D} overflow-hidden`}>
            <img alt="Dashboard preview" className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1400&auto=format&fit=crop"/>
          </motion.div>
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {[{title:'Scan',icon:<Camera className='h-5 w-5'/>},{title:'Analyse',icon:<Droplets className='h-5 w-5'/>},{title:'Report',icon:<FileText className='h-5 w-5'/>}].map((c,i)=> (
          <div key={i} className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
            <div className="flex items-center gap-2 text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">{c.icon}</span><span className="font-semibold">{c.title}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScanPage({ goResult }:{ goResult: ()=>void }){
  const inputRef = useRef<HTMLInputElement|null>(null)
  const [files,setFiles] = useState<File[]>([])
  const [provider,setProvider] = useState<'openai'|'ollama'>('ollama')
  const [model,setModel] = useState<string>('llava:7b')
  const onProviderChange = (val: 'openai'|'ollama') => {
    setProvider(val)
    // Adjust model default to avoid invalid combinations
    if (val === 'openai' && !model.toLowerCase().startsWith('gpt')) {
      setModel('gpt-4o-mini')
    }
    if (val === 'ollama' && model.toLowerCase().startsWith('gpt')) {
      setModel('llava:7b')
    }
  }
  const [questionId,setQuestionId] = useState<string>('rics_analyze')
  const [loading,setLoading] = useState(false)
  // Address details for header
  const [addr,setAddr] = useState<string>('')
  const [pc,setPc] = useState<string>('')
  const [lvl,setLvl] = useState<number>(2)

  const onPick = ()=> inputRef.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>)=> {
    const list = Array.from(e.target.files || [])
    if(list.length) setFiles(list)
  }
  const submit = async ()=>{
    if(!files.length || loading) return
    const token = localStorage.getItem('hs_token')
    if(!token){ window.location.href = '/login'; return }
    setLoading(true)
    try{
      const fd = new FormData()
      files.forEach(f=>fd.append('files', f))
      fd.append('question_id', questionId)
      fd.append('provider', provider)
      fd.append('model', model)
      if (addr) fd.append('property_address', addr)
      if (pc) fd.append('property_postcode', pc)
      if (lvl) fd.append('survey_level', String(lvl))
      const res = await fetch(`${API_BASE}/api/scan`, { method:'POST', body: fd, headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if(!res.ok || j?.ok===false) throw new Error(j?.detail || j?.error || 'Scan failed')
      // Persist last header info as well
      const header = {
        property: j.property || { address: addr, postcode: pc },
        survey: j.survey || { level: lvl, date: j.created_at },
      }
      const envelope = { ...j, ...header }
      localStorage.setItem('hs_last_envelope', JSON.stringify(envelope))
      // Notify butterfly assistant
      window.dispatchEvent(new CustomEvent('hs_envelope_updated', { detail: envelope }))
      goResult()
    }catch(e){ alert((e as Error).message) }
    finally{ setLoading(false) }
  }

  return (
    <div className="mx-auto w-[min(1200px,92vw)] py-8 md:py-12 grid gap-6 md:grid-cols-3">
      <div className={`md:col-span-1 space-y-6 ${glass} ${soft3D} rounded-3xl p-6`}>
        <h2 className="text-white text-xl font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Settings</h2>
        <div className="space-y-3 text-white/90">
          <label className="block text-sm">Property address
            <input value={addr} onChange={e=>setAddr(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2" placeholder="e.g., 12 Elm Street, Norwich"/>
          </label>
          <label className="block text-sm">Postcode
            <input value={pc} onChange={e=>setPc(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2" placeholder="e.g., NR2 1AB"/>
          </label>
          <label className="block text-sm">Survey Level
            <select value={lvl} onChange={e=>setLvl(Number(e.target.value))} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2">
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
            </select>
          </label>
          <label className="block text-sm">Question
            <select value={questionId} onChange={e=>setQuestionId(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2">
              <option value="rics_analyze">rics_analyze</option>
              <option value="rics_single_image">rics_single_image</option>
              <option value="general">general</option>
            </select>
          </label>
          <label className="block text-sm">Engine
            <select value={provider} onChange={e=>onProviderChange(e.target.value as any)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2">
              <option value="ollama">LLaVA (local)</option>
              <option value="openai">OpenAI (API key)</option>
            </select>
          </label>
          <label className="block text-sm">Model
            <input value={model} onChange={e=>setModel(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2" placeholder="llava:7b or gpt-4o-mini"/>
          </label>
        </div>
      </div>

      <div className="md:col-span-2 space-y-6">
        <div className={`rounded-3xl p-6 ${glass} ${soft3D}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-white text-xl font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Upload images</h2>
            <div className="flex items-center gap-2">
              <input ref={inputRef} className="hidden" type="file" accept="image/*" multiple onChange={onChange}/>
              <button onClick={onPick} className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`}><Camera className="mr-2 inline h-4 w-4"/> Choose files</button>
              <button onClick={submit} className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`} disabled={loading}>{loading ? 'Analyzing…' : <>Analyse now <ArrowRight className="ml-2 inline h-4 w-4"/></>}</button>
            </div>
          </div>
          {files.length>0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {files.map((f,i)=> (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-800/40 to-slate-900/40 grid place-items-center text-xs">
                  <span className="text-white/80 px-2 py-1 bg-black/30 rounded">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultPage(){
  // Load last envelope
  const env = useMemo(()=>{ try { return JSON.parse(localStorage.getItem('hs_last_envelope')||'{}') } catch { return {} } }, [])
  const text: string = Array.isArray(env?.raws) ? (env.raws[0]||'') : (env?.raw||'')
  const model: string = env?.model || ''
  const provider: string = env?.provider || ''
  const createdAt: string | null = env?.created_at || null

  // Try to parse structured JSON from the LLM text
  const extract = (t: string) => {
    if (!t) return null
    const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced) { try { return JSON.parse(fenced[1]) } catch {} }
    const s = t.indexOf('{'); const e = t.lastIndexOf('}')
    if (s !== -1 && e !== -1 && e > s) { try { return JSON.parse(t.slice(s, e+1)) } catch {} }
    return null
  }
  const parsed: any = useMemo(()=> extract(text), [text])
  const title: string = parsed?.title || 'Survey Analysis'
  const summary: string = parsed?.summary || ''
  const findings: string[] = Array.isArray(parsed?.findings) ? parsed.findings : []
  const actions: string[] = Array.isArray(parsed?.recommended_actions) ? parsed.recommended_actions : (Array.isArray(parsed?.actions) ? parsed.actions : [])
  const risk: string = (parsed?.risk_level || parsed?.risk || '').toString().toLowerCase()
  const keywords: string[] = Array.isArray(parsed?.keywords) ? parsed.keywords : []
  const property = env?.property || null
  const survey = env?.survey || null

  const countData = useMemo(() => ([
    { name: 'Findings', value: findings.length },
    { name: 'Actions', value: actions.length },
  ]), [findings.length, actions.length])

  const RiskChip = ({ level }:{ level: string }) => {
    const m = level === 'high' ? 'bg-red-500/20 text-red-200 border-red-400/30'
            : level === 'moderate' ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
            : level === 'low' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
            : 'bg-white/10 text-white border-white/20'
    const label = level ? level.toUpperCase() : 'N/A'
    return <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs border ${m}`}>{label}</span>
  }

  // TTS state and handler
  const [ttsLoading, setTtsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>('')
  // dynamic voices from backend (optional)
  const [voices, setVoices] = useState<{id:string,name:string}[]>([])
  const [voiceName, setVoiceName] = useState<string>('Rachel')
  const [voiceId, setVoiceId] = useState<string>('')
  useEffect(() => {
    // fetch available voices; ignore failures (backend will still resolve names)
    fetch(`${API_BASE}/api/tts/voices`).then(async (r) => {
      if (!r.ok) return
      const j = await r.json().catch(() => null)
      const list = Array.isArray(j?.voices) ? j.voices : []
      const mapped = list.map((v: any) => ({ id: String(v.voice_id||''), name: String(v.name||'') })).filter(v => v.id && v.name)
      if (mapped.length) {
        setVoices(mapped)
        // pick current by name, else first
        const match = mapped.find(v => v.name.toLowerCase() === voiceName.toLowerCase())
        setVoiceId(match ? match.id : mapped[0].id)
        if (!match) setVoiceName(mapped[0].name)
      }
    }).catch(() => {})
    // revoke audio URL on unmount to avoid leaks
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ttsCacheRef = useRef<Record<string,string>>({})
  const speakSummary = async () => {
    const toSpeak = summary || (text ? String(text).slice(0, 600) : '')
    if (!toSpeak) return
    const cacheKey = `${voiceId||voiceName}|${toSpeak}`
    // Use cached audio if available
    const cached = ttsCacheRef.current[cacheKey]
    if (cached) {
      setAudioUrl(cached)
      const audio = new Audio(cached)
      audio.play().catch(()=>{})
      return
    }
    setTtsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: toSpeak, voice_id: voiceId || voiceName })
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      ttsCacheRef.current[cacheKey] = url
      const audio = new Audio(url)
      audio.play().catch(()=>{})
    } catch (e) {
      alert('Unable to synthesize audio. Check TTS settings.')
    } finally {
      setTtsLoading(false)
    }
  }

  const [magazine, setMagazine] = useState(false)

  return (
    <div className="mx-auto w-[min(1200px,92vw)] py-8 md:py-12 space-y-6">
      {/* Header */}
      <div className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
        {/* Address header */}
        <div className="mb-4">
          <AddressHeader
            title={title || (property?.address ? `Residential Survey – ${property.address}` : 'Residential Survey')}
            address={property?.address || ''}
            postcode={property?.postcode || ''}
            level={(survey?.level as 1|2|3) || 2}
            dateISO={(env?.created_at as string) || new Date().toISOString()}
            standard={'RICS Home Survey Standard 2020 (rev. 2024)'}
            compact
            cream={false}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-widest text-white/70">HomeSurvey AI</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-white">{title}</h1>
            <div className="mt-2 text-xs text-white/60">Engine: {provider || 'unknown'} · Model: {model || 'unknown'} {createdAt ? `· ${new Date(createdAt).toLocaleString()}` : ''}</div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl bg-white/10 px-3 py-2 text-xs border border-white/20 hover:bg-white/15" onClick={()=>setMagazine(m=>!m)}>
              {magazine ? 'Structured View' : 'Magazine View'}
            </button>
            <RiskChip level={risk} />
          </div>
        </div>
        {magazine ? (
          // Magazine layout
          <div className="mt-6 space-y-6">
            {/* Deck / Standfirst with drop cap */}
            <div className={`rounded-2xl p-4 border border-white/15 bg-white/5 ${soft3D}`}>
              <div className="text-white font-semibold mb-2">Summary</div>
              <p className="text-white/85 text-[15px] md:text-base leading-relaxed first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:leading-[0.8]">
                {summary || (text ? 'No structured summary found; displaying raw output below.' : 'No result yet.')}
              </p>
            </div>
            {/* Two columns like a spread */}
            <div className="grid gap-6 md:grid-cols-3">
              <article className={`md:col-span-2 rounded-2xl p-5 border border-white/15 bg-white/5 ${soft3D}`}>
                <h3 className="text-white font-bold mb-3">Findings</h3>
                <div className="columns-1 md:columns-2 gap-6 [&_p]:mb-3">
                  {findings.length ? findings.map((f,i)=> (
                    <p key={i} className="text-white/85 text-sm break-inside-avoid">{f}</p>
                  )) : (<p className="text-white/60 text-sm">No structured findings</p>)}
                </div>
                {text && !parsed && (
                  <blockquote className="mt-4 border-l-4 border-white/30 pl-4 text-white/80 italic text-sm">{text.slice(0,280)}{text.length>280?'…':''}</blockquote>
                )}
              </article>
              <aside className={`md:col-span-1 space-y-4`}>
                <div className={`rounded-2xl p-4 border border-white/15 bg-white/5 ${soft3D}`}>
                  <h3 className="text-white font-bold mb-2">Recommended Actions</h3>
                  <ul className="list-disc pl-5 text-white/85 text-sm grid gap-2">
                    {actions.length ? actions.map((a,i)=> <li key={i}>{a}</li>) : <li className="list-none text-white/60">No structured actions</li>}
                  </ul>
                </div>
                <div className={`rounded-2xl p-4 border border-white/15 bg-white/5 ${soft3D}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold">Risk Level</div>
                    <RiskChip level={risk} />
                  </div>
                  <div className="mt-3 text-xs text-white/60">Assessment based on visual cues only.</div>
                </div>
                <div className={`rounded-2xl p-4 border border-white/15 bg-white/5 ${soft3D}`}>
                  <div className="text-white font-bold mb-2">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.length ? keywords.map((k,i)=> <span key={i} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/20">{k}</span>) : <span className="text-white/60 text-sm">No keywords</span>}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          // Structured dashboard layout
          <>
            {/* Grid cards */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15 md:col-span-2`}>
                <div className="text-white font-semibold mb-2">Summary</div>
                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{summary || (text ? 'No structured summary found; displaying raw output below.' : 'No result yet.')}</div>
              </div>
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15`}>
                <div className="text-white font-semibold mb-2">Findings vs Actions</div>
                <div className="h-32 grid grid-cols-2 items-end gap-4">
                  {countData.map((d,i)=> (
                    <div key={i} className="text-center">
                      <div className="mx-auto w-8 bg-white/25 rounded-t" style={{height: `${Math.max(12, d.value*12)}px`}} />
                      <div className="mt-1 text-xs text-white/70">{d.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15 md:col-span-1`}>
                <div className="text-white font-semibold mb-2">Findings</div>
                <ul className="list-disc pl-5 text-sm text-white/85 grid gap-2">
                  {findings.length ? findings.map((f,i)=> <li key={i}>{f}</li>) : <li className="list-none text-white/60">No structured findings</li>}
                </ul>
              </div>
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15 md:col-span-1`}>
                <div className="text-white font-semibold mb-2">Recommended Actions</div>
                <ul className="list-disc pl-5 text-sm text-white/85 grid gap-2">
                  {actions.length ? actions.map((a,i)=> <li key={i}>{a}</li>) : <li className="list-none text-white/60">No structured actions</li>}
                </ul>
              </div>
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15 md:col-span-1`}>
                <div className="text-white font-semibold mb-2">Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {keywords.length ? keywords.map((k,i)=> (
                    <span key={i} className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-white/15 text-white border border-white/25">{k}</span>
                  )) : <span className="text-white/60 text-sm">No keywords</span>}
                </div>
              </div>
            </div>
            {!parsed && text && (
              <div className={`${glass} ${soft3D} rounded-2xl p-4 border border-white/15 mt-4`}>
                <div className="text-white font-semibold mb-2">Raw Output</div>
                <pre className="whitespace-pre-wrap text-sm text-white/85">{text}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LoginPage({ goScan, goSignup }:{ goScan: ()=>void, goSignup: ()=>void }){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const submit = async ()=>{
    setError('')
    if(!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try{
      const res = await fetch(`${API_BASE}/api/auth/login`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
      const j = await res.json()
      if(!res.ok || j?.ok===false){
        if(res.status===401){ setError('Invalid email or password.'); return }
        throw new Error(j?.detail || 'Login failed')
      }
      localStorage.setItem('hs_token', j.token)
      localStorage.setItem('hs_user', JSON.stringify(j.user||{}))
      goScan()
    }catch(e:any){ setError(e.message || 'Login failed') }
    finally{ setLoading(false) }
  }
  return (
    <div className="mx-auto w-[min(500px,92vw)] py-10">
      <div className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
        <h2 className="text-white text-xl font-bold mb-4">Sign in</h2>
        <div className="grid gap-3">
          <input aria-label="Email" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input aria-label="Password" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`} onClick={submit} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <button className={`rounded-xl bg-white/10 px-3 py-2 border border-white/30 ${pressable}`} onClick={()=>{ window.location.href = `${API_BASE}/api/auth/google/start?next=/scan` }}>Continue with Google</button>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="text-sm text-white/70">No account? <button className="underline" onClick={goSignup}>Sign up</button></div>
        </div>
      </div>
    </div>
  )
}

function SignupPage({ goScan, goLogin }:{ goScan: ()=>void, goLogin: ()=>void }){
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const submit = async ()=>{
    setError('')
    if(!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try{
      const res = await fetch(`${API_BASE}/api/auth/signup`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, name, role:'user' }) })
      const j = await res.json()
      if(!res.ok || j?.ok===false){ throw new Error(j?.detail || 'Signup failed') }
      localStorage.setItem('hs_token', j.token)
      localStorage.setItem('hs_user', JSON.stringify(j.user||{}))
      goScan()
    }catch(e:any){ setError(e.message || 'Signup failed') }
    finally{ setLoading(false) }
  }
  return (
    <div className="mx-auto w-[min(500px,92vw)] py-10">
      <div className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
        <h2 className="text-white text-xl font-bold mb-4">Create account</h2>
        <div className="grid gap-3">
          <input aria-label="Name" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} />
          <input aria-label="Email" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input aria-label="Password" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`} onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Sign up'}</button>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="text-sm text-white/70">Already have an account? <button className="underline" onClick={goLogin}>Log in</button></div>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  const [page,setPage] = useState<'home'|'login'|'signup'|'scan'|'result'|'admin'>('home')
  const [user,setUser] = useState<any>(null)

  const pageToPath = (p: typeof page): string => {
    if (p === 'home') return '/'
    if (p === 'login') return '/login'
    if (p === 'signup') return '/signup'
    if (p === 'scan') return '/scan'
    if (p === 'result') return '/result'
    if (p === 'admin') return '/admin/tts'
    return '/'
  }
  const pathToPage = (path: string): typeof page => {
    if (path === '/login') return 'login'
    if (path === '/signup') return 'signup'
    if (path === '/scan') return 'scan'
    if (path === '/result') return 'result'
    if (path === '/admin/tts') return 'admin'
    return 'home'
  }
  const navigate = (p: typeof page) => {
    // auth guard for scan/result
    if ((p === 'scan' || p === 'result') && !localStorage.getItem('hs_token')) {
      window.history.pushState({}, '', '/login')
      setPage('login')
      return
    }
    // admin guard
    if (p === 'admin') {
      const u = JSON.parse(localStorage.getItem('hs_user')||'null')
      if (!u || (u.role !== 'admin')) { window.history.pushState({}, '', '/'); setPage('home'); return }
    }
    window.history.pushState({}, '', pageToPath(p))
    setPage(p)
  }
  // Handle OAuth return: store token from query params and redirect to desired page
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const next = params.get('next') || '/scan'
      if (token) {
        localStorage.setItem('hs_token', token)
        // best-effort: fetch claims to populate hs_user
        fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json()).then(j => {
            const claims = j?.claims || null
            if (j?.ok && claims && (claims.email || claims.name)) {
              const u = { email: claims.email, name: claims.name, role: claims.role || 'user' }
              localStorage.setItem('hs_user', JSON.stringify(u))
              setUser(u)
            }
          }).catch(() => {})
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Map next path to app page state
        if (next === '/scan') navigate('scan')
        else if (next === '/result') navigate('result')
        else navigate('home')
      } else {
        // Initial page from path with guard
        const initial = pathToPage(window.location.pathname)
        navigate(initial)
      }
    } catch {}
    const onPop = () => setPage(pathToPage(window.location.pathname))
    window.addEventListener('popstate', onPop)
    // bootstrap user
    try { const u = JSON.parse(localStorage.getItem('hs_user')||'null'); if (u) setUser(u) } catch {}
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const signOut = () => {
    localStorage.removeItem('hs_token')
    localStorage.removeItem('hs_user')
    setUser(null)
    navigate('home')
  }
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.25),transparent),radial-gradient(1200px_600px_at_100%_10%,rgba(99,102,241,0.25),transparent),linear-gradient(180deg,#0b0f1a,40%,#0b0f1a)]">
      <div className="pointer-events-none fixed inset-0"/>
      {/* Floating, draggable TTS butterfly assistant */}
      <ButterflyTTS apiBase={API_BASE} />
      {/* Agent bar to connect/disconnect the Vivek voice */}
      <AgentBar apiBase={API_BASE} />
      <Nav page={page} setPage={(p)=> navigate(p as any) } user={user} onSignOut={signOut} />
      {page==='home' && <HomePage goScan={()=> navigate(localStorage.getItem('hs_token') ? 'scan' : 'login') }/>} 
      {page==='login' && <LoginPage goScan={()=>navigate('scan')} goSignup={()=>navigate('signup')} />}
      {page==='signup' && <SignupPage goScan={()=>navigate('scan')} goLogin={()=>navigate('login')} />}
      {page==='scan' && <ScanPage goResult={()=>navigate('result')}/>} 
      {page==='result' && <ResultPage/>}
      {page==='admin' && <AdminTTS/>}
      <footer className="mx-auto mb-10 mt-16 w-[min(1200px,92vw)] text-center text-xs text-white/50">© {new Date().getFullYear()} HomeSurvey AI</footer>
    </div>
  )
}
