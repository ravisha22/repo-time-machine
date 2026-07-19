# Repo Time Machine research protocol

## Purpose

Repo Time Machine is a reproducible software-evolution observatory over Git
history. It visualizes how change, ownership, file survival, module activity,
and temporal coupling evolve.

It does not label files as defective, predict bugs, infer developer competence,
or claim that co-change is a static dependency.

## Unit of evidence

Every dataset stores:

- repository source or local path;
- remote URL when available;
- exact HEAD commit;
- branch;
- Git version;
- analysis configuration;
- analyzed commit window;
- generation timestamp.

The same commit and configuration must reproduce the same aggregates, apart
from the generation timestamp.

## History extraction

- Author identity uses `git log --use-mailmap`.
- Rename detection uses Git's configurable similarity threshold.
- Merge commits are excluded by default because merge diffs and integration
  policy can dominate file-change measures.
- The history window is explicit and bounded.
- Binary files contribute file-touch counts but not textual churn.
- Configured path prefixes can be excluded and their count is reported.

Changing any of these settings creates a different study, not a cosmetic view.

## Measures

### Churn

Textual churn is insertions plus deletions from Git numstat. It is descriptive
change volume. It is not code complexity and does not imply defects.

### Change entropy

For each commit, textual churn is grouped by the configured path-depth module.
Normalized Shannon entropy describes whether a change is concentrated or spread
across modules. Monthly values average commit-level entropy.

Changing path depth changes the construct and must be reported.

### Ownership

For each file or module:

- author count;
- normalized entropy of commit shares;
- largest author's share.

These describe concentration of historical modification. They do not establish
current expertise, responsibility, or organizational risk. Mailmap quality,
pairing, bots, generated commits, and squashing affect the result.

### Attention hotspots

The visual attention score is:

```text
commit count × log2(churn + 2)
```

It is normalized to the largest file in the analyzed repository and window.
Both underlying axes remain visible. The score prioritizes visually active
files; it is not a defect probability.

### Temporal coupling

Files changed in the same eligible commit form a co-change pair. The application
reports:

- co-change count;
- support over eligible commits;
- directional confidence;
- lift relative to independent occurrence.

Commits above the configured file-count threshold are excluded from coupling to
reduce mass-formatting, vendoring, and broad-merge artifacts. Exclusion counts
remain visible.

Temporal coupling is association. It can arise from architecture, release
process, test organization, ownership, formatting, or tooling.

### Change points

Monthly commit count, churn, and mean change entropy use recursive binary
segmentation. Candidate splits are standardized by segment variance. Significance
is estimated with a moving-block bootstrap to preserve short-range
autocorrelation.

These are exploratory structural breaks. Results are sensitive to:

- history window;
- block size;
- sparse months;
- release cycles;
- alpha threshold;
- multiple recursive tests.

No causal event is assigned automatically.

## Sensitivity requirements

Before a research claim:

1. compare multiple history windows;
2. include and exclude merges;
3. vary rename similarity;
4. vary module path depth;
5. vary bulk-commit exclusion;
6. inspect results with and without generated/vendor paths;
7. verify author aliases and bot treatment;
8. report which conclusions survive.

## Public repository datasets

Bundled public datasets use bounded, blob-filtered histories for:

- Redis;
- React;
- Visual Studio Code.

They are examples, not a representative sample of software projects. Cross-repo
numeric comparisons are confounded by language, process, age, repository
policy, squashing, release cadence, and history-window coverage.

## Claims policy

Permitted:

- "Within the latest 900 commits, these files changed together more often than
  expected from their marginal change rates."
- "Ownership of modifications is more concentrated in this module under the
  current mailmap and window."
- "A block-bootstrap heuristic detects a structural shift in monthly churn."

Not permitted:

- "This file is buggy."
- "This developer owns the code in an organizational sense."
- "These files are statically dependent."
- "The change point was caused by this release."
- "This repository is healthier than another repository."

## Methodological foundations

- Nagappan, N., & Ball, T. (2005). Use of relative code churn measures to
  predict system defect density.
  <https://doi.org/10.1145/1062455.1062514>
- Hassan, A. E. (2009). Predicting faults using the complexity of code changes.
  <https://doi.org/10.1109/ICSE.2009.5070510>
- Bird, C. et al. (2011). Don't touch my code! Examining the effects of
  ownership on software quality.
  <https://doi.org/10.1145/2025113.2025119>
- Zimmermann, T. et al. (2004). Mining version histories to guide software
  changes. <https://doi.org/10.1109/ICSE.2004.1317476>
- Kamei, Y. et al. (2013). A large-scale empirical study of just-in-time
  quality assurance. <https://doi.org/10.1109/TSE.2012.70>
- Herzig, K., Just, S., & Zeller, A. (2013). It's not a bug, it's a feature:
  how misclassification impacts bug prediction.
  <https://doi.org/10.1109/ICSE.2013.6606609>
- Tantithamthavorn, C. et al. (2016). An empirical comparison of model
  validation techniques for defect prediction models.
  <https://doi.org/10.1109/TSE.2016.2584050>
- Cataldo, M. et al. (2009). Socio-technical congruence.
  <https://doi.org/10.1007/s10664-008-9074-0>
- Benkoczi, R. et al. (2018). A Design Structure Matrix Approach for Measuring
  Co-Change-Modularity of Software Products.
  <https://doi.org/10.1145/3196398.3196409>
