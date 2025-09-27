export type HeaderJSON = {
  property?: { address?: string; postcode?: string }
  survey?: { level?: number; date?: string; standard?: string }
  title?: string
}

export function bindHeader(data: HeaderJSON) {
  const title = data?.title || '–'
  const addr = data?.property?.address || '–'
  const pc = data?.property?.postcode || '–'
  const level = data?.survey?.level != null ? String(data.survey.level) : '–'
  const dateISO = data?.survey?.date || ''
  const date = dateISO ? formatDateUK(dateISO) : '–'
  const standard = data?.survey?.standard || '–'

  const ADDRESS_LINE = `${addr} • ${pc}`
  const META_LINE = `L${level} • ${date} • ${standard}`
  return { TITLE: title, ADDRESS_LINE, META_LINE }
}

export function formatDateUK(dateISO: string) {
  const d = new Date(dateISO)
  if (isNaN(d.getTime())) return dateISO || '–'
  const day = d.getDate().toString().padStart(2,'0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec']
  const mon = months[d.getMonth()] || ''
  return `${day} ${mon} ${d.getFullYear()}`
}

