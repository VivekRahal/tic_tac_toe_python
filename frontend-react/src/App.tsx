import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Droplets,
  FileText,
  Home,
  Sparkles,
  LayoutGrid,
  AlertTriangle,
  ShieldAlert,
  Ban,
  Coins,
  ClipboardList,
  FileText as FileTextIcon,
  X,
} from 'lucide-react'
import AddressHeader from './components/AddressHeader'
import AdminTTS from './pages/AdminTTS'
import ElevenLabsWidget from './components/ElevenLabsWidget'
import InspectionReport, { ReportContent } from './pages/InspectionReport'
import HistoryPage from './pages/HistoryPage'
import { sanitizeReportData, type ReportData } from './utils/reportSanitizer'
import { resolveApiBase } from './utils/apiBase'
import {
  deriveUserId,
  getCurrentUserId,
  getUserScopedItem,
  setUserScopedItem,
} from './utils/userScopedStorage'
import type { RICSDashboardCase } from './types/ricsDashboard'

const API_BASE = resolveApiBase()

const pressable = 'pressable'
const glass = 'glass'
const soft3D = 'soft3d'

type StructuredResult = {
  title: string
  summary: string
  findings: string[]
  recommended_actions: string[]
  risk_level: string
  keywords: string[]
  imageUrl?: string
}

const extractJsonBlock = (text: string) => {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1]) } catch { /* ignore */ }
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch { /* ignore */ }
  }
  return null
}

const normaliseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const sentenceFrom = (value: string) => {
  const cleaned = normaliseWhitespace(value)
  const idx = cleaned.indexOf('. ')
  return idx !== -1 ? cleaned.slice(0, idx + 1) : cleaned
}

const dedupeList = (items: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  items.forEach((item) => {
    const trimmed = normaliseWhitespace(item)
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(trimmed)
    }
  })
  return out
}

const detectRiskLevel = (lines: string[]): string => {
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (!lower.includes('risk')) continue
    if (lower.includes('high')) return 'high'
    if (lower.includes('moderate') || lower.includes('medium')) return 'moderate'
    if (lower.includes('low')) return 'low'
  }
  return ''
}

const extractKeywords = (source: string, fallback: string[] = []) => {
  const words = normaliseWhitespace(source).split(/[^a-zA-Z0-9]+/)
  const filtered = words.filter((w) => w.length > 3 && isNaN(Number(w))).map((w) => w.toLowerCase())
  const combined = [...filtered, ...fallback.map((w) => w.toLowerCase())]
  return dedupeList(combined).slice(0, 8)
}

const convertPlainTextToStructured = (text: string): StructuredResult | null => {
  if (!text) return null
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  const title = sentenceFrom(lines[0]).slice(0, 140) || 'Survey Analysis'
  const summary = normaliseWhitespace(lines.slice(0, 3).join(' ')) || title

  const findings: string[] = []
  const actions: string[] = []
  let current: 'findings' | 'actions' | null = null

  lines.forEach((line) => {
    const lower = line.toLowerCase()
    if (lower.startsWith('finding') || lower.startsWith('observ') || lower.startsWith('issue')) {
      current = 'findings'
      return
    }
    if (lower.startsWith('recommend') || lower.startsWith('action') || lower.includes('advise')) {
      current = 'actions'
      return
    }

    const bullet = line.replace(/^[-*•]\s*/, '')
    if (line !== bullet) {
      if (current === 'actions') actions.push(bullet)
      else findings.push(bullet)
      return
    }

    if (current === 'actions') actions.push(line)
    else if (current === 'findings') findings.push(line)
  })

  if (!findings.length) {
    const inferred = lines.filter((line) => /issue|defect|damp|crack|leak|concern/i.test(line))
    if (inferred.length) findings.push(...inferred)
  }
  if (!findings.length) findings.push(summary)

  if (!actions.length) {
    const inferred = lines.filter((line) => /repair|recommend|advise|monitor|investigate|specialist/i.test(line))
    if (inferred.length) actions.push(...inferred)
  }

  const risk = detectRiskLevel(lines) || 'moderate'
  const keywords = extractKeywords(summary, findings)

  return {
    title: normaliseWhitespace(title) || 'Survey Analysis',
    summary,
    findings: dedupeList(findings),
    recommended_actions: dedupeList(actions),
    risk_level: risk,
    keywords,
  }
}

const interpretRiskLevel = (value: string) => {
  const lower = (value || '').toLowerCase()
  if (lower.includes('high') || lower.includes('red')) return 'high'
  if (lower.includes('moderate') || lower.includes('amber')) return 'moderate'
  return lower ? 'low' : ''
}

const ensureStringArray = (input: unknown, fallbackLabel: string): string[] => {
  if (!Array.isArray(input)) return fallbackLabel ? [fallbackLabel] : []
  const items = input.map((item) => normaliseWhitespace(String(item ?? ''))).filter((item) => item.length > 0)
  return items.length ? items : (fallbackLabel ? [fallbackLabel] : [])
}

const ensureRatings = (input: unknown): RICSDashboardCase['level1']['ratings'] => {
  const entries = Array.isArray(input) ? input : []
  const ratings: RICSDashboardCase['level1']['ratings'] = entries.slice(0, 3).map((entry: any, index: number) => ({
    element: normaliseWhitespace(String(entry?.element ?? `Element ${index + 1}`)) || `Element ${index + 1}`,
    rating: Math.min(3, Math.max(1, Number(entry?.rating) || 1)),
    note: normaliseWhitespace(String(entry?.note ?? '')),
  }))
  while (ratings.length < 3) {
    const index = ratings.length
    ratings.push({ element: `Element ${index + 1}`, rating: 1, note: '' })
  }
  return ratings
}

const ensureCosts = (input: unknown): RICSDashboardCase['costs'] => {
  if (!Array.isArray(input)) return []
  return input.map((entry: any) => ({
    item: normaliseWhitespace(String(entry?.item ?? '')),
    min: Number.isFinite(entry?.min) ? Number(entry.min) : 0,
    max: Number.isFinite(entry?.max) ? Number(entry.max) : 0,
  })).filter((entry) => entry.item.length > 0)
}

const parseClassicCaseObject = (data: any): RICSDashboardCase | null => {
  if (!data || typeof data !== 'object') return null
  if (!('verdict' in data) || !('level1' in data) || !('level2' in data)) return null
  const verdict = data.verdict || {}
  const level1 = data.level1 || {}
  const level2 = data.level2 || {}
  const level3 = data.level3 || {}
  const costs = ensureCosts(data.costs)
  const property = {
    address: normaliseWhitespace(String(data.property?.address ?? '')) || undefined,
    city: normaliseWhitespace(String(data.property?.city ?? '')) || undefined,
    postcode: normaliseWhitespace(String(data.property?.postcode ?? '')) || undefined,
  }
  const hasProperty = Object.values(property).some((value) => Boolean(value))

  return {
    id: normaliseWhitespace(String(data.id ?? '1')) || '1',
    title: normaliseWhitespace(String(data.title ?? 'Survey Analysis')) || 'Survey Analysis',
    address: normaliseWhitespace(String(data.address ?? '')), 
    imageUrl: normaliseWhitespace(String(data.imageUrl ?? '')), 
    property: hasProperty ? property : undefined,
    verdict: {
      condition: normaliseWhitespace(String(verdict.condition ?? '')),
      risk: normaliseWhitespace(String(verdict.risk ?? '')),
      stance: normaliseWhitespace(String(verdict.stance ?? '')),
    },
    highlights: ensureStringArray(data.highlights, ''),
    likelyCauses: ensureStringArray(data.likelyCauses, ''),
    level1: {
      ratings: ensureRatings(level1.ratings),
      advice: normaliseWhitespace(String(level1.advice ?? '')),
    },
    level2: {
      investigations: ensureStringArray(level2.investigations, ''),
      remediation: ensureStringArray(level2.remediation, ''),
    },
    level3: {
      intrusive: ensureStringArray(level3.intrusive, ''),
      risks: ensureStringArray(level3.risks, ''),
      heavyCosts: ensureCosts(level3.heavyCosts),
    },
    costs,
    checklist: ensureStringArray(data.checklist, ''),
    allowance: normaliseWhitespace(String(data.allowance ?? '')),
  }
}

