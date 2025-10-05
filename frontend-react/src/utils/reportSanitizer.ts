export type Rating = {
  element: string
  rating: number
  note: string
}

export type Cost = {
  item: string
  min: number
  max: number
}

export type Verdict = {
  condition: string
  risk: string
  stance: string
}

export type Level1 = {
  ratings: Rating[]
  advice: string
}

export type Level2 = {
  investigations: string[]
  remediation: string[]
}

export type Level3 = {
  intrusive: string[]
  risks: string[]
  heavyCosts: Cost[]
}

export type ReportData = {
  id: string
  title: string
  address: string
  imageUrl: string
  property?: {
    address?: string
    city?: string
    postcode?: string
  }
  verdict: Verdict
  highlights: string[]
  likelyCauses: string[]
  level1: Level1
  level2: Level2
  level3: Level3
  costs: Cost[]
  checklist: string[]
  allowance: string
}

type RawRecord = Record<string, unknown>

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const ensureString = (input: unknown): string => (typeof input === 'string' ? input.trim() : '')

const ensureNumber = (input: unknown): number => {
  const num = Number(input)
  return Number.isFinite(num) ? num : 0
}

const ensureStringArray = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => ensureString(item))
    .filter((value) => value.length > 0)
}

const ensureRatings = (input: unknown): Rating[] => {
  if (!Array.isArray(input)) return []
  return input.map((entry, index) => {
    const src: RawRecord = typeof entry === 'object' && entry !== null ? (entry as RawRecord) : {}
    const rating = clamp(Math.round(ensureNumber(src.rating)), 0, 5)
    return {
      element: ensureString(src.element) || `Element ${index + 1}`,
      rating,
      note: ensureString(src.note),
    }
  })
}

const ensureCosts = (input: unknown): Cost[] => {
  if (!Array.isArray(input)) return []
  return input
    .map((entry) => {
      const src: RawRecord = typeof entry === 'object' && entry !== null ? (entry as RawRecord) : {}
      const item = ensureString(src.item)
      if (!item) return null
      return {
        item,
        min: ensureNumber(src.min),
        max: ensureNumber(src.max),
      }
    })
    .filter((entry): entry is Cost => Boolean(entry))
}

export const sanitizeReportData = (input: unknown): ReportData => {
  const src: RawRecord = typeof input === 'object' && input !== null ? (input as RawRecord) : {}
  const verdictSrc: RawRecord = typeof src.verdict === 'object' && src.verdict !== null ? (src.verdict as RawRecord) : {}
  const level1Src: RawRecord = typeof src.level1 === 'object' && src.level1 !== null ? (src.level1 as RawRecord) : {}
  const level2Src: RawRecord = typeof src.level2 === 'object' && src.level2 !== null ? (src.level2 as RawRecord) : {}
  const level3Src: RawRecord = typeof src.level3 === 'object' && src.level3 !== null ? (src.level3 as RawRecord) : {}
  const propertySrc: RawRecord = typeof src.property === 'object' && src.property !== null ? (src.property as RawRecord) : {}

  const property = {
    address: ensureString(propertySrc.address),
    city: ensureString(propertySrc.city),
    postcode: ensureString(propertySrc.postcode),
  }
  const hasProperty = Object.values(property).some((value) => value.length > 0)

  return {
    id: ensureString(src.id) || '–',
    title: ensureString(src.title) || 'Inspection Report',
    address: ensureString(src.address) || '–',
    imageUrl: ensureString(src.imageUrl),
    property: hasProperty ? property : undefined,
    verdict: {
      condition: ensureString(verdictSrc.condition) || 'Unknown',
      risk: ensureString(verdictSrc.risk) || 'Unknown',
      stance: ensureString(verdictSrc.stance) || 'Further investigation recommended',
    },
    highlights: ensureStringArray(src.highlights),
    likelyCauses: ensureStringArray(src.likelyCauses),
    level1: {
      ratings: ensureRatings(level1Src.ratings),
      advice: ensureString(level1Src.advice),
    },
    level2: {
      investigations: ensureStringArray(level2Src.investigations),
      remediation: ensureStringArray(level2Src.remediation),
    },
    level3: {
      intrusive: ensureStringArray(level3Src.intrusive),
      risks: ensureStringArray(level3Src.risks),
      heavyCosts: ensureCosts(level3Src.heavyCosts),
    },
    costs: ensureCosts(src.costs),
    checklist: ensureStringArray(src.checklist),
    allowance: ensureString(src.allowance),
  }
}
