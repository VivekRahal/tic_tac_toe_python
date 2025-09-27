import * as React from 'react'

type Voice = { id: string; name: string }

export default function AgentBar({ apiBase }: { apiBase: string }){
  const [voices, setVoices] = React.useState<Voice[]>([])
  const [status, setStatus] = React.useState<'disconnected'|'connecting'|'connected'|'notfound'>('disconnected')
  const [agent, setAgent] = React.useState<Voice | null>(null)

  React.useEffect(() => {
    let mounted = true
    fetch(`${apiBase}/api/tts/voices`).then(async r => {
      if (!r.ok) return
      const j = await r.json().catch(()=>null)
      const list = Array.isArray(j?.voices) ? j.voices as any[] : []
      const mapped = list.map(v => ({ id: String(v.voice_id||''), name: String(v.name||'') })).filter(v => v.id && v.name)
      if (!mounted) return
      setVoices(mapped)
      const vivek = mapped.find(v => v.name.toLowerCase().includes('vivek')) || null
      setAgent(vivek)
      if (!vivek) setStatus('notfound')
    }).catch(()=>{})
    return () => { mounted = false }
  }, [apiBase])

  const connect = () => {
    if (!agent) { setStatus('notfound'); return }
    setStatus('connecting')
    // Tell the butterfly to switch to Vivek voice
    window.dispatchEvent(new CustomEvent('hs_tts_set_voice', { detail: { voice_id: agent.id, voice_name: agent.name } }))
    // Small delay to show connecting status
    setTimeout(() => setStatus('connected'), 300)
  }

  const disconnect = () => {
    setStatus('disconnected')
    // Optionally clear the voice back to default (name only; butterfly resolves)
    window.dispatchEvent(new CustomEvent('hs_tts_set_voice', { detail: { voice_id: '', voice_name: '' } }))
  }

  const dotCls = status === 'connected' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : status === 'notfound' ? 'bg-rose-400' : 'bg-white/40'
  const label = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : status === 'notfound' ? 'Vivek voice not found' : 'Disconnected'

  return (
    <div className="fixed top-3 right-3 z-40">
      <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white px-3 py-2 shadow-lg flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
        <div className="text-sm font-semibold">Agent: Vivek</div>
        <div className="text-xs opacity-80">{label}</div>
        {status !== 'connected' && status !== 'notfound' && (
          <button onClick={connect} className="ml-2 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs hover:bg-white/15">Connect</button>
        )}
        {status === 'connected' && (
          <button onClick={disconnect} className="ml-2 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs hover:bg-white/15">Disconnect</button>
        )}
      </div>
    </div>
  )
}

