# Local repository analysis

The API binds to `127.0.0.1:4177` and invokes `git` with argument arrays rather
than shell-concatenated commands.

## Endpoint

`POST /api/analyze`

```json
{
  "path": "C:\\path\\to\\repo",
  "config": {
    "maxCommits": 1000,
    "includeMerges": false,
    "renameThreshold": 60,
    "pathDepth": 2
  }
}
```

## File ancestry

`POST /api/file-history`

```json
{
  "path": "C:\\path\\to\\repo",
  "filePath": "src/example.ts"
}
```

This runs `git log --follow` and returns commit metadata and numstat.

## Data handling

- Source content is not sent to a remote service.
- Git metadata can contain personal information and confidential commit
  messages.
- Exported datasets should follow the repository's data-handling policy.
- Do not use author metrics for individual performance management.
