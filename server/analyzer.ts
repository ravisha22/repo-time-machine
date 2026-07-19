import { execFile } from 'node:child_process'
import path from 'node:path'
import { realpath } from 'node:fs/promises'
import { promisify } from 'node:util'
import {
  mean,
} from 'simple-statistics'
import type {
  AnalysisConfig,
  ArchitectureSnapshot,
  AuthorMetric,
  ChangedFile,
  CommitRecord,
  CouplingEdge,
  FileHistory,
  FileMetric,
  MilestoneCommit,
  ModuleMetric,
  MonthlyMetric,
  RepositoryAnalysis,
} from '../src/domain.ts'
import { detectChangePoints } from '../src/core/statistics.ts'

const execFileAsync = promisify(execFile)
const RECORD_SEPARATOR = '\u001e'
const FIELD_SEPARATOR = '\u001f'

interface FileAccumulator {
  commits: number
  churn: number
  authors: Map<string, number>
  firstSeenAt: string
  lastSeenAt: string
  renameCount: number
}

interface ModuleAccumulator {
  commits: Set<string>
  churn: number
  files: Set<string>
  authors: Map<string, number>
}

export const defaultAnalysisConfig: AnalysisConfig = {
  maxCommits: 1_000,
  includeMerges: false,
  renameThreshold: 60,
  pathDepth: 2,
  minCouplingCommits: 3,
  maxFilesPerCommitForCoupling: 50,
  excludedPathPrefixes: [
    'node_modules/',
    'vendor/',
    'dist/',
    'build/',
    '.git/',
  ],
  changePointAlpha: 0.05,
  changePointBootstrapIterations: 300,
  changePointBlockSize: 3,
}

async function runGit(
  repositoryPath: string,
  args: string[],
  timeout = 900_000,
): Promise<string> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repositoryPath, '--no-pager', ...args],
    {
      encoding: 'utf8',
      maxBuffer: 96 * 1024 * 1024,
      timeout,
      windowsHide: true,
    },
  )
  return stdout
}

function parseNumber(value: string): number {
  if (value === '-') return 0
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) ? number : 0
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}

function parseRename(filePath: string): {
  path: string
  oldPath?: string
} {
  const normalized = normalizePath(filePath)
  const brace = normalized.match(/^(.*)\{(.+) => (.+)\}(.*)$/)
  if (brace) {
    return {
      oldPath: `${brace[1]}${brace[2]}${brace[4]}`,
      path: `${brace[1]}${brace[3]}${brace[4]}`,
    }
  }
  const direct = normalized.match(/^(.+) => (.+)$/)
  if (direct) {
    return { oldPath: direct[1], path: direct[2] as string }
  }
  return { path: normalized }
}

function moduleOf(filePath: string, depth: number): string {
  const parts = normalizePath(filePath).split('/').filter(Boolean)
  if (parts.length <= 1) return '(root)'
  return parts.slice(0, Math.max(1, depth)).join('/')
}

function entropy(values: number[]): number {
  const positive = values.filter((value) => value > 0)
  const total = positive.reduce((sum, value) => sum + value, 0)
  if (positive.length <= 1 || total <= 0) return 0
  const raw = -positive.reduce((sum, value) => {
    const probability = value / total
    return sum + probability * Math.log2(probability)
  }, 0)
  return raw / Math.log2(positive.length)
}

function parseLog(output: string, pathDepth: number): CommitRecord[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [header = '', ...lines] = record.split(/\r?\n/)
      const [
        hash = '',
        date = '',
        author = '',
        email = '',
        parents = '',
        subject = '',
      ] = header.split(FIELD_SEPARATOR)
      const files: ChangedFile[] = lines
        .map((line) => line.split('\t'))
        .filter((parts) => parts.length >= 3)
        .map(([insertions = '0', deletions = '0', ...pathParts]) => {
          const parsed = parseRename(pathParts.join('\t'))
          return {
            ...parsed,
            insertions: parseNumber(insertions),
            deletions: parseNumber(deletions),
            binary: insertions === '-' || deletions === '-',
          }
        })
      const moduleChurn = new Map<string, number>()
      files.forEach((file) => {
        const module = moduleOf(file.path, pathDepth)
        moduleChurn.set(
          module,
          (moduleChurn.get(module) ?? 0) + file.insertions + file.deletions,
        )
      })
      return {
        hash,
        date,
        author,
        email,
        parents: parents.split(' ').filter(Boolean),
        subject,
        files,
        insertions: files.reduce((sum, file) => sum + file.insertions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
        changeEntropy: entropy([...moduleChurn.values()]),
      }
    })
}

