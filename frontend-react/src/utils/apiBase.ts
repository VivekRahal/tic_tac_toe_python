export const resolveApiBase = (fallback = 'http://localhost:8000'): string => {
  const raw = (import.meta as any)?.env?.VITE_API_BASE
  return typeof raw === 'string' ? raw : fallback
}

