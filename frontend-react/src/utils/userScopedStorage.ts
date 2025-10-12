type AnyUser = { id?: string; _id?: string; email?: string | null | undefined }

const cleanup = (value: string | null): string | null => {
  if (typeof value !== 'string') return null
  return value
}

export const deriveUserId = (user: AnyUser | null | undefined): string => {
  if (!user || typeof user !== 'object') return ''
  if (typeof user.id === 'string' && user.id.trim()) return user.id.trim()
  if (typeof (user as AnyUser)._id === 'string' && (user as AnyUser)._id?.trim()) {
    return (user as AnyUser)._id!.trim()
  }
  if (typeof user.email === 'string' && user.email.trim()) {
    return user.email.trim().toLowerCase()
  }
  return ''
}

export const getCurrentUser = (): AnyUser | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('hs_user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const getCurrentUserId = (): string => {
  return deriveUserId(getCurrentUser())
}

export const getUserScopedKey = (base: string, userId?: string): string => {
  const trimmedBase = base.trim()
  if (!userId || !userId.trim()) return trimmedBase
  return `${trimmedBase}__${userId.trim()}`
}

export const getUserScopedItem = (base: string, userId?: string): string | null => {
  if (typeof window === 'undefined') return null
  const uid = userId ?? getCurrentUserId()
  const scopedKey = getUserScopedKey(base, uid)
  try {
    const scoped = cleanup(window.localStorage.getItem(scopedKey))
    if (scoped !== null) return scoped
    const fallback = cleanup(window.localStorage.getItem(base))
    if (fallback !== null && scopedKey !== base) {
      try {
        window.localStorage.setItem(scopedKey, fallback)
        window.localStorage.removeItem(base)
      } catch {
        /* ignore storage quota issues */
      }
      return fallback
    }
    return fallback
  } catch {
    return null
  }
}

export const setUserScopedItem = (base: string, value: string, userId?: string): void => {
  if (typeof window === 'undefined') return
  const uid = userId ?? getCurrentUserId()
  const scopedKey = getUserScopedKey(base, uid)
  try {
    window.localStorage.setItem(scopedKey, value)
    if (scopedKey !== base) {
      try {
        window.localStorage.removeItem(base)
      } catch {
        /* ignore storage quota issues */
      }
    }
  } catch {
    /* ignore storage quota issues */
  }
}

export const removeUserScopedItem = (base: string, userId?: string): void => {
  if (typeof window === 'undefined') return
  const uid = userId ?? getCurrentUserId()
  const scopedKey = getUserScopedKey(base, uid)
  try {
    window.localStorage.removeItem(scopedKey)
  } catch {
    /* ignore storage quota issues */
  }
}