const classicCaseToStructured = (caseData: RICSDashboardCase): StructuredResult => ({
  title: caseData.title || 'Survey Analysis',
  summary: caseData.verdict.condition || caseData.verdict.stance || '',
  findings: dedupeList(caseData.highlights),
  recommended_actions: dedupeList(caseData.level2.remediation),
  risk_level: interpretRiskLevel(caseData.verdict.risk),
  keywords: dedupeList(caseData.likelyCauses),
  imageUrl: caseData.imageUrl || '',
})

const extractResultPayload = (text: string): { structured: StructuredResult | null; classic: RICSDashboardCase | null } => {
  const parsed = extractJsonBlock(text)
  if (parsed) {
    const classic = parseClassicCaseObject(parsed)
    if (classic) {
      return {
        structured: classicCaseToStructured(classic),
        classic,
      }
    }
    return {
      structured: {
        title: normaliseWhitespace(parsed.title || parsed.heading || 'Survey Analysis'),
        summary: normaliseWhitespace(parsed.summary || parsed.overview || ''),
        findings: dedupeList(Array.isArray(parsed.findings) ? parsed.findings.map((item: any) => String(item)) : []),
        recommended_actions: dedupeList(
          Array.isArray(parsed.recommended_actions)
            ? parsed.recommended_actions.map((item: any) => String(item))
            : (Array.isArray(parsed.actions) ? parsed.actions.map((item: any) => String(item)) : [])
        ),
        risk_level: (parsed.risk_level || parsed.risk || '').toString().toLowerCase(),
        keywords: dedupeList(Array.isArray(parsed.keywords) ? parsed.keywords.map((item: any) => String(item)) : []),
        imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl.trim() : '',
      },
      classic: null,
    }
  }
  return { structured: convertPlainTextToStructured(text), classic: null }
}

const toStructuredResult = (text: string): StructuredResult | null => extractResultPayload(text).structured

