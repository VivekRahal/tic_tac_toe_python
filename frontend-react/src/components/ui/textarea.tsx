import * as React from 'react'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => (
    <textarea ref={ref} className={`rounded-2xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2 ${className}`} {...props} />
  )
)
Textarea.displayName = 'Textarea'

