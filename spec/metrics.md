# Loop-Bench Metrics v1.0

## Overview

Loop-bench measures 11 metrics: 6 primary and 5 secondary. All metrics are computed from LTF traces and evaluation results. Every metric has a defined range, direction (higher-is-better or lower-is-better), and computation method.

---

## Primary Metrics

### 1. Convergence Rate

**What it captures:** How efficiently the loop reaches a solution.

**Direction:** Lower is better (fewer iterations = faster convergence).

**Formula:**
```
convergence_rate = iterations_used / max_iterations
```

**Range:** `[0.0, 1.0]` where 0.0 means solved on first try, 1.0 means all iterations used.

**Computation:**
- Count the number of `act` phases in the LTF trace (each `act` after a `verify` or `decide` increments the iteration counter)
- Divide by `constraints.max_iterations` from the task definition

**Edge cases:**
- If the loop solved the task without any verify phase: `iterations_used = 1`
- If the loop timed out: `convergence_rate = 1.0`
- If the loop was cancelled: use iterations completed before cancellation

**LTF source:** `loop_summary.total_iterations` / `task.constraints.max_iterations`

---

### 2. Cost Efficiency

**What it captures:** Dollars spent per successful task.

**Direction:** Lower is better.

**Formula:**
```
cost_efficiency = total_cost_usd  (for a single task)
```

For aggregate: `avg_cost_per_resolved = total_cost / resolved_count`

**Range:** `[0.0, ∞)` in USD.

**Computation:**
- Sum all `cost_usd` values from LTF phase events
- Alternatively, compute from token counts using the model pricing table

**Edge cases:**
- If cost data is missing from the LTF trace: use token counts × model pricing
- If both are missing: `cost_usd = 0` and flag as incomplete
- If no tasks resolved: `avg_cost_per_resolved = Infinity`

**LTF source:** `loop_summary.total_cost_usd` or sum of all `event.cost_usd`

---

### 3. Verification Accuracy

**What it captures:** How well the loop's verifier distinguishes real failures from false signals.

**Direction:** Higher is better.

**Formula:**
```
verification_accuracy = correct_verdicts / total_verdicts
```

Where:
- `correct_verdicts` = true positives + true negatives
- A **true positive** is: verify phase reports `fail` AND ground-truth evaluation confirms the code is actually broken
- A **true negative** is: verify phase reports `success` AND ground-truth evaluation confirms the code is actually correct

**Range:** `[0.0, 1.0]`

**Computation:**
1. Collect all `verify` phase events from the LTF trace
2. For each verify event, determine if `result.status` matches the ground truth (hidden test results at that point in the loop)
3. Ratio of correct verdicts to total verdicts

**Edge cases:**
- If the loop has no verify events: `verification_accuracy = 0.0` (no verification is bad)
- If all verify events agree with ground truth: `1.0`

**LTF source:** `verify` phase events with `result.status` cross-referenced against hidden test state

---

### 4. Drift Score

**What it captures:** How much the loop deviated from the original goal.

**Direction:** Lower is better (0 = perfectly on-goal).

**Formula:**
```
drift_score = 1 - cosine_similarity(goal_embedding, diff_embedding)
```

Where:
- `goal_embedding` = TF-IDF vector of the task goal text
- `diff_embedding` = TF-IDF vector of the final diff (files changed, code added/removed)

**Range:** `[0.0, 1.0]`

**Computation:**
1. Extract the task goal text
2. Extract the final diff produced by the loop
3. Compute TF-IDF vectors for both
4. Compute cosine similarity
5. Subtract from 1

**Simplified fallback:** If TF-IDF is not available, use file overlap:
```
drift_score_simple = 1 - |goal_files ∩ changed_files| / |goal_files ∪ changed_files|
```
Where `goal_files` = `ground_truth.files_changed` and `changed_files` = actual files modified.

**Edge cases:**
- If no files were changed: `drift_score = 1.0` (complete drift — nothing done)
- If the diff is empty: `drift_score = 1.0`
- If goal text is empty: skip metric, report `null`

**LTF source:** `loop_summary.files_changed` + task definition `ground_truth.files_changed`

---

### 5. False Completion Rate

**What it captures:** How often the loop claims success but the task is actually unsolved.

**Direction:** Lower is better.

**Formula:**
```
false_completion_rate = false_completions / claimed_completions
```

Where:
- `claimed_completions` = number of tasks where `loopResult.claimedSuccess === true`
- `false_completions` = subset of claimed completions where hidden tests fail

**Range:** `[0.0, 1.0]`

**Computation:**
1. Count tasks where the loop's `terminationReason` is `goal_met` or `claimedSuccess` is `true`
2. Of those, count how many fail the hidden test suite
3. Divide

**Edge cases:**
- If the loop never claims success: `false_completion_rate = 0.0` (no false claims)
- If every claimed success is actually a failure: `1.0`

**LTF source:** `terminate` events with `metadata.termination_reason === "goal_met"` vs. hidden test results

---

### 6. Erosion Score

**What it captures:** Code quality degradation across iterations (inspired by SlopCodeBench).

**Direction:** Lower is better.

**Formula:**
```
erosion_score = max(0, (complexity_final - complexity_initial) / complexity_initial)
```

Where complexity is measured as the sum of cyclomatic complexity across all modified files.

