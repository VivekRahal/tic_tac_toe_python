import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Image as ImageIcon, ListChecks, ArrowRight, ShieldCheck, Droplets, FileText, Home, Sparkles } from 'lucide-react'

const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000'

const pressable = 'pressable'
const glass = 'glass'
const soft3D = 'soft3d'

function Nav({ page, setPage }: { page: string, setPage: (p: string)=>void }) {
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
          <div className="flex items-center gap-2">
            <NavButton icon={<Home className="h-4 w-4"/>} label="Home" active={page==='home'} onClick={()=>setPage('home')} />
            <NavButton icon={<Camera className="h-4 w-4"/>} label="Scan" active={page==='scan'} onClick={()=>setPage('scan')} />
            <NavButton icon={<ListChecks className="h-4 w-4"/>} label="Results" active={page==='result'} onClick={()=>setPage('result')} />
            <button
              className={`ml-2 rounded-xl bg-white/20 px-3 py-2 text-sm ${pressable}`}
              onClick={() => {
                window.location.href = `${API_BASE}/api/auth/google/start?next=/scan`
              }}
            >
              Sign in
            </button>
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
  const [questionId,setQuestionId] = useState<string>('rics_analyze')
  const [loading,setLoading] = useState(false)

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
      const res = await fetch(`${API_BASE}/api/scan`, { method:'POST', body: fd, headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if(!res.ok || j?.ok===false) throw new Error(j?.detail || j?.error || 'Scan failed')
      localStorage.setItem('hs_last_envelope', JSON.stringify(j))
      goResult()
    }catch(e){ alert((e as Error).message) }
    finally{ setLoading(false) }
  }

  return (
    <div className="mx-auto w-[min(1200px,92vw)] py-8 md:py-12 grid gap-6 md:grid-cols-3">
      <div className={`md:col-span-1 space-y-6 ${glass} ${soft3D} rounded-3xl p-6`}>
        <h2 className="text-white text-xl font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5"/> Settings</h2>
        <div className="space-y-3 text-white/90">
          <label className="block text-sm">Question
            <select value={questionId} onChange={e=>setQuestionId(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2">
              <option value="rics_analyze">rics_analyze</option>
              <option value="rics_single_image">rics_single_image</option>
              <option value="general">general</option>
            </select>
          </label>
          <label className="block text-sm">Engine
            <select value={provider} onChange={e=>setProvider(e.target.value as any)} className="mt-1 w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2">
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
  const env = useMemo(()=>{
    try{ return JSON.parse(localStorage.getItem('hs_last_envelope')||'{}') }catch{ return {} }
  },[])
  const text: string = Array.isArray(env?.raws) ? (env.raws[0]||'') : (env?.raw||'')
  const model: string = env?.model || ''
  const provider: string = env?.provider || ''
  return (
    <div className="mx-auto w-[min(1200px,92vw)] py-8 md:py-12 grid gap-6 md:grid-cols-2">
      <div className={`${glass} ${soft3D} rounded-3xl p-6`}>
        <h2 className="text-white text-xl font-bold">Analysis (engine: {provider} – {model})</h2>
        <pre className="mt-3 whitespace-pre-wrap text-sm text-white/90">{text || 'No result'}</pre>
      </div>
      <div className={`${glass} ${soft3D} rounded-3xl p-6 grid place-items-center`}>
        <div className="orb"/>
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
  const [page,setPage] = useState<'home'|'login'|'signup'|'scan'|'result'>('home')
  // Handle OAuth return: store token from query params and redirect to desired page
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const next = params.get('next') || '/scan'
      if (token) {
        localStorage.setItem('hs_token', token)
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Map next path to app page state
        if (next === '/scan') setPage('scan')
        else if (next === '/result') setPage('result')
        else setPage('home')
      } else {
        // If user lands on /login without token, keep home
        if (window.location.pathname === '/login') setPage('home')
      }
    } catch {}
  }, [])
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.25),transparent),radial-gradient(1200px_600px_at_100%_10%,rgba(99,102,241,0.25),transparent),linear-gradient(180deg,#0b0f1a,40%,#0b0f1a)]">
      <div className="pointer-events-none fixed inset-0"/>
      <Nav page={page} setPage={(p)=>{
        if(p==='scan' && !localStorage.getItem('hs_token')) { setPage('login'); return }
        setPage(p as any)
      }}/>
      {page==='home' && <HomePage goScan={()=> setPage(localStorage.getItem('hs_token') ? 'scan' : 'login') }/>} 
      {page==='login' && <LoginPage goScan={()=>setPage('scan')} goSignup={()=>setPage('signup')} />}
      {page==='signup' && <SignupPage goScan={()=>setPage('scan')} goLogin={()=>setPage('login')} />}
      {page==='scan' && <ScanPage goResult={()=>setPage('result')}/>} 
      {page==='result' && <ResultPage/>}
      <footer className="mx-auto mb-10 mt-16 w-[min(1200px,92vw)] text-center text-xs text-white/50">© {new Date().getFullYear()} HomeSurvey AI</footer>
    </div>
  )
}
