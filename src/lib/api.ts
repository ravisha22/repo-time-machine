import type {
  AnalysisConfig,
  FileHistory,
  RepositoryAnalysis,
} from '../domain.ts'
import { parseRepositoryAnalysis } from '../core/validation.ts'

export interface PresetIndexItem {
  id: string
  name: string
  description: string
  accent: string
  file: string
  headSha: string
  commits: number
  generatedAt: string
}

async function jsonResponse(response: Response): Promise<unknown> {
  const payload = await response.json()
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return payload
}

export async function loadPresetIndex(): Promise<PresetIndexItem[]> {
  const response = await fetch('/data/index.json')
  const value = await jsonResponse(response)
  if (!Array.isArray(value)) throw new Error('Preset index is malformed')
  return value as PresetIndexItem[]
}

export async function loadPresetAnalysis(
  item: PresetIndexItem,
): Promise<RepositoryAnalysis> {
  return parseRepositoryAnalysis(
    await jsonResponse(await fetch(`/data/${item.file}`)),
  )
}

export async function analyzeLocalRepository(
  repositoryPath: string,
  config: Partial<AnalysisConfig>,
): Promise<RepositoryAnalysis> {
  return parseRepositoryAnalysis(
    await jsonResponse(
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: repositoryPath, config }),
      }),
    ),
  )
}

export async function loadFileHistory(
  repositoryPath: string,
  filePath: string,
): Promise<FileHistory> {
  return (await jsonResponse(
    await fetch('/api/file-history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: repositoryPath, filePath }),
    }),
  )) as FileHistory
}
