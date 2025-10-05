import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Moon, Sun, Home, GripVertical, Dock, Maximize2, X, PanelsTopLeft } from 'lucide-react'
import { clamp, sanitizeReportData, type Cost, type Rating, type ReportData } from '../utils/reportSanitizer'

const riskToScore = (risk: string): number => {
  const value = risk.toLowerCase()
  if (value.includes('high')) return 85
  if (value.includes('medium') || value.includes('moderate')) return 50
  if (value.includes('low')) return 25
  return 40
}

const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000'

const InspectionReport: React.FC = () => {
  const [showUpload, setShowUpload] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [jsonInput, setJsonInput] = useState('')
  const [cachedJson, setCachedJson] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const isLight = theme === 'light'
  const hasAutoLoaded = useRef(false)
  const [fallbackImage, setFallbackImage] = useState('')

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const rememberReport = useCallback((data: ReportData) => {
    const pretty = JSON.stringify(data, null, 2)
    setCachedJson(pretty)
    try {
      localStorage.setItem('hs_last_report_json', pretty)
    } catch {
      /* ignore storage errors */
    }
    setJsonInput(pretty)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hs_last_report_json')
      if (stored) {
        setCachedJson(stored)
        setJsonInput((current) => current || stored)
      }
      const storedImageB64 = localStorage.getItem('hs_last_image_b64') || ''
      const storedImage = localStorage.getItem('hs_last_image') || ''
      if (storedImageB64) {
        setFallbackImage(storedImageB64)
      } else if (storedImage) {
        setFallbackImage(storedImage)
      }
    } catch {
      /* ignore stale storage */
    }
  }, [])

  const handleUseCached = useCallback(() => {
    if (!cachedJson) return
    try {
      const parsed = JSON.parse(cachedJson)
      const sanitized = sanitizeReportData(parsed)
      setReportData(sanitized)
      setShowUpload(false)
      setError('')
      setJsonInput(cachedJson)
    } catch {
      setError('Saved JSON is invalid. Please upload a new file.')
    }
  }, [cachedJson])

  useEffect(() => {
    if (!hasAutoLoaded.current && cachedJson) {
      hasAutoLoaded.current = true
      handleUseCached()
    }
  }, [cachedJson, handleUseCached])

  const handleFileUpload = useCallback((file: File) => {
    if (file.type !== 'application/json') {
      setError('Please upload a JSON file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || '{}'))
        const sanitized = sanitizeReportData(parsed)
        rememberReport(sanitized)
        setReportData(sanitized)
        setShowUpload(false)
        setError('')
      } catch (err) {
        setError(`Error parsing JSON: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
  }, [rememberReport])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length > 0) {
      handleFileUpload(event.dataTransfer.files[0])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handlePasteJson = useCallback(() => {
    if (!jsonInput.trim()) {
      setError('Please paste JSON data')
      return
    }

    try {
      const parsed = JSON.parse(jsonInput)
      const sanitized = sanitizeReportData(parsed)
      rememberReport(sanitized)
      setReportData(sanitized)
      setShowUpload(false)
      setError('')
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`)
    }
  }, [jsonInput, rememberReport])

  const handleBack = useCallback(() => {
    setShowUpload(true)
    setReportData(null)
    setJsonInput(cachedJson ?? '')
    setError('')
  }, [cachedJson])

  const rootClass = [
    'min-h-screen p-5 font-["Exo_2"] relative overflow-x-hidden',
    isLight
      ? 'bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#e0f2fe] text-slate-800'
      : 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-[#e0e7ff]'
  ].join(' ')

  const overlayClass = isLight
    ? 'absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_20%_15%,rgba(59,130,246,0.18)_0%,transparent_45%),radial-gradient(ellipse_at_80%_85%,rgba(236,72,153,0.15)_0%,transparent_55%),radial-gradient(circle_at_center,rgba(14,165,233,0.12)_0%,transparent_65%)]'
    : 'absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_10%_20%,rgba(255,0,255,0.1)_0%,transparent_50%),radial-gradient(ellipse_at_90%_80%,rgba(0,255,255,0.1)_0%,transparent_50%),radial-gradient(ellipse_at_50%_50%,rgba(255,255,0,0.05)_0%,transparent_50%)]'

  const toggleButtonClass = [
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.25em] transition-all duration-300 border backdrop-blur-sm shadow-sm',
    isLight
      ? 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-100'
      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
  ].join(' ')

  return (
    <div className={rootClass}>
      <div className="fixed inset-0 pointer-events-none">
        <div className={overlayClass} />
      </div>

      <div className="relative z-10">
        <div className="flex justify-end mb-6">
          <button type="button" onClick={toggleTheme} className={toggleButtonClass}>
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>
        {showUpload ? (
          <UploadSection
            isDragging={isDragging}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onFileSelect={handleFileUpload}
            jsonInput={jsonInput}
            setJsonInput={setJsonInput}
            onGenerate={handlePasteJson}
            hasCached={Boolean(cachedJson)}
            onUseCached={handleUseCached}
            theme={theme}
            error={error}
          />
        ) : (
          <>
            <button
              onClick={handleBack}
              className="fixed top-8 right-8 bg-gradient-to-br from-[#ff00ff] to-[#8b00ff] text-white px-10 py-4 rounded-full font-['Orbitron'] font-bold uppercase tracking-wider text-sm shadow-[0_10px_30px_rgba(138,43,226,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_15px_40px_rgba(138,43,226,0.7)] hover:-translate-y-1 transition-all duration-300 z-50"
            >
              ◈ NEW FILE ◈
            </button>
            {reportData && <ReportContent data={reportData} theme={theme} fallbackImage={fallbackImage} />}
          </>
        )}
      </div>
    </div>
  )
}

type UploadSectionProps = {
  isDragging: boolean
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onFileSelect: (file: File) => void
  jsonInput: string
  setJsonInput: React.Dispatch<React.SetStateAction<string>>
  onGenerate: () => void
  hasCached: boolean
  onUseCached: () => void
  theme: 'dark' | 'light'
  error: string
}

const UploadSection: React.FC<UploadSectionProps> = ({
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  jsonInput,
  setJsonInput,
  onGenerate,
  hasCached,
  onUseCached,
  theme,
  error,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const isLight = theme === 'light'

  const containerClass = [
    'max-w-[700px] mx-auto mt-12 p-12 rounded-[25px] backdrop-blur-sm transition-colors duration-300',
    isLight
      ? 'bg-white text-slate-800 border border-slate-200 shadow-[0_18px_50px_rgba(148,163,184,0.25)]'
      : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(20,20,40,0.95)] text-[#e0e7ff] shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1),0_0_40px_rgba(138,43,226,0.3)] border border-[rgba(138,43,226,0.3)]'
  ].join(' ')

  const headingClass = [
    'text-3xl font-["Orbitron"] text-center uppercase tracking-[3px] mb-8 drop-shadow'
  , isLight ? 'text-indigo-600' : 'text-[#00ffff] animate-pulse drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]'
  ].join(' ')

  const dividerClass = isLight
    ? 'absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-200 to-transparent'
    : 'absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[rgba(138,43,226,0.8)] to-transparent'

  const dividerLabelClass = [
    'relative px-5 font-["Orbitron"] font-bold uppercase tracking-[2px] text-sm inline-block left-1/2 -translate-x-1/2',
    isLight
      ? 'bg-white text-indigo-500'
      : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(20,20,40,0.95)] text-[#ff00ff]'
  ].join(' ')

  const dropZoneBase = 'border-3 border-dashed p-12 rounded-[20px] cursor-pointer transition-all duration-400 relative overflow-hidden'
  const dropZoneClass = [
    dropZoneBase,
    isLight
      ? (isDragging
        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 shadow-[inset_0_0_30px_rgba(59,130,246,0.2),0_0_30px_rgba(79,70,229,0.25)]'
        : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 hover:-translate-y-1 shadow-[inset_0_0_20px_rgba(148,163,184,0.12),0_10px_30px_rgba(148,163,184,0.18)]')
      : (isDragging
        ? 'border-[#00ffff] bg-gradient-to-br from-[rgba(20,20,40,0.8)] to-[rgba(40,40,80,0.8)] shadow-[inset_0_0_30px_rgba(0,255,255,0.2),0_0_30px_rgba(0,255,255,0.4)]'
        : 'border-[rgba(0,255,255,0.5)] bg-gradient-to-br from-[rgba(10,10,30,0.7)] to-[rgba(30,30,60,0.7)] hover:border-[#00ffff] hover:bg-gradient-to-br hover:from-[rgba(20,20,40,0.8)] hover:to-[rgba(40,40,80,0.8)] hover:-translate-y-1')
  ].join(' ')

  const dropIconClass = isLight
    ? 'text-6xl text-center mb-5 text-indigo-500'
    : 'text-6xl text-center mb-5 animate-[float_3s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]'

  const dropTextClass = [
    'text-lg text-center relative z-10',
    isLight ? 'text-indigo-600' : 'text-[#00ffff] drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]'
  ].join(' ')

  const textareaClass = [
    'w-full min-h-[200px] p-5 rounded-2xl font-["Courier_New"] text-xs resize-y transition-all border-2 focus:outline-none',
    isLight
      ? 'bg-slate-50 text-slate-800 border-slate-300 shadow-[inset_0_2px_6px_rgba(148,163,184,0.25)] focus:border-indigo-400 focus:shadow-[inset_0_2px_10px_rgba(148,163,184,0.35),0_0_18px_rgba(59,130,246,0.25)]'
      : 'bg-gradient-to-br from-[rgba(10,10,30,0.9)] to-[rgba(20,20,40,0.9)] text-[#00ff00] border-[rgba(138,43,226,0.5)] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-[#00ffff] focus:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,255,0.5)]'
  ].join(' ')

  const errorClass = isLight
    ? 'mt-4 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg shadow-[0_0_10px_rgba(248,113,113,0.15)]'
    : 'mt-4 text-[#ff0055] bg-[rgba(255,0,85,0.1)] border border-[rgba(255,0,85,0.3)] p-4 rounded-lg drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]'

  const loadButtonClass = isLight
    ? 'w-full mt-3 border border-indigo-200 bg-white px-10 py-3 rounded-full font-["Orbitron"] text-xs uppercase tracking-[2px] text-indigo-600 shadow-[0_6px_18px_rgba(148,163,184,0.25)] hover:bg-indigo-50 hover:-translate-y-0.5 transition-all'
    : 'w-full mt-3 border border-[rgba(0,255,255,0.4)] bg-transparent px-10 py-3 rounded-full font-["Orbitron"] text-xs uppercase tracking-[2px] text-[#00ffff] shadow-[0_6px_18px_rgba(0,255,255,0.2)] hover:bg-[rgba(0,255,255,0.08)] hover:-translate-y-0.5 transition-all'

  return (
    <div className={containerClass}>
      <h2 className={headingClass}>◈ Property Inspection ◈</h2>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={dropZoneClass}
      >
        <div className={dropIconClass}>🔮</div>
        <div className={dropTextClass}>
          <strong>DROP JSON FILE</strong>
          <br />
          or click to browse
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) onFileSelect(e.target.files[0])
          }}
          className="hidden"
        />
      </div>

      <div className="my-8 relative">
        <div className={dividerClass} />
        <span className={dividerLabelClass}>◈ OR ◈</span>
      </div>

      <div className="mt-5">
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"id": "001", "title": "Living Room Inspection", ...}'
          className={textareaClass}
        />

        {error && <div className={errorClass}>{error}</div>}

        <button
          onClick={onGenerate}
          className="w-full mt-5 bg-gradient-to-br from-[#ff00ff] to-[#8b00ff] text-white px-10 py-4 rounded-full font-['Orbitron'] font-bold uppercase tracking-[2px] shadow-[0_10px_30px_rgba(138,43,226,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_15px_40px_rgba(138,43,226,0.7)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          ◈ GENERATE REPORT ◈
        </button>
        {hasCached && (
          <button type="button" onClick={onUseCached} className={loadButtonClass}>
            ◈ LOAD LAST ANALYSIS ◈
          </button>
        )}
      </div>
    </div>
  )
}

