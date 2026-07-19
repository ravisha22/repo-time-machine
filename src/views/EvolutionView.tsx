import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RepositoryAnalysis } from '../domain.ts'
import {
  ArchitectureLandscape,
  TimelineChart,
} from '../components/Charts.tsx'
import { Badge, Panel, Stat } from '../components/UI.tsx'
import {
  formatCompact,
  formatDate,
  formatNumber,
  shortSha,
} from '../lib/format.ts'

type TimelineMetric = 'commits' | 'churn' | 'meanChangeEntropy' | 'cumulativeFiles'

export function EvolutionView({
  analysis,
}: {
  analysis: RepositoryAnalysis
}) {
  const [snapshotIndex, setSnapshotIndex] = useState(
    Math.max(0, analysis.architectureSnapshots.length - 1),
  )
  const [playing, setPlaying] = useState(false)
  const [metric, setMetric] = useState<TimelineMetric>('commits')
  const snapshot =
    analysis.architectureSnapshots[snapshotIndex] ??
    analysis.architectureSnapshots[0]
  const firstSnapshot = analysis.architectureSnapshots[0]
  const lastSnapshot = analysis.architectureSnapshots.at(-1)
  const spanYears =
    firstSnapshot && lastSnapshot
      ? (new Date(lastSnapshot.date).getTime() -
          new Date(firstSnapshot.date).getTime()) /
        (365.25 * 24 * 60 * 60 * 1_000)
      : 0

  useEffect(() => {
    setSnapshotIndex(Math.max(0, analysis.architectureSnapshots.length - 1))
    setPlaying(false)
  }, [analysis])

  useEffect(() => {
    if (!playing || analysis.architectureSnapshots.length < 2) return
    const handle = window.setInterval(() => {
      setSnapshotIndex((current) => {
        if (current >= analysis.architectureSnapshots.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 850)
    return () => window.clearInterval(handle)
  }, [analysis.architectureSnapshots.length, playing])

  if (!snapshot) return null

  return (
    <div className="view-stack">
      <section className="evolution-hero">
        <div>
          <div className="hero-meta">
            <Badge tone="cyan">{analysis.manifest.branch}</Badge>
            <span>{shortSha(analysis.manifest.headSha)}</span>
            <span>{analysis.manifest.analysisWindow.commits} detailed commits</span>
          </div>
          <h1>
            Watch <em>{analysis.manifest.name}</em>
            <br />
            become itself.
          </h1>
          <p>
            Release-tag architecture footprints span product history; detailed
            churn, ownership, and coupling come from the bounded recent window.
          </p>
        </div>
        <div className="hero-stat">
          <Sparkles size={24} />
          <strong>{formatNumber(spanYears, 1)} years</strong>
          <span>{analysis.architectureSnapshots.length} reproducible snapshots</span>
        </div>
      </section>

      <div className="stat-grid">
        <Stat
          label="Files at selected snapshot"
          value={formatCompact(snapshot.totalFiles)}
          detail={`${snapshot.label} / ${formatDate(snapshot.date)}`}
          tone="cyan"
        />
        <Stat
          label="Visible modules"
          value={snapshot.modules.length}
          detail="top path-depth modules"
          tone="violet"
        />
        <Stat
          label="Recent monthly span"
          value={`${analysis.timeline.length} months`}
          detail={`${formatDate(analysis.manifest.analysisWindow.firstCommitAt)} to ${formatDate(
            analysis.manifest.analysisWindow.lastCommitAt,
          )}`}
          tone="green"
        />
        <Stat
          label="Detected structural breaks"
          value={analysis.changePoints.length}
          detail="exploratory block-bootstrap heuristic"
          tone="amber"
        />
      </div>

      <Panel
        className="architecture-panel"
        eyebrow="Release-tag architecture footprint"
        title={`${snapshot.label} — ${formatCompact(snapshot.totalFiles)} files`}
        action={
          <Badge tone={snapshot.source === 'release-tag' ? 'green' : 'neutral'}>
            {snapshot.source}
          </Badge>
        }
      >
        <ArchitectureLandscape snapshot={snapshot} />
        <div className="snapshot-controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              if (snapshotIndex >= analysis.architectureSnapshots.length - 1) {
                setSnapshotIndex(0)
              }
              setPlaying((current) => !current)
            }}
            aria-label={playing ? 'Pause architecture replay' : 'Play architecture replay'}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setPlaying(false)
              setSnapshotIndex(0)
            }}
            aria-label="Reset architecture replay"
          >
            <RotateCcw size={17} />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, analysis.architectureSnapshots.length - 1)}
            step={1}
            value={snapshotIndex}
            onChange={(event) => {
              setSnapshotIndex(Number(event.target.value))
              setPlaying(false)
            }}
            aria-label="Architecture snapshot"
          />
          <div>
            <strong>{snapshot.label}</strong>
            <span>{formatDate(snapshot.date)}</span>
          </div>
        </div>
        <div className="snapshot-strip">
          {analysis.architectureSnapshots.map((item, index) => (
            <button
              type="button"
              key={`${item.label}-${item.commit}`}
              className={index === snapshotIndex ? 'active' : ''}
              onClick={() => {
                setSnapshotIndex(index)
                setPlaying(false)
              }}
            >
              <i />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="two-column-grid">
        <Panel
          eyebrow="Detailed recent window"
          title="Activity through time"
          action={
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as TimelineMetric)}
              aria-label="Timeline metric"
            >
              <option value="commits">Commit count</option>
              <option value="churn">Textual churn</option>
              <option value="meanChangeEntropy">Mean change entropy</option>
              <option value="cumulativeFiles">Cumulative files seen</option>
            </select>
          }
        >
          <TimelineChart timeline={analysis.timeline} metric={metric} />
        </Panel>

        <Panel eyebrow="Snapshot comparison" title="What expanded">
          <div className="module-change-list">
            {snapshot.modules.slice(0, 12).map((module) => {
              const baseline =
                firstSnapshot?.modules.find((item) => item.name === module.name)
                  ?.files ?? 0
              const delta = module.files - baseline
              return (
                <article key={module.name}>
                  <div>
                    <strong>{module.name}</strong>
                    <span>{formatCompact(module.files)} files</span>
                  </div>
                  <b className={delta >= 0 ? 'positive' : 'negative'}>
                    {delta >= 0 ? '+' : ''}
                    {formatCompact(delta)}
                  </b>
                </article>
              )
            })}
          </div>
          <p className="method-note">
            Snapshot file counts come from Git trees at selected release tags.
            They do not measure code volume or architectural quality.
          </p>
        </Panel>
      </div>
    </div>
  )
}
