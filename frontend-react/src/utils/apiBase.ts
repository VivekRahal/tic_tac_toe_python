export const resolveApiBase = (fallback = ''): string => {
  const raw = (import.meta as any)?.env?.VITE_API_BASE
  return typeof raw === 'string' ? raw : fallback
}
