export interface AnalysisConfig {
  maxCommits: number
  includeMerges: boolean
  renameThreshold: number
  pathDepth: number
  minCouplingCommits: number
  maxFilesPerCommitForCoupling: number
  excludedPathPrefixes: string[]
  changePointAlpha: number
  changePointBootstrapIterations: number
  changePointBlockSize: number
}

export interface ChangedFile {
  path: string
  oldPath?: string
  insertions: number
  deletions: number
  binary: boolean
}

export interface CommitRecord {
  hash: string
  date: string
  author: string
  email: string
  parents: string[]
  subject: string
  files: ChangedFile[]
  insertions: number
  deletions: number
  changeEntropy: number
}

export interface RepositoryManifest {
  schemaVersion: '1.0'
  id: string
  name: string
  source: string
  remoteUrl?: string
  branch: string
  headSha: string
  generatedAt: string
  gitVersion: string
  config: AnalysisConfig
  analysisWindow: {
    firstCommitAt: string
    lastCommitAt: string
    commits: number
  }
}

export interface ModuleMetric {
  name: string
  commits: number
  churn: number
  files: number
  authors: number
  ownershipEntropy: number
  majorOwnerShare: number
}

export interface MonthlyMetric {
  month: string
  commits: number
  churn: number
  filesTouched: number
  authors: number
  meanChangeEntropy: number
  cumulativeFiles: number
  topModules: ModuleMetric[]
}

export interface ArchitectureSnapshot {
  label: string
  commit: string
  date: string
  source: 'history-window' | 'release-tag'
  totalFiles: number
  modules: Array<{
    name: string
    files: number
  }>
}

export interface FileMetric {
  path: string
  module: string
  firstSeenAt: string
  lastSeenAt: string
  commits: number
  churn: number
  authors: number
  ownershipEntropy: number
  majorOwnerShare: number
  renameCount: number
  attentionScore: number
}

export interface AuthorMetric {
  name: string
  email: string
  commits: number
  churn: number
  files: number
}

export interface CouplingEdge {
  fileA: string
  fileB: string
  coChanges: number
  support: number
  confidenceAToB: number
  confidenceBToA: number
  lift: number
}

export type ChangePointMetric = 'commits' | 'churn' | 'meanChangeEntropy'

export interface ChangePoint {
  month: string
  metric: ChangePointMetric
  score: number
  pValue: number
  beforeMean: number
  afterMean: number
  segmentStart: string
  segmentEnd: string
}

export interface MilestoneCommit {
  hash: string
  date: string
  author: string
  subject: string
  filesChanged: number
  churn: number
  bulkChange: boolean
}

export interface RepositoryAnalysis {
  manifest: RepositoryManifest
  timeline: MonthlyMetric[]
  architectureSnapshots: ArchitectureSnapshot[]
  files: FileMetric[]
  modules: ModuleMetric[]
  authors: AuthorMetric[]
  coupling: CouplingEdge[]
  changePoints: ChangePoint[]
  milestones: MilestoneCommit[]
  fileHistories: Record<string, FileHistory['commits']>
  recentCommits: Array<Omit<CommitRecord, 'files'> & { filesChanged: number }>
  exclusions: {
    commitsOverCouplingLimit: number
    filesByPrefix: number
    binaryFiles: number
  }
  limitations: string[]
}

export interface RepositoryPreset {
  id: string
  name: string
  owner: string
  description: string
  url: string
  branch: string
  historyDepth: number
  accent: string
}

export interface FileHistory {
  path: string
  commits: Array<{
    hash: string
    date: string
    author: string
    subject: string
    insertions: number
    deletions: number
  }>
}
