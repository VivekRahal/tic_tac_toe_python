import * as React from 'react'
import { Home as HomeIcon, MapPin } from 'lucide-react'

export type AddressHeaderProps = {
  title: string
  address: string
  postcode: string
  level: 1|2|3
  dateISO: string
  standard: string
  compact?: boolean
  cream?: boolean
}

// Tailwind, dark-glass compatible header block with an optional cream variant for print/heritage feel.
export function AddressHeader({
  title,
  address,
  postcode,
  level,
  dateISO,
  standard,
  compact = true,
  cream = false,
}: AddressHeaderProps) {
  const date = new Date(dateISO)
  const formatted = isNaN(date.getTime()) ? dateISO : formatDateUK(date)

  const container = [
    'rounded-xl print:rounded-none',
    'border', cream ? 'border-stone-200' : 'border-white/20',
    cream ? 'bg-stone-50 text-slate-900' : 'bg-white/10 text-white',
    'shadow-sm print:shadow-none',
    'print:bg-white',
    compact ? 'px-3 py-2' : 'px-4 py-3',
  ].join(' ')

  const titleCls = [
    'font-extrabold truncate',
    compact ? 'text-base' : 'text-lg',
  ].join(' ')

  const sublineCls = [
    'flex items-center gap-1 text-sm truncate',
    cream ? 'text-slate-700' : 'text-white/85',
  ].join(' ')

  const metaCls = [
    'text-xs', cream ? 'text-slate-600' : 'text-white/70',
  ].join(' ')

  // Build fixed heading: "Residential Survey – ADDRESS, CITY" (address uppercased for emphasis)
  const fixedHeading = `Residential Survey – ${((address || title || '–')).toUpperCase()}`

  return (
    <div className={container} aria-label="Survey header">
      <div className="flex items-start gap-3">
        <div className={cream ? 'text-slate-500' : 'text-white/80'} aria-hidden="true">
          <HomeIcon size={20} />
        </div>
        <div className="min-w-0">
          <div className={titleCls} title={fixedHeading}>{fixedHeading}</div>
          <div className={sublineCls} title={`${address} • ${postcode}`}>
            <MapPin className={cream ? 'text-slate-600' : 'text-white/70'} size={14} />
            <span className="truncate max-w-[80vw] md:max-w-[640px]">{address || '–'} • {postcode || '–'}</span>
          </div>
          <div className={metaCls}>L{level || '–'} • {formatted || '–'} • {standard || '–'}</div>
        </div>
      </div>
    </div>
  )
}

function formatDateUK(d: Date) {
  // 25 Sept 2025
  const day = d.getDate().toString().padStart(2,'0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec']
  const mon = months[d.getMonth()] || ''
  return `${day} ${mon} ${d.getFullYear()}`
}

export default AddressHeader

/*
Example usage:

<AddressHeader
  title='Residential Survey – 12 Elm Street, Norwich'
  address='12 Elm Street, Norwich'
  postcode='NR2 1AB'
  level={2}
  dateISO='2025-09-25'
  standard='RICS Home Survey Standard 2020 (rev. 2024)'
  compact
  cream={false}
/>
*/
