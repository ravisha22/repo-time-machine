import type { RepositoryPreset } from '../src/domain.ts'

export const repositoryPresets: RepositoryPreset[] = [
  {
    id: 'redis',
    name: 'Redis',
    owner: 'redis',
    description:
      'A mature in-memory data platform with a long C codebase history.',
    url: 'https://github.com/redis/redis.git',
    branch: 'unstable',
    historyDepth: 320,
    accent: '#ff5f57',
  },
  {
    id: 'react',
    name: 'React',
    owner: 'facebook',
    description:
      'A UI framework whose subsystem boundaries evolved across reconciler eras.',
    url: 'https://github.com/facebook/react.git',
    branch: 'main',
    historyDepth: 320,
    accent: '#61dafb',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    owner: 'microsoft',
    description:
      'A large TypeScript product with dense module and ownership evolution.',
    url: 'https://github.com/microsoft/vscode.git',
    branch: 'main',
    historyDepth: 260,
    accent: '#2da7f5',
  },
]