function Nav({ page, setPage, user, onSignOut }: { page: string, setPage: (p: string)=>void, user: any, onSignOut: ()=>void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initial = (user?.name || user?.email || '').trim().charAt(0).toUpperCase()
  return (
    <div className="fixed inset-x-0 top-0 z-50 px-0">
      <div className="relative mx-auto w-full overflow-visible border border-white/20 bg-white/8 px-4 py-3 backdrop-blur-3xl shadow-[0_40px_110px_rgba(8,14,46,0.55)] md:rounded-[28px] md:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.32),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(56,189,248,0.25),transparent_65%)] opacity-70" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-white shadow-[0_20px_40px_rgba(99,102,241,0.4)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight text-white">
              <div className="text-sm font-['Orbitron'] uppercase tracking-[0.45em] text-white/90">HomeSurvey AI</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavButton icon={<Home className="h-4 w-4"/>} label="Home" active={page==='home'} onClick={()=>setPage('home')} />
            <NavButton icon={<Camera className="h-4 w-4"/>} label="Scan" active={page==='scan'} onClick={()=>setPage('scan')} />
            {user && (
              <NavButton icon={<LayoutGrid className="h-4 w-4" />} label="History" active={page==='history'} onClick={()=>setPage('history')} />
            )}
            {user?.role === 'admin' && (
              <NavButton icon={<FileTextIcon className="h-4 w-4"/>} label="Report" active={page==='report'} onClick={()=>setPage('report')} />
            )}
            {!user && (
              <button
                className={`ml-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)] ${pressable}`}
                onClick={() => setPage('login')}
              >
                Sign in
              </button>
            )}
            {user && (
              <div className="relative z-[60]">
                <button
                  aria-label="User menu"
                  className="ml-2 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/20 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_18px_36px_rgba(15,23,42,0.45)]"
                  onClick={()=>setMenuOpen(v=>!v)}
                >
                  {initial || 'U'}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-xs uppercase tracking-[0.35em] text-white shadow-[0_28px_60px_rgba(8,14,46,0.5)] backdrop-blur-2xl" role="menu">
                    <button className="block w-full px-4 py-3 text-left hover:bg-white/15" onClick={()=>{ setPage('scan'); setMenuOpen(false) }}>Scan Console</button>
                    <button className="block w-full px-4 py-3 text-left hover:bg-white/15" onClick={()=>{ onSignOut(); setMenuOpen(false) }}>Sign out</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }:{ icon: React.ReactNode, label: string, active?: boolean, onClick?: ()=>void }){
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-all ${pressable} ${active ? 'bg-white/25 text-white shadow-[0_20px_40px_rgba(99,102,241,0.45)]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 group-hover:text-white">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function HomePage({ goScan }:{ goScan: ()=>void }){
  return (
    <div className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(160%_120%_at_0%_0%,rgba(94,234,212,0.18),transparent),radial-gradient(140%_120%_at_100%_0%,rgba(99,102,241,0.28),transparent),radial-gradient(120%_120%_at_50%_100%,rgba(56,189,248,0.22),transparent)]" />
      <div className="relative mx-auto w-[min(1200px,92vw)] space-y-16">
        <div className="grid items-center gap-10 rounded-[34px] border border-white/15 bg-white/10 p-8 backdrop-blur-3xl shadow-[0_60px_140px_rgba(8,14,46,0.5)] md:grid-cols-[minmax(320px,1fr)_minmax(320px,420px)]">
          <div className="space-y-8 text-white">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.45em] text-white/80">
              <Sparkles className="h-4 w-4" />
              HomeSurvey Tactical Suite
            </div>
            <h1 className="text-4xl font-['Orbitron'] uppercase leading-tight tracking-[0.25em] text-white drop-shadow-[0_20px_60px_rgba(56,189,248,0.55)] md:text-5xl">
              Realistic analysis.
              <br className="hidden md:block" /> Futuristic insight.
            </h1>
            <p className="max-w-xl text-base text-white/70">
              Fuse a single property image with RICS-informed heuristics. We simulate expert surveyor thinking, produce structured heatmaps, and surface negotiation intelligence—all within minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={goScan} className="rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-[0_28px_60px_rgba(99,102,241,0.45)] transition-transform hover:-translate-y-0.5">
                <Camera className="mr-3 inline h-4 w-4" /> Engage Scan
              </button>
              <button className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white/80 shadow-[0_22px_40px_rgba(8,14,46,0.45)] transition-transform hover:-translate-y-0.5">
                <FileText className="mr-3 inline h-4 w-4" /> View Sample
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[{
                label: 'Turnaround',
                value: '3 min',
                detail: 'avg insight time'
              }, {
                label: 'Accuracy delta',
                value: '+24%',
                detail: 'vs baseline manual notes'
              }, {
                label: 'Confidence band',
                value: '97%',
                detail: 'validated test suite'
              }].map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.35em] text-white/60">
                  <div className="text-[10px]">{item.label}</div>
                  <div className="mt-2 text-2xl font-['Orbitron'] text-white">{item.value}</div>
                  <div className="mt-1 text-[10px] text-white/50">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.45),transparent),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.4),transparent)] opacity-70 blur-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/5 shadow-[0_60px_120px_rgba(15,23,42,0.65)]"
            >
              <img
                alt="Futuristic survey dashboard"
                className="h-full w-full object-cover"
                src="https://images.unsplash.com/photo-1505692952047-1a78307da8f2?q=80&w=1400&auto=format&fit=crop"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 text-white">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/70">
                  <span>LIVE ANALYSIS</span>
                  <span className="font-['Orbitron']">HS-4.7</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.35em] text-white/50">
                  <div>
                    <div className="text-white/40">Moisture</div>
                    <div className="mt-1 font-['Orbitron'] text-white">04.2</div>
                  </div>
                  <div>
                    <div className="text-white/40">Risk</div>
                    <div className="mt-1 font-['Orbitron'] text-white">Low</div>
                  </div>
                  <div>
                    <div className="text-white/40">Verdict</div>
                    <div className="mt-1 font-['Orbitron'] text-white">Monitor</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[{
            title: 'Scan',
            icon: <Camera className='h-5 w-5' />, 
            text: 'Capture a single hi-res frame or upload vendor imagery. We normalise, denoise, and enrich metadata before inference.'
          }, {
            title: 'Analyse',
            icon: <Droplets className='h-5 w-5' />, 
            text: 'Hybrid LLM + rules engine maps moisture patterns, structural heuristics, and RICS-tier classifications instantly.'
          }, {
            title: 'Report',
            icon: <FileText className='h-5 w-5' />, 
            text: 'Generate negotiation-ready outputs, JSON payloads, and printable PDFs with confidence bands and next actions.'
          }].map((card, idx) => (
            <div key={idx} className="relative overflow-hidden rounded-[26px] border border-white/15 bg-white/10 p-6 text-white shadow-[0_35px_90px_rgba(8,14,46,0.45)] backdrop-blur-3xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.3),transparent),radial-gradient(circle_at_bottom,rgba(56,189,248,0.25),transparent)] opacity-60" />
              <div className="relative flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em]">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/15 text-white">{card.icon}</span>
                {card.title}
              </div>
              <p className="relative mt-4 text-sm text-white/75">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


const RiskBanner = ({ level }: { level: string }) => {
  const normalized = (level || 'moderate').toLowerCase()
  const label = normalized ? normalized.toUpperCase() : 'N/A'
  const theme = normalized === 'high'
    ? 'from-rose-500/90 via-amber-500/80 to-red-500/80 text-white border border-white/20 shadow-[0_0_22px_rgba(248,113,113,0.45)]'
    : normalized === 'low'
      ? 'from-emerald-500/85 via-teal-400/75 to-sky-400/75 text-white border border-white/15 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
      : 'from-amber-400/85 via-orange-400/75 to-yellow-400/75 text-white border border-white/15 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
  return (
    <span className={`inline-flex items-center rounded-2xl px-4 py-2 text-xs font-semibold bg-gradient-to-r ${theme} uppercase tracking-widest backdrop-blur`}>{label}</span>
  )
}

const accentThemes: Record<string, { border: string; badge: string; bullet: string; chip: string }> = {
  info: {
    border: 'border-[#3498db]',
    badge: 'bg-[#3498db]/15 text-[#1f5f86] border-[#3498db]/40',
    bullet: 'border-[#3498db] bg-[#ecf5fb]',
    chip: 'from-[#3498db] to-[#5dade2]',
  },
  warning: {
    border: 'border-[#f39c12]',
    badge: 'bg-[#f39c12]/15 text-[#8a5d07] border-[#f39c12]/30',
    bullet: 'border-[#f39c12] bg-[#fff9e6]',
    chip: 'from-[#f39c12] to-[#f8c471]',
  },
  danger: {
    border: 'border-[#e74c3c]',
    badge: 'bg-[#e74c3c]/15 text-[#922b21] border-[#e74c3c]/35',
    bullet: 'border-[#e74c3c] bg-[#ffebee]',
    chip: 'from-[#e74c3c] to-[#f1948a]',
  },
  success: {
    border: 'border-[#27ae60]',
    badge: 'bg-[#27ae60]/15 text-[#1b6f3c] border-[#27ae60]/30',
    bullet: 'border-[#27ae60] bg-[#eafaf1]',
    chip: 'from-[#27ae60] to-[#58d68d]',
  },
}

const SimpleCard = ({
  title,
  items,
  empty,
  ordered,
  layout = 'list',
  accent = 'info',
}: {
  title: string
  items?: string[]
  empty: string
  ordered?: boolean
  layout?: 'list' | 'chips'
  accent?: 'info' | 'warning' | 'danger' | 'success'
}) => {
  const content = (items && items.length ? items : [])
  const palette = accentThemes[accent] || accentThemes.info
  return (
    <div className="rounded-3xl border border-[#e0e0e0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2c3e50] border-b-2 ${palette.border}`}>{title}</div>
      <div className="px-4 py-3 text-sm text-[#2c3e50] space-y-2">
        {layout === 'chips' ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {content.length ? content.map((item, index) => (
              <span
                key={index}
                className={`rounded-full px-3 py-1 text-white shadow-[0_0_12px_rgba(0,0,0,0.12)] border border-white/30 bg-gradient-to-r ${palette.chip}`}
              >
                {item}
              </span>
            )) : <span className="text-[#7f8c8d] text-sm">{empty}</span>}
          </div>
        ) : content.length ? (
          <div className="space-y-2">
            {content.map((item, index) => (
              <div key={index} className={`rounded-2xl px-3 py-2 border-l-4 ${palette.bullet} text-sm`}>{ordered ? `${index + 1}. ${item}` : item}</div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl px-3 py-3 text-sm ${palette.badge}`}>{empty}</div>
        )}
      </div>
    </div>
  )
}

const VerdictCard = ({ condition, risk, stance }: { condition: string; risk: string; stance: string }) => {
  const normalized = (risk || 'moderate').toLowerCase()
  const gradient = normalized === 'high'
    ? 'from-[#e74c3c] via-[#c0392b] to-[#96281b]'
    : normalized === 'low'
      ? 'from-[#27ae60] via-[#1e8449] to-[#145a32]'
      : 'from-[#f39c12] via-[#f1c40f] to-[#d68910]'
  const labels = [
    { icon: <ShieldAlert className="h-4 w-4" />, text: `Condition: ${condition || 'Pending'}` },
    { icon: <AlertTriangle className="h-4 w-4" />, text: `Risk: ${risk || 'Not rated'}` },
    { icon: <Ban className="h-4 w-4" />, text: stance || 'Awaiting guidance' },
  ]
  return (
    <div className="rounded-3xl border border-[#e0e0e0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3 bg-[#f8f9fa] border-b border-[#e0e0e0] text-xs font-semibold uppercase tracking-[0.3em] text-[#2c3e50] flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#c0392b]" /> Verdict
      </div>
      <div className="px-4 py-4 space-y-2">
        {labels.map((item, idx) => (
          <div key={idx} className={`rounded-2xl bg-gradient-to-r ${gradient} text-white font-semibold px-4 py-2 flex items-center gap-2 shadow-[0_8px_18px_rgba(192,57,43,0.35)]`}>
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CostTable = ({ title, costs }: { title: string; costs?: RICSDashboardCase['costs'] }) => {
  if (!costs || !costs.length) return null
  return (
    <div className={`${glass} ${soft3D} rounded-3xl border border-white/20 bg-white/10 p-6`}>
      <div className="flex items-center gap-2 text-white font-semibold mb-3"><Coins className="h-4 w-4"/> {title}</div>
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5">
        <table className="w-full text-sm text-white/85">
          <thead className="bg-white/10 text-xs uppercase tracking-[0.3em] text-white/60">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Min</th>
              <th className="px-3 py-2 text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((row, index) => (
              <tr key={index} className="odd:bg-white/0 even:bg-white/5">
                <td className="px-3 py-2">{row.item}</td>
                <td className="px-3 py-2 text-right">£{Number(row.min || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">£{Number(row.max || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const LevelRatingsCard = ({ ratings, advice }: { ratings?: RICSDashboardCase['level1']['ratings']; advice?: string }) => {
  if (!ratings || !ratings.length) return null
  const palette = ['bg-[#e0f7fa]', 'bg-[#fff8e1]', 'bg-[#ffebee]']
  const border = ['border-[#00acc1]', 'border-[#f39c12]', 'border-[#e74c3c]']
  return (
    <div className="rounded-3xl border border-[#e0e0e0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2c3e50] border-b-2 border-[#3498db]">Level 1 Ratings</div>
      <div className="px-4 py-4 space-y-3 text-sm text-[#2c3e50]">
        {ratings.map((item, index) => (
          <div key={index} className={`rounded-2xl border-l-4 ${border[Math.min(item.rating - 1, border.length - 1)]} ${palette[Math.min(item.rating - 1, palette.length - 1)]} px-3 py-2`}> 
            <div className="flex items-center justify-between">
              <span className="font-semibold">{item.element || `Element ${index + 1}`}</span>
              <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-[#2c3e50] shadow-inner">CR{item.rating}</span>
            </div>
            <div className="mt-1 text-xs text-[#34495e]">{item.note || 'No note supplied.'}</div>
          </div>
        ))}
        {advice && (
          <div className="rounded-2xl bg-[#fff9e6] border border-[#f39c12]/40 px-3 py-2 text-xs text-[#8a5d07]">
            <strong className="uppercase tracking-[0.2em] mr-2">Advice</strong>{advice}
          </div>
        )}
      </div>
    </div>
  )
}

const RecommendationCard = ({ text }: { text?: string }) => {
  if (!text) return null
  return (
    <div className="rounded-3xl border border-[#f39c12] bg-[#fff3cd] px-4 py-3 text-sm text-[#8a5d07] shadow-[0_4px_12px_rgba(243,156,18,0.25)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold"><ClipboardList className="h-4 w-4"/> Recommendation</div>
      <div className="mt-2">{text}</div>
    </div>
  )
}

function ScanPage(){
  const inputRef = useRef<HTMLInputElement|null>(null)
  const [files,setFiles] = useState<File[]>([])
  const provider: 'openai'|'ollama' = 'openai'
  const model = 'gpt-4o-mini'
  const questionId = 'rics_single_image'
  const [loading,setLoading] = useState(false)
  const [addr,setAddr] = useState<string>('')
  const [city,setCity] = useState<string>('')
  const [pc,setPc] = useState<string>('')
  const lvl = 3
  const [analysisStructured, setAnalysisStructured] = useState<StructuredResult | null>(null)
  const [analysisClassic, setAnalysisClassic] = useState<RICSDashboardCase | null>(null)
  const [analysisRaw, setAnalysisRaw] = useState<string>('')
  const [analysisMeta, setAnalysisMeta] = useState<{ created_at?: string | null; model?: string; provider?: string } | null>(null)
  const [analysisImages, setAnalysisImages] = useState<string[]>([])
  const [analysisProperty, setAnalysisProperty] = useState<{ address?: string; city?: string; postcode?: string } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [previews, setPreviews] = useState<string[]>([])
  const [pendingImageData, setPendingImageData] = useState('')
  const [reportImageSrc, setReportImageSrc] = useState('')
  const [cachedImageB64, setCachedImageB64] = useState('')
  const [progress, setProgress] = useState(0)
  const reportRef = useRef<HTMLDivElement | null>(null)
  const [showReportOverlay, setShowReportOverlay] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>(() => (typeof window === 'undefined' ? '' : getCurrentUserId()))

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: any }>).detail
      if (detail && Object.prototype.hasOwnProperty.call(detail, 'user')) {
        setCurrentUserId(deriveUserId(detail.user))
        return
      }
      setCurrentUserId(getCurrentUserId())
    }
    window.addEventListener('hs_user_updated', handleUserUpdated as EventListener)
    return () => window.removeEventListener('hs_user_updated', handleUserUpdated as EventListener)
  }, [])

  const isPlaceholderImage = useCallback((url: string | null | undefined) => {
    if (!url) return false
    const trimmed = url.trim().toLowerCase()
    if (!trimmed) return false
    if (trimmed.includes('placeholder')) return true
    if (trimmed.includes('url_to_image')) return true
    if (trimmed.includes('example.com')) return true
    if (trimmed === 'null' || trimmed === '-' || trimmed === 'n/a') return true
    return false
  }, [])

  const panelClass = 'relative overflow-hidden rounded-[34px] border border-white/15 bg-white/10 text-white shadow-[0_60px_140px_rgba(8,14,46,0.55)] backdrop-blur-3xl'
  const secondaryPanelClass = 'relative overflow-hidden rounded-[34px] border border-white/15 bg-white/10 text-white shadow-[0_60px_140px_rgba(8,14,46,0.55)] backdrop-blur-3xl'
  const panelHaloClass = 'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-5%,rgba(99,102,241,0.32),transparent_55%),radial-gradient(circle_at_88%_115%,rgba(56,189,248,0.28),transparent_60%)]'
  const headingClass = 'text-xs font-["Orbitron"] uppercase tracking-[0.55em] text-white/75 flex items-center gap-3'
  const headingBadgeClass = 'grid h-9 w-9 place-items-center rounded-2xl bg-white/15 text-white shadow-[0_24px_60px_rgba(99,102,241,0.4)]'
  const labelClass = 'block text-[11px] uppercase tracking-[0.4em] text-white/70'
  const inputShellClass = 'relative mt-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-[0_28px_70px_rgba(8,14,46,0.5)] transition-all hover:border-white/40 hover:bg-white/15'
  const inputBaseClass = 'w-full bg-transparent text-white text-sm font-medium placeholder:text-white/35 focus:outline-none focus:ring-0'
  const inputClass = `${inputBaseClass}`
  const ghostButtonClass = `rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white/80 shadow-[0_22px_48px_rgba(8,14,46,0.45)] transition-all hover:-translate-y-0.5 hover:text-white ${pressable}`
  const primaryButtonClass = `rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(79,70,229,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_55px_rgba(79,70,229,0.5)] disabled:opacity-60 disabled:cursor-not-allowed ${pressable}`

  const normalizeImageReference = useCallback((value: string): string => {
    const trimmed = (value || '').trim()
    if (!trimmed) return ''

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

    const dataUrlMatch = trimmed.match(/^data:(image\/[^;]+);base64,(.*)$/i)
    if (dataUrlMatch) {
      const [, mime, payloadRaw = ''] = dataUrlMatch
      const payload = payloadRaw.trim().replace(/\s+/g, '')
      const isBase64 = payload.length > 0 && payload.length % 4 === 0 && /^[A-Za-z0-9+/+=_-]+$/.test(payload)
      if (isBase64) {
        const normalized = `data:${mime};base64,${payload}`
        if (import.meta.env?.DEV) {
          console.debug('[image] normalize:data-url', normalized.slice(0, 60))
        }
        return normalized
      }
      if (import.meta.env?.DEV) {
        console.debug('[image] normalize:data-url->absolute', payloadRaw.slice(0, 60))
      }
      return buildAbsolute(payloadRaw)
    }

    if (/^(data:|https?:|blob:)/i.test(trimmed)) {
      if (import.meta.env?.DEV) {
        console.debug('[image] normalize:direct', trimmed.slice(0, 60))
      }
      return trimmed
    }

    const base64Candidate = trimmed.replace(/\s+/g, '')
    const isLikelyBase64 =
      base64Candidate.length > 64 &&
      base64Candidate.length % 4 === 0 &&
      /^[A-Za-z0-9+/+=_-]+$/.test(base64Candidate)
    if (isLikelyBase64) {
      const normalized = `data:image/jpeg;base64,${base64Candidate}`
      if (import.meta.env?.DEV) {
        console.debug('[image] normalize:base64', normalized.slice(0, 60))
      }
      return normalized
    }

    const absolute = buildAbsolute(trimmed)
    if (import.meta.env?.DEV) {
      console.debug('[image] normalize:absolute', trimmed, '=>', absolute)
    }
    return absolute
  }, [])

  const updateReportImage = useCallback((next: string) => {
    if (isPlaceholderImage(next)) return
    const normalized = normalizeImageReference(next)
    if (!normalized || isPlaceholderImage(normalized)) return
    setReportImageSrc((prev) => {
      if (prev === normalized) return prev
      if (import.meta.env?.DEV) {
        console.debug('[image] updateReportImage', normalized.slice(0, 80))
      }
      return normalized
    })
  }, [isPlaceholderImage, normalizeImageReference])

  const leadPreview = useMemo(() => {
    if (files.length) {
      return normalizeImageReference(previews[0] || pendingImageData || '')
    }
    if (loading && pendingImageData) {
      return normalizeImageReference(pendingImageData)
    }
    return ''
  }, [files.length, previews, pendingImageData, loading, normalizeImageReference])

  const reportImageFallback = useMemo(
    () => {
      const candidates = [reportImageSrc, analysisImages[0], leadPreview, pendingImageData, cachedImageB64]
      const firstValid = candidates.find((candidate) => candidate && !isPlaceholderImage(candidate)) || ''
      return normalizeImageReference(firstValid)
    },
    [reportImageSrc, analysisImages, leadPreview, pendingImageData, cachedImageB64, isPlaceholderImage, normalizeImageReference]
  )

  const lastSurveyLabel = useMemo(() => {
    if (analysisMeta?.created_at) {
      const date = new Date(analysisMeta.created_at)
      const datePart = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      const timePart = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      return `Last survey · ${datePart} at ${timePart}`
    }
    return 'Last survey · awaiting new analysis'
  }, [analysisMeta?.created_at])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedB64 = getUserScopedItem('hs_last_image_b64', currentUserId) || ''
      const storedPath = storedB64 ? '' : (getUserScopedItem('hs_last_image', currentUserId) || '')
      setCachedImageB64(storedB64)
      if (!reportImageSrc) {
        if (storedB64) {
          updateReportImage(storedB64)
        } else if (storedPath) {
          updateReportImage(storedPath)
        }
      }
    } catch {
      /* ignore storage */
    }
  }, [currentUserId, reportImageSrc, updateReportImage])

  useEffect(() => {
    if (!files.length) {
      setPreviews([])
      return
    }
    const next = files.map((file) => URL.createObjectURL(file))
    setPreviews(next)
    if (next[0]) updateReportImage(next[0])
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  useEffect(() => {
    if (!loading) return
    setProgress(0)
    const interval = window.setInterval(() => {
      setProgress((previous) => (previous >= 96 ? previous : Math.min(previous + Math.random() * 8 + 4, 96)))
    }, 280)
    return () => window.clearInterval(interval)
  }, [loading])

  useEffect(() => {
    if (!loading && progress >= 96 && progress < 100) {
      const timeout = window.setTimeout(() => setProgress(100), 120)
      return () => window.clearTimeout(timeout)
    }
    if (!loading && progress === 100) {
      const timeout = window.setTimeout(() => setProgress(0), 600)
      return () => window.clearTimeout(timeout)
    }
    return
  }, [loading, progress])

  useEffect(() => {
    let hydrated = false
    try {
      const rawSaved = getUserScopedItem('hs_last_envelope', currentUserId)
      if (rawSaved) {
        const saved = JSON.parse(rawSaved)
        if (!saved?.user_id || !currentUserId || saved.user_id === currentUserId) {
          hydrated = true
          syncAnalysisFromEnvelope(saved)
        }
      }
    } catch {
      /* ignore storage */
    }
    if (!hydrated) {
      setAnalysisStructured(null)
      setAnalysisClassic(null)
      setAnalysisRaw('')
      setAnalysisMeta(null)
      setAnalysisImages([])
      setAnalysisProperty(null)
      setAddr('')
      setCity('')
      setPc('')
      setReportImageSrc('')
      setCachedImageB64('')
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail) return
      if (detail?.user_id && currentUserId && detail.user_id !== currentUserId) return
      syncAnalysisFromEnvelope(detail)
    }
    window.addEventListener('hs_envelope_updated', handler as EventListener)
    return () => window.removeEventListener('hs_envelope_updated', handler as EventListener)
  }, [currentUserId])

  const reportData = useMemo<ReportData | null>(() => {
    if (analysisClassic) {
      const addressParts = [
        analysisProperty?.address || analysisClassic.address || '',
        analysisProperty?.city || '',
      ].filter((part) => part && part !== '-')
      const addressLabel = addressParts.join(', ') || analysisProperty?.postcode || analysisClassic.address || '–'
      const preferredImage = isPlaceholderImage(analysisClassic.imageUrl)
        ? (analysisImages[0] || leadPreview || reportImageSrc || '')
        : (analysisClassic.imageUrl || analysisImages[0] || leadPreview || reportImageSrc || '')
      const enrichedImage = normalizeImageReference(preferredImage)
      const enrichedProperty = {
        ...(analysisClassic.property || {}),
        address: analysisProperty?.address || analysisClassic.address || analysisClassic.property?.address,
        city: analysisProperty?.city || analysisClassic.property?.city,
        postcode: analysisProperty?.postcode || analysisClassic.property?.postcode,
      }
      const enriched = {
        ...analysisClassic,
        property: enrichedProperty,
        address: addressLabel,
        imageUrl: enrichedImage,
      }
      return sanitizeReportData(enriched)
    }
    if (analysisStructured) {
      const addressParts = [
        analysisProperty?.address || '',
        analysisProperty?.city || '',
      ].filter((part) => part && part !== '-')
      const addressLabel = addressParts.join(', ') || analysisProperty?.postcode || '–'
      const fallback = {
        id: 'preview',
        title: analysisStructured.title,
        address: addressLabel,
        imageUrl: normalizeImageReference(
          isPlaceholderImage(analysisStructured.imageUrl)
            ? (analysisImages[0] || leadPreview || reportImageSrc || '')
            : (analysisImages[0] || analysisStructured.imageUrl || leadPreview || reportImageSrc || '')
        ),
        verdict: {
          condition: analysisStructured.summary || analysisStructured.title,
          risk: analysisStructured.risk_level || 'moderate',
          stance: analysisStructured.summary || analysisStructured.title,
        },
        highlights: analysisStructured.findings || [],
        likelyCauses: analysisStructured.keywords || [],
        level1: { ratings: [], advice: analysisStructured.summary || '' },
        level2: {
          investigations: analysisStructured.recommended_actions || [],
          remediation: analysisStructured.recommended_actions || [],
        },
        level3: { intrusive: [], risks: [], heavyCosts: [] },
        costs: [],
        checklist: analysisStructured.recommended_actions || [],
        allowance: '',
        property: analysisProperty ? { ...analysisProperty } : undefined,
      }
      return sanitizeReportData(fallback)
    }
    return null
  }, [analysisClassic, analysisStructured, analysisImages, analysisProperty, isPlaceholderImage, leadPreview, reportImageSrc, normalizeImageReference])

  const overviewAddressDisplay = useMemo(() => {
    const parts = [
      reportData?.property?.address || analysisProperty?.address || reportData?.address || '',
      reportData?.property?.city || analysisProperty?.city || '',
    ]
      .map((part) => (part || '').trim())
      .filter((part) => part.length && part !== '-')
    return parts.length ? parts.join(', ') : 'Address unavailable'
  }, [reportData, analysisProperty])

  const overviewPostcodeDisplay = useMemo(() => {
    const value = reportData?.property?.postcode || analysisProperty?.postcode || ''
    return value.trim()
  }, [reportData, analysisProperty])

  const handleDownloadPdf = useCallback(() => {
    if (!reportRef.current || !reportData) return
    const styles = `
      @page { margin: 24px; }
      body { font-family: 'Exo 2', sans-serif; background: radial-gradient(circle at top left, rgba(148,163,184,0.18), transparent); margin: 0; }
      .pdf-wrapper { max-width: 960px; margin: 0 auto; padding: 32px; background: linear-gradient(145deg, rgba(15,23,42,0.94), rgba(30,41,59,0.96)); color: #e2e8f0; border-radius: 28px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 40px 100px rgba(8,14,46,0.6); }
      .pdf-wrapper h1, .pdf-wrapper h2, .pdf-wrapper h3 { font-family: 'Orbitron', sans-serif; letter-spacing: 0.38em; text-transform: uppercase; color: #f8fafc; }
      .pdf-wrapper .gradient-bar { height: 4px; border-radius: 9999px; background: linear-gradient(90deg, #67e8f9, #6366f1, #f472b6); margin: 28px 0; }
      .pdf-wrapper img { width: 100%; border-radius: 18px; border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 24px 60px rgba(8,14,46,0.45); }
      .pdf-wrapper .badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; background: linear-gradient(90deg, rgba(14,165,233,0.25), rgba(99,102,241,0.25)); border: 1px solid rgba(255,255,255,0.2); }
    `
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>HomeSurvey Report</title><style>${styles}</style></head><body><div class=\"pdf-wrapper\">${reportRef.current.innerHTML}</div></body></html>`
    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }, [reportData])

  const closeOverlay = useCallback(() => setShowReportOverlay(false), [])

  const syncAnalysisFromEnvelope = (envelope: any) => {
    const rawText = Array.isArray(envelope?.raws) ? (envelope.raws[0] || '') : (envelope?.raw || '')
    const fallback = rawText ? extractResultPayload(rawText) : { structured: null, classic: null }
    const baseStructured = envelope?.structured ?? fallback.structured
    const baseClassic = envelope?.classic ?? fallback.classic

    let resultImages = Array.isArray(envelope?.results)
      ? envelope.results
          .map((r: any) => normalizeImageReference(r?.image_url || r?.image || r?.image_b64 || r?.image_b64_preview || ''))
          .filter((img: string) => img.length > 0)
      : []
    const envelopePreviewRaw = typeof envelope?.preview_image === 'string' ? envelope.preview_image : ''
    const envelopePreview = envelopePreviewRaw && !isPlaceholderImage(envelopePreviewRaw)
      ? normalizeImageReference(envelopePreviewRaw)
      : ''
    if (!resultImages.length && pendingImageData && !isPlaceholderImage(pendingImageData)) {
      const fallbackImage = normalizeImageReference(pendingImageData)
      if (fallbackImage && !isPlaceholderImage(fallbackImage)) resultImages = [fallbackImage]
    }
    if (!resultImages.length && envelopePreview) {
      resultImages = [envelopePreview]
      updateReportImage(envelopePreview)
      try {
        setUserScopedItem('hs_last_image_b64', envelopePreview, currentUserId)
        setCachedImageB64(envelopePreview)
      } catch {
        /* ignore storage */
      }
    }
    const leadImage = resultImages[0] || ''
    if (leadImage) {
      updateReportImage(leadImage)
    } else if (pendingImageData && !isPlaceholderImage(pendingImageData)) {
      const fallback = normalizeImageReference(pendingImageData)
      if (fallback && !isPlaceholderImage(fallback)) updateReportImage(fallback)
    }

    const classicWithImage = baseClassic ? { ...baseClassic } : null
    if (classicWithImage && leadImage && !classicWithImage.imageUrl) {
      classicWithImage.imageUrl = leadImage
    }
    const structuredNormalizedBase = baseStructured ?? (classicWithImage ? classicCaseToStructured(classicWithImage) : null)
    const structuredNormalized = structuredNormalizedBase
      ? { ...structuredNormalizedBase, imageUrl: structuredNormalizedBase.imageUrl || leadImage || '' }
      : null

    if (structuredNormalized) {
      setUserScopedItem('hs_last_result', JSON.stringify(structuredNormalized), currentUserId)
    }
    if (classicWithImage) {
      setUserScopedItem('hs_last_report_json', JSON.stringify(classicWithImage, null, 2), currentUserId)
    }
    if (leadImage) {
      setUserScopedItem('hs_last_image', leadImage, currentUserId)
    }
    if (rawText) {
      setUserScopedItem('hs_last_raw', rawText, currentUserId)
    }
    if (Array.isArray(envelope?.raws)) {
      setUserScopedItem('hs_last_raws', JSON.stringify(envelope.raws), currentUserId)
    }

    setAnalysisStructured(structuredNormalized ?? null)
    setAnalysisClassic(classicWithImage ?? null)
    setAnalysisRaw(rawText || '')
    setAnalysisMeta({ created_at: envelope?.created_at, model: envelope?.model, provider: envelope?.provider })

    const classicImage = classicWithImage?.imageUrl || ''
    if (classicImage) {
      const formatted = normalizeImageReference(classicImage)
      if (formatted && !resultImages.includes(formatted)) resultImages.push(formatted)
    }
    if (!resultImages.length && pendingImageData && !isPlaceholderImage(pendingImageData)) {
      const fallbackImage = normalizeImageReference(pendingImageData)
      if (fallbackImage && !isPlaceholderImage(fallbackImage)) resultImages = [fallbackImage]
    }
    if (!resultImages.length && envelopePreview) {
      resultImages = [envelopePreview]
      updateReportImage(envelopePreview)
      try {
        setUserScopedItem('hs_last_image_b64', envelopePreview, currentUserId)
        setCachedImageB64(envelopePreview)
      } catch {
        /* ignore storage */
      }
    }
    setAnalysisImages(resultImages.slice(0, 1))
    if (resultImages[0]) {
      updateReportImage(resultImages[0])
    }
    setAnalysisProperty((prev) => ({
      address: envelope?.property?.address ?? prev?.address ?? undefined,
      city: envelope?.property?.city ?? prev?.city ?? undefined,
      postcode: envelope?.property?.postcode ?? prev?.postcode ?? undefined,
    }))
    if (envelope?.property?.address) setAddr(envelope.property.address)
    if (envelope?.property?.city) setCity(envelope.property.city)
    if (envelope?.property?.postcode) setPc(envelope.property.postcode)
    setLoadError('')

    if (envelope && typeof envelope === 'object') {
      if (structuredNormalized) envelope.structured = structuredNormalized
      if (classicWithImage) envelope.classic = classicWithImage
      const envelopeForUser = { ...envelope, user_id: currentUserId }
      try {
        setUserScopedItem('hs_last_envelope', JSON.stringify(envelopeForUser), currentUserId)
      } catch {
        /* ignore storage */
      }
    }
  }

  const onPick = ()=> inputRef.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>)=> {
    const list = Array.from(e.target.files || [])
    if (!list.length) {
      setFiles([])
      setPendingImageData('')
      setReportImageSrc('')
      return
    }
    const first = list[0]
    setFiles([first])
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPendingImageData(reader.result)
          updateReportImage(reader.result)
          try {
            setUserScopedItem('hs_last_image_b64', reader.result, currentUserId)
            setCachedImageB64(reader.result)
          } catch {
            /* ignore storage */
          }
        }
      }
      reader.onerror = () => {
        setPendingImageData('')
        setReportImageSrc('')
      }
      reader.readAsDataURL(first)
    } catch {
      setPendingImageData('')
    }
  }

  const submit = async ()=>{
    if(!files.length || loading) return
    const token = localStorage.getItem('hs_token')
    if(!token){ window.location.href = '/login'; return }
    setLoading(true)
    try{
      const fd = new FormData()
      files.forEach(f=>fd.append('files', f))
      fd.append('question_id', questionId)
      fd.append('provider', provider)
      fd.append('model', model)
      if (addr) fd.append('property_address', addr)
      if (city) fd.append('property_city', city)
      if (pc) fd.append('property_postcode', pc)
      if (lvl) fd.append('survey_level', String(lvl))
      const res = await fetch(`${API_BASE}/api/scan`, { method:'POST', body: fd, headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if(!res.ok || j?.ok===false) throw new Error(j?.detail || j?.error || 'Scan failed')
      const rawText = Array.isArray(j?.raws) ? (j.raws[0] || '') : (j?.raw || '')
      const { structured, classic } = extractResultPayload(rawText)
      const property = j.property || (addr || city || pc
        ? {
            ...(addr ? { address: addr } : {}),
            ...(city ? { city } : {}),
            ...(pc ? { postcode: pc } : {}),
          }
        : undefined)
      const survey = j.survey || { level: lvl, date: j.created_at }
      let resultImages = Array.isArray(j?.results)
        ? j.results
            .map((r: any) => normalizeImageReference(r?.image_url || r?.image || r?.image_b64 || r?.image_b64_preview || ''))
            .filter((img: string) => img.length > 0)
        : []
      if (!resultImages.length && pendingImageData) {
        const fallbackImage = normalizeImageReference(pendingImageData)
        if (fallbackImage) resultImages = [fallbackImage]
      }
      const leadImage = resultImages[0] || ''
      if (leadImage) {
        updateReportImage(leadImage)
      } else if (pendingImageData) {
        updateReportImage(pendingImageData)
      }
      const classicWithImage = classic ? { ...classic } : null
      if (classicWithImage && leadImage && !classicWithImage.imageUrl) {
        classicWithImage.imageUrl = leadImage
      }
      const structuredNormalizedBase = structured ?? (classicWithImage ? classicCaseToStructured(classicWithImage) : null)
      const structuredNormalized = structuredNormalizedBase
        ? { ...structuredNormalizedBase, imageUrl: structuredNormalizedBase.imageUrl || leadImage || '' }
        : null

      const envelope: any = { ...j }
      const previewImageCandidate = pendingImageData || leadImage || reportImageSrc
      const previewImage = previewImageCandidate && !isPlaceholderImage(previewImageCandidate)
        ? previewImageCandidate
        : leadImage
      if (previewImage && !isPlaceholderImage(previewImage)) {
        envelope.preview_image = previewImage
        updateReportImage(previewImage)
        try {
          setUserScopedItem('hs_last_image_b64', previewImage, currentUserId)
          setCachedImageB64(previewImage)
        } catch {
          /* ignore storage */
        }
      }
      if (property) envelope.property = property
      if (survey) envelope.survey = survey
      if (structuredNormalized) envelope.structured = structuredNormalized
      if (classicWithImage) envelope.classic = classicWithImage

      try {
        if (leadImage) setUserScopedItem('hs_last_image', leadImage, currentUserId)
        if (structuredNormalized) setUserScopedItem('hs_last_result', JSON.stringify(structuredNormalized), currentUserId)
        if (classicWithImage) setUserScopedItem('hs_last_report_json', JSON.stringify(classicWithImage, null, 2), currentUserId)
        if (rawText) setUserScopedItem('hs_last_raw', rawText, currentUserId)
        if (Array.isArray(j?.raws)) setUserScopedItem('hs_last_raws', JSON.stringify(j.raws), currentUserId)
      } catch {
        /* ignore storage errors */
      }

      const scopedEnvelope = { ...envelope, user_id: currentUserId }
      setUserScopedItem('hs_last_envelope', JSON.stringify(scopedEnvelope), currentUserId)
      window.dispatchEvent(new CustomEvent('hs_envelope_updated', { detail: scopedEnvelope }))
      syncAnalysisFromEnvelope(scopedEnvelope)
      setShowReportOverlay(true)
      setFiles([])
    }catch(e){ alert((e as Error).message) }
    finally{
      setProgress(100)
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(160%_120%_at_0%_0%,rgba(94,234,212,0.18),transparent),radial-gradient(140%_120%_at_100%_0%,rgba(99,102,241,0.28),transparent),radial-gradient(120%_120%_at_50%_100%,rgba(56,189,248,0.22),transparent)]" />
      <div className="relative mx-auto w-[min(1200px,92vw)]">
        <div className="pointer-events-none absolute inset-0 rounded-[40px] border border-white/15 bg-white/8 shadow-[0_60px_140px_rgba(8,14,46,0.65)]" />
        <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_12%_0%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(circle_at_88%_100%,rgba(56,189,248,0.32),transparent_55%)]" />
        <div className="relative grid gap-6 md:grid-cols-3 text-white">
          <div className={`${panelClass} md:col-span-1 space-y-6 px-6 py-6 md:px-8`}>
            <div className={panelHaloClass} />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="flex items-center justify-between">
              <div className={headingClass}>
                <span className={headingBadgeClass}><ImageIcon className="h-5 w-5" /></span>
                Property Console
              </div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/55">v1.4</span>
            </div>
            <div className="space-y-4">
              <label className={labelClass}>Property address
                <div className={inputShellClass}>
                  <input value={addr} onChange={e=>setAddr(e.target.value)} className={inputClass} placeholder="12 Elm Street, Norwich" />
                </div>
              </label>
              <label className={labelClass}>City
                <div className={inputShellClass}>
                  <input value={city} onChange={e=>setCity(e.target.value)} className={inputClass} placeholder="Norwich" />
                </div>
              </label>
              <label className={labelClass}>Postcode
                <div className={inputShellClass}>
                  <input value={pc} onChange={e=>setPc(e.target.value)} className={inputClass} placeholder="NR2 1AB" />
                </div>
              </label>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className={`${secondaryPanelClass} space-y-6 px-6 py-6 md:px-8`}>
              <div className={panelHaloClass} />
              {loading && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-[34px] bg-slate-950/60 backdrop-blur-md">
                  <div className="relative h-28 w-28">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-300 border-b-fuchsia-400 animate-[spin_1.6s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center font-['Orbitron'] text-lg text-white">{Math.min(99, Math.round(progress))}%</div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.45em] text-white/70">Analysing imagery</p>
                </div>
              )}
              <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className={headingClass}>
                  <span className={headingBadgeClass}><Camera className="h-5 w-5" /></span>
                  Upload Console
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={onChange}/>
                  <button onClick={onPick} className={ghostButtonClass}><Camera className="mr-2 inline h-4 w-4 text-white"/>Choose files</button>
                  <button onClick={submit} className={primaryButtonClass} disabled={loading}>
                    {loading ? 'Analyzing…' : <>Analyse now <ArrowRight className="ml-2 inline h-4 w-4"/></>}
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-6 text-white/70">
                <div className="text-sm uppercase tracking-[0.35em] text-white/65">Dropzone</div>
                <div className="mt-4 rounded-2xl border border-dashed border-white/25 bg-black/30 px-4 py-6" />
              </div>
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {files.map((f,i)=> (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[0_28px_65px_rgba(8,14,46,0.55)]">
                      {previews[i] ? (
                        <img src={previews[i]} alt={f.name} className="absolute inset-0 h-full w-full object-cover opacity-80" />
                      ) : (
                        <div className="absolute inset-0 bg-white/10" />
                      )}
                      <span className="relative z-10 m-3 inline-block rounded-full border border-white/30 bg-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.35em] text-white">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {loadError && (
              <div className="rounded-[18px] border border-rose-400/60 bg-white/10 px-4 py-3 text-sm text-rose-200 shadow-[0_24px_50px_rgba(244,114,182,0.35)]">{loadError}</div>
            )}
          </div>

          {(analysisStructured || analysisClassic || analysisRaw) && (
            <div className="md:col-span-3 space-y-6">
              {reportData ? (
                <div className="space-y-5 rounded-[30px] border border-white/15 bg-white/5 px-6 py-6 text-white shadow-[0_36px_90px_rgba(8,14,46,0.55)] backdrop-blur-2xl">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="mt-1 text-sm text-white/60">{lastSurveyLabel}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReportOverlay(true)}
                        className="rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.45em] text-white shadow-[0_24px_60px_rgba(99,102,241,0.35)] transition-transform hover:-translate-y-0.5"
                      >
                        Open Workspace
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.45em] text-white shadow-[0_24px_60px_rgba(99,102,241,0.45)] transition-transform hover:-translate-y-0.5"
                      >
                        <FileText className="mr-2 inline h-4 w-4" /> Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="h-px rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div className="grid gap-4 text-[10px] uppercase tracking-[0.35em] text-white/55 md:grid-cols-4">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-center">Verdict · {reportData.verdict.condition}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-center">Risk · {reportData.verdict.risk}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-center">Actions · {reportData.checklist.length}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-center">Images · {analysisImages.length || files.length || 1}</span>
                  </div>
                </div>
              ) : (
                <div className={`${panelClass} space-y-5`}>
                  <div className="text-center text-sm text-white/70">Preparing structured JSON report…</div>
                  {analysisRaw && (
                    <pre className="whitespace-pre-wrap rounded-2xl border border-white/25 bg-black/40 px-4 py-3 text-xs text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{analysisRaw}</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {reportData && showReportOverlay && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" />
          <div className="relative z-10 flex h-full w-full items-center justify-center p-6 md:p-12">
            <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/15 bg-white/10 text-white shadow-[0_70px_160px_rgba(8,14,46,0.75)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_-10%,rgba(94,234,212,0.22),transparent_55%),radial-gradient(circle_at_90%_110%,rgba(99,102,241,0.25),transparent_55%)]" />
              <div className="relative flex items-center justify-between gap-4 border-b border-white/15 px-6 py-5">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.55em] text-white/70 font-['Orbitron']">Property Overview</div>
                  <div className="text-lg font-semibold tracking-[0.08em] text-white/95">{overviewAddressDisplay}</div>
                  {overviewPostcodeDisplay ? (
                    <div className="text-sm uppercase tracking-[0.35em] text-white/70">{overviewPostcodeDisplay}</div>
                  ) : null}
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-4 py-2 text-[11px] uppercase tracking-[0.42em] text-white/85 shadow-[0_10px_24px_rgba(99,102,241,0.35)]">
                    <span className="relative grid h-3.5 w-3.5 place-items-center">
                      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-80 blur-sm" />
                      <span className="relative h-2 w-2 rounded-full bg-white" />
                    </span>
                    <span className="font-['Orbitron'] tracking-[0.55em] text-[10px]">{lastSurveyLabel.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.45em] text-white shadow-[0_24px_60px_rgba(99,102,241,0.45)] transition-transform hover:-translate-y-0.5"
                  >
                    <FileText className="mr-2 inline h-4 w-4" /> Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={closeOverlay}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_20px_40px_rgba(8,14,46,0.45)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="relative flex-1 overflow-y-auto px-6 py-8 md:px-10">
                <div ref={reportRef} className="space-y-6">
                  <ReportContent data={reportData} theme="light" fallbackImage={reportImageFallback} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoginPage({ goScan, goSignup }:{ goScan: ()=>void, goSignup: ()=>void }){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const submit = async ()=>{
    setError('')
    if(!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try{
      const res = await fetch(`${API_BASE}/api/auth/login`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) })
      const j = await res.json()
      if(!res.ok || j?.ok===false){
        if(res.status===401){ setError('Invalid email or password.'); return }
        throw new Error(j?.detail || 'Login failed')
      }
      localStorage.setItem('hs_token', j.token)
      localStorage.setItem('hs_user', JSON.stringify(j.user||{}))
      window.dispatchEvent(new CustomEvent('hs_user_updated', { detail: { user: j.user || null } }))
      goScan()
    }catch(e:any){ setError(e.message || 'Login failed') }
    finally{ setLoading(false) }
  }
  return (
    <div className="mx-auto w-[min(500px,92vw)] py-10">
      <div className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
        <h2 className="text-white text-xl font-bold mb-4">Sign in</h2>
        <div className="grid gap-3">
          <input aria-label="Email" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input aria-label="Password" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`} onClick={submit} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <button className={`rounded-xl bg-white/10 px-3 py-2 border border-white/30 ${pressable}`} onClick={()=>{ window.location.href = `${API_BASE}/api/auth/google/start?next=/scan` }}>Continue with Google</button>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="text-sm text-white/70">No account? <button className="underline" onClick={goSignup}>Sign up</button></div>
        </div>
      </div>
    </div>
  )
}

function SignupPage({ goScan, goLogin }:{ goScan: ()=>void, goLogin: ()=>void }){
  const [name,setName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const submit = async ()=>{
    setError('')
    if(!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    try{
      const res = await fetch(`${API_BASE}/api/auth/signup`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, name, role:'user' }) })
      const j = await res.json()
      if(!res.ok || j?.ok===false){ throw new Error(j?.detail || 'Signup failed') }
      localStorage.setItem('hs_token', j.token)
      localStorage.setItem('hs_user', JSON.stringify(j.user||{}))
      window.dispatchEvent(new CustomEvent('hs_user_updated', { detail: { user: j.user || null } }))
      goScan()
    }catch(e:any){ setError(e.message || 'Signup failed') }
    finally{ setLoading(false) }
  }
  return (
    <div className="mx-auto w-[min(500px,92vw)] py-10">
      <div className={`${glass} ${soft3D} rounded-3xl p-6 border border-white/20`}>
        <h2 className="text-white text-xl font-bold mb-4">Create account</h2>
        <div className="grid gap-3">
          <input aria-label="Name" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} />
          <input aria-label="Email" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input aria-label="Password" className="rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className={`rounded-xl bg-white/20 px-3 py-2 ${pressable}`} onClick={submit} disabled={loading}>{loading ? 'Creating…' : 'Sign up'}</button>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <div className="text-sm text-white/70">Already have an account? <button className="underline" onClick={goLogin}>Log in</button></div>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  const [page,setPage] = useState<'home'|'login'|'signup'|'scan'|'history'|'admin'|'report'>('home')
  const [user,setUser] = useState<any>(null)

  const pageToPath = (p: typeof page): string => {
    if (p === 'home') return '/'
    if (p === 'login') return '/login'
    if (p === 'signup') return '/signup'
    if (p === 'scan') return '/scan'
    if (p === 'history') return '/history'
    if (p === 'admin') return '/admin/tts'
    if (p === 'report') return '/report'
    return '/'
  }
  const pathToPage = (path: string): typeof page => {
    if (path === '/login') return 'login'
    if (path === '/signup') return 'signup'
    if (path === '/scan') return 'scan'
    if (path === '/history') return 'history'
    if (path === '/admin/tts') return 'admin'
    if (path === '/report') return 'report'
    return 'home'
  }
  const navigate = (p: typeof page) => {
    // auth guard for scan
    if ((p === 'scan' || p === 'history') && !localStorage.getItem('hs_token')) {
      window.history.pushState({}, '', '/login')
      setPage('login')
      return
    }
    // admin guard
    if (p === 'admin') {
      const u = JSON.parse(localStorage.getItem('hs_user')||'null')
      if (!u || (u.role !== 'admin')) { window.history.pushState({}, '', '/'); setPage('home'); return }
    }
    if (p === 'report') {
      const u = JSON.parse(localStorage.getItem('hs_user')||'null')
      if (!u || (u.role !== 'admin')) { window.history.pushState({}, '', '/'); setPage('home'); return }
    }
    window.history.pushState({}, '', pageToPath(p))
    setPage(p)
  }
  // Handle OAuth return: store token from query params and redirect to desired page
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const next = params.get('next') || '/scan'
      if (token) {
        localStorage.setItem('hs_token', token)
        // best-effort: fetch claims to populate hs_user
        fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json()).then(j => {
            const claims = j?.claims || null
            if (j?.ok && claims && (claims.email || claims.name)) {
              const u = { email: claims.email, name: claims.name, role: claims.role || 'user' }
              localStorage.setItem('hs_user', JSON.stringify(u))
              setUser(u)
            }
          }).catch(() => {})
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Map next path to app page state
        if (next === '/scan') navigate('scan')
        else navigate('home')
      } else {
        // Initial page from path with guard
        const initial = pathToPage(window.location.pathname)
        navigate(initial)
      }
    } catch {}
    const onPop = () => setPage(pathToPage(window.location.pathname))
    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: any }>).detail
      if (detail?.user) {
        setUser(detail.user)
        return
      }
      try {
        const refreshed = JSON.parse(localStorage.getItem('hs_user') || 'null')
        setUser(refreshed || null)
      } catch {
        setUser(null)
      }
    }

    window.addEventListener('popstate', onPop)
    window.addEventListener('hs_user_updated', handleUserUpdated as EventListener)
    // bootstrap user
    try { const u = JSON.parse(localStorage.getItem('hs_user')||'null'); if (u) setUser(u) } catch {}
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hs_user_updated', handleUserUpdated as EventListener)
    }
  }, [])

  const signOut = () => {
    localStorage.removeItem('hs_token')
    localStorage.removeItem('hs_user')
    window.dispatchEvent(new CustomEvent('hs_user_updated', { detail: { user: null } }))
    setUser(null)
    navigate('home')
  }
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.25),transparent),radial-gradient(1200px_600px_at_100%_10%,rgba(99,102,241,0.25),transparent),linear-gradient(180deg,#0b0f1a,40%,#0b0f1a)] pt-28 md:pt-32">
      <div className="pointer-events-none fixed inset-0"/>
      {/* Embedded ElevenLabs agent widget */}
      <ElevenLabsWidget />
      <Nav page={page} setPage={(p)=> navigate(p as any) } user={user} onSignOut={signOut} />
      {page==='home' && <HomePage goScan={()=> navigate(localStorage.getItem('hs_token') ? 'scan' : 'login') }/>} 
      {page==='login' && <LoginPage goScan={()=>navigate('scan')} goSignup={()=>navigate('signup')} />}
      {page==='signup' && <SignupPage goScan={()=>navigate('scan')} goLogin={()=>navigate('login')} />}
      {page==='scan' && <ScanPage />} 
      {page==='history' && <HistoryPage />}
      {page==='admin' && <AdminTTS/>}
      {page==='report' && <InspectionReport />}
      <footer className="mx-auto mb-10 mt-16 w-[min(1200px,92vw)] text-center text-xs text-white/50">© {new Date().getFullYear()} HomeSurvey AI</footer>
    </div>
  )
}
