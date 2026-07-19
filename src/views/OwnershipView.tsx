import { Users } from 'lucide-react'
import { useState } from 'react'
import type { RepositoryAnalysis } from '../domain.ts'
import { Panel, SegmentedControl, Stat } from '../components/UI.tsx'
import {
  formatCompact,
  formatNumber,
  formatPercent,
  moduleColor,
} from '../lib/format.ts'

type OwnershipMode = 'modules' | 'files'

export function OwnershipView({
  analysis,
}: {
  analysis: RepositoryAnalysis
}) {
  const [mode, setMode] = useState<OwnershipMode>('modules')
  const items =
    mode === 'modules'
      ? analysis.modules.slice(0, 36).map((module) => ({
          id: module.name,
          label: module.name,
          commits: module.commits,
          authors: module.authors,
          entropy: module.ownershipEntropy,
          majorShare: module.majorOwnerShare,
        }))
      : analysis.files.slice(0, 60).map((file) => ({
          id: file.path,
          label: file.path,
          commits: file.commits,
          authors: file.authors,
          entropy: file.ownershipEntropy,
          majorShare: file.majorOwnerShare,
        }))

  return (
    <div className="view-stack">
      <header className="view-heading">
        <div>
          <span className="eyebrow">Historical modification concentration</span>
          <h1>Where knowledge appears concentrated</h1>
          <p>
            Entropy and major-owner share describe commit history under the
            current mailmap. They do not measure expertise, responsibility, or performance.
          </p>
        </div>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          label="Ownership level"
          options={[
            { value: 'modules', label: 'Modules' },
            { value: 'files', label: 'Files' },
          ]}
        />
      </header>

      <div className="stat-grid">
        <Stat label="Observed authors" value={analysis.authors.length} detail="top authors retained in dataset" tone="cyan" />
        <Stat
          label="Most concentrated item"
          value={formatPercent(Math.max(...items.map((item) => item.majorShare), 0))}
          detail="largest historical author share"
          tone="amber"
        />
        <Stat
          label="Median entropy"
          value={formatNumber(
            [...items.map((item) => item.entropy)].sort((a, b) => a - b)[
              Math.floor(items.length / 2)
            ] ?? 0,
          )}
          detail="normalized 0 to 1"
          tone="violet"
        />
        <Stat
          label="Mailmap mode"
          value="enabled"
          detail="git log --use-mailmap"
          tone="green"
        />
      </div>

      <div className="ownership-layout">
        <Panel eyebrow="Concentration map" title={mode === 'modules' ? 'Module ownership' : 'File ownership'}>
          <div className="ownership-list">
            {items.map((item) => (
              <article key={item.id}>
                <i style={{ background: moduleColor(item.label) }} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.commits} commits / {item.authors} authors</span>
                  <div className="ownership-bars">
                    <span
                      className="entropy-bar"
                      style={{ width: `${item.entropy * 100}%` }}
                    />
                    <span
                      className="major-bar"
                      style={{ width: `${item.majorShare * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <b>{formatNumber(item.entropy)}</b>
                  <small>entropy</small>
                  <b>{formatPercent(item.majorShare)}</b>
                  <small>major share</small>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Contributor activity" title="Top observed authors">
          <div className="author-list">
            {analysis.authors.slice(0, 30).map((author, index) => (
              <article key={`${author.name}-${author.email}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{author.name}</strong>
                  <small>{author.email}</small>
                </div>
                <div>
                  <b>{author.commits}</b>
                  <small>commits</small>
                </div>
                <div>
                  <b>{formatCompact(author.churn)}</b>
                  <small>churn</small>
                </div>
                <div>
                  <b>{author.files}</b>
                  <small>files</small>
                </div>
              </article>
            ))}
          </div>
          <div className="ownership-warning">
            <Users size={17} />
            <span>
              Git identity, bots, pairing, squashing, and organizational changes
              can all distort this view.
            </span>
          </div>
        </Panel>
      </div>
    </div>
  )
}