function ownership(values: Map<string, number>): {
  entropy: number
  majorOwnerShare: number
} {
  const counts = [...values.values()]
  const total = counts.reduce((sum, value) => sum + value, 0)
  return {
    entropy: entropy(counts),
    majorOwnerShare: total === 0 ? 0 : Math.max(0, ...counts) / total,
  }
}

function isExcluded(filePath: string, config: AnalysisConfig): boolean {
  const normalized = normalizePath(filePath)
  return config.excludedPathPrefixes.some((prefix) =>
    normalized.startsWith(normalizePath(prefix)),
  )
}

function makeModuleMetrics(
  modules: Map<string, ModuleAccumulator>,
): ModuleMetric[] {
  return [...modules.entries()]
    .map(([name, value]) => {
      const ownershipValues = ownership(value.authors)
      return {
        name,
        commits: value.commits.size,
        churn: value.churn,
        files: value.files.size,
        authors: value.authors.size,
        ownershipEntropy: ownershipValues.entropy,
        majorOwnerShare: ownershipValues.majorOwnerShare,
      }
    })
    .sort((left, right) => right.commits - left.commits)
}

function monthOf(date: string): string {
  return date.slice(0, 7)
}

function makeTimeline(
  commitsOldestFirst: CommitRecord[],
  config: AnalysisConfig,
): MonthlyMetric[] {
  const months = new Map<
    string,
    {
      commits: CommitRecord[]
      files: Set<string>
      authors: Set<string>
      modules: Map<string, ModuleAccumulator>
    }
  >()
  commitsOldestFirst.forEach((commit) => {
    const month = monthOf(commit.date)
    const bucket = months.get(month) ?? {
      commits: [],
      files: new Set<string>(),
      authors: new Set<string>(),
      modules: new Map<string, ModuleAccumulator>(),
    }
    bucket.commits.push(commit)
    bucket.authors.add(commit.author)
    commit.files.forEach((file) => {
      if (isExcluded(file.path, config)) return
      bucket.files.add(file.path)
      const moduleName = moduleOf(file.path, config.pathDepth)
      const module = bucket.modules.get(moduleName) ?? {
        commits: new Set<string>(),
        churn: 0,
        files: new Set<string>(),
        authors: new Map<string, number>(),
      }
      module.commits.add(commit.hash)
      module.churn += file.insertions + file.deletions
      module.files.add(file.path)
      module.authors.set(
        commit.author,
        (module.authors.get(commit.author) ?? 0) + 1,
      )
      bucket.modules.set(moduleName, module)
    })
    months.set(month, bucket)
  })
  const cumulativeFiles = new Set<string>()
  return [...months.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, bucket]) => {
      bucket.files.forEach((file) => cumulativeFiles.add(file))
      return {
        month,
        commits: bucket.commits.length,
        churn: bucket.commits.reduce(
          (sum, commit) => sum + commit.insertions + commit.deletions,
          0,
        ),
        filesTouched: bucket.files.size,
        authors: bucket.authors.size,
        meanChangeEntropy:
          bucket.commits.length === 0
            ? 0
            : mean(bucket.commits.map((commit) => commit.changeEntropy)),
        cumulativeFiles: cumulativeFiles.size,
        topModules: makeModuleMetrics(bucket.modules).slice(0, 8),
      }
    })
}

