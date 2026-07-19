import express from 'express'
import path from 'node:path'
import { access } from 'node:fs/promises'
import { z } from 'zod'
import {
  analyzeRepository,
  defaultAnalysisConfig,
  getFileHistory,
} from './analyzer.ts'
import { repositoryPresets } from './presets.ts'
import { preparePresetRepository } from './presetRepository.ts'
const app = express()
const port = Number.parseInt(process.env.PORT ?? '4177', 10)

app.use(express.json({ limit: '4mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'repo-time-machine',
    time: new Date().toISOString(),
  })
})

app.get('/api/presets', (_request, response) => {
  response.json(repositoryPresets)
})

const configSchema = z
  .object({
    maxCommits: z.number().int().min(20).max(10_000).optional(),
    includeMerges: z.boolean().optional(),
    renameThreshold: z.number().int().min(1).max(100).optional(),
    pathDepth: z.number().int().min(1).max(5).optional(),
    minCouplingCommits: z.number().int().min(2).max(50).optional(),
    maxFilesPerCommitForCoupling: z.number().int().min(5).max(500).optional(),
    excludedPathPrefixes: z.array(z.string()).optional(),
    changePointAlpha: z.number().gt(0).lt(1).optional(),
    changePointBootstrapIterations: z.number().int().min(50).max(2_000).optional(),
    changePointBlockSize: z.number().int().min(1).max(12).optional(),
  })
  .optional()

app.post('/api/analyze', async (request, response) => {
  const parsed = z
    .object({
      path: z.string().min(1),
      config: configSchema,
    })
    .safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message })
    return
  }
  try {
    response.json(
      await analyzeRepository(parsed.data.path, parsed.data.config ?? {}),
    )
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    })
  }
})

app.post('/api/presets/:presetId/analyze', async (request, response) => {
  try {
    const preset = repositoryPresets.find(
      (item) => item.id === request.params.presetId,
    )
    if (!preset) {
      response.status(404).json({ error: 'Unknown preset' })
      return
    }
    const repositoryPath = await preparePresetRepository(preset)
    response.json(
      await analyzeRepository(
        repositoryPath,
        {
          ...defaultAnalysisConfig,
          maxCommits: preset.historyDepth,
        },
        preset.url,
      ),
    )
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Preset analysis failed',
    })
  }
})

app.post('/api/file-history', async (request, response) => {
  const parsed = z
    .object({
      path: z.string().min(1),
      filePath: z.string().min(1),
    })
    .safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message })
    return
  }
  try {
    response.json(
      await getFileHistory(parsed.data.path, parsed.data.filePath),
    )
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'File history failed',
    })
  }
})

const webRoot = path.resolve(process.cwd(), 'dist')
try {
  await access(webRoot)
  app.use(express.static(webRoot))
  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(webRoot, 'index.html'))
  })
} catch {
  // Vite serves the client separately during development.
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Repo Time Machine API listening on http://127.0.0.1:${port}`)
})
