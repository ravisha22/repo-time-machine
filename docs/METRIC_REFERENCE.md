# Metric reference

## Attention score

```text
attention = commits × log2(churn + 2)
normalized = attention / max(repository attention) × 100
```

Use it to allocate visual space, not to classify defects.

## Ownership entropy

For author commit shares `p_i`:

```text
H = -Σ p_i log2(p_i) / log2(author count)
```

Zero means one observed author; one means equal historical commit shares.

## Change entropy

The same normalized Shannon entropy is applied to churn distributed across path
modules within a commit.

## Temporal coupling

For eligible commits:

```text
support(A,B) = cochanges(A,B) / eligible commits
confidence(A→B) = cochanges(A,B) / commits(A)
lift(A,B) = cochanges(A,B) × eligible commits / (commits(A) × commits(B))
```

Lift above one indicates more co-change than expected under independent
occurrence. It does not identify why.

## Change points

For each candidate split, the standardized score is the absolute difference
between segment means, weighted by segment sizes and divided by segment standard
deviation. Moving-block bootstrap samples estimate the exploratory p-value.
