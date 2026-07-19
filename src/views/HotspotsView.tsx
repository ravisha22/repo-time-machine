import { GitCommitHorizontal, History, ScanSearch } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type {
  FileHistory,
  RepositoryAnalysis,
} from '../domain.ts'
import { HotspotScatter } from '../components/Charts.tsx'
import { Badge, Panel, Stat } from '../components/UI.tsx'
import {
  formatCompact,
  formatDate,
  formatNumber,
  formatPercent,
  moduleColor,
  shortSha,
} from '../lib/format.ts'

export function HotspotsView({
  analysis,
  onLoadHistory,
}: {
  analysis: RepositoryAnalysis
  onLoadHistory: (path: string) => Promise<FileHistory | null>
}) {
  const [selectedPath, setSelectedPath] = useState(
    analysis.files[0]?.path ?? '',
  )
  const [externalHistory, setExternalHistory] = useState<FileHistory | null>(
    null,
  )
  const selected =
    analysis.files.find((file) => file.path === selectedPath) ??
    analysis.files[0]
  const embeddedHistory = selected
    ? analysis.fileHistories[selected.path] ?? []
    : []
  const history = externalHistory?.path === selectedPath
    ? externalHistory.commits
    : embeddedHistory

  useEffect(() => {
    setSelectedPath(analysis.files[0]?.path ?? '')
    setExternalHistory(null)
  }, [analysis])

  const modulePeers = useMemo(
    () =>
      selected
        ? analysis.files
            .filter((file) => file.module === selected.module)
            .slice(0, 12)
        : [],
    [analysis.files, selected],
  )

  if (!selected) return null

  async function loadFullHistory() {
    const value = await onLoadHistory(selected.path)
    if (value) setExternalHistory(value)
  }

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Descriptive attention map</span>
          <h1>Where change keeps returning</h1>
          <p>
            Frequency and textual churn allocate visual attention. They do not
            classify defects, complexity, or importance.
          </p>
        </div>
        <Badge tone="amber">attention ≠ risk</Badge>
      </header>

      <Panel eyebrow="Two-axis evidence" title="Frequency vs textual churn">
        <HotspotScatter
          files={analysis.files}
          selectedPath={selected.path}
          onSelect={(path) => {
            setSelectedPath(path)
            setExternalHistory(null)
          }}
        />
      </Panel>

      <div className="hotspot-detail-grid">
        <Panel
          eyebrow="Selected file"
          title={selected.path}
          action={
            <Badge tone="cyan">{selected.module}</Badge>
          }
        >
          <div className="stat-grid compact-stats">
            <Stat label="Commits" value={selected.commits} detail="within analyzed window" tone="cyan" />
            <Stat label="Churn" value={formatCompact(selected.churn)} detail="insertions + deletions" tone="amber" />
            <Stat label="Authors" value={selected.authors} detail={`${formatPercent(selected.majorOwnerShare)} major share`} tone="violet" />
            <Stat label="Attention" value={formatNumber(selected.attentionScore)} detail="repository-normalized" tone="green" />
          </div>
          <div className="file-facts">
            <div>
              <span>First observed</span>
              <strong>{formatDate(selected.firstSeenAt)}</strong>
            </div>
            <div>
              <span>Last observed</span>
              <strong>{formatDate(selected.lastSeenAt)}</strong>
            </div>
            <div>
              <span>Ownership entropy</span>
              <strong>{formatNumber(selected.ownershipEntropy)}</strong>
            </div>
            <div>
              <span>Detected renames</span>
              <strong>{selected.renameCount}</strong>
            </div>
          </div>
          <div className="formula-note">
            <ScanSearch size={18} />
            <code>commits × log2(churn + 2)</code>
            <span>normalized to the largest file in this dataset</span>
          </div>
        </Panel>

        <Panel
          eyebrow="File ancestry"
          title={`${history.length} observed changes`}
          action={
            history.length < 2 && (
              <button type="button" className="text-button" onClick={() => void loadFullHistory()}>
                <History size={15} /> Load full local history
              </button>
            )
          }
        >
          <div className="ancestry-list">
            {history.map((commit) => (
              <article key={commit.hash}>
                <GitCommitHorizontal size={16} />
                <div>
                  <strong>{commit.subject}</strong>
                  <span>
                    {shortSha(commit.hash)} / {commit.author} / {formatDate(commit.date)}
                  </span>
                </div>
                <b>
                  +{commit.insertions} -{commit.deletions}
                </b>
              </article>
            ))}
            {history.length === 0 && (
              <p>No ancestry was embedded for this lower-ranked file.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Module neighborhood" title={`Other active files in ${selected.module}`}>
        <div className="peer-grid">
          {modulePeers.map((file) => (
            <button
              type="button"
              key={file.path}
              onClick={() => {
                setSelectedPath(file.path)
                setExternalHistory(null)
              }}
              style={{ '--module-color': moduleColor(file.module) } as React.CSSProperties}
            >
              <i />
              <span>
                <strong>{file.path.split('/').at(-1)}</strong>
                <small>{file.commits} commits / {formatCompact(file.churn)} churn</small>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}
