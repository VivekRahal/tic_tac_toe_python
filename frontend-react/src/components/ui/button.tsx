import * as React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default'|'secondary'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-xl transition-colors'
    const style = variant === 'secondary'
      ? 'bg-white/15 text-white hover:bg-white/25 border border-white/30'
      : 'bg-white/20 text-white hover:bg-white/30'
    return <button ref={ref} className={`${base} ${style} ${className}`} {...props} />
  }
)
Button.displayName = 'Button'