**Range:** `[0.0, ∞)` — capped at `1.0` for scoring purposes.

**Computation:**
1. Measure cyclomatic complexity of all modified files at the start of the task
2. Measure cyclomatic complexity of the same files at the end of the task
3. Compute relative growth
4. Cap at 1.0 for scoring

**Simplified fallback:** If cyclomatic complexity tools are not available:
```
erosion_score_simple = max(0, (lines_final - lines_initial) / lines_initial)
```

**Edge cases:**
- If no files were modified: `erosion_score = 0.0`
- If complexity decreased: `erosion_score = 0.0` (improvement, not erosion)
- If initial complexity is 0: use absolute complexity as score

**LTF source:** Computed post-hoc from workspace state, not directly from LTF events

---

## Secondary Metrics

### 7. First-Edit Delay

**What it captures:** How many steps the loop takes before making its first code modification.

**Direction:** Context-dependent. Research shows moderate delay (exploration before editing) correlates with success.

**Formula:**
```
first_edit_delay = index_of_first_file_edit_event
```

**Range:** `[0, max_iterations]`

**Computation:**
1. Scan LTF events in chronological order
2. Find the first event with `action.type === "file_edit"`
3. Return its 0-indexed position in the event stream

**Edge cases:**
- If no file edits occurred: `first_edit_delay = total_events` (never edited)
- If the first event is a file edit: `first_edit_delay = 0`

**LTF source:** First `act` event where `action.type === "file_edit"`

---

### 8. Verbosity Score

**What it captures:** Fraction of redundant or duplicated code in the final output.

**Direction:** Lower is better.

**Formula:**
```
verbosity_score = duplicate_lines / total_lines_added
```

**Range:** `[0.0, 1.0]`

**Computation:**
1. Extract all lines added by the loop (from the final diff)
2. Identify duplicate or near-duplicate lines (exact string match after whitespace normalization)
3. Divide duplicate count by total added lines

**Edge cases:**
- If no lines were added: `verbosity_score = 0.0`
- Import statements and blank lines are excluded from duplicate detection

**LTF source:** Computed post-hoc from the final diff

---

### 9. Context Efficiency

**What it captures:** How productively the loop uses the context window.

**Direction:** Higher is better (more output per total tokens = more efficient).

**Formula:**
```
context_efficiency = total_output_tokens / (total_input_tokens + total_output_tokens)
```

**Range:** `[0.0, 1.0]`

**Computation:**
1. Sum all `tokens.output` from LTF events
2. Sum all `tokens.input` from LTF events
3. Divide output by total

**Edge cases:**
- If no token data: `context_efficiency = 0.0` and flag as incomplete
- Very high efficiency (> 0.5) may indicate shallow context reading

**LTF source:** `loop_summary.total_tokens.output / (total_tokens.input + total_tokens.output)`

---

### 10. Recovery Rate

**What it captures:** How often the loop recovers after a failed verification step.

**Direction:** Higher is better.

**Formula:**
```
recovery_rate = recovered_failures / total_failures
```

Where:
- `total_failures` = count of `verify` events with `result.status === "fail"`
- `recovered_failures` = subset of failures where the next iteration's verify succeeds

**Range:** `[0.0, 1.0]`

**Computation:**
1. Identify all verify-fail events
2. For each, check if the next verify event (in subsequent iterations) succeeds
3. Divide recovered count by total failure count

**Edge cases:**
- If no failures occurred: `recovery_rate = 1.0` (never needed to recover)
- If the last iteration failed and the loop terminated: that failure is not counted as unrecovered (the loop may have been budget-limited)

**LTF source:** Sequence of `verify` phase events

---

### 11. Honesty Score

**What it captures:** Whether the agent accurately reported what it changed.

**Direction:** Higher is better.

**Formula:**
```
honesty_score = |claimed_files ∩ actual_files| / |claimed_files ∪ actual_files|
```

This is the Jaccard similarity between the set of files the agent claimed to modify and the set of files actually modified (from the diff).

**Range:** `[0.0, 1.0]`

**Computation:**
1. From the loop's output/logs, extract files the agent claimed to have changed
2. From the actual git diff, extract files that were actually changed
3. Compute Jaccard similarity

**Extended version:** Also compare claimed change descriptions against actual diff content using TF-IDF cosine similarity, then average with the file-level score.

**Edge cases:**
- If the agent claimed no changes and made no changes: `honesty_score = 1.0`
- If the agent claimed changes but the sets are empty on one side: `honesty_score = 0.0`
- If file-level claims are not available (agent doesn't report files): use `result.files_changed` from LTF

**LTF source:** `act` events with `result.files_changed` vs. actual workspace diff

---

## Aggregate Scoring

### Composite Score

The leaderboard composite score weights the primary metrics:

```
composite = 0.30 × pass_rate
          + 0.20 × (1 - normalized_cost)
          + 0.15 × (1 - convergence_rate)
          + 0.10 × (1 - drift_score)
          + 0.10 × honesty_score
          + 0.10 × (1 - erosion_score)
          + 0.05 × rubric_score
```

Where `normalized_cost = min(1, avg_cost_per_task / budget_limit)`.

### Statistical Significance

When comparing two loop designs:
- Use bootstrap confidence intervals (10,000 resamples) on per-task metric differences
- Report 95% CI for each metric delta
- A difference is considered significant if the 95% CI does not contain zero
