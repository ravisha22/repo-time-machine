import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { analyzeRepository, defaultAnalysisConfig } from '../server/analyzer.ts'
import {
  prepareHistoricalTagRefs,
  preparePresetRepository,
} from '../server/presetRepository.ts'
import { repositoryPresets } from '../server/presets.ts'

const outputRoot = path.resolve(
  process.argv[process.argv.indexOf('--output') + 1] ??
    path.join('public', 'data'),
)
await mkdir(outputRoot, { recursive: true })

const index: Array<{
  id: string
  name: string
  description: string
  accent: string
  file: string
  headSha: string
  commits: number
  generatedAt: string
}> = []

for (const preset of repositoryPresets) {
  console.log(`Preparing ${preset.owner}/${preset.name}...`)
  const repositoryPath = await preparePresetRepository(preset)
  const snapshotRefs = await prepareHistoricalTagRefs(
    preset,
    repositoryPath,
    12,
  )
  console.log(`Analyzing ${preset.name}...`)
  const analysis = await analyzeRepository(
    repositoryPath,
    {
      ...defaultAnalysisConfig,
      maxCommits: preset.historyDepth,
      changePointBootstrapIterations: 500,
    },
    preset.url,
    snapshotRefs,
  )
  const filename = `${preset.id}.json`
  await writeFile(
    path.join(outputRoot, filename),
    `${JSON.stringify(analysis, null, 2)}\n`,
    'utf8',
  )
  index.push({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    accent: preset.accent,
    file: filename,
    headSha: analysis.manifest.headSha,
    commits: analysis.manifest.analysisWindow.commits,
    generatedAt: analysis.manifest.generatedAt,
  })
  console.log(
    `Wrote ${preset.name}: ${analysis.manifest.analysisWindow.commits} commits, ${analysis.files.length} files`,
  )
}

await writeFile(
  path.join(outputRoot, 'index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
  'utf8',
)
console.log(`Generated ${index.length} public repository datasets.`)
