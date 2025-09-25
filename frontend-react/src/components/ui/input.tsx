import * as React from 'react'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input ref={ref} className={`rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2 ${className}`} {...props} />
  )
)
Input.displayName = 'Input'

