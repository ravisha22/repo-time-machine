import { FolderGit2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type {
  AnalysisConfig,
  RepositoryAnalysis,
} from '../domain.ts'
import type { PresetIndexItem } from '../lib/api.ts'
import { Badge, Panel, Stat } from '../components/UI.tsx'
import {
  formatDate,
  formatNumber,
  shortSha,
} from '../lib/format.ts'

export function LabView({
  analysis,
  presets,
  activePresetId,
  loading,
  error,
  onLoadPreset,
  onAnalyzeLocal,
}: {
  analysis: RepositoryAnalysis
  presets: PresetIndexItem[]
  activePresetId: string
  loading: boolean
  error: string
  onLoadPreset: (id: string) => void
  onAnalyzeLocal: (
    repositoryPath: string,
    config: Partial<AnalysisConfig>,
  ) => Promise<void>
}) {
  const [repositoryPath, setRepositoryPath] = useState('')
  const [maxCommits, setMaxCommits] = useState(1_000)
  const [includeMerges, setIncludeMerges] = useState(false)
  const [pathDepth, setPathDepth] = useState(2)
  const [renameThreshold, setRenameThreshold] = useState(60)

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Reproducible analysis laboratory</span>
          <h1>Choose a product or open local history</h1>
          <p>
            Every analysis is tied to an exact commit, Git version, history
            window, rename policy, merge policy, and path-depth construct.
          </p>
        </div>
        <Badge tone="green">loopback API only</Badge>
      </header>

      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={activePresetId === preset.id ? 'active' : ''}
            onClick={() => onLoadPreset(preset.id)}
            style={{ '--preset-color': preset.accent } as React.CSSProperties}
          >
            <i />
            <div>
              <strong>{preset.name}</strong>
              <p>{preset.description}</p>
              <span>{preset.commits} detailed commits / {shortSha(preset.headSha)}</span>
            </div>
          </button>
        ))}
      </div>

      <Panel eyebrow="Local repository" title="Analyze a Git worktree">
        <div className="local-form">
          <label className="path-input">
            Repository path
            <div>
              <FolderGit2 size={18} />
              <input
                value={repositoryPath}
                onChange={(event) => setRepositoryPath(event.target.value)}
                placeholder="C:\path\to\repository"
              />
            </div>
          </label>
          <label>
            Maximum commits
            <input
              type="number"
              min={20}
              max={10_000}
              value={maxCommits}
              onChange={(event) => setMaxCommits(Number(event.target.value))}
            />
          </label>
          <label>
            Module path depth
            <input
              type="number"
              min={1}
              max={5}
              value={pathDepth}
              onChange={(event) => setPathDepth(Number(event.target.value))}
            />
          </label>
          <label>
            Rename similarity %
            <input
              type="number"
              min={1}
              max={100}
              value={renameThreshold}
              onChange={(event) => setRenameThreshold(Number(event.target.value))}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeMerges}
              onChange={(event) => setIncludeMerges(event.target.checked)}
            />
            Include merge commits
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!repositoryPath || loading}
            onClick={() =>
              void onAnalyzeLocal(repositoryPath, {
                maxCommits,
                pathDepth,
                renameThreshold,
                includeMerges,
              })
            }
          >
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
            Analyze history
          </button>
        </div>
        {error && <div className="analysis-error">{error}</div>}
      </Panel>

      <div className="stat-grid">
        <Stat label="HEAD" value={shortSha(analysis.manifest.headSha)} detail={analysis.manifest.branch} tone="cyan" />
        <Stat label="Window commits" value={analysis.manifest.analysisWindow.commits} detail={`${formatDate(analysis.manifest.analysisWindow.firstCommitAt)} to ${formatDate(analysis.manifest.analysisWindow.lastCommitAt)}`} tone="green" />
        <Stat label="Excluded bulk commits" value={analysis.exclusions.commitsOverCouplingLimit} detail="coupling only" tone="amber" />
        <Stat label="Git version" value={analysis.manifest.gitVersion.replace('git version ', '')} detail={formatDate(analysis.manifest.generatedAt)} tone="violet" />
      </div>

      <div className="two-column-grid">
        <Panel eyebrow="Frozen manifest" title="Analysis configuration">
          <div className="config-table">
            {Object.entries(analysis.manifest.config).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <code>
                  {Array.isArray(value)
                    ? value.join(', ')
                    : typeof value === 'number'
                      ? formatNumber(value, 4)
                      : String(value)}
                </code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Interpretation boundary" title="What this dataset cannot establish">
          <div className="limitations-list">
            {analysis.limitations.map((limitation) => (
              <div key={limitation}>
                <ShieldCheck size={15} />
                <span>{limitation}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
