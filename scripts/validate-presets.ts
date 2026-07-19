import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseRepositoryAnalysis } from '../src/core/validation.ts'

const root = path.resolve(
  process.argv[process.argv.indexOf('--root') + 1] ??
    path.join('public', 'data'),
)
const index = JSON.parse(
  await readFile(path.join(root, 'index.json'), 'utf8'),
) as Array<{ id: string; file: string; headSha: string }>

for (const item of index) {
  const analysis = parseRepositoryAnalysis(
    JSON.parse(await readFile(path.join(root, item.file), 'utf8')),
  )
  if (analysis.manifest.headSha !== item.headSha) {
    throw new Error(
      `${item.id} index head ${item.headSha} does not match dataset ${analysis.manifest.headSha}`,
    )
  }
  console.log(
    `PASS ${item.id} commits=${analysis.manifest.analysisWindow.commits} snapshots=${analysis.architectureSnapshots.length} files=${analysis.files.length}`,
  )
}
