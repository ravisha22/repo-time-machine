import {
  curveMonotoneX,
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  hierarchy,
  line,
  pack,
  scaleLinear,
  scaleLog,
  scaleSqrt,
} from 'd3'
import type {
  ArchitectureSnapshot,
  CouplingEdge,
  FileMetric,
  MonthlyMetric,
} from '../domain.ts'
import {
  formatCompact,
  formatNumber,
  moduleColor,
} from '../lib/format.ts'

interface BubbleDatum {
  name: string
  value?: number
  children?: BubbleDatum[]
}

export function ArchitectureLandscape({
  snapshot,
}: {
  snapshot: ArchitectureSnapshot
}) {
  const width = 760
  const height = 440
  const data: BubbleDatum = {
    name: 'root',
    children: snapshot.modules.map((module) => ({
      name: module.name,
      value: module.files,
    })),
  }
  const root = hierarchy<BubbleDatum>(data)
    .sum((item) => item.value ?? 0)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))
  const layout = pack<BubbleDatum>()
    .size([width, height])
    .padding(8)(root)
  const leaves = layout.leaves()

  return (
    <svg
      className="architecture-landscape"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Architecture footprint at ${snapshot.label}`}
    >
      {leaves.map((leaf) => {
        const name = 'name' in leaf.data ? leaf.data.name : ''
        const color = moduleColor(name)
        return (
          <g key={name} transform={`translate(${leaf.x}, ${leaf.y})`}>
            <circle
              r={leaf.r}
              fill={color}
              fillOpacity={0.1}
              stroke={color}
              strokeOpacity={0.65}
              strokeWidth={1.5}
            />
            {leaf.r > 27 && (
              <>
                <text textAnchor="middle" y={-3} className="bubble-label">
                  {name.length > 22 ? `${name.slice(0, 21)}...` : name}
                </text>
                <text textAnchor="middle" y={12} className="bubble-value">
                  {formatCompact(leaf.value ?? 0)} files
                </text>
              </>
            )}
            <title>
              {name}: {leaf.value ?? 0} files
            </title>
          </g>
        )
      })}
    </svg>
  )
}

type TimelineMetric = 'commits' | 'churn' | 'meanChangeEntropy' | 'cumulativeFiles'

export function TimelineChart({
  timeline,
  metric,
  changePointMonths = [],
}: {
  timeline: MonthlyMetric[]
  metric: TimelineMetric
  changePointMonths?: string[]
}) {
  const width = 820
  const height = 330
  const margin = { top: 24, right: 26, bottom: 52, left: 68 }
  const maxValue = Math.max(...timeline.map((item) => item[metric]), 1)
  const x = scaleLinear()
    .domain([0, Math.max(1, timeline.length - 1)])
    .range([margin.left, width - margin.right])
  const y = scaleLinear()
    .domain([0, maxValue * 1.08])
    .range([height - margin.bottom, margin.top])
  const path = line<MonthlyMetric>()
    .x((_, index) => x(index))
    .y((item) => y(item[metric]))
    .curve(curveMonotoneX)(timeline)

  return (
    <svg
      className="timeline-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${metric} over recent repository history`}
    >
      {y.ticks(5).map((tick) => (
        <g key={tick}>
          <line x1={x(0)} x2={x(timeline.length - 1)} y1={y(tick)} y2={y(tick)} className="chart-grid" />
          <text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="axis-tick">
            {metric === 'meanChangeEntropy'
              ? formatNumber(tick, 2)
              : formatCompact(tick)}
          </text>
        </g>
      ))}
      {timeline.map((item, index) =>
        index % Math.max(1, Math.floor(timeline.length / 6)) === 0 ? (
          <text key={item.month} x={x(index)} y={height - 20} textAnchor="middle" className="axis-tick">
            {item.month}
          </text>
        ) : null,
      )}
      {changePointMonths.map((month) => {
        const index = timeline.findIndex((item) => item.month === month)
        if (index < 0) return null
        return (
          <line
            key={month}
            x1={x(index)}
            x2={x(index)}
            y1={margin.top}
            y2={height - margin.bottom}
            className="change-point-line"
          />
        )
      })}
      {path && <path d={path} className="metric-line" />}
      {timeline.map((item, index) => (
        <circle
          key={item.month}
          cx={x(index)}
          cy={y(item[metric])}
          r={3}
          className="metric-point"
        >
          <title>
            {item.month}: {formatNumber(item[metric], 2)}
          </title>
        </circle>
      ))}
    </svg>
  )
}

