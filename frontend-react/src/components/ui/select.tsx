import * as React from 'react'

type Item = { value: string, label: React.ReactNode }
type Ctx = {
  items: Item[]
  register: (it: Item)=>void
  value?: string
  setValue: (v: string)=>void
}
const SelectCtx = React.createContext<Ctx | null>(null)

export function Select({ defaultValue, value, onValueChange, children }:{ defaultValue?: string, value?: string, onValueChange?: (v:string)=>void, children: React.ReactNode }){
  const [items,setItems] = React.useState<Item[]>([])
  const [inner,setInner] = React.useState(defaultValue)
  const val = value !== undefined ? value : inner
  const setVal = (v:string)=> { setInner(v); onValueChange?.(v) }
  const register = (it: Item)=> setItems(prev => prev.some(p=>p.value===it.value) ? prev : [...prev, it])
  return <SelectCtx.Provider value={{ items, register, value: val, setValue: setVal }}>{children}</SelectCtx.Provider>
}

export function SelectTrigger({ className='', children }:{ className?: string, children?: React.ReactNode }){
  const ctx = React.useContext(SelectCtx)!
  return (
    <div className={className}>
      <select className="w-full rounded-xl bg-white/10 text-white border border-white/20 px-3 py-2"
        value={ctx.value}
        onChange={e=>ctx.setValue(e.target.value)}>
        {ctx.items.map(it => <option key={it.value} value={it.value}>{String(it.label)}</option>)}
      </select>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }:{ placeholder?: string }){
  return <span className="sr-only">{placeholder}</span>
}

export function SelectContent({ className='', children }:{ className?: string, children: React.ReactNode }){
  return <div className={className} hidden>{children}</div>
}

export function SelectItem({ value, children }:{ value: string, children: React.ReactNode }){
  const ctx = React.useContext(SelectCtx)!
  React.useEffect(()=>{ ctx.register({ value, label: children }) }, [value, children])
  return null
}