function makeCoupling(
  commits: CommitRecord[],
  config: AnalysisConfig,
): {
  edges: CouplingEdge[]
  excludedCommits: number
} {
  const fileCommits = new Map<string, number>()
  const pairs = new Map<string, number>()
  let eligibleCommits = 0
  let excludedCommits = 0
  commits.forEach((commit) => {
    const files = [
      ...new Set(
        commit.files
          .map((file) => file.path)
          .filter((file) => !isExcluded(file, config)),
      ),
    ]
    if (files.length > config.maxFilesPerCommitForCoupling) {
      excludedCommits += 1
      return
    }
    if (files.length < 2) return
    eligibleCommits += 1
    files.forEach((file) =>
      fileCommits.set(file, (fileCommits.get(file) ?? 0) + 1),
    )
    for (let left = 0; left < files.length; left += 1) {
      for (let right = left + 1; right < files.length; right += 1) {
        const pair = [files[left], files[right]].sort().join('\u001f')
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1)
      }
    }
  })
  const edges = [...pairs.entries()]
    .filter(([, count]) => count >= config.minCouplingCommits)
    .map(([key, coChanges]) => {
      const [fileA = '', fileB = ''] = key.split('\u001f')
      const countA = fileCommits.get(fileA) ?? 1
      const countB = fileCommits.get(fileB) ?? 1
      return {
        fileA,
        fileB,
        coChanges,
        support: eligibleCommits === 0 ? 0 : coChanges / eligibleCommits,
        confidenceAToB: coChanges / countA,
        confidenceBToA: coChanges / countB,
        lift:
          eligibleCommits === 0
            ? 0
            : (coChanges * eligibleCommits) / (countA * countB),
      }
    })
    .sort(
      (left, right) =>
        right.coChanges * right.lift - left.coChanges * left.lift,
    )
    .slice(0, 160)
  return { edges, excludedCommits }
}

