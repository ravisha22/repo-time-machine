# Repo Time Machine

Repo Time Machine is a local-first, research-grade software-evolution
observatory over Git history. It lets you scrub through product architecture,
inspect recent change activity, trace file ancestry, explore temporal coupling,
measure historical ownership concentration, and review candidate structural
breaks.

It is deliberately not a defect predictor or developer-performance tool.

## Included real product histories

The repository ships with reproducible datasets generated from public Git
history:

| Product | Detailed recent window | Tag-anchored architecture span |
| --- | ---: | --- |
| Redis | 320 commits | 2010–2026 |
| React | 320 commits | 2013–2026 |
| Visual Studio Code | 260 commits | 2016–2026 |

Every dataset stores its exact HEAD SHA, branch, source URL, Git version,
analysis configuration, generation time, detailed commit window, release-tag
snapshots, exclusions, and limitations.

## Launch

```powershell
npm install
npm run dev
```

Open <http://127.0.0.1:5173/>.

`npm run dev` starts:

- the local analysis API on `127.0.0.1:4177`;
- the Vite client with an `/api` proxy.

Production:

```powershell
npm run build
npm start
```

## What the finished product does

- Replays architecture footprints across release tags as a living module map.
- Shows detailed recent monthly commits, churn, entropy, and cumulative files.
- Maps file change frequency against textual churn without calling it risk.
- Preserves ancestry for top files and can query full local `git log --follow`
  history.
- Calculates temporal coupling with co-change count, support, directional
  confidence, and lift.
- Reports modification ownership entropy and major-author share with mailmap
  support.
- Detects exploratory monthly change points with recursive binary segmentation
  and moving-block bootstrap significance.
- Exposes bulk-commit, binary-file, and path-prefix exclusions.
- Analyzes any local Git worktree through a loopback-only API.

## Analyze a local repository

Open **Repository lab**, enter a Windows path, and choose:

- maximum detailed commits;
- include/exclude merge commits;
- module path depth;
- rename similarity threshold.

The analyzer uses argument-safe `git` subprocess calls, binds only to
`127.0.0.1`, and does not upload source or history.

## Regenerate public datasets

```powershell
npm run presets:generate -- --output public\data
npm run presets:validate -- --root public\data
```

Preset generation uses blob-filtered clones, bounded recent numstat windows, and
selected semantic-version tags for historical tree snapshots.

## Validation

```powershell
npm run presets:validate -- --root public\data
npm run check
```

The tests create an actual temporary Git repository and verify:

- authors and exact provenance;
- timeline aggregation;
- rename detection;
- co-change extraction;
- history following across a rename;
- known block-bootstrap change-point detection;
- loading and navigating the real React dataset.

## Research guardrails

Read:

- [Research protocol](RESEARCH_PROTOCOL.md)
- [Threats to validity](THREATS_TO_VALIDITY.md)
- [Metric reference](docs/METRIC_REFERENCE.md)
- [Dataset schema](docs/DATASET_SCHEMA.md)
- [Local analysis](docs/LOCAL_ANALYSIS.md)

Key constraints:

- churn is not complexity;
- attention score is not defect risk;
- ownership is not expertise or responsibility;
- co-change is not a static dependency;
- change points do not identify causes;
- cross-repository numeric rankings are not valid without a controlled study.
