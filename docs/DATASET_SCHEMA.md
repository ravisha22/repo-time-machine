# Dataset schema

## Manifest

- schema version;
- repository name and source;
- remote URL when available;
- branch and exact HEAD SHA;
- generation timestamp and Git version;
- frozen analysis configuration;
- first and last detailed commits;
- detailed commit count.

## Architecture snapshots

Each snapshot records:

- release-tag or sampled-window label;
- commit/ref;
- author date;
- snapshot source;
- total non-excluded files;
- top path-depth modules and file counts.

Snapshots use Git trees and do not require source blobs.

## Detailed recent window

- monthly activity and entropy;
- file-level frequency, churn, ownership, renames, and attention;
- module-level activity and ownership;
- author activity;
- temporal coupling edges;
- exploratory change points;
- large-change milestone commits;
- ancestry for top files;
- recent commit summaries.

## Exclusions

Datasets report:

- commits excluded from coupling because too many files changed;
- files excluded by configured path prefix;
- binary file touches.

Missing or excluded data are not silently interpreted as zero-risk behavior.
