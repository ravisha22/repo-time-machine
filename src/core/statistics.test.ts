import { describe, expect, it } from 'vitest'
import type { MonthlyMetric } from '../domain.ts'
import { detectChangePoints } from './statistics.ts'

function month(index: number): string {
  const date = new Date(Date.UTC(2024, index, 1))
  return date.toISOString().slice(0, 7)
}

describe('detectChangePoints', () => {
  it('detects a sustained level shift with block-bootstrap significance', () => {
    const timeline: MonthlyMetric[] = Array.from({ length: 24 }, (_, index) => ({
      month: month(index),
      commits: index < 12 ? 3 + (index % 2) : 24 + (index % 3),
      churn: index < 12 ? 100 : 1_000,
      filesTouched: 10,
      authors: 3,
      meanChangeEntropy: index < 12 ? 0.2 : 0.7,
      cumulativeFiles: 20 + index,
      topModules: [],
    }))
    const points = detectChangePoints(
      timeline,
      'commits',
      0.05,
      300,
      3,
      42,
    )

    expect(points.length).toBeGreaterThan(0)
    expect(points.some((point) => point.month === '2025-01')).toBe(true)
  })
})
