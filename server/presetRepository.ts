import { execFile } from 'node:child_process'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import type { RepositoryPreset } from '../src/domain.ts'

const execFileAsync = promisify(execFile)

export async function preparePresetRepository(
  preset: RepositoryPreset,
): Promise<string> {
  const cacheRoot = path.resolve(
    process.cwd(),
    '.repo-time-machine',
    'repositories',
  )
  const repositoryPath = path.join(cacheRoot, preset.id)
  await mkdir(cacheRoot, { recursive: true })
  let repositoryExists = false
  try {
    await access(path.join(repositoryPath, '.git'))
    repositoryExists = true
  } catch {
    repositoryExists = false
  }
  if (repositoryExists) {
    await execFileAsync(
      'git',
      [
        '-C',
        repositoryPath,
        'fetch',
        '--quiet',
        `--depth=${preset.historyDepth}`,
        'origin',
        preset.branch,
      ],
      { timeout: 900_000, windowsHide: true },
    )
    await execFileAsync(
      'git',
      [
        '-C',
        repositoryPath,
        'update-ref',
        `refs/heads/${preset.branch}`,
        'FETCH_HEAD',
      ],
      { timeout: 120_000, windowsHide: true },
    )
    await execFileAsync(
      'git',
      [
        '-C',
        repositoryPath,
        'symbolic-ref',
        'HEAD',
        `refs/heads/${preset.branch}`,
      ],
      { timeout: 120_000, windowsHide: true },
    )
  } else {
    await execFileAsync(
      'git',
      [
        'clone',
        '--quiet',
        '--filter=blob:none',
        '--no-checkout',
        `--depth=${preset.historyDepth}`,
        '--branch',
        preset.branch,
        preset.url,
        repositoryPath,
      ],
      { timeout: 1_200_000, windowsHide: true },
    )
  }
  return repositoryPath
}

interface SemanticTag {
  name: string
  version: number[]
}

function compareVersion(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export async function prepareHistoricalTagRefs(
  preset: RepositoryPreset,
  repositoryPath: string,
  count = 12,
): Promise<Array<{ ref: string; label: string; source: 'release-tag' }>> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repositoryPath, 'ls-remote', '--tags', 'origin'],
    {
      encoding: 'utf8',
      timeout: 180_000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  const tags = new Map<string, SemanticTag>()
  stdout.split(/\r?\n/).forEach((line) => {
    const [, reference = ''] = line.split(/\s+/)
    const rawName = reference
      .replace('refs/tags/', '')
      .replace(/\^\{\}$/, '')
    const match = rawName.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/)
    if (!match) return
    tags.set(rawName, {
      name: rawName,
      version: [
        Number(match[1]),
        Number(match[2]),
        Number(match[3] ?? 0),
      ],
    })
  })
  const ordered = [...tags.values()].sort((left, right) =>
    compareVersion(left.version, right.version),
  )
  if (ordered.length === 0) return []
  const selected = Array.from(
    { length: Math.min(count, ordered.length) },
    (_, index) =>
      ordered[
        Math.round(
          (index / Math.max(1, Math.min(count, ordered.length) - 1)) *
            (ordered.length - 1),
        )
      ],
  ).filter((tag): tag is SemanticTag => Boolean(tag))
  const unique = [...new Map(selected.map((tag) => [tag.name, tag])).values()]
  const refs: Array<{ ref: string; label: string; source: 'release-tag' }> = []
  for (const [index, tag] of unique.entries()) {
    const localRef = `refs/rtm-tags/${preset.id}-${index}`
    try {
      await execFileAsync(
        'git',
        [
          '-C',
          repositoryPath,
          'fetch',
          '--quiet',
          '--filter=blob:none',
          '--depth=1',
          'origin',
          `refs/tags/${tag.name}:${localRef}`,
        ],
        { timeout: 600_000, windowsHide: true },
      )
      refs.push({
        ref: `${localRef}^{}`,
        label: tag.name,
        source: 'release-tag',
      })
    } catch {
      // Some repositories delete or rewrite old tags; skip unavailable anchors.
    }
  }
  return refs
}
