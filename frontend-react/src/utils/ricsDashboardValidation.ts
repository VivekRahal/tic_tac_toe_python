import { RICSDashboardCase, RICSDashboardCost, RICSDashboardData, RICSDashboardLevel1Rating } from '../types/ricsDashboard'

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonEmptyString)

const isCostArray = (value: unknown): value is RICSDashboardCost[] =>
  Array.isArray(value) && value.every((item) =>
    item && typeof item === 'object' &&
    isNonEmptyString((item as any).item) &&
    typeof (item as any).min === 'number' && (item as any).min >= 0 &&
    typeof (item as any).max === 'number' && (item as any).max >= 0
  )

const isLevel1Ratings = (value: unknown): value is RICSDashboardLevel1Rating[] =>
  Array.isArray(value) && value.every((item) =>
    item && typeof item === 'object' &&
    isNonEmptyString((item as any).element) &&
    typeof (item as any).rating === 'number' && (item as any).rating >= 1 && (item as any).rating <= 3 &&
    isNonEmptyString((item as any).note)
  )

const isCase = (value: unknown): value is RICSDashboardCase => {
  if (!value || typeof value !== 'object') return false
  const data = value as any
  if (!isNonEmptyString(data.id)) return false
  if (!isNonEmptyString(data.title)) return false
  if (!isNonEmptyString(data.address)) return false
  if (!isNonEmptyString(data.imageUrl)) return false
  if (!data.verdict || typeof data.verdict !== 'object') return false
  const { condition, risk, stance } = data.verdict
  if (![condition, risk, stance].every(isNonEmptyString)) return false
  if (!isStringArray(data.highlights)) return false
  if (!isStringArray(data.likelyCauses)) return false
  if (!data.level1 || typeof data.level1 !== 'object') return false
  if (!isLevel1Ratings(data.level1.ratings)) return false
  if (!isNonEmptyString(data.level1.advice)) return false
  if (!data.level2 || typeof data.level2 !== 'object') return false
  if (!isStringArray(data.level2.investigations)) return false
  if (!isStringArray(data.level2.remediation)) return false
  if (!data.level3 || typeof data.level3 !== 'object') return false
  if (!isStringArray(data.level3.intrusive)) return false
  if (!isStringArray(data.level3.risks)) return false
  if (!isCostArray(data.level3.heavyCosts)) return false
  if (!isCostArray(data.costs)) return false
  if (!isStringArray(data.checklist)) return false
  if (!isNonEmptyString(data.allowance)) return false
  return true
}

export const isValidRicsDashboardData = (value: unknown): value is RICSDashboardData => {
  if (!value || typeof value !== 'object') return false
  const data = value as any
  if (!Array.isArray(data.cases)) return false
  return data.cases.every(isCase)
}
