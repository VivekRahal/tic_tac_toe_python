import * as React from 'react'

type Ctx = {
  value: string,
  setValue: (v: string)=>void
}
const TabsCtx = React.createContext<Ctx | null>(null)

export function Tabs({ defaultValue, value, onValueChange, className='', children }:{ defaultValue?: string, value?: string, onValueChange?: (v:string)=>void, className?: string, children: React.ReactNode }){
  const [inner, setInner] = React.useState(defaultValue || '')
  const val = value !== undefined ? value : inner
  const setVal = (v: string)=> { setInner(v); onValueChange?.(v) }
  return <TabsCtx.Provider value={{ value: val, setValue: setVal }}>
    <div className={className}>{children}</div>
  </TabsCtx.Provider>
}

export function TabsList({ className='', children }:{ className?: string, children: React.ReactNode }){
  return <div className={`inline-flex gap-2 p-1 ${className}`}>{children}</div>
}

export function TabsTrigger({ value, className='', children }:{ value: string, className?: string, children: React.ReactNode }){
  const ctx = React.useContext(TabsCtx)!
  const active = ctx.value === value
  return <button className={`px-3 py-2 rounded-xl text-sm ${active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'} ${className}`} onClick={()=>ctx.setValue(value)}>{children}</button>
}

export function TabsContent({ value, className='', children }:{ value: string, className?: string, children: React.ReactNode }){
  const ctx = React.useContext(TabsCtx)!
  if (ctx.value !== value) return null
  return <div className={className}>{children}</div>
}

