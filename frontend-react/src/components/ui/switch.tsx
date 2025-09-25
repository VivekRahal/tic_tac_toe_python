import * as React from 'react'

export function Switch({ checked, onCheckedChange }:{ checked?: boolean, onCheckedChange?: (v:boolean)=>void }){
  const [val,setVal] = React.useState(!!checked)
  React.useEffect(()=>{ if(checked!==undefined) setVal(!!checked) },[checked])
  const toggle = ()=> { const v = !val; setVal(v); onCheckedChange?.(v) }
  return (
    <button onClick={toggle} className={`w-11 h-6 rounded-full border border-white/30 ${val ? 'bg-emerald-500/60' : 'bg-white/10'}`}>
      <span className={`block w-5 h-5 bg-white rounded-full transition-transform translate-y-[2px] ${val ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}/>
    </button>
  )
}

