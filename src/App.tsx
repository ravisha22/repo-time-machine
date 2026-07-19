import {
  Activity,
  Clock3,
  FlaskConical,
  GitBranch,
  History,
  Menu,
  Network,
  ScanSearch,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import './App.css'
import type {
  AnalysisConfig,
  FileHistory,
  RepositoryAnalysis,
} from './domain.ts'
import { Badge, LoadingState } from './components/UI.tsx'
import {
  analyzeLocalRepository,
  loadFileHistory,
  loadPresetAnalysis,
  loadPresetIndex,
  type PresetIndexItem,
} from './lib/api.ts'
import { shortSha } from './lib/format.ts'
import { ChangePointsView } from './views/ChangePointsView.tsx'
import { CouplingView } from './views/CouplingView.tsx'
import { EvolutionView } from './views/EvolutionView.tsx'
import { HotspotsView } from './views/HotspotsView.tsx'
import { LabView } from './views/LabView.tsx'
import { OwnershipView } from './views/OwnershipView.tsx'

type ViewId =
  | 'evolution'
  | 'hotspots'
  | 'coupling'
  | 'ownership'
  | 'changes'
  | 'lab'

const navigation: Array<{
  id: ViewId
  label: string
  detail: string
  icon: typeof History
}> = [
  {
    id: 'evolution',
    label: 'Time machine',
    detail: 'Release-tag architecture replay',
    icon: History,
  },
  {
    id: 'hotspots',
    label: 'Attention map',
    detail: 'Frequency, churn, ancestry',
    icon: ScanSearch,
  },
  {
    id: 'coupling',
    label: 'Temporal coupling',
    detail: 'Co-change association network',
    icon: Network,
  },
  {
    id: 'ownership',
    label: 'Ownership',
    detail: 'Modification concentration',
    icon: Users,
  },
  {
    id: 'changes',
    label: 'Change points',
    detail: 'Structural breaks and milestones',
    icon: Activity,
  },
  {
    id: 'lab',
    label: 'Repository lab',
    detail: 'Presets, local paths, manifest',
    icon: FlaskConical,
  },
]

function App() {
  const [view, setView] = useState<ViewId>('evolution')
  const [presets, setPresets] = useState<PresetIndexItem[]>([])
  const [activePresetId, setActivePresetId] = useState('')
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentNav =
    navigation.find((item) => item.id === view) ?? navigation[0]
  const CurrentIcon = currentNav?.icon ?? Clock3

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      try {
        const index = await loadPresetIndex()
        if (cancelled) return
        setPresets(index)
        const initial =
          index.find((item) => item.id === 'react') ?? index[0]
        if (!initial) throw new Error('No preset datasets are available')
        const value = await loadPresetAnalysis(initial)
        if (cancelled) return
        setActivePresetId(initial.id)
        setAnalysis(value)
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load repository data',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void initialize()
    return () => {
      cancelled = true
    }
  }, [])

  async function selectPreset(id: string) {
    const preset = presets.find((item) => item.id === id)
    if (!preset) return
    setLoading(true)
    setError('')
    try {
      setAnalysis(await loadPresetAnalysis(preset))
      setActivePresetId(id)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Preset load failed',
      )
    } finally {
      setLoading(false)
    }
  }

  async function analyzeLocal(
    repositoryPath: string,
    config: Partial<AnalysisConfig>,
  ) {
    setLoading(true)
    setError('')
    try {
      setAnalysis(await analyzeLocalRepository(repositoryPath, config))
      setActivePresetId('')
      setView('evolution')
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Local analysis failed',
      )
    } finally {
      setLoading(false)
    }
  }

  async function fullFileHistory(filePath: string): Promise<FileHistory | null> {
    if (!analysis || /^https?:\/\//.test(analysis.manifest.source)) return null
    try {
      return await loadFileHistory(analysis.manifest.source, filePath)
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : 'File history failed',
      )
      return null
    }
  }

  function navigate(next: ViewId) {
    setView(next)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Clock3 size={24} />
          </div>
          <div>
            <strong>Repo Time Machine</strong>
            <span>software evolution observatory</span>
          </div>
          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="side-navigation" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                className={view === item.id ? 'active' : ''}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-presets">
          <span className="eyebrow">Curated products</span>
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={activePresetId === preset.id ? 'active' : ''}
              onClick={() => void selectPreset(preset.id)}
              style={{ '--preset-accent': preset.accent } as React.CSSProperties}
            >
              <i />
              <span>
                <strong>{preset.name}</strong>
                <small>{preset.commits} detailed commits</small>
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <Badge tone="green">Git evidence only</Badge>
          <span>Loopback API / local processing</span>
          <span>Metrics are descriptive, not defect labels</span>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="nav-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <CurrentIcon size={18} />
            <span>{currentNav?.label}</span>
            <i />
            <strong>{analysis?.manifest.name ?? 'loading repository'}</strong>
          </div>
          <div className="topbar-right">
            {analysis && (
              <>
                <div>
                  <GitBranch size={16} />
                  {analysis.manifest.branch}
                </div>
                <Badge tone="cyan">{shortSha(analysis.manifest.headSha)}</Badge>
              </>
            )}
          </div>
        </header>

        <div className="content">
          {loading && !analysis ? (
            <LoadingState label="Loading repository history" />
          ) : error && !analysis ? (
            <div className="fatal-error">
              <strong>Repository data could not be loaded</strong>
              <span>{error}</span>
            </div>
          ) : analysis ? (
            <>
              {loading && <div className="loading-banner">Analyzing repository history…</div>}
              {view === 'evolution' && <EvolutionView analysis={analysis} />}
              {view === 'hotspots' && (
                <HotspotsView
                  analysis={analysis}
                  onLoadHistory={fullFileHistory}
                />
              )}
              {view === 'coupling' && <CouplingView analysis={analysis} />}
              {view === 'ownership' && <OwnershipView analysis={analysis} />}
              {view === 'changes' && <ChangePointsView analysis={analysis} />}
              {view === 'lab' && (
                <LabView
                  analysis={analysis}
                  presets={presets}
                  activePresetId={activePresetId}
                  loading={loading}
                  error={error}
                  onLoadPreset={(id) => void selectPreset(id)}
                  onAnalyzeLocal={analyzeLocal}
                />
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default App
