import { Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CouplingEdge, RepositoryAnalysis } from '../domain.ts'
import { CouplingGraph } from '../components/Charts.tsx'
import { Badge, Panel, Stat } from '../components/UI.tsx'
import {
  formatNumber,
  formatPercent,
} from '../lib/format.ts'

function edgeKey(edge: CouplingEdge): string {
  return `${edge.fileA}\u001f${edge.fileB}`
}

export function CouplingView({
  analysis,
}: {
  analysis: RepositoryAnalysis
}) {
  const [selected, setSelected] = useState<CouplingEdge | undefined>(
    analysis.coupling[0],
  )

  useEffect(() => {
    setSelected(analysis.coupling[0])
  }, [analysis])

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Temporal association</span>
          <h1>Files that travel together</h1>
          <p>
            Co-change count, support, directional confidence, and lift reveal
            historical coordination—not static dependency or causality.
          </p>
        </div>
        <Badge tone="violet">
          {analysis.exclusions.commitsOverCouplingLimit} bulk commits excluded
        </Badge>
      </header>

      <div className="coupling-layout">
        <Panel className="coupling-panel" eyebrow="Top association network" title="Co-change geometry">
          <CouplingGraph
            edges={analysis.coupling}
            selectedKey={selected ? edgeKey(selected) : ''}
            onSelect={setSelected}
          />
        </Panel>

        <Panel eyebrow="Selected relationship" title="Association measures">
          {selected && (
            <>
              <div className="coupled-files">
                <div><Link2 size={16} /><span>{selected.fileA}</span></div>
                <div><Link2 size={16} /><span>{selected.fileB}</span></div>
              </div>
              <div className="stat-grid coupling-stats">
                <Stat label="Co-changes" value={selected.coChanges} tone="cyan" />
                <Stat label="Support" value={formatPercent(selected.support)} tone="green" />
                <Stat label="A → B" value={formatPercent(selected.confidenceAToB)} tone="amber" />
                <Stat label="Lift" value={formatNumber(selected.lift)} tone="violet" />
              </div>
              <p className="method-note">
                Confidence is directional. Lift above one means the pair appears
                together more often than expected from marginal change rates,
                within eligible commits.
              </p>
            </>
          )}
        </Panel>
      </div>

      <Panel eyebrow="Ranked associations" title="Evidence table">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>File A</th>
                <th>File B</th>
                <th>Co-changes</th>
                <th>Support</th>
                <th>A → B</th>
                <th>B → A</th>
                <th>Lift</th>
              </tr>
            </thead>
            <tbody>
              {analysis.coupling.slice(0, 80).map((edge) => (
                <tr
                  key={edgeKey(edge)}
                  className={selected && edgeKey(selected) === edgeKey(edge) ? 'selected' : ''}
                  onClick={() => setSelected(edge)}
                >
                  <td>{edge.fileA}</td>
                  <td>{edge.fileB}</td>
                  <td>{edge.coChanges}</td>
                  <td>{formatPercent(edge.support)}</td>
                  <td>{formatPercent(edge.confidenceAToB)}</td>
                  <td>{formatPercent(edge.confidenceBToA)}</td>
                  <td>{formatNumber(edge.lift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
