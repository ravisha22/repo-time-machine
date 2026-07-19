import { GitCommit, Milestone } from 'lucide-react'
import { useState } from 'react'
import type {
  ChangePointMetric,
  RepositoryAnalysis,
} from '../domain.ts'
import { TimelineChart } from '../components/Charts.tsx'
import { Badge, Panel } from '../components/UI.tsx'
import {
  formatCompact,
  formatDate,
  formatNumber,
  shortSha,
} from '../lib/format.ts'

export function ChangePointsView({
  analysis,
}: {
  analysis: RepositoryAnalysis
}) {
  const [metric, setMetric] = useState<ChangePointMetric>('commits')
  const points = analysis.changePoints.filter((point) => point.metric === metric)
  const timelineMonths = new Set(analysis.timeline.map((item) => item.month))
  const markedMonths = analysis.changePoints
    .filter(
      (point) => point.metric === metric && timelineMonths.has(point.month),
    )
    .map((point) => point.month)

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Exploratory structural breaks</span>
          <h1>When the rhythm changed</h1>
          <p>
            Recursive binary segmentation with a moving-block bootstrap flags
            candidate level shifts. It does not assign a cause.
          </p>
        </div>
        <select
          value={metric}
          onChange={(event) => setMetric(event.target.value as ChangePointMetric)}
          aria-label="Change point metric"
        >
          <option value="commits">Monthly commits</option>
          <option value="churn">Monthly churn</option>
          <option value="meanChangeEntropy">Mean change entropy</option>
        </select>
      </header>

      <Panel eyebrow="Recent detailed window" title={`${metric} change-point scan`}>
        <TimelineChart
          timeline={analysis.timeline}
          metric={metric}
          changePointMonths={markedMonths}
        />
      </Panel>

      <div className="change-layout">
        <Panel eyebrow="Detected candidates" title={`${points.length} structural breaks`}>
          <div className="change-point-list">
            {points.map((point) => (
              <article key={`${point.metric}-${point.month}`}>
                <Milestone size={18} />
                <div>
                  <strong>{point.month}</strong>
                  <span>{point.segmentStart} to {point.segmentEnd}</span>
                </div>
                <div>
                  <b>{formatNumber(point.beforeMean)} → {formatNumber(point.afterMean)}</b>
                  <small>p={formatNumber(point.pValue, 4)} / score {formatNumber(point.score)}</small>
                </div>
              </article>
            ))}
            {points.length === 0 && (
              <p>
                No break crossed the configured alpha in this bounded monthly
                window. This is not evidence of temporal stability.
              </p>
            )}
          </div>
        </Panel>

        <Panel eyebrow="Large observed changes" title="Milestone commits">
          <div className="milestone-list">
            {analysis.milestones.map((commit) => (
              <article key={commit.hash}>
                <GitCommit size={16} />
                <div>
                  <strong>{commit.subject}</strong>
                  <span>{shortSha(commit.hash)} / {commit.author} / {formatDate(commit.date)}</span>
                </div>
                <div>
                  <b>{formatCompact(commit.churn)}</b>
                  <small>{commit.filesChanged} files</small>
                </div>
                {commit.bulkChange && <Badge tone="amber">bulk change</Badge>}
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