type ReportContentProps = {
  data: ReportData
  theme: 'dark' | 'light'
  fallbackImage?: string
}

export const ReportContent: React.FC<ReportContentProps> = ({ data, theme, fallbackImage }) => {
  const isLight = theme === 'light'
  const level1Ratings = data.level1.ratings
  const level3Costs = data.level3.heavyCosts
  const additionalCosts = data.costs
  const highlights = data.highlights
  const likelyCauses = data.likelyCauses
  const level2Investigations = data.level2.investigations
  const level2Remediation = data.level2.remediation
  const level3Intrusive = data.level3.intrusive
  const level3Risks = data.level3.risks
  const checklist = data.checklist
  const addressLabel = (data.address || 'Address Pending').toUpperCase()
  const titleLabel = (data.title || 'Inspection Report').toUpperCase()
  const propertyAddressRaw = (data.property?.address || data.address || '').trim()
  const propertyCityRaw = (data.property?.city || '').trim()
  const propertyPostcodeRaw = (data.property?.postcode || '').trim()
  const combinedAddressRaw = [propertyAddressRaw, propertyCityRaw].filter((part) => part.length > 0).join(', ')
  const propertyAddress = (combinedAddressRaw || propertyAddressRaw).toUpperCase()
  const propertyCity = propertyCityRaw.toUpperCase()
  const propertyPostcode = propertyPostcodeRaw.toUpperCase()
  const reportTitle = (data.title || 'Property Survey').toUpperCase()
  const titleLine = propertyAddress ? `${reportTitle} – ${propertyAddress}` : reportTitle

  const [analyticsDocked, setAnalyticsDocked] = useState(false)
  const [analyticsVisible, setAnalyticsVisible] = useState(true)
  const [analyticsPosition, setAnalyticsPosition] = useState({ x: 24, y: 120 })
  const [analyticsSize, setAnalyticsSize] = useState({ width: 400, height: 480 })

  useEffect(() => {
    if (analyticsDocked || typeof window === 'undefined') return
    setAnalyticsPosition((prev) => ({
      x: Math.max(24, Math.min(prev.x, window.innerWidth - analyticsSize.width - 24)),
      y: Math.max(96, Math.min(prev.y, window.innerHeight - analyticsSize.height - 24)),
    }))
  }, [analyticsDocked, analyticsSize.width, analyticsSize.height])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      if (analyticsDocked) return
      setAnalyticsPosition((prev) => ({
        x: Math.max(24, Math.min(prev.x, window.innerWidth - analyticsSize.width - 24)),
        y: Math.max(96, Math.min(prev.y, window.innerHeight - analyticsSize.height - 24)),
      }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [analyticsDocked, analyticsSize.width, analyticsSize.height])

  useEffect(() => {
    if (analyticsDocked || typeof window === 'undefined') {
      return
    }
    setAnalyticsPosition({
      x: Math.max(24, window.innerWidth - analyticsSize.width - 36),
      y: 120,
    })
  }, [])

  const handleDockToggle = useCallback(() => {
    setAnalyticsDocked((prev) => {
      if (prev && typeof window !== 'undefined') {
        setAnalyticsPosition({
          x: Math.max(24, window.innerWidth - analyticsSize.width - 36),
          y: 120,
        })
      }
      return !prev
    })
    setAnalyticsVisible(true)
  }, [analyticsSize.width])

  const handleDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (analyticsDocked) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const originX = analyticsPosition.x
    const originY = analyticsPosition.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      if (typeof window === 'undefined') {
        setAnalyticsPosition({ x: originX + (moveEvent.clientX - startX), y: originY + (moveEvent.clientY - startY) })
        return
      }
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const maxX = window.innerWidth - analyticsSize.width - 36
      const maxY = window.innerHeight - analyticsSize.height - 24
      setAnalyticsPosition({
        x: Math.max(24, Math.min(maxX, originX + deltaX)),
        y: Math.max(96, Math.min(maxY, originY + deltaY)),
      })
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [analyticsDocked, analyticsPosition.x, analyticsPosition.y, analyticsSize.height, analyticsSize.width])

  const handleResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (analyticsDocked) return
    event.stopPropagation()
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const originWidth = analyticsSize.width
    const originHeight = analyticsSize.height

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const minWidth = 320
      const minHeight = 360
      let maxWidth = 560
      let maxHeight = 640
      if (typeof window !== 'undefined') {
        maxWidth = Math.min(600, window.innerWidth - analyticsPosition.x - 36)
        maxHeight = Math.min(700, window.innerHeight - analyticsPosition.y - 24)
      }
      setAnalyticsSize({
        width: Math.max(minWidth, Math.min(maxWidth, originWidth + deltaX)),
        height: Math.max(minHeight, Math.min(maxHeight, originHeight + deltaY)),
      })
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [analyticsDocked, analyticsSize.height, analyticsSize.width, analyticsPosition.x, analyticsPosition.y])

  const imageCandidate = useMemo(() => {
    const direct = (data.imageUrl || '').trim()
    const isPlaceholder = (url: string) => {
      const trimmed = url.trim().toLowerCase()
      if (!trimmed) return false
      if (trimmed.includes('placeholder')) return true
      if (trimmed.includes('url_to_image')) return true
      if (trimmed.includes('example.com')) return true
      if (trimmed === 'null' || trimmed === '-' || trimmed === 'n/a') return true
      return false
    }
    if (direct && !isPlaceholder(direct)) return direct

    const provided = (fallbackImage || '').trim()
    if (provided && !isPlaceholder(provided)) return provided

    const readFromEnvelope = (raw: string | null): string => {
      if (!raw) return ''
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.structured?.imageUrl && !isPlaceholder(String(parsed.structured.imageUrl))) return String(parsed.structured.imageUrl)
        if (parsed?.classic?.imageUrl && !isPlaceholder(String(parsed.classic.imageUrl))) return String(parsed.classic.imageUrl)
        if (Array.isArray(parsed?.results)) {
          const first = parsed.results
            .map((r: any) => (r?.image_url || r?.image || r?.image_b64 || r?.image_b64_preview || '') as string)
            .find((value: string) => typeof value === 'string' && value.trim().length > 0 && !isPlaceholder(value))
          if (first) return first
        }
        return ''
      } catch {
        return ''
      }
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const envelopeCandidate = readFromEnvelope(window.localStorage.getItem('hs_last_envelope'))
        if (envelopeCandidate) return envelopeCandidate

        const imageCandidate = window.localStorage.getItem('hs_last_image')
        if (imageCandidate && imageCandidate.trim() && !isPlaceholder(imageCandidate)) return imageCandidate

        const structuredCandidateRaw = window.localStorage.getItem('hs_last_result')
        if (structuredCandidateRaw) {
          try {
            const parsed = JSON.parse(structuredCandidateRaw)
            if (parsed?.imageUrl && !isPlaceholder(String(parsed.imageUrl))) return String(parsed.imageUrl)
          } catch {
            /* ignore parse */
          }
        }
      }
    } catch {
      /* ignore storage access */
    }

    return ''
  }, [data.imageUrl, fallbackImage])

  useEffect(() => {
    if (import.meta.env?.DEV) {
      console.debug('[image] ReportContent:imageCandidate', imageCandidate?.slice?.(0, 120))
    }
  }, [imageCandidate])

  const normalizedImageSrc = useMemo(() => {
    const raw = imageCandidate.trim()
    if (!raw) return ''

    const base = API_BASE.replace(/\/$/, '')
    const buildAbsolute = (path: string): string => {
      const candidate = (path || '').trim()
      if (!candidate) return ''
      if (/^(data:|https?:|blob:)/i.test(candidate)) return candidate
      if (candidate.startsWith('//')) return candidate
      if (candidate.startsWith('/')) return `${base}${candidate}`
      if (candidate.startsWith('./') || candidate.startsWith('../')) {
        return `${base}/${candidate.replace(/^[.\/]+/, '')}`
      }
      if (candidate.startsWith('assets/')) {
        return `${base}/${candidate}`
      }
      return `${base}/${candidate.replace(/^\/+/, '')}`
    }

    const dataUrlMatch = raw.match(/^data:(image\/[^;]+);base64,(.*)$/i)
    if (dataUrlMatch) {
      const [, mime, payloadRaw = ''] = dataUrlMatch
      const payload = payloadRaw.trim().replace(/\s+/g, '')
      const isBase64 = payload.length > 0 && payload.length % 4 === 0 && /^[A-Za-z0-9+/+=_-]+$/.test(payload)
      if (isBase64) {
        const normalized = `data:${mime};base64,${payload}`
        if (import.meta.env?.DEV) {
          console.debug('[image] ReportContent:data-url', normalized.slice(0, 60))
        }
        return normalized
      }
      if (import.meta.env?.DEV) {
        console.debug('[image] ReportContent:data-url->absolute', payloadRaw.slice(0, 60))
      }
      return buildAbsolute(payloadRaw)
    }

    if (/^(data:|https?:|blob:)/i.test(raw)) {
      if (import.meta.env?.DEV) {
        console.debug('[image] ReportContent:direct', raw.slice(0, 60))
      }
      return raw
    }

    const base64Candidate = raw.replace(/\s+/g, '')
    const looksLikeBase64 = base64Candidate.length > 64 && base64Candidate.length % 4 === 0 && /^[A-Za-z0-9+/+=_-]+$/.test(base64Candidate)
    if (looksLikeBase64) {
      const normalized = `data:image/jpeg;base64,${base64Candidate}`
      if (import.meta.env?.DEV) {
        console.debug('[image] ReportContent:base64', normalized.slice(0, 60))
      }
      return normalized
    }

    const absolute = buildAbsolute(raw)
    if (import.meta.env?.DEV) {
      console.debug('[image] ReportContent:absolute', raw, '=>', absolute)
    }
    return absolute
  }, [imageCandidate])

  const { avgRatingValue, avgRatingLabel, issuesCount, minCost, maxCost, avgCost, actionItems, riskScore, conditionScore } = useMemo(() => {
    const ratings = level1Ratings
    const ratingSum = ratings.reduce((sum, rating) => sum + rating.rating, 0)
    const avgValue = ratings.length ? ratingSum / ratings.length : 0
    const avgLabel = avgValue.toFixed(1)
    const allCosts = [...level3Costs, ...additionalCosts]
    const minTotal = allCosts.reduce((sum, cost) => sum + cost.min, 0)
    const maxTotal = allCosts.reduce((sum, cost) => sum + cost.max, 0)
    const avgTotal = (minTotal + maxTotal) / 2

    return {
      avgRatingValue: avgValue,
      avgRatingLabel: avgLabel,
      issuesCount: highlights.length,
      minCost: minTotal,
      maxCost: maxTotal,
      avgCost: avgTotal,
      actionItems: level2Remediation.length + checklist.length,
      riskScore: riskToScore(data.verdict.risk),
      conditionScore: clamp(avgValue * 20, 0, 100),
    }
  }, [additionalCosts, checklist.length, data.verdict.risk, highlights.length, level1Ratings, level2Remediation.length, level3Costs])

  const allCosts = useMemo(() => [...level3Costs, ...additionalCosts], [level3Costs, additionalCosts])

  const getStars = (rating: number) => {
    const clamped = clamp(Math.round(rating), 0, 5)
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
  }

  const getPriorityColor = (rating: number) => {
    if (rating <= 2) return 'text-[#ff0055]'
    if (rating === 3) return 'text-[#ffff00]'
    return 'text-[#00ff00]'
  }

  const getPriorityLabel = (rating: number) => {
    if (rating <= 2) return 'HIGH'
    if (rating === 3) return 'MED'
    return 'LOW'
  }

  const riskUpper = data.verdict.risk.toUpperCase() || 'UNKNOWN'
  const conditionUpper = data.verdict.condition.toUpperCase() || 'UNKNOWN'
  const riskSafe = riskScore <= 60
  const highlightMessage = highlights[0] || 'Awaiting specialist insight.'
  const actionMessage = level2Remediation[0] || 'Next steps pending confirmation.'
  const conditionPercent = Math.max(0, Math.min(100, Math.round(conditionScore)))
  const riskPercent = Math.max(0, Math.min(100, Math.round(riskScore)))

  const headerContainerClass = [
    'relative overflow-hidden rounded-[26px] border transition-all duration-500 p-6 md:p-8 flex flex-col gap-6',
    isLight
      ? 'bg-gradient-to-br from-white via-[#eef2ff] to-[#e0f2fe] text-slate-800 border-slate-200 shadow-[0_25px_60px_rgba(148,163,184,0.35)]'
      : 'bg-gradient-to-br from-[rgba(5,8,25,0.95)] via-[rgba(11,15,45,0.92)] to-[rgba(2,4,12,0.96)] text-white border-white/10 shadow-[0_36px_80px_rgba(3,6,20,0.7)] backdrop-blur'
  ].join(' ')

  const headerGridClass = 'relative z-10 flex flex-col gap-6 lg:gap-8'

  const addressBadgeClass = [
    'inline-flex w-full items-center gap-4 rounded-[36px] border px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition-all duration-500 backdrop-blur-sm',
    isLight
      ? 'bg-gradient-to-br from-white via-slate-100 to-white text-slate-900 border-slate-200'
      : 'bg-gradient-to-br from-[rgba(15,23,42,0.65)] via-[rgba(30,41,59,0.7)] to-[rgba(15,23,42,0.9)] text-white border-white/15'
  ].join(' ')

  const headerChipClass = [
    'px-5 py-2 rounded-2xl border text-center shadow-sm transition-colors duration-300 min-w-[120px]',
    isLight
      ? 'bg-white/90 border-slate-200 text-indigo-600 shadow-[0_10px_26px_rgba(148,163,184,0.25)]'
      : 'bg-gradient-to-br from-[rgba(255,0,255,0.14)] via-[rgba(138,43,226,0.16)] to-[rgba(0,255,255,0.18)] border-[rgba(255,0,255,0.25)] text-[#8ff7ff] shadow-[0_12px_28px_rgba(3,6,20,0.6)] backdrop-blur'
  ].join(' ')

  const headerChipLabelClass = [
    'text-[10px] uppercase tracking-[0.35em] transition-colors duration-300',
    isLight ? 'text-slate-500' : 'text-[#ffb3ff]/80'
  ].join(' ')

  const infoStackClass = 'flex flex-col gap-5 h-full'

  const headerImageWrapperClass = [
    'relative overflow-hidden rounded-[20px] border transition-transform duration-500 h-[220px] md:h-[240px] flex md:w-[240px] lg:w-[260px] flex-shrink-0',
    isLight
      ? 'border-white/60 bg-slate-100/90 shadow-[0_22px_46px_rgba(148,163,184,0.28)]'
      : 'border-white/12 bg-white/10 shadow-[0_28px_60px_rgba(3,6,20,0.7)] backdrop-blur-md'
  ].join(' ')

  const headerImageBadgeClass = 'absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/25 bg-black/35 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/80 backdrop-blur-sm'

  const holoPanelClass = [
    'relative overflow-hidden rounded-[22px] border px-6 py-5 flex flex-col gap-5 transition-colors duration-300',
    isLight
      ? 'bg-white/90 border-white/60 shadow-[0_22px_46px_rgba(148,163,184,0.32)]'
      : 'bg-white/8 border-white/15 shadow-[0_24px_55px_rgba(3,6,20,0.65)] backdrop-blur-xl'
  ].join(' ')

  const gaugeTrackClass = [
    'relative h-2 w-full overflow-hidden rounded-full',
    isLight ? 'bg-slate-200/70' : 'bg-white/12'
  ].join(' ')

  const intelGridClass = 'grid gap-3 lg:grid-cols-2'

  const intelCardClass = [
    'relative overflow-hidden rounded-[18px] border px-5 py-4 text-sm leading-relaxed transition-colors duration-300',
    isLight
      ? 'bg-white/85 border-slate-200 text-slate-700 shadow-[0_14px_30px_rgba(148,163,184,0.22)]'
      : 'bg-white/6 border-white/12 text-white/90 shadow-[0_18px_38px_rgba(3,6,20,0.58)] backdrop-blur'
  ].join(' ')

  const metricAccentColours: Record<'default' | 'success' | 'danger', string> = {
    default: isLight ? 'bg-gradient-to-r from-slate-200/80 to-slate-100/30' : 'bg-gradient-to-r from-white/10 to-white/5',
    success: isLight ? 'bg-gradient-to-r from-emerald-300/70 to-cyan-200/40' : 'bg-gradient-to-r from-emerald-400/50 to-cyan-300/30',
    danger: isLight ? 'bg-gradient-to-r from-rose-300/70 to-amber-200/40' : 'bg-gradient-to-r from-rose-500/50 to-fuchsia-400/30',
  }

  const totalCostBannerClass = [
    'col-span-12 flex flex-col gap-4 rounded-[22px] border px-6 py-5 text-sm transition-all duration-300 md:flex-row md:items-center md:justify-between',
    isLight
      ? 'bg-white/90 border-rose-200/70 text-rose-600 shadow-[0_20px_48px_rgba(248,113,113,0.25)]'
      : 'bg-white/6 border-rose-400/35 text-white shadow-[0_24px_54px_rgba(255,0,85,0.35)] backdrop-blur'
  ].join(' ')

  const negotiationBannerClass = [
    'col-span-12 rounded-[22px] border px-6 py-5 text-sm transition-all duration-300',
    isLight
      ? 'bg-white/90 border-amber-200 text-amber-700 shadow-[0_18px_42px_rgba(251,191,36,0.28)]'
      : 'bg-white/6 border-amber-300/35 text-white shadow-[0_24px_54px_rgba(255,224,102,0.32)] backdrop-blur'
  ].join(' ')

  const costCardClass = [
    'relative overflow-hidden rounded-[18px] border px-4 py-4 transition-all duration-300',
    isLight
      ? 'bg-white/85 border-rose-200/70 text-rose-600 shadow-[0_14px_32px_rgba(248,113,113,0.25)] hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(248,113,113,0.3)]'
      : 'bg-white/6 border-rose-300/40 text-white shadow-[0_22px_48px_rgba(255,0,85,0.35)] hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(255,0,170,0.45)] backdrop-blur'
  ].join(' ')

  const costCardLabelClass = isLight
    ? 'text-[10px] uppercase tracking-[0.35em] text-rose-500'
    : 'text-[10px] uppercase tracking-[0.35em] text-white/70'

  const costCardValueClass = isLight
    ? 'text-lg font-["Orbitron"] font-semibold text-rose-600'
    : 'text-lg font-["Orbitron"] font-semibold text-white'

  const costCardGaugeClass = [
    'mt-3 h-1.5 rounded-full',
    isLight
      ? 'bg-gradient-to-r from-rose-300 via-rose-400 to-amber-300 shadow-[0_0_10px_rgba(248,113,113,0.35)]'
      : 'bg-gradient-to-r from-[#ff4d8c] via-[#ff00ff] to-[#ffaa33] shadow-[0_0_12px_rgba(255,0,170,0.5)]'
  ].join(' ')

  const analyticsFloatingPanelClass = [
    'fixed z-40 flex flex-col overflow-hidden rounded-[28px] border backdrop-blur-xl transition-all duration-300',
    isLight
      ? 'bg-white/95 border-slate-200 text-slate-900 shadow-[0_32px_80px_rgba(15,23,42,0.28)]'
      : 'bg-[rgba(10,16,32,0.92)] border-white/15 text-white shadow-[0_40px_88px_rgba(0,0,0,0.65)]'
  ].join(' ')

  const analyticsDockedPanelClass = [
    'mt-10 rounded-[30px] border px-6 py-6 transition-all duration-300',
    isLight
      ? 'bg-white/90 border-slate-200 text-slate-800 shadow-[0_28px_70px_rgba(148,163,184,0.28)]'
      : 'bg-white/6 border-white/12 text-white shadow-[0_32px_70px_rgba(3,6,20,0.6)] backdrop-blur'
  ].join(' ')

  const analyticsFloatingHeaderClass = [
    'flex items-center justify-between gap-3 border-b px-4 py-3 cursor-move select-none',
    isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-white/80'
  ].join(' ')

  const analyticsDockedHeaderClass = [
    'flex items-center justify-between gap-3 border-b px-4 py-3 uppercase tracking-[0.35em] text-[11px] font-["Orbitron"]',
    isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-white/75'
  ].join(' ')

  const analyticsControlButtonClass = [
    'grid h-8 w-8 place-items-center rounded-full border transition-colors duration-200',
    isLight ? 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600' : 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
  ].join(' ')

  const analyticsRestoreButtonClass = [
    'fixed top-6 right-6 z-50 flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.4em] font-["Orbitron"] shadow-[0_18px_45px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-colors duration-200',
    isLight ? 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-100' : 'border-white/20 bg-[rgba(10,16,32,0.92)] text-white hover:bg-white/15'
  ].join(' ')

  const analyticsContent = (
    <AnalyticsSection
      riskScore={riskScore}
      conditionScore={conditionScore}
      avgRatingValue={avgRatingValue}
      avgRatingLabel={avgRatingLabel}
      checklistComplete={0}
      checklistTotal={checklist.length}
      avgCost={avgCost}
      ratings={level1Ratings}
      allCosts={allCosts}
      maxCost={maxCost}
      theme={theme}
      compact={!analyticsDocked}
    />
  )

  const reportWrapperClass = useMemo(() => {
    const base = 'relative max-w-[1800px] mx-auto space-y-6 transition-[padding] duration-300'
    if (!analyticsDocked && analyticsVisible) {
      return `${base} lg:pr-[420px]`
    }
    return base
  }, [analyticsDocked, analyticsVisible])

  const floatingAnalyticsPanel = !analyticsDocked && analyticsVisible ? (
    <div
      className={analyticsFloatingPanelClass}
      style={{ width: analyticsSize.width, height: analyticsSize.height, left: analyticsPosition.x, top: analyticsPosition.y }}
    >
      <div className={analyticsFloatingHeaderClass} onMouseDown={handleDragStart}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.45em] font-['Orbitron']">
          <GripVertical className="h-4 w-4 opacity-70" />
          <span>System Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={analyticsControlButtonClass}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              handleDockToggle()
            }}
            aria-label="Dock analytics"
          >
            <Dock className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={analyticsControlButtonClass}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              setAnalyticsVisible(false)
            }}
            aria-label="Hide analytics"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-4 py-4 space-y-6">
          {analyticsContent}
        </div>
      </div>
      <div
        className="absolute bottom-0 right-0 h-6 w-6 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1 right-1 h-4 w-4 border-b-2 border-r-2 border-white/40" />
      </div>
    </div>
  ) : null

  const dockedAnalyticsPanel = analyticsDocked && analyticsVisible ? (
    <div className={analyticsDockedPanelClass}>
      <div className={analyticsDockedHeaderClass}>
        <div className="flex items-center gap-2 text-xs">
          <PanelsTopLeft className="h-4 w-4" />
          <span>System Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={analyticsControlButtonClass}
            onClick={() => handleDockToggle()}
            aria-label="Pop out analytics"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={analyticsControlButtonClass}
            onClick={() => setAnalyticsVisible(false)}
            aria-label="Hide analytics"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-[520px] overflow-hidden rounded-[22px] border border-white/10 bg-white/5 px-3 py-3">
        <div className="max-h-[480px] overflow-auto pr-2">
          {analyticsContent}
        </div>
      </div>
    </div>
  ) : null

  const analyticsRestoreButton = !analyticsVisible ? (
    <button
      type="button"
      className={analyticsRestoreButtonClass}
      onClick={() => {
        setAnalyticsVisible(true)
        if (!analyticsDocked && typeof window !== 'undefined') {
          setAnalyticsPosition({
            x: Math.max(24, window.innerWidth - analyticsSize.width - 36),
            y: 120,
          })
        }
      }}
    >
      <PanelsTopLeft className="h-4 w-4" />
      <span>Analytics</span>
    </button>
  ) : null
  const metricStripClass = [
    'grid gap-3 sm:grid-cols-3 xl:grid-cols-6 transition-colors duration-300 rounded-[22px] border px-4 py-5',
    isLight
      ? 'bg-white/85 border-slate-200 text-slate-800 shadow-[0_20px_45px_rgba(148,163,184,0.28)]'
      : 'bg-white/6 border-white/12 text-white shadow-[0_26px_55px_rgba(3,6,20,0.65)] backdrop-blur'
  ].join(' ')

  const metricItemClass = [
    'relative overflow-hidden rounded-[18px] border px-4 py-4 transition-all duration-300',
    isLight
      ? 'bg-white/90 border-slate-200 shadow-[0_12px_28px_rgba(148,163,184,0.2)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.25)]'
      : 'bg-white/6 border-white/15 shadow-[0_18px_36px_rgba(3,6,20,0.6)] hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(138,43,226,0.5)] backdrop-blur'
  ].join(' ')

  const metricLabelClass = [
    'text-[10px] uppercase tracking-[0.35em] transition-colors duration-300 opacity-70',
    isLight ? 'text-slate-500' : 'text-white'
  ].join(' ')

  const metricValueClass = [
    'mt-2 text-2xl font-["Orbitron"] font-semibold tracking-[0.2em] transition-colors duration-300',
    isLight ? 'text-slate-800' : 'text-white'
  ].join(' ')

  const bodyWrapperClass = [
    'grid grid-cols-12 gap-5 rounded-[24px] border px-6 py-6 transition-colors duration-300',
    isLight
      ? 'bg-white/80 border-slate-200 text-slate-800 shadow-[0_24px_55px_rgba(148,163,184,0.25)]'
      : 'bg-white/4 border-white/12 text-white shadow-[0_28px_60px_rgba(3,6,20,0.65)] backdrop-blur'
  ].join(' ')

  const verdictBannerClass = [
    'col-span-12 flex flex-col gap-4 rounded-[22px] border px-6 py-5 transition-all duration-300 md:flex-row md:items-center md:justify-between',
    isLight
      ? 'bg-white/90 border-rose-200/70 text-rose-600 shadow-[0_18px_40px_rgba(248,113,113,0.25)]'
      : 'bg-white/6 border-rose-400/40 text-[#ff7ab9] shadow-[0_22px_48px_rgba(255,0,85,0.35)] backdrop-blur'
  ].join(' ')

  const verdictIconClass = [
    'flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-300',
    isLight
      ? 'bg-gradient-to-br from-rose-200 to-amber-200 text-rose-600 shadow-[0_8px_18px_rgba(248,113,113,0.35)]'
      : 'bg-gradient-to-br from-[#ff0055]/60 to-[#ff8bd6]/40 text-white shadow-[0_12px_26px_rgba(255,0,85,0.4)]'
  ].join(' ')

  const verdictTextClass = [
    'text-base font-["Orbitron"] uppercase tracking-[0.45em] transition-colors duration-300',
    isLight ? 'text-rose-600' : 'text-white'
  ].join(' ')

  return (
    <div className={reportWrapperClass}>
      {floatingAnalyticsPanel}
      {analyticsRestoreButton}
      <div className={headerContainerClass}>
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute -top-24 -right-10 h-64 w-64 rounded-full blur-3xl opacity-60 transition-opacity duration-500 ${isLight ? 'bg-sky-300/40' : 'bg-fuchsia-500/35'}`} />
          <div className={`absolute -bottom-20 -left-16 h-72 w-72 rounded-full blur-3xl opacity-60 transition-opacity duration-500 ${isLight ? 'bg-indigo-200/45' : 'bg-cyan-500/30'}`} />
          <div className={`absolute inset-x-10 top-1/2 h-px opacity-50 ${isLight ? 'bg-gradient-to-r from-transparent via-indigo-200 to-transparent' : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'}`} />
          <div className={`absolute inset-6 rounded-[24px] opacity-40 ${isLight ? 'border border-white/60' : 'border border-white/15'}`} />
        </div>
        <div className={headerGridClass}>
          <div className={infoStackClass}>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className={`${addressBadgeClass} flex-col items-start gap-4 md:flex-row md:items-center md:gap-6`}>
                  <span
                    className={`relative grid place-items-center rounded-full border p-5 shadow-[0_16px_40px_rgba(15,23,42,0.35)] ${
                      isLight
                        ? 'border-indigo-200/60 bg-gradient-to-br from-indigo-100 via-white to-sky-100 text-indigo-700'
                        : 'border-white/20 bg-gradient-to-br from-white/10 via-indigo-400/20 to-cyan-400/10 text-white'
                    }`}
                  >
                    <span className="absolute inset-0 rounded-full border border-white/40 opacity-80" />
                    <span className="absolute inset-1 rounded-full bg-gradient-to-br from-white/70 via-transparent to-transparent opacity-90" />
                    <Home className="relative z-10 h-9 w-9" />
                  </span>
                  <div className="space-y-1 text-left">
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.45em] ${isLight ? 'text-slate-600' : 'text-slate-200/80'} font-['Orbitron']`}>
                      {titleLine}
                    </div>
                    <div className={`text-xl font-semibold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {propertyAddress || 'ADDRESS PENDING'}
                    </div>
                    {propertyCity ? (
                      <div className={`text-sm uppercase tracking-[0.35em] ${isLight ? 'text-slate-500' : 'text-slate-300/80'}`}>{propertyCity}</div>
                    ) : null}
                    {propertyPostcode ? (
                      <div className={`text-xs uppercase tracking-[0.35em] ${isLight ? 'text-slate-500' : 'text-slate-300/70'}`}>{propertyPostcode}</div>
                    ) : (
                      <div className={`text-xs uppercase tracking-[0.35em] ${isLight ? 'text-slate-400' : 'text-slate-500/60'}`}>POSTCODE PENDING</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className={headerImageWrapperClass}>
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-br from-white/5 via-transparent to-white/30' : 'bg-gradient-to-br from-[#1e2746]/25 via-transparent to-[#050b1d]/55'}`} />
                    <div className={`absolute inset-0 ${isLight ? 'border border-white/60' : 'border border-white/20'} rounded-[20px] opacity-50`} />
                  </div>
                  {normalizedImageSrc ? (
                    <img
                      src={normalizedImageSrc}
                      alt={data.title ? `${data.title} reference` : 'Inspection reference'}
                      className="relative z-[1] h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`relative z-[1] flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.35em] ${isLight ? 'text-slate-500/70 bg-slate-100/90' : 'text-white/60 bg-white/10'}`}>
                      Image Reference Pending
                    </div>
                  )}
                </div>
                <div className="flex flex-row gap-4 md:flex-col md:w-[200px] lg:w-[220px]">
                  <div className={`${headerChipClass} md:flex-1 ${riskSafe ? (isLight ? 'border-emerald-300 bg-emerald-50/90 text-emerald-700' : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200') : ''}`}>
                    <div className={headerChipLabelClass}>Condition</div>
                    <div className={`text-lg font-['Orbitron'] font-bold tracking-[0.32em] ${riskSafe ? (isLight ? 'text-emerald-600' : 'text-emerald-200') : ''}`}>{conditionUpper}</div>
                  </div>
                  <div className={`${headerChipClass} md:flex-1 ${riskSafe ? (isLight ? 'border-emerald-300 bg-emerald-50/90 text-emerald-700' : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200') : ''}`}>
                    <div className={headerChipLabelClass}>Risk</div>
                    <div className={`text-lg font-['Orbitron'] font-bold tracking-[0.32em] ${riskSafe ? (isLight ? 'text-emerald-600' : 'text-emerald-200') : ''}`}>{riskUpper}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={holoPanelClass}>
              <div className={`pointer-events-none absolute inset-0 ${isLight ? 'bg-gradient-to-br from-white/25 via-transparent to-sky-200/20' : 'bg-gradient-to-br from-fuchsia-500/15 via-transparent to-cyan-400/15'}`} />
              <div className="relative flex items-center justify-between text-[11px] uppercase tracking-[0.35em]">
                <span>Live Telemetry</span>
                <span className="font-['Orbitron'] text-xs">#{data.id || '000'}</span>
              </div>
              <div className="relative grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
                    <span>Condition Index</span>
                    <span className="font-['Orbitron'] text-sm">{conditionPercent}%</span>
                  </div>
                  <div className={gaugeTrackClass}>
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${isLight ? 'bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500' : 'bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400'}`}
                      style={{ width: `${Math.max(conditionPercent, 6)}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 blur-xl ${isLight ? 'bg-sky-300/50' : 'bg-fuchsia-400/60'}`}
                      style={{ width: `${Math.max(conditionPercent, 6)}%` }}
                    />
                  </div>
                  <div className={`text-[10px] uppercase tracking-[0.25em] ${isLight ? 'text-slate-500/80' : 'text-white/60'}`}>Structural confidence</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
                    <span>Risk Pulse</span>
                    <span className="font-['Orbitron'] text-sm">{riskPercent}%</span>
                  </div>
                  <div className={gaugeTrackClass}>
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${isLight ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-red-600' : 'bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600'}`}
                      style={{ width: `${Math.max(riskPercent, 6)}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 blur-xl ${isLight ? 'bg-rose-300/60' : 'bg-rose-500/50'}`}
                      style={{ width: `${Math.max(riskPercent, 6)}%` }}
                    />
                  </div>
                  <div className={`text-[10px] uppercase tracking-[0.25em] ${isLight ? 'text-slate-500/80' : 'text-white/60'}`}>Exposure profile</div>
                </div>
              </div>
            </div>
            <div className={intelGridClass}>
              <div className={intelCardClass}>
                <div className={`pointer-events-none absolute inset-0 ${isLight ? 'bg-gradient-to-br from-indigo-200/25 via-transparent to-sky-200/10' : 'bg-gradient-to-br from-fuchsia-500/20 via-transparent to-purple-500/10'}`} />
                <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                  <span>Latest Finding</span>
                </div>
                <p className="relative mt-2 text-sm leading-relaxed">{highlightMessage}</p>
              </div>
              <div className={intelCardClass}>
                <div className={`pointer-events-none absolute inset-0 ${isLight ? 'bg-gradient-to-br from-emerald-200/20 via-transparent to-sky-100/15' : 'bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-500/10'}`} />
                <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] opacity-80">
                  <span className="inline-block h-2 w-2 rounded-full bg-current animate-ping" />
                  <span>Next Action</span>
                </div>
                <p className="relative mt-2 text-sm leading-relaxed">{actionMessage}</p>
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className={metricStripClass}>
        {[
          { label: 'Avg Rating', value: `${avgRatingLabel}/5`, accent: 'default' },
          { label: 'Issues', value: issuesCount, accent: 'default' },
          { label: 'Est. Cost', value: `£${(minCost / 1000).toFixed(1)}K-${(maxCost / 1000).toFixed(1)}K`, accent: 'default' },
          { label: 'Actions', value: actionItems, accent: 'default' },
          { label: 'Risk Score', value: `${riskScore}%`, accent: riskSafe ? 'success' : 'danger' },
          { label: 'Checklist', value: `${0}/${checklist.length}`, accent: 'default' },
        ].map((metric, idx) => (
          <div key={idx} className={metricItemClass}>
            <div className={`absolute inset-x-4 top-3 h-px opacity-70 ${metricAccentColours[(metric.accent as 'success' | 'danger' | 'default') || 'default']}`} />
            <div className={metricLabelClass}>{metric.label}</div>
            <div className={metricValueClass}>{metric.value}</div>
          </div>
        ))}
      </div>

      {dockedAnalyticsPanel}

      <div className={bodyWrapperClass}>
        <div className={verdictBannerClass}>
          <div className="flex items-center gap-4">
            <div className={verdictIconClass}>
              ⛔
            </div>
            <div className={verdictTextClass}>
              {titleLabel} — {data.verdict.stance || 'Further investigation recommended'}
            </div>
          </div>
        </div>

        <ContentCard title="⚠ Critical Highlights" theme={theme} className="col-span-12 md:col-span-6 lg:col-span-3">
          {highlights.map((item, idx) => (
            <ItemBox key={idx} type="danger" theme={theme}>{item}</ItemBox>
          ))}
        </ContentCard>

        <ContentCard title="🔍 Root Cause Analysis" theme={theme} className="col-span-12 md:col-span-6 lg:col-span-3">
          {likelyCauses.map((item, idx) => (
            <ItemBox key={idx} type="warning" theme={theme}>{item}</ItemBox>
          ))}
        </ContentCard>

        <ContentCard title="⚠ Associated Risks" theme={theme} className="col-span-12 md:col-span-6 lg:col-span-3">
          {level3Risks.map((item, idx) => (
            <ItemBox key={idx} type="danger" theme={theme}>{item}</ItemBox>
          ))}
        </ContentCard>

        <ContentCard title="✓ Checklist" theme={theme} className="col-span-12 md:col-span-6 lg:col-span-3">
          {checklist.length ? (
            checklist.map((item, idx) => (
              <ChecklistItem key={idx} theme={theme}>{item}</ChecklistItem>
            ))
          ) : (
            <div className={isLight ? 'text-slate-500 text-xs' : 'text-white/70 text-xs'}>No checklist items supplied.</div>
          )}
        </ContentCard>

        <ContentCard title="🏗 Level 1: Ratings" theme={theme} className="col-span-12 lg:col-span-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className={isLight ? 'bg-slate-100 p-3 border border-slate-200 text-slate-600 rounded-l-lg' : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(40,40,80,0.9)] p-3 border border-[rgba(138,43,226,0.2)]'}>Element</th>
                  <th className={isLight ? 'bg-slate-100 p-3 border border-slate-200 text-slate-600' : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(40,40,80,0.9)] p-3 border border-[rgba(138,43,226,0.2)]'}>Rating</th>
                  <th className={isLight ? 'bg-slate-100 p-3 border border-slate-200 text-slate-600' : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(40,40,80,0.9)] p-3 border border-[rgba(138,43,226,0.2)]'}>Notes</th>
                  <th className={isLight ? 'bg-slate-100 p-3 border border-slate-200 text-slate-600 rounded-r-lg' : 'bg-gradient-to-br from-[rgba(30,30,60,0.9)] to-[rgba(40,40,80,0.9)] p-3 border border-[rgba(138,43,226,0.2)] rounded-r-lg'}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {level1Ratings.map((rating, idx) => (
                  <tr key={idx} className="group">
                    <td className={isLight ? 'bg-white p-3 border border-slate-200 text-xs text-slate-700 group-hover:bg-indigo-50 transition-all' : 'bg-gradient-to-br from-[rgba(20,20,50,0.7)] to-[rgba(30,30,60,0.7)] p-3 border border-[rgba(138,43,226,0.2)] text-xs group-hover:bg-gradient-to-br group-hover:from-[rgba(30,30,60,0.8)] group-hover:to-[rgba(40,40,80,0.8)] transition-all'}>
                      {rating.element}
                    </td>
                    <td className={isLight ? 'bg-white p-3 border border-slate-200 group-hover:bg-indigo-50 transition-all' : 'bg-gradient-to-br from-[rgba(20,20,50,0.7)] to-[rgba(30,30,60,0.7)] p-3 border border-[rgba(138,43,226,0.2)] group-hover:bg-gradient-to-br group-hover:from-[rgba(30,30,60,0.8)] group-hover:to-[rgba(40,40,80,0.8)] transition-all'}>
                      <span className={isLight ? 'text-yellow-500 text-base' : 'text-[#ffff00] text-base drop-shadow-[0_0_10px_rgba(255,255,0,0.8)] tracking-wider'}>
                        {getStars(rating.rating)}
                      </span>
                    </td>
                    <td className={isLight ? 'bg-white p-3 border border-slate-200 text-xs text-slate-700 group-hover:bg-indigo-50 transition-all' : 'bg-gradient-to-br from-[rgba(20,20,50,0.7)] to-[rgba(30,30,60,0.7)] p-3 border border-[rgba(138,43,226,0.2)] text-xs group-hover:bg-gradient-to-br group-hover:from-[rgba(30,30,60,0.8)] group-hover:to-[rgba(40,40,80,0.8)] transition-all'}>
                      {rating.note || '—'}
                    </td>
                    <td className={isLight ? 'bg-white p-3 border border-slate-200 rounded-r-lg text-center text-sm group-hover:bg-indigo-50 transition-all' : 'bg-gradient-to-br from-[rgba(20,20,50,0.7)] to-[rgba(30,30,60,0.7)] p-3 border border-[rgba(138,43,226,0.2)] rounded-r-lg text-center group-hover:bg-gradient-to-br group-hover:from-[rgba(30,30,60,0.8)] group-hover:to-[rgba(40,40,80,0.8)] transition-all'}>
                      <span className={`${isLight ? (rating.rating <= 2 ? 'text-rose-600' : rating.rating === 3 ? 'text-amber-500' : 'text-emerald-600') : getPriorityColor(rating.rating)} font-bold`}>
                        {getPriorityLabel(rating.rating)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.level1.advice && (
            <div className={isLight ? 'bg-sky-50 p-3 mt-3 border-l-4 border-sky-300 rounded-lg text-xs text-slate-700 shadow-[0_5px_12px_rgba(125,211,252,0.25)]' : 'bg-gradient-to-br from-[rgba(0,255,255,0.1)] to-[rgba(0,200,200,0.1)] p-3 mt-3 border-l-4 border-[#00ffff] rounded-lg text-xs shadow-[0_5px_15px_rgba(0,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]'}>
              <strong>◈ Advice:</strong> {data.level1.advice}
            </div>
          )}
        </ContentCard>

        <ContentCard title="🛠 Level 2 Overview" theme={theme} className="col-span-12 lg:col-span-3">
          <div className={isLight ? "text-[11px] uppercase tracking-[2px] text-indigo-500 mb-2 font-['Orbitron']" : "text-[11px] uppercase tracking-[2px] text-[#00ffff] mb-2 font-['Orbitron']"}>
            Remediation
          </div>
          {level2Remediation.map((item, idx) => (
            <ItemBox key={idx} type="success" theme={theme}>{item}</ItemBox>
          ))}
          <div className={isLight ? "text-[11px] uppercase tracking-[2px] text-indigo-500 mt-4 mb-2 font-['Orbitron']" : "text-[11px] uppercase tracking-[2px] text-[#00ffff] mt-4 mb-2 font-['Orbitron']"}>
            Investigations
          </div>
          {level2Investigations.map((item, idx) => (
            <ItemBox key={idx} theme={theme}>{item}</ItemBox>
          ))}
        </ContentCard>

        <ContentCard title="◈ Level 3: Intrusive" theme={theme} className="col-span-12 lg:col-span-3">
          {level3Intrusive.map((item, idx) => (
            <ItemBox key={idx} theme={theme}>{item}</ItemBox>
          ))}
        </ContentCard>

        <ContentCard title="💰 Financial Impact Analysis" theme={theme} className="col-span-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {allCosts.map((cost, idx) => {
              const percentage = maxCost > 0 ? ((cost.max / maxCost) * 100) : 0
              return (
                <div
                  key={idx}
                  className={costCardClass}
                >
                  <div className={`${costCardLabelClass} mb-2`}>
                    {cost.item}
                  </div>
                  <div className={costCardValueClass}>
                    £{cost.min.toLocaleString()}-{cost.max.toLocaleString()}
                  </div>
                  <div className={costCardGaugeClass} style={{ width: `${Math.max(percentage, 6)}%` }} />
                </div>
              )
            })}
          </div>
        </ContentCard>

        <div className={totalCostBannerClass}>
          <div className="text-xs font-['Orbitron'] uppercase tracking-[0.45em] opacity-70">
            Total Estimated Cost
          </div>
          <div className="text-2xl font-['Orbitron'] font-semibold tracking-[0.2em]">
            £{minCost.toLocaleString()} - £{maxCost.toLocaleString()}
          </div>
        </div>

        <div className={negotiationBannerClass}>
          <div className="text-xs font-['Orbitron'] uppercase tracking-[0.45em] opacity-70">Negotiation Strategy</div>
          <p className="mt-2 text-sm leading-relaxed">{data.allowance || 'No negotiation guidance supplied.'}</p>
        </div>
      </div>
    </div>
  )
}

type AnalyticsSectionProps = {
  riskScore: number
  conditionScore: number
  avgRatingValue: number
  avgRatingLabel: string
  checklistComplete: number
  checklistTotal: number
  avgCost: number
  ratings: Rating[]
  allCosts: Cost[]
  maxCost: number
  theme: 'dark' | 'light'
  compact?: boolean
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  riskScore,
  conditionScore,
  avgRatingValue,
  avgRatingLabel,
  checklistComplete,
  checklistTotal,
  avgCost,
  ratings,
  allCosts,
  maxCost,
  theme,
  compact: compactProp = false,
}) => {
  const isLight = theme === 'light'
  const compact = compactProp
  const checklistPercentage = checklistTotal > 0 ? (checklistComplete / checklistTotal) * 100 : 0
  const conditionColour = conditionScore > 60 ? '#00ff00' : conditionScore > 40 ? '#ffff00' : '#ff0055'
  const ratingDescriptor = avgRatingValue >= 4 ? 'Excellent' : avgRatingValue >= 3 ? 'Sound' : 'Needs attention'
  const riskLabel = riskScore > 60 ? 'High' : riskScore > 40 ? 'Medium' : 'Low'

  const containerClass = [
    'relative overflow-hidden rounded-[26px] border transition-all duration-300',
    compact ? 'px-4 py-5 space-y-4' : 'px-8 py-10 space-y-6',
    isLight
      ? 'bg-white/90 border-slate-200 text-slate-800 shadow-[0_26px_68px_rgba(148,163,184,0.3)]'
      : 'bg-white/6 border-white/12 text-white shadow-[0_30px_80px_rgba(3,6,20,0.65)] backdrop-blur'
  ].join(' ')

  const glowClass = isLight
    ? 'pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl'
    : 'pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl'

  const headingClass = [
    'text-center font-["Orbitron"] uppercase transition-colors duration-300',
    compact ? 'mb-4 text-[10px] tracking-[0.45em]' : 'mb-8 text-sm tracking-[0.6em]',
    isLight ? 'text-slate-500' : 'text-white/70'
  ].join(' ')

  const cardDividerClass = [
    compact ? 'mt-4 pt-4 text-center text-[10px] uppercase tracking-[0.28em]' : 'mt-5 pt-5 text-center text-xs uppercase tracking-[0.3em]',
    isLight ? 'border-t border-slate-200 text-slate-500/80' : 'border-t border-white/15 text-white/60'
  ].join(' ')

  const mutedLabelClass = isLight
    ? 'mt-1 text-[10px] uppercase tracking-[0.32em] text-slate-500/80'
    : 'mt-1 text-[10px] uppercase tracking-[0.32em] text-white/60'

  const valueHighlightClass = (tone: 'indigo' | 'rose' | 'sky') => {
    if (isLight) {
      const palette: Record<typeof tone, string> = {
        indigo: 'text-indigo-600',
        rose: 'text-rose-500',
        sky: 'text-sky-500',
      }
      return `${compact ? 'text-xl' : 'text-2xl'} font-["Orbitron"] font-semibold ${palette[tone]}`
    }
    const palette: Record<typeof tone, string> = {
      indigo: 'text-white',
      rose: 'text-white',
      sky: 'text-white',
    }
    return `${compact ? 'text-xl' : 'text-2xl'} font-["Orbitron"] font-semibold ${palette[tone]}`
  }

  const CircularProgress = ({ percentage, color, label, value }: { percentage: number; color: string; label: string; value: string }) => {
    const size = compact ? 120 : 160
    const radius = compact ? 52 : 70
    const circumference = 2 * Math.PI * radius
    const safePercentage = clamp(percentage, 0, 100)
    const offset = circumference - (safePercentage / 100) * circumference
    const baseStroke = isLight ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.1)'
    const labelClass = isLight
      ? 'mt-2 text-[10px] uppercase tracking-[0.35em] text-slate-500/80'
      : 'mt-2 text-[10px] uppercase tracking-[0.35em] text-white/60'

    return (
      <div className={`relative flex items-center justify-center ${compact ? 'h-[150px]' : 'h-[200px]'}`}>
        <svg className={compact ? 'w-32 h-32' : 'w-40 h-40'} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={baseStroke} strokeWidth="15" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.5s ease' }}
            className="drop-shadow-[0_0_10px_currentColor]"
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className={`${compact ? 'text-2xl' : 'text-3xl'} font-['Orbitron'] font-semibold leading-none`} style={{ color }}>
            {value}
          </div>
          <div className={labelClass}>{label}</div>
        </div>
      </div>
    )
  }

  const BarChart = ({ data, type }: { data: (Rating | Cost)[]; type: 'ratings' | 'costs' }) => {
    const colours = type === 'ratings' ? ['#6366f1', '#0ea5e9', '#14b8a6'] : ['#f97316']
    const safeMax = type === 'costs' ? Math.max(maxCost, 1) : 5

    return (
      <div className={`w-full flex items-end gap-2 ${compact ? 'h-[120px] p-3 pb-7' : 'h-[150px] p-4 pb-9'}`}>
        {data.map((item, idx) => {
          const colour = colours[idx % colours.length]
          const magnitude = type === 'ratings'
            ? (item as Rating).rating / safeMax
            : (item as Cost).max / safeMax
          const height = clamp(magnitude * 100, 0, 100)
          const barClass = [
            'flex-1 relative min-h-[40px] rounded-t-[14px] transition-all duration-400',
            isLight
              ? 'bg-white/80 shadow-[0_8px_20px_rgba(148,163,184,0.25)] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(99,102,241,0.2)]'
              : 'bg-white/10 shadow-[0_12px_28px_rgba(3,6,20,0.5)] hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(138,43,226,0.45)] backdrop-blur'
          ].join(' ')
          const valueLabelClass = [
            `absolute ${compact ? '-top-5' : '-top-6'} left-0 right-0 text-center text-[10px] font-["Orbitron"] uppercase tracking-[0.3em]`,
            isLight ? 'text-slate-600' : 'text-white/70'
          ].join(' ')
          const elementLabelClass = [
            `absolute ${compact ? '-bottom-6' : '-bottom-7'} left-0 right-0 text-center text-[10px] uppercase tracking-[0.2em]`,
            isLight ? 'text-slate-500' : 'text-white/50'
          ].join(' ')

          return (
            <div
              key={idx}
              className={barClass}
              style={{ height: `${Math.max(height, 12)}%`, background: `linear-gradient(180deg, ${colour}CC, ${colour}55)` }}
            >
              <div className={valueLabelClass}>
                {type === 'ratings' ? `${(item as Rating).rating}/5` : `£${((item as Cost).max / 1000).toFixed(1)}K`}
              </div>
              <div className={elementLabelClass}>
                {type === 'ratings' ? (item as Rating).element : (item as Cost).item.split(' ')[0]}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const GaugeChart = ({ percentage }: { percentage: number }) => {
    const safePercentage = clamp(percentage, 0, 100)
    const radius = compact ? 52 : 70
    const circumference = Math.PI * radius
    const offset = circumference - (safePercentage / 100) * circumference
    const color = safePercentage > 60 ? '#ff0055' : safePercentage > 40 ? '#ffff00' : '#00ff00'
    const labelClass = isLight
      ? 'text-[10px] text-slate-500/80 uppercase tracking-[0.35em] mt-1'
      : 'text-[10px] text-white/60 uppercase tracking-[0.35em] mt-1'

    return (
      <div className={`relative mx-auto ${compact ? 'w-[150px] h-[90px] my-4' : 'w-[180px] h-[110px] my-5'}`}>
        <svg width={compact ? 150 : 180} height={compact ? 90 : 110} viewBox={compact ? '0 0 150 90' : '0 0 180 110'}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff00" />
              <stop offset="50%" stopColor="#ffff00" />
              <stop offset="100%" stopColor="#ff0055" />
            </linearGradient>
          </defs>
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke={isLight ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.1)'} strokeWidth="18" />
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <div className={`${compact ? 'text-xl' : 'text-2xl'} font-['Orbitron'] font-semibold`} style={{ color }}>
            {safePercentage.toFixed(0)}%
          </div>
          <div className={labelClass}>Overall Risk</div>
        </div>
      </div>
    )
  }

  const Heatmap = ({ ratings: ratingData }: { ratings: Rating[] }) => {
    const heatmapColors = ['#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444']
    const cells: { value: number | null; label?: string }[] = ratingData.map((rating) => ({ value: rating.rating, label: rating.element }))
    while (cells.length < 5) cells.push({ value: null })

    return (
      <div className={`${compact ? 'my-4 gap-2' : 'my-5 gap-2'} grid grid-cols-5`}>
        {cells.map((cell, idx) => {
          const severity = cell.value !== null ? clamp(5 - cell.value, 0, 4) : null
          const background = severity !== null ? heatmapColors[severity] : (isLight ? 'rgba(226,232,240,0.9)' : 'rgba(255,255,255,0.1)')
          const cellClass = [
            `${compact ? 'h-12' : 'h-14'} aspect-square rounded-[14px] flex items-center justify-center ${compact ? 'text-xs' : 'text-sm'} font-["Orbitron"] font-semibold transition-all duration-300`,
            isLight ? 'text-slate-800 shadow-[0_6px_16px_rgba(148,163,184,0.26)]' : 'text-white shadow-[0_12px_26px_rgba(3,6,20,0.55)] backdrop-blur'
          ].join(' ')

          return (
            <div
              key={idx}
              className={cellClass}
              style={{ background }}
              title={cell.label || ''}
            >
              {cell.value ?? '-'}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <div className={glowClass} />
      <h2 className={headingClass}>SYSTEM ANALYTICS</h2>
      <div className={`${compact ? 'grid gap-4 relative z-10 auto-rows-fr' : 'grid grid-cols-3 gap-5 relative z-10'}`}>
        <AnalyticsCard title="Risk Score" theme={theme} compact={compact}>
          <CircularProgress percentage={riskScore} color="#ff0055" label="Risk Score" value={`${riskScore}%`} />
          <div className={cardDividerClass}>
            <div className={valueHighlightClass('rose')}>{riskLabel}</div>
            <div className={mutedLabelClass}>Risk Level</div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Condition" theme={theme} compact={compact}>
          <CircularProgress percentage={conditionScore} color={conditionColour} label="Condition" value={`${conditionScore.toFixed(0)}%`} />
          <div className={cardDividerClass}>
            <div className={valueHighlightClass('indigo')}>{avgRatingLabel}/5</div>
            <div className={mutedLabelClass}>{ratingDescriptor}</div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Checklist" theme={theme} compact={compact}>
          <CircularProgress percentage={checklistPercentage} color="#00ffff" label="Checklist" value={`${checklistComplete}/${checklistTotal}`} />
          <div className={cardDividerClass}>
            <div className={valueHighlightClass('sky')}>{checklistPercentage.toFixed(0)}%</div>
            <div className={mutedLabelClass}>Completed</div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Component Ratings" theme={theme} compact={compact}>
          <BarChart data={ratings} type="ratings" />
        </AnalyticsCard>

        <AnalyticsCard title="Cost Breakdown" theme={theme} compact={compact}>
          <BarChart data={allCosts} type="costs" />
          <div className={cardDividerClass}>
            <div className={valueHighlightClass('rose')}>£{(avgCost / 1000).toFixed(1)}K</div>
            <div className={mutedLabelClass}>Avg Cost</div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Severity Heatmap" theme={theme} compact={compact}>
          <Heatmap ratings={ratings} />
          <GaugeChart percentage={riskScore} />
        </AnalyticsCard>
      </div>
    </div>
  )
}

const AnalyticsCard: React.FC<{ title?: string; children: React.ReactNode; theme: 'dark' | 'light'; compact?: boolean }> = ({ title, children, theme, compact }) => {
  const isLight = theme === 'light'
  const containerClass = [
    'relative overflow-hidden rounded-[22px] border transition-all duration-300 group',
    compact ? 'px-4 py-4' : 'px-6 py-6',
    isLight
      ? 'bg-white/90 border-slate-200 text-slate-800 shadow-[0_22px_52px_rgba(148,163,184,0.28)] hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(99,102,241,0.24)]'
      : 'bg-white/6 border-white/12 text-white shadow-[0_26px_60px_rgba(3,6,20,0.62)] hover:-translate-y-1 hover:shadow-[0_32px_80px_rgba(138,43,226,0.45)] backdrop-blur'
  ].join(' ')

  const titleClass = isLight
    ? `${compact ? 'mb-3 text-[10px]' : 'mb-5 text-xs'} text-center font-["Orbitron"] uppercase tracking-[0.45em] text-slate-500`
    : `${compact ? 'mb-3 text-[10px]' : 'mb-5 text-xs'} text-center font-["Orbitron"] uppercase tracking-[0.45em] text-white/70`

  return (
    <div className={containerClass}>
      <div className={`pointer-events-none absolute inset-0 rounded-[22px] opacity-40 ${isLight ? 'border border-white/60' : 'border border-white/15'}`} />
      {title && (
        <div className={titleClass}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

const ContentCard: React.FC<{ title: string; children: React.ReactNode; theme: 'dark' | 'light'; className?: string }> = ({ title, children, theme, className }) => {
  const isLight = theme === 'light'
  const containerClass = [
    'relative overflow-hidden rounded-[20px] border px-5 py-5 transition-all duration-300',
    isLight
      ? 'bg-white/90 border-slate-200 text-slate-800 shadow-[0_18px_45px_rgba(148,163,184,0.25)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(99,102,241,0.22)]'
      : 'bg-white/6 border-white/12 text-white shadow-[0_22px_50px_rgba(3,6,20,0.6)] hover:-translate-y-1 hover:shadow-[0_28px_65px_rgba(138,43,226,0.42)] backdrop-blur'
  ].join(' ')
  const combinedClass = className ? `${containerClass} ${className}` : containerClass

  const titleClass = isLight
    ? 'mb-4 pb-2 border-b border-slate-200 text-[11px] font-["Orbitron"] uppercase tracking-[0.4em] text-slate-500'
    : 'mb-4 pb-2 border-b border-white/15 text-[11px] font-["Orbitron"] uppercase tracking-[0.4em] text-white/70'

  return (
    <div className={combinedClass}>
      <div className={`pointer-events-none absolute inset-0 rounded-[20px] opacity-30 ${isLight ? 'border border-white/60' : 'border border-white/12'}`} />
      <div className={titleClass}>
        {title}
      </div>
      {children}
    </div>
  )
}

type ItemBoxProps = {
  children: React.ReactNode
  type?: 'default' | 'warning' | 'danger' | 'success'
  theme: 'dark' | 'light'
}

const ItemBox: React.FC<ItemBoxProps> = ({ children, type = 'default', theme }) => {
  const isLight = theme === 'light'
  const accentColours: Record<'default' | 'warning' | 'danger' | 'success', string> = {
    default: isLight ? 'from-indigo-200/60 to-sky-200/30' : 'from-white/20 to-white/5',
    warning: isLight ? 'from-amber-200/70 to-yellow-100/30' : 'from-amber-300/40 to-amber-200/10',
    danger: isLight ? 'from-rose-200/70 to-orange-200/30' : 'from-rose-400/40 to-fuchsia-300/15',
    success: isLight ? 'from-emerald-200/70 to-teal-200/30' : 'from-emerald-300/35 to-cyan-200/10',
  }

  const baseClass = [
    'relative my-2 rounded-[16px] border px-4 py-3 text-xs transition-all duration-300',
    isLight
      ? 'bg-white/85 border-slate-200 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.2)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(99,102,241,0.24)]'
      : 'bg-white/6 border-white/10 text-white/85 shadow-[0_16px_34px_rgba(3,6,20,0.5)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(138,43,226,0.45)] backdrop-blur'
  ].join(' ')

  return (
    <div className={baseClass}>
      <div className={`pointer-events-none absolute inset-x-3 top-2 h-px rounded-full opacity-80 bg-gradient-to-r ${accentColours[type]}`} />
      {children}
    </div>
  )
}

const ChecklistItem: React.FC<{ children: React.ReactNode; theme: 'dark' | 'light' }> = ({ children, theme }) => {
  const isLight = theme === 'light'
  const containerClass = [
    'relative pl-9 pr-4 py-3 my-1.5 rounded-[16px] border text-xs transition-all duration-300',
    isLight
      ? 'bg-white/85 border-emerald-200 text-slate-700 shadow-[0_12px_28px_rgba(52,211,153,0.28)]'
      : 'bg-white/6 border-emerald-300/40 text-white/85 shadow-[0_18px_36px_rgba(0,255,170,0.35)] backdrop-blur'
  ].join(' ')
  const tickClass = isLight
    ? 'absolute left-3 text-base text-emerald-500 font-bold'
    : 'absolute left-3 text-base text-emerald-300 font-bold drop-shadow-[0_0_10px_rgba(0,255,170,0.8)]'

  return (
    <div className={containerClass}>
      <span className={tickClass}>□</span>
      {children}
    </div>
  )
}

export default InspectionReport
