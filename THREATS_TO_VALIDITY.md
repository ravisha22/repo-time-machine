# Threats to validity

## Repository-history validity

| Threat | Consequence | Required control |
| --- | --- | --- |
| Squash or rebase policy | Historical commits do not represent actual work units | Document repository policy and avoid cross-project equivalence |
| Missing pre-migration history | File age and ownership are truncated | Report first analyzed commit and import older history when available |
| Mailmap gaps | One person appears as several authors | Inspect aliases and version `.mailmap` |
| Bots and generated commits | Activity and ownership can be dominated by automation | Run sensitivity with bot/generated-path exclusions |
| Merge strategy | Merge commits inflate broad co-change | Exclude by default and report include-merge sensitivity |
| Rename detection | Lineage splits or false joins | Vary similarity threshold |
| Binary files | Churn is missing | Report binary touch counts separately |

## Construct validity

- Churn is not complexity.
- Commit frequency is not importance.
- Ownership entropy is not expertise or accountability.
- Co-change is not static dependency or causality.
- Directory paths are not necessarily architectural modules.
- A normalized hotspot score changes when the cohort of files changes.
- File size is not measured by the current attention score.

## Statistical validity

- Monthly observations are autocorrelated and seasonally structured.
- Recursive change-point testing can inflate false discoveries.
- Block-bootstrap results depend on block size and available months.
- Sparse histories can produce unstable entropy and ownership estimates.
- Co-change confidence is asymmetric and can be high for rare files.
- Lift can explode at low support; minimum co-change filtering is required.

## External validity

The bundled Redis, React, and Visual Studio Code windows are intentionally
interesting, not statistically representative. They differ in language,
contribution process, repository age, release cadence, generated code, and
review policy.

## Causal validity

Repository history is observational. A release near a change point, a team near
an ownership concentration, or a co-change pair near an incident does not
identify a cause.

## Privacy and organizational interpretation

Author names and emails come from Git metadata. Private repositories can contain
personal or confidential history. The local API binds to loopback, and exported
datasets should follow repository data-handling policy. Do not use the tool for
individual performance evaluation.