export function HotspotScatter({
  files,
  selectedPath,
  onSelect,
}: {
  files: FileMetric[]
  selectedPath: string
  onSelect: (path: string) => void
}) {
  const width = 800
  const height = 440
  const margin = { top: 24, right: 28, bottom: 58, left: 72 }
  const maximumCommits = Math.max(...files.map((file) => file.commits), 1)
  const maximumChurn = Math.max(...files.map((file) => file.churn), 10)
  const x = scaleLinear()
    .domain([0, maximumCommits * 1.05])
    .range([margin.left, width - margin.right])
  const y = scaleLog()
    .domain([1, maximumChurn * 1.1])
    .range([height - margin.bottom, margin.top])
  const size = scaleSqrt().domain([0, 100]).range([3, 15])

  return (
    <svg
      className="hotspot-scatter"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="File change frequency and churn scatter plot"
    >
      {x.ticks(6).map((tick) => (
        <g key={`x-${tick}`}>
          <line x1={x(tick)} x2={x(tick)} y1={y(1)} y2={y(maximumChurn)} className="chart-grid" />
          <text x={x(tick)} y={height - 25} textAnchor="middle" className="axis-tick">
            {formatNumber(tick, 0)}
          </text>
        </g>
      ))}
      {y.ticks(5).map((tick) => (
        <g key={`y-${tick}`}>
          <line x1={x(0)} x2={x(maximumCommits)} y1={y(tick)} y2={y(tick)} className="chart-grid" />
          <text x={margin.left - 10} y={y(tick) + 4} textAnchor="end" className="axis-tick">
            {formatCompact(tick)}
          </text>
        </g>
      ))}
      {files.map((file) => {
        const color = moduleColor(file.module)
        return (
          <circle
            key={file.path}
            cx={x(file.commits)}
            cy={y(Math.max(1, file.churn))}
            r={size(file.attentionScore)}
            fill={color}
            fillOpacity={selectedPath === file.path ? 0.9 : 0.35}
            stroke={color}
            strokeWidth={selectedPath === file.path ? 3 : 1}
            onClick={() => onSelect(file.path)}
            className="hotspot-point"
          >
            <title>
              {file.path}
              {'\n'}commits {file.commits}, churn {file.churn}, attention{' '}
              {formatNumber(file.attentionScore)}
            </title>
          </circle>
        )
      })}
      <text x={width / 2} y={height - 4} textAnchor="middle" className="axis-label">
        commit frequency
      </text>
      <text
        x={16}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 16 ${height / 2})`}
        className="axis-label"
      >
        textual churn (log scale)
      </text>
    </svg>
  )
}

interface GraphNode {
  id: string
  x?: number
  y?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  edge: CouplingEdge
}

function randomSource() {
  let state = 42
  return () => {
    state = Math.imul(1_664_525, state) + 1_013_904_223
    return (state >>> 0) / 4_294_967_296
  }
}

export function CouplingGraph({
  edges,
  selectedKey,
  onSelect,
}: {
  edges: CouplingEdge[]
  selectedKey: string
  onSelect: (edge: CouplingEdge) => void
}) {
  const width = 820
  const height = 520
  const visibleEdges = edges.slice(0, 45)
  const nodeIds = [
    ...new Set(visibleEdges.flatMap((edge) => [edge.fileA, edge.fileB])),
  ]
  const nodes: GraphNode[] = nodeIds.map((id) => ({ id }))
  const links: GraphLink[] = visibleEdges.map((edge) => ({
    source: edge.fileA,
    target: edge.fileB,
    edge,
  }))
  const simulation = forceSimulation(nodes)
    .randomSource(randomSource())
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id((node) => node.id)
        .distance((link) => 130 - Math.min(70, link.edge.coChanges * 3)),
    )
    .force('charge', forceManyBody().strength(-180))
    .force('center', forceCenter(width / 2, height / 2))
    .stop()
  for (let index = 0; index < 260; index += 1) simulation.tick()
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const maxCoChanges = Math.max(...visibleEdges.map((edge) => edge.coChanges), 1)
  const stroke = scaleLinear().domain([1, maxCoChanges]).range([0.5, 4])

  return (
    <svg
      className="coupling-graph"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Temporal file coupling network"
    >
      {visibleEdges.map((edge) => {
        const source = nodeMap.get(edge.fileA)
        const target = nodeMap.get(edge.fileB)
        if (!source || !target) return null
        const key = `${edge.fileA}\u001f${edge.fileB}`
        return (
          <line
            key={key}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            className={selectedKey === key ? 'coupling-link selected' : 'coupling-link'}
            strokeWidth={stroke(edge.coChanges)}
            onClick={() => onSelect(edge)}
          >
            <title>
              {edge.fileA} ↔ {edge.fileB}: {edge.coChanges} co-changes, lift{' '}
              {formatNumber(edge.lift)}
            </title>
          </line>
        )
      })}
      {nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
          <circle r={8} fill={moduleColor(node.id.split('/').slice(0, 2).join('/'))} />
          <text x={11} y={3} className="coupling-label">
            {node.id.split('/').at(-1)?.slice(0, 22)}
          </text>
        </g>
      ))}
    </svg>
  )
}
