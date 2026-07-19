import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseRepositoryAnalysis } from '../src/core/validation.ts'
import { analyzeRepository, getFileHistory } from './analyzer.ts'

const execFileAsync = promisify(execFile)
let repositoryPath = ''

async function git(args: string[], environment: NodeJS.ProcessEnv = {}) {
  return execFileAsync('git', args, {
    cwd: repositoryPath,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
    windowsHide: true,
  })
}

async function commit(
  message: string,
  date: string,
  author: { name: string; email: string },
) {
  await git(['add', '.'])
  await git(
    [
      '-c',
      `user.name=${author.name}`,
      '-c',
      `user.email=${author.email}`,
      'commit',
      '--quiet',
      '-m',
      message,
    ],
    {
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    },
  )
}

beforeAll(async () => {
  repositoryPath = await mkdtemp(path.join(os.tmpdir(), 'repo-time-machine-'))
  await git(['init', '--quiet', '-b', 'main'])
  await mkdir(path.join(repositoryPath, 'src'), { recursive: true })
  await writeFile(path.join(repositoryPath, 'src', 'a.ts'), 'export const a = 1\n')
  await writeFile(path.join(repositoryPath, 'src', 'b.ts'), 'export const b = 1\n')
  await commit('initial modules', '2025-01-02T10:00:00Z', {
    name: 'Alice',
    email: 'alice@example.test',
  })
  await writeFile(path.join(repositoryPath, 'src', 'a.ts'), 'export const a = 2\n')
  await writeFile(path.join(repositoryPath, 'src', 'b.ts'), 'export const b = 2\n')
  await commit('change pair one', '2025-02-02T10:00:00Z', {
    name: 'Bob',
    email: 'bob@example.test',
  })
  await writeFile(path.join(repositoryPath, 'src', 'a.ts'), 'export const a = 3\n')
  await writeFile(path.join(repositoryPath, 'src', 'b.ts'), 'export const b = 3\n')
  await commit('change pair two', '2025-03-02T10:00:00Z', {
    name: 'Alice',
    email: 'alice@example.test',
  })
  await git(['mv', 'src/b.ts', 'src/c.ts'])
  await writeFile(path.join(repositoryPath, 'src', 'a.ts'), 'export const a = 4\n')
  await commit('rename b to c', '2025-04-02T10:00:00Z', {
    name: 'Bob',
    email: 'bob@example.test',
  })
  await writeFile(path.join(repositoryPath, 'src', 'a.ts'), 'export const a = 5\n')
  await writeFile(path.join(repositoryPath, 'src', 'c.ts'), 'export const b = 5\n')
  await commit('change renamed pair', '2025-05-02T10:00:00Z', {
    name: 'Alice',
    email: 'alice@example.test',
  })
})

afterAll(async () => {
  if (repositoryPath) await rm(repositoryPath, { recursive: true, force: true })
})

describe('analyzeRepository', () => {
  it('extracts provenance, ownership, renames, coupling, and timeline metrics', async () => {
    const analysis = await analyzeRepository(repositoryPath, {
      maxCommits: 50,
      minCouplingCommits: 2,
      changePointBootstrapIterations: 50,
    })
    parseRepositoryAnalysis(analysis)

    expect(analysis.manifest.analysisWindow.commits).toBe(5)
    expect(analysis.timeline).toHaveLength(5)
    expect(analysis.authors.map((author) => author.name).sort()).toEqual([
      'Alice',
      'Bob',
    ])
    expect(
      analysis.files.find((file) => file.path === 'src/c.ts')?.renameCount,
    ).toBeGreaterThan(0)
    expect(
      analysis.coupling.some(
        (edge) =>
          edge.fileA.includes('a.ts') &&
          (edge.fileB.includes('b.ts') || edge.fileB.includes('c.ts')),
      ),
    ).toBe(true)
  })

  it('follows file history across a rename', async () => {
    const history = await getFileHistory(repositoryPath, 'src/c.ts')
    expect(history.commits.length).toBeGreaterThanOrEqual(3)
    expect(history.commits.some((commit) => commit.subject === 'initial modules')).toBe(true)
  })
})
