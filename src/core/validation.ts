import { z } from 'zod'
import type { RepositoryAnalysis } from '../domain.ts'

const config = z.object({
  maxCommits: z.number().int().positive(),
  includeMerges: z.boolean(),
  renameThreshold: z.number().min(1).max(100),
  pathDepth: z.number().int().positive(),
  minCouplingCommits: z.number().int().positive(),
  maxFilesPerCommitForCoupling: z.number().int().positive(),
  excludedPathPrefixes: z.array(z.string()),
  changePointAlpha: z.number().gt(0).lt(1),
  changePointBootstrapIterations: z.number().int().positive(),
  changePointBlockSize: z.number().int().positive(),
})
const moduleMetric = z.object({
  name: z.string(),
  commits: z.number().nonnegative(),
  churn: z.number().nonnegative(),
  files: z.number().nonnegative(),
  authors: z.number().nonnegative(),
  ownershipEntropy: z.number().min(0).max(1),
  majorOwnerShare: z.number().min(0).max(1),
})
const monthlyMetric = z.object({
  month: z.string(),
  commits: z.number().nonnegative(),
  churn: z.number().nonnegative(),
  filesTouched: z.number().nonnegative(),
  authors: z.number().nonnegative(),
  meanChangeEntropy: z.number().min(0).max(1),
  cumulativeFiles: z.number().nonnegative(),
  topModules: z.array(moduleMetric),
})

export const repositoryAnalysisSchema = z.object({
  manifest: z.object({
    schemaVersion: z.literal('1.0'),
    id: z.string().min(1),
    name: z.string().min(1),
    source: z.string().min(1),
    remoteUrl: z.string().optional(),
    branch: z.string().min(1),
    headSha: z.string().min(7),
    generatedAt: z.string().min(1),
    gitVersion: z.string().min(1),
    config,
    analysisWindow: z.object({
      firstCommitAt: z.string(),
      lastCommitAt: z.string(),
      commits: z.number().nonnegative(),
    }),
  }),
  timeline: z.array(monthlyMetric),
  architectureSnapshots: z.array(
    z.object({
      label: z.string(),
      commit: z.string(),
      date: z.string(),
      source: z.enum(['history-window', 'release-tag']),
      totalFiles: z.number().nonnegative(),
      modules: z.array(
        z.object({
          name: z.string(),
          files: z.number().nonnegative(),
        }),
      ),
    }),
  ),
  files: z.array(
    z.object({
      path: z.string(),
      module: z.string(),
      firstSeenAt: z.string(),
      lastSeenAt: z.string(),
      commits: z.number().nonnegative(),
      churn: z.number().nonnegative(),
      authors: z.number().nonnegative(),
      ownershipEntropy: z.number().min(0).max(1),
      majorOwnerShare: z.number().min(0).max(1),
      renameCount: z.number().nonnegative(),
      attentionScore: z.number().min(0).max(100),
    }),
  ),
  modules: z.array(moduleMetric),
  authors: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      commits: z.number().nonnegative(),
      churn: z.number().nonnegative(),
      files: z.number().nonnegative(),
    }),
  ),
  coupling: z.array(
    z.object({
      fileA: z.string(),
      fileB: z.string(),
      coChanges: z.number().nonnegative(),
      support: z.number().min(0).max(1),
      confidenceAToB: z.number().min(0).max(1),
      confidenceBToA: z.number().min(0).max(1),
      lift: z.number().nonnegative(),
    }),
  ),
  changePoints: z.array(
    z.object({
      month: z.string(),
      metric: z.enum(['commits', 'churn', 'meanChangeEntropy']),
      score: z.number().nonnegative(),
      pValue: z.number().min(0).max(1),
      beforeMean: z.number(),
      afterMean: z.number(),
      segmentStart: z.string(),
      segmentEnd: z.string(),
    }),
  ),
  milestones: z.array(
    z.object({
      hash: z.string(),
      date: z.string(),
      author: z.string(),
      subject: z.string(),
      filesChanged: z.number().nonnegative(),
      churn: z.number().nonnegative(),
      bulkChange: z.boolean(),
    }),
  ),
  fileHistories: z.record(
    z.string(),
    z.array(
      z.object({
        hash: z.string(),
        date: z.string(),
        author: z.string(),
        subject: z.string(),
        insertions: z.number().nonnegative(),
        deletions: z.number().nonnegative(),
      }),
    ),
  ),
  recentCommits: z.array(
    z.object({
      hash: z.string(),
      date: z.string(),
      author: z.string(),
      email: z.string(),
      parents: z.array(z.string()),
      subject: z.string(),
      insertions: z.number().nonnegative(),
      deletions: z.number().nonnegative(),
      changeEntropy: z.number().min(0).max(1),
      filesChanged: z.number().nonnegative(),
    }),
  ),
  exclusions: z.object({
    commitsOverCouplingLimit: z.number().nonnegative(),
    filesByPrefix: z.number().nonnegative(),
    binaryFiles: z.number().nonnegative(),
  }),
  limitations: z.array(z.string()),
})

export function parseRepositoryAnalysis(value: unknown): RepositoryAnalysis {
  return repositoryAnalysisSchema.parse(value) as RepositoryAnalysis
}
