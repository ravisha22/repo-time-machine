import {
  mean,
  sampleStandardDeviation,
} from 'simple-statistics'
import type {
  ChangePoint,
  ChangePointMetric,
  MonthlyMetric,
} from '../domain.ts'

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function stableHash(value: string): number {
  let output = 2_166_136_261
  for (const character of value) {
    output ^= character.charCodeAt(0)
    output = Math.imul(output, 16_777_619)
  }
  return output >>> 0
}

function bestSplit(
  values: number[],
  minimumSegment: number,
): {
  index: number
  score: number
  beforeMean: number
  afterMean: number
} | null {
  if (values.length < minimumSegment * 2) return null
  const deviation =
    values.length > 1 ? sampleStandardDeviation(values) : 0
  const scale = deviation > 1e-12 ? deviation : 1
  let best:
    | {
        index: number
        score: number
        beforeMean: number
        afterMean: number
      }
    | undefined
  for (
    let index = minimumSegment;
    index <= values.length - minimumSegment;
    index += 1
  ) {
    const beforeMean = mean(values.slice(0, index))
    const afterMean = mean(values.slice(index))
    const score =
      (Math.abs(beforeMean - afterMean) *
        Math.sqrt((index * (values.length - index)) / values.length)) /
      scale
    if (!best || score > best.score) {
      best = { index, score, beforeMean, afterMean }
    }
  }
  return best ?? null
}

function blockResample(
  values: number[],
  blockSize: number,
  random: () => number,
): number[] {
  const output: number[] = []
  while (output.length < values.length) {
    const start = Math.floor(random() * values.length)
    for (let offset = 0; offset < blockSize; offset += 1) {
      output.push(values[(start + offset) % values.length] ?? 0)
      if (output.length >= values.length) break
    }
  }
  return output
}

function recursiveChangePoints(
  timeline: MonthlyMetric[],
  metric: ChangePointMetric,
  start: number,
  end: number,
  alpha: number,
  iterations: number,
  blockSize: number,
  minimumSegment: number,
  seed: number,
  output: ChangePoint[],
): void {
  const segment = timeline.slice(start, end)
  const values = segment.map((item) => item[metric])
  const observed = bestSplit(values, minimumSegment)
  if (!observed) return
  const random = seededRandom(seed + stableHash(`${metric}:${start}:${end}`))
  let exceedances = 0
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const bootstrap = blockResample(values, blockSize, random)
    const candidate = bestSplit(bootstrap, minimumSegment)
    if (candidate && candidate.score >= observed.score) exceedances += 1
  }
  const pValue = (exceedances + 1) / (iterations + 1)
  if (pValue > alpha) return
  const absoluteIndex = start + observed.index
  const point = timeline[absoluteIndex]
  const first = timeline[start]
  const last = timeline[end - 1]
  if (!point || !first || !last) return
  output.push({
    month: point.month,
    metric,
    score: observed.score,
    pValue,
    beforeMean: observed.beforeMean,
    afterMean: observed.afterMean,
    segmentStart: first.month,
    segmentEnd: last.month,
  })
  recursiveChangePoints(
    timeline,
    metric,
    start,
    absoluteIndex,
    alpha,
    iterations,
    blockSize,
    minimumSegment,
    seed,
    output,
  )
  recursiveChangePoints(
    timeline,
    metric,
    absoluteIndex,
    end,
    alpha,
    iterations,
    blockSize,
    minimumSegment,
    seed,
    output,
  )
}

export function detectChangePoints(
  timeline: MonthlyMetric[],
  metric: ChangePointMetric,
  alpha: number,
  iterations: number,
  blockSize: number,
  seed: number,
): ChangePoint[] {
  const output: ChangePoint[] = []
  recursiveChangePoints(
    timeline,
    metric,
    0,
    timeline.length,
    alpha,
    iterations,
    blockSize,
    4,
    seed,
    output,
  )
  return output.sort((left, right) => left.month.localeCompare(right.month))
}