export async function analyzeRepository(
  requestedPath: string,
  requestedConfig: Partial<AnalysisConfig> = {},
  sourceLabel?: string,
  requestedSnapshotRefs?: Array<{
    ref: string
    label: string
    source: ArchitectureSnapshot['source']
  }>,
): Promise<RepositoryAnalysis> {
  const config: AnalysisConfig = {
    ...defaultAnalysisConfig,
    ...requestedConfig,
  }
  const repositoryPath = await realpath(requestedPath)
  const isRepository = (
    await runGit(repositoryPath, ['rev-parse', '--is-inside-work-tree'])
  ).trim()
  if (isRepository !== 'true') {
    throw new Error('Path is not a Git worktree')
  }
  const logArguments = [
    'log',
    `--max-count=${Math.max(20, Math.min(10_000, config.maxCommits))}`,
    '--date=iso-strict',
    '--use-mailmap',
    `--find-renames=${Math.max(1, Math.min(100, config.renameThreshold))}%`,
    `--pretty=format:${RECORD_SEPARATOR}%H${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%aN${FIELD_SEPARATOR}%aE${FIELD_SEPARATOR}%P${FIELD_SEPARATOR}%s`,
    '--numstat',
  ]
  if (!config.includeMerges) logArguments.splice(1, 0, '--no-merges')
  const [
    topLevel,
    branch,
    headSha,
    remoteUrl,
    gitVersion,
    logOutput,
  ] = await Promise.all([
    runGit(repositoryPath, ['rev-parse', '--show-toplevel']).then((value) =>
      value.trim(),
    ),
    runGit(repositoryPath, ['branch', '--show-current']).then(
      (value) => value.trim() || 'detached',
    ),
    runGit(repositoryPath, ['rev-parse', 'HEAD']).then((value) => value.trim()),
    runGit(repositoryPath, ['remote', 'get-url', 'origin'])
      .then((value) => value.trim())
      .catch(() => ''),
    execFileAsync('git', ['--version'], {
      encoding: 'utf8',
      windowsHide: true,
    }).then(({ stdout }) => stdout.trim()),
    runGit(repositoryPath, logArguments),
  ])
  const commitsNewestFirst = parseLog(logOutput, config.pathDepth)
  const commits = [...commitsNewestFirst].reverse()
  const files = new Map<string, FileAccumulator>()
  const modules = new Map<string, ModuleAccumulator>()
  const authors = new Map<
    string,
    { email: string; commits: number; churn: number; files: Set<string> }
  >()
  let excludedFiles = 0
  let binaryFiles = 0

  commits.forEach((commit) => {
    const authorKey = `${commit.author}\u001f${commit.email}`
    const author = authors.get(authorKey) ?? {
      email: commit.email,
      commits: 0,
      churn: 0,
      files: new Set<string>(),
    }
    author.commits += 1
    author.churn += commit.insertions + commit.deletions
    commit.files.forEach((file) => {
      if (file.binary) binaryFiles += 1
      if (isExcluded(file.path, config)) {
        excludedFiles += 1
        return
      }
      author.files.add(file.path)
      const fileAccumulator = files.get(file.path) ?? {
        commits: 0,
        churn: 0,
        authors: new Map<string, number>(),
        firstSeenAt: commit.date,
        lastSeenAt: commit.date,
        renameCount: 0,
      }
      fileAccumulator.commits += 1
      fileAccumulator.churn += file.insertions + file.deletions
      fileAccumulator.lastSeenAt = commit.date
      fileAccumulator.renameCount += file.oldPath ? 1 : 0
      fileAccumulator.authors.set(
        commit.author,
        (fileAccumulator.authors.get(commit.author) ?? 0) + 1,
      )
      files.set(file.path, fileAccumulator)
      const moduleName = moduleOf(file.path, config.pathDepth)
      const module = modules.get(moduleName) ?? {
        commits: new Set<string>(),
        churn: 0,
        files: new Set<string>(),
        authors: new Map<string, number>(),
      }
      module.commits.add(commit.hash)
      module.churn += file.insertions + file.deletions
      module.files.add(file.path)
      module.authors.set(
        commit.author,
        (module.authors.get(commit.author) ?? 0) + 1,
      )
      modules.set(moduleName, module)
    })
    authors.set(authorKey, author)
  })

  const rawFileMetrics = [...files.entries()].map(([filePath, value]) => {
    const ownershipValues = ownership(value.authors)
    return {
      path: filePath,
      module: moduleOf(filePath, config.pathDepth),
      firstSeenAt: value.firstSeenAt,
      lastSeenAt: value.lastSeenAt,
      commits: value.commits,
      churn: value.churn,
      authors: value.authors.size,
      ownershipEntropy: ownershipValues.entropy,
      majorOwnerShare: ownershipValues.majorOwnerShare,
      renameCount: value.renameCount,
      rawAttention: value.commits * Math.log2(value.churn + 2),
    }
  })
  const maximumAttention = Math.max(
    1,
    ...rawFileMetrics.map((file) => file.rawAttention),
  )
  const fileMetrics: FileMetric[] = rawFileMetrics
    .map(({ rawAttention, ...file }) => ({
      ...file,
      attentionScore: (rawAttention / maximumAttention) * 100,
    }))
    .sort((left, right) => right.attentionScore - left.attentionScore)
    .slice(0, 240)
  const moduleMetrics = makeModuleMetrics(modules).slice(0, 100)
  const authorMetrics: AuthorMetric[] = [...authors.entries()]
    .map(([key, value]) => ({
      name: key.split('\u001f')[0] ?? '',
      email: value.email,
      commits: value.commits,
      churn: value.churn,
      files: value.files.size,
    }))
    .sort((left, right) => right.commits - left.commits)
    .slice(0, 80)
  const timeline = makeTimeline(commits, config)
  const defaultSnapshotRefs = Array.from(
    {
      length: Math.min(12, commits.length),
    },
    (_, index) => {
      const commit =
        commits[
          Math.round(
            (index / Math.max(1, Math.min(12, commits.length) - 1)) *
              (commits.length - 1),
          )
        ]
      return commit
        ? {
            ref: commit.hash,
            label: commit.date.slice(0, 10),
            source: 'history-window' as const,
          }
        : null
    },
  ).filter(
    (
      item,
    ): item is {
      ref: string
      label: string
      source: 'history-window'
    } => item !== null,
  )
  const snapshotRefs =
    requestedSnapshotRefs && requestedSnapshotRefs.length > 0
      ? requestedSnapshotRefs
      : defaultSnapshotRefs
  const architectureSnapshots: ArchitectureSnapshot[] = []
  for (const snapshot of snapshotRefs) {
    const [date, tree] = await Promise.all([
      runGit(repositoryPath, ['show', '-s', '--format=%aI', snapshot.ref]).then(
        (value) => value.trim(),
      ),
      runGit(repositoryPath, [
        'ls-tree',
        '-r',
        '--name-only',
        snapshot.ref,
      ]),
    ])
    const moduleFiles = new Map<string, number>()
    const paths = tree
      .split(/\r?\n/)
      .map((value) => normalizePath(value.trim()))
      .filter(Boolean)
      .filter((value) => !isExcluded(value, config))
    paths.forEach((file) => {
      const moduleName = moduleOf(file, config.pathDepth)
      moduleFiles.set(moduleName, (moduleFiles.get(moduleName) ?? 0) + 1)
    })
    architectureSnapshots.push({
      label: snapshot.label,
      commit: snapshot.ref.replace(/\^\{\}$/, ''),
      date,
      source: snapshot.source,
      totalFiles: paths.length,
      modules: [...moduleFiles.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 18)
        .map(([name, count]) => ({ name, files: count })),
    })
  }
  architectureSnapshots.sort((left, right) => left.date.localeCompare(right.date))
  const coupling = makeCoupling(commits, config)
  const changePoints = (
    ['commits', 'churn', 'meanChangeEntropy'] as const
  ).flatMap((metric) =>
    detectChangePoints(
      timeline,
      metric,
      config.changePointAlpha,
      config.changePointBootstrapIterations,
      config.changePointBlockSize,
      91_337,
    ),
  )
  const milestones: MilestoneCommit[] = [...commitsNewestFirst]
    .sort(
      (left, right) =>
        right.insertions +
        right.deletions -
        (left.insertions + left.deletions),
    )
    .slice(0, 20)
    .map((commit) => ({
      hash: commit.hash,
      date: commit.date,
      author: commit.author,
      subject: commit.subject,
      filesChanged: commit.files.length,
      churn: commit.insertions + commit.deletions,
      bulkChange:
        commit.files.length > config.maxFilesPerCommitForCoupling,
    }))
  const historyPaths = new Set(fileMetrics.slice(0, 30).map((file) => file.path))
  const fileHistories = Object.fromEntries(
    [...historyPaths].map((filePath) => [
      filePath,
      commitsNewestFirst
        .filter((commit) =>
          commit.files.some(
            (file) => file.path === filePath || file.oldPath === filePath,
          ),
        )
        .slice(0, 30)
        .map((commit) => {
          const changed = commit.files.filter(
            (file) => file.path === filePath || file.oldPath === filePath,
          )
          return {
            hash: commit.hash,
            date: commit.date,
            author: commit.author,
            subject: commit.subject,
            insertions: changed.reduce(
              (sum, file) => sum + file.insertions,
              0,
            ),
            deletions: changed.reduce(
              (sum, file) => sum + file.deletions,
              0,
            ),
          }
        }),
    ]),
  )
  const first = commits[0]
  const last = commits.at(-1)
  const name = path.basename(topLevel)

  return {
    manifest: {
      schemaVersion: '1.0',
      id: `${name}-${headSha.slice(0, 10)}`,
      name,
      source: sourceLabel ?? topLevel,
      remoteUrl: remoteUrl || undefined,
      branch,
      headSha,
      generatedAt: new Date().toISOString(),
      gitVersion,
      config,
      analysisWindow: {
        firstCommitAt: first?.date ?? '',
        lastCommitAt: last?.date ?? '',
        commits: commits.length,
      },
    },
    timeline,
    architectureSnapshots,
    files: fileMetrics,
    modules: moduleMetrics,
    authors: authorMetrics,
    coupling: coupling.edges,
    changePoints,
    milestones,
    fileHistories,
    recentCommits: commitsNewestFirst.slice(0, 50).map(({ files: changed, ...commit }) => ({
      ...commit,
      filesChanged: changed.length,
    })),
    exclusions: {
      commitsOverCouplingLimit: coupling.excludedCommits,
      filesByPrefix: excludedFiles,
      binaryFiles,
    },
    limitations: [
      'Metrics describe the selected history window and are not defect labels.',
      'Attention score is commit frequency multiplied by log2(churn + 2), normalized within this repository.',
      'Temporal coupling is association, not a static dependency or causal relationship.',
      'Block-bootstrap change points are exploratory and sensitive to window length and autocorrelation.',
      'Author identity depends on Git mailmap and commit metadata quality.',
    ],
  }
}

export async function getFileHistory(
  requestedPath: string,
  filePath: string,
): Promise<FileHistory> {
  const repositoryPath = await realpath(requestedPath)
  const output = await runGit(repositoryPath, [
    'log',
    '--follow',
    '--max-count=120',
    '--date=iso-strict',
    '--use-mailmap',
    `--pretty=format:${RECORD_SEPARATOR}%H${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%aN${FIELD_SEPARATOR}%s`,
    '--numstat',
    '--',
    filePath,
  ])
  const commits = output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [header = '', ...lines] = record.split(/\r?\n/)
      const [hash = '', date = '', author = '', subject = ''] =
        header.split(FIELD_SEPARATOR)
      const values = lines
        .map((line) => line.split('\t'))
        .filter((parts) => parts.length >= 3)
      return {
        hash,
        date,
        author,
        subject,
        insertions: values.reduce(
          (sum, [insertions = '0']) => sum + parseNumber(insertions),
          0,
        ),
        deletions: values.reduce(
          (sum, [, deletions = '0']) => sum + parseNumber(deletions),
          0,
        ),
      }
    })
  return { path: filePath, commits }
}
