import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Image, Loader2, RefreshCcw, Sparkles } from 'lucide-react'
import { deriveUserId, getCurrentUserId, getUserScopedItem, setUserScopedItem } from '../utils/userScopedStorage'
import { resolveApiBase } from '../utils/apiBase'

type HistoryItem = {
  id: string
  question_id?: string
  model?: string
  images_count?: number
  created_at?: string | null
  preview_image?: string | null
}

type ScanEnvelope = {
  scan_id: string
  question_id?: string
  model?: string
  provider?: string
  created_at?: string | null
  results: Array<Record<string, any>>
  raws: string[]
  raw?: string
  structured?: Record<string, any> | null
  property?: Record<string, any> | null
  survey?: Record<string, any> | null
  preview_image?: string
}

const API_BASE = resolveApiBase()
const previewStorageKey = (scanId: string) => `hs_scan_preview_${scanId}`

const HistoryPage: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => (typeof window === 'undefined' ? '' : getCurrentUserId()))
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState('')
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({})
  const previewImagesRef = useRef<Record<string, string>>({})
  useEffect(() => {
    previewImagesRef.current = previewImages
  }, [previewImages])
  const pendingPreviewIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    pendingPreviewIds.current.clear()
    previewImagesRef.current = {}
    setPreviewImages({})
  }, [userId])

  const normalizePreviewUrl = useCallback((value: string): string => {
    const trimmed = (value || '').trim()
    if (!trimmed) return ''
    if (/^(data:|https?:|blob:)/i.test(trimmed)) return trimmed
    if (trimmed.startsWith('//')) return trimmed
    const base = API_BASE.replace(/\/$/, '')
    if (trimmed.startsWith('/')) return `${base}${trimmed}`
    if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return `${base}/${trimmed.replace(/^[.\/]+/, '')}`
    }
    return `${base}/${trimmed.replace(/^\/+/, '')}`
  }, [])

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return 'Unknown time'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }, [])

  const leadImageFromResults = useCallback((results: Array<Record<string, any>>): string => {
    if (!Array.isArray(results)) return ''
    const withUrl = results.find((result) => {
      const url = typeof result?.image_url === 'string' ? result.image_url : ''
      return url.trim().length > 0
    })
    return typeof withUrl?.image_url === 'string' ? withUrl.image_url : ''
  }, [])

  const hydrateEnvelope = useCallback((scan: Record<string, any>): ScanEnvelope => {
    const results = Array.isArray(scan?.results) ? scan.results : []
    const raws = results.map((result) => {
      const response = typeof result?.response === 'string' ? result.response : ''
      return response.trim()
    }).filter(Boolean)
    const leadImage = leadImageFromResults(results)
    const previewCandidate = typeof scan?.preview_image === 'string' && scan.preview_image
      ? scan.preview_image
      : leadImage
    const normalizedPreview = normalizePreviewUrl(previewCandidate || '')
    return {
      scan_id: String(scan?.id || ''),
      question_id: scan?.question_id,
      model: scan?.model,
      provider: scan?.provider,
      created_at: scan?.created_at,
      results,
      raws,
      raw: typeof scan?.raw_text === 'string' ? scan.raw_text : '',
      structured: scan?.structured || null,
      property: scan?.property || null,
      survey: scan?.survey || null,
      preview_image: normalizedPreview
    }
  }, [leadImageFromResults, normalizePreviewUrl])

  const fetchScans = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('hs_token')
      const activeUser = userId || getCurrentUserId()
      if (!token || !activeUser) {
        setError('Please sign in to view your history.')
        setItems([])
        return
      }
      const response = await fetch(`${API_BASE}/api/scans`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.ok) {
        const message = json?.error || 'Failed to load history'
        throw new Error(message)
      }
      const next = Array.isArray(json.items) ? json.items : []
      const previewMap: Record<string, string> = {}
      const mapped = next
        .map((item: any): HistoryItem | null => {
          const id = typeof item?.id === 'string' ? item.id : ''
          if (!id) return null
          const previewRaw = typeof item?.preview_image === 'string' ? item.preview_image : ''
          const normalizedPreview = previewRaw ? normalizePreviewUrl(previewRaw) : ''
          if (normalizedPreview) {
            previewMap[id] = normalizedPreview
            setUserScopedItem(previewStorageKey(id), normalizedPreview, activeUser)
          }
          return {
            id,
            question_id: typeof item?.question_id === 'string' ? item.question_id : undefined,
            model: typeof item?.model === 'string' ? item.model : undefined,
            images_count: typeof item?.images_count === 'number' ? item.images_count : undefined,
            created_at: typeof item?.created_at === 'string' ? item.created_at : null,
            preview_image: normalizedPreview || undefined,
          }
        })
        .filter((item: HistoryItem | null): item is HistoryItem => Boolean(item))
      setItems(mapped)
      if (Object.keys(previewMap).length) {
        previewImagesRef.current = { ...previewImagesRef.current, ...previewMap }
        setPreviewImages((prev) => ({ ...prev, ...previewMap }))
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load history')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [normalizePreviewUrl, userId])

  const loadPreview = useCallback(async (scanId: string, uid: string) => {
    if (!scanId || !uid) return
    if (previewImagesRef.current[scanId]) return
    if (pendingPreviewIds.current.has(scanId)) return

    const cached = getUserScopedItem(previewStorageKey(scanId), uid)
    if (cached) {
      const normalized = normalizePreviewUrl(cached)
      if (normalized) {
        previewImagesRef.current[scanId] = normalized
        setPreviewImages((prev) => ({ ...prev, [scanId]: normalized }))
        return
      }
    }

    const token = localStorage.getItem('hs_token')
    if (!token) return
    pendingPreviewIds.current.add(scanId)
    try {
      const response = await fetch(`${API_BASE}/api/scans/${scanId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.ok || !json?.scan) return
      const envelope = hydrateEnvelope(json.scan)
      if (envelope.preview_image) {
        previewImagesRef.current[scanId] = envelope.preview_image
        setPreviewImages((prev) => ({ ...prev, [scanId]: envelope.preview_image }))
        setUserScopedItem(previewStorageKey(scanId), envelope.preview_image, uid)
      }
    } catch {
      /* ignore preview fetch errors */
    } finally {
      pendingPreviewIds.current.delete(scanId)
    }
  }, [hydrateEnvelope, normalizePreviewUrl])

  const persistEnvelopeForUser = useCallback((envelope: ScanEnvelope, uid: string) => {
    const scoped = { ...envelope, user_id: uid }
    if (scoped.preview_image) {
      scoped.preview_image = normalizePreviewUrl(scoped.preview_image)
    }
    try {
      setUserScopedItem('hs_last_envelope', JSON.stringify(scoped), uid)
      if (scoped.preview_image) {
        setUserScopedItem('hs_last_image', scoped.preview_image, uid)
        setUserScopedItem('hs_last_image_b64', scoped.preview_image, uid)
        setUserScopedItem(previewStorageKey(scoped.scan_id), scoped.preview_image, uid)
      }
    } catch {
      /* ignore storage limitations */
    }
    if (scoped.preview_image) {
      previewImagesRef.current[scoped.scan_id] = scoped.preview_image
      setPreviewImages((prev) => ({ ...prev, [scoped.scan_id]: scoped.preview_image }))
    }
  }, [normalizePreviewUrl])

  const openScan = useCallback(async (id: string) => {
    if (!id || openingId === id) return
    const activeUser = userId || getCurrentUserId()
    if (!activeUser) {
      setOpenError('Please sign in to open a scan.')
      return
    }
    setOpeningId(id)
    setOpenError('')
    try {
      const token = localStorage.getItem('hs_token')
      if (!token) throw new Error('Please sign in to open a scan.')
      const response = await fetch(`${API_BASE}/api/scans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.ok || !json?.scan) {
        const message = json?.error || 'Failed to open scan'
        throw new Error(message)
      }
      const envelope = hydrateEnvelope(json.scan)
      if (!envelope.scan_id) throw new Error('Scan record is incomplete.')
      persistEnvelopeForUser(envelope, activeUser)
      window.dispatchEvent(new CustomEvent('hs_envelope_updated', { detail: { ...envelope, user_id: activeUser } }))
      window.history.pushState({}, '', '/scan')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      setOpenError((err as Error).message || 'Failed to open scan')
    } finally {
      setOpeningId(null)
    }
  }, [hydrateEnvelope, openingId, persistEnvelopeForUser, userId])

  useEffect(() => {
    fetchScans()
  }, [fetchScans])

  useEffect(() => {
    if (!userId) return
    items.forEach((item) => {
      if (!item.id) return
      loadPreview(item.id, userId)
    })
  }, [items, userId, loadPreview])

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: any }>).detail
      if (detail && Object.prototype.hasOwnProperty.call(detail, 'user')) {
        const derived = deriveUserId(detail.user)
        setUserId(derived)
        setItems([])
        setError('')
        return
      }
      setUserId(getCurrentUserId())
      setItems([])
      setError('')
    }
    window.addEventListener('hs_user_updated', handleUserUpdated as EventListener)
    return () => window.removeEventListener('hs_user_updated', handleUserUpdated as EventListener)
  }, [])

  const summary = useMemo(() => {
    if (!items.length) return 'No scans yet. Run a Quick Scan to get started.'
    if (items.length === 1) return 'You have 1 saved scan.'
    return `You have ${items.length} saved scans.`
  }, [items])

  return (
    <div className="relative mx-auto w-[min(1100px,92vw)] py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(147,197,253,0.18),transparent_70%),radial-gradient(circle_at_88%_120%,rgba(192,132,252,0.18),transparent_68%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))]" />
      <div className="relative space-y-6">
        <div className="overflow-hidden rounded-[36px] border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_50px_120px_rgba(15,23,42,0.5)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="grid gap-6 p-8 md:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70">
                <Sparkles className="h-4 w-4" />
                Scan History
              </div>
              <h1 className="font-['Orbitron'] text-3xl uppercase tracking-[0.45em] text-white/90 md:text-4xl">
                Your Timeline
              </h1>
              <p className="text-sm text-white/70 md:text-base">
                Every property scan you run is stored here. Open any entry to revisit the analysis instantly.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 text-sm text-white/80 shadow-[0_30px_80px_rgba(14,23,42,0.45)]">
              <div className="flex items-center gap-3 text-white/70">
                <Clock className="h-5 w-5" />
                Latest status
              </div>
              <div className="mt-4 text-lg font-semibold text-white/90">
                {loading ? 'Loading…' : summary}
              </div>
              <button
                type="button"
                onClick={fetchScans}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:border-white/40 hover:bg-white/20"
                disabled={loading}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200 shadow-[0_30px_80px_rgba(127,29,29,0.25)]">
            {error}
          </div>
        )}

        {openError && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-100 shadow-[0_26px_70px_rgba(217,119,6,0.25)]">
            {openError}
          </div>
        )}

        <div className="grid gap-4">
          {loading && (
            <div className="flex items-center justify-center rounded-[32px] border border-white/15 bg-white/5 py-16 text-white/70 shadow-[0_40px_100px_rgba(15,23,42,0.45)]">
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              Loading your scans…
            </div>
          )}
          {!loading && !items.length && !error && (
            <div className="rounded-[32px] border border-white/15 bg-white/5 p-10 text-center text-white/70 shadow-[0_40px_100px_rgba(15,23,42,0.45)]">
              <p>No scans yet. Run a Quick Scan to populate your history.</p>
            </div>
          )}
          {!loading && items.map((item) => {
            const isOpening = openingId === item.id
            const previewSrc = previewImages[item.id]
            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-[30px] border border-white/15 bg-white/8 px-6 py-5 text-white shadow-[0_40px_100px_rgba(15,23,42,0.45)] transition hover:border-white/30 hover:bg-white/12"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.25),transparent_60%)] opacity-20" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-[0_24px_60px_rgba(15,23,42,0.45)] md:h-28 md:w-44">
                      {previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="Scan preview"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/60">
                          <Image className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm uppercase tracking-[0.35em] text-white/60">
                        {item.question_id || 'rics_single_image'}
                      </div>
                      <div className="text-lg font-semibold text-white/90">
                        {formatDate(item.created_at)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                        {item.model && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            {item.model}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                          <Image className="h-3.5 w-3.5" />
                          {item.images_count ?? 0} image{(item.images_count ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-center">
                    <button
                      type="button"
                      onClick={() => openScan(item.id)}
                      disabled={isOpening}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-[0_30px_80px_rgba(56,189,248,0.35)] transition hover:shadow-[0_34px_90px_rgba(56,189,248,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                      Open
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
