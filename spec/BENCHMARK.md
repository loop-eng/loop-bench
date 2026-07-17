# Loop-Bench Methodology v1.0

## 1. Purpose

Loop-bench is a standardized benchmark for measuring **loop architecture quality** in AI coding agents. Unlike existing benchmarks that confound model capability with scaffold/harness design, loop-bench isolates the loop's contribution by holding the model constant and varying only the loop design.

## 2. The Problem with Existing Benchmarks

### 2.1 Confounded Measurements

SWE-bench, Terminal-Bench, and AgentBench report a single score that blends model capability, scaffold design, prompt engineering, and configuration. Two reports using the same model can differ by 25+ percentage points purely because of the scaffold. This makes it impossible to answer: "Is my loop design better than yours?"

### 2.2 Pass/Fail is Insufficient

Pass/fail tells you whether a task was solved, not how well. A loop that solves 80% of tasks in 3 iterations at $0.50 each is fundamentally different from one that solves 80% in 12 iterations at $4.00 each — but pass-rate treats them as identical.

### 2.3 Contamination

94% of SWE-bench tasks exist in model training data. OpenAI abandoned SWE-bench Verified in February 2026 after finding frontier models could reproduce verbatim gold patches. Loop-bench eliminates this by using custom synthetic repositories.

## 3. Core Principles

### 3.1 Hold-Model-Constant Protocol

Every benchmark run specifies a single `model_id`. All loop adapters in a run use the same model. Results are grouped by model, then ranked by loop design within each model group.

This isolates the loop's contribution. If Loop A outperforms Loop B on the same model and tasks, the difference is attributable to loop design — not model capability.

**Required metadata for every submission:**
- Model ID (e.g., `claude-sonnet-4-6`)
- Model version or checkpoint
- Temperature and sampling parameters
- Any system prompt modifications

### 3.2 Anti-Contamination by Design

Tasks use custom synthetic repositories that do not exist on GitHub or in any public dataset. No model has seen these codebases, their bugs, or their solutions during training.

**Task creation requirements:**
- Repositories MUST be purpose-built for loop-bench
- Repositories MUST NOT be derived from public GitHub repositories
- Task descriptions MUST NOT reference real GitHub issues
- Ground truth patches MUST NOT appear in any public location

### 3.3 Multi-Dimensional Scoring

Every run produces 11 metrics across 6 primary and 5 secondary dimensions (see `metrics.md`). Pass/fail is one data point among many — not the headline number.

### 3.4 LTF-Native Traces

Every benchmark run produces Loop Trace Format (LTF v1.0) traces. Metrics are computed from traces, making results reproducible and auditable. Third parties can recompute any metric from the raw trace data.

### 3.5 Rubric-Based Evaluation

Every task has both functional tests (does the code work?) and structural rubrics (is the code good?). Rubrics catch quality issues that functional tests miss:
- Workarounds (e.g., `@ts-ignore`, `type: any`)
- Unnecessary complexity
- Violation of architectural constraints
- Dead code or unused imports

## 4. Task Design

### 4.1 Categories

| Category | Count | Purpose |
|----------|-------|---------|
| Bug Fix | 10 | Single-point fixes with known ground truth |
| Feature | 10 | Spec-driven implementation with quality rubrics |
| Refactoring | 5 | Structural transformation with quality constraints |
| Multi-Step | 5 | Tasks where early decisions compound |

### 4.2 Difficulty Levels

| Level | Definition |
|-------|-----------|
| Easy | 1 file, < 10 lines changed, straightforward fix |
| Medium | 1-3 files, 10-50 lines, requires understanding context |
| Hard | 3+ files, 50+ lines, requires architectural reasoning |

### 4.3 Languages

Tasks span TypeScript, Python, and Go to avoid language-specific bias.

### 4.4 Task Definition Format

Each task is defined by a `task.yaml` file conforming to `spec/task-schema.json`:

```yaml
id: "bug-fix-001"
name: "Wrong return type in utility function"
category: "bug-fix"
difficulty: "easy"
language: "typescript"
description: |
  Human-readable description of the problem.
goal: |
  What the loop should accomplish.
repo:
  base_image: "node"
  setup_command: "npm install"
  test_command: "npm test"
  build_command: "npx tsc --noEmit"
ground_truth:
  patch_file: "ground-truth/fix.patch"
  files_changed: ["src/utils/format.ts"]
  lines_changed: 3
rubric:
  - criterion: "Return type is string, not number"
    weight: 0.4
    check: "ast"
  - criterion: "No type assertion workarounds"
    weight: 0.3
    check: "grep"
  - criterion: "All existing tests pass"
    weight: 0.3
    check: "test"
constraints:
  max_iterations: 20
  max_cost_usd: 5.00
  timeout_minutes: 15
```

### 4.5 Hidden Tests

Each task includes a hidden test suite (`tests/`) that is NOT shown to the agent. The agent receives only the task description and goal. This prevents test-driven shortcuts that mask poor loop planning.

### 4.6 Ground Truth

Ground truth patches establish the expected solution but are NOT used for evaluation directly. Evaluation uses functional tests and rubric scoring. A loop may produce a different patch than the ground truth and still score perfectly if tests pass and rubrics are satisfied.

## 5. Evaluation Pipeline

```
task.yaml → Docker Sandbox → Loop Adapter → Evaluator → Reporter
                                  │                         │
                                  ▼                         ▼
                            LTF trace file           result.json
```

### 5.1 Docker Sandbox

Each task runs in an isolated Docker container:
1. Build task image from base (Node/Python/Go) + repo snapshot
2. Run setup command (e.g., `npm install`)
3. Mount volume for LTF trace output
4. Enforce resource limits (CPU, memory, timeout)

### 5.2 Loop Adapter Execution

The loop adapter receives:
- Path to the task repository (inside the container)
- Goal description
- Test command
- Model ID
- Budget constraints
- LTF output path

The adapter runs until it terminates (goal met, budget exhausted, timeout, or error).

### 5.3 Evaluation

After the loop terminates:
1. **Functional tests**: Run the hidden test suite against the modified codebase
2. **Rubric scoring**: Evaluate each rubric criterion (AST analysis, grep, test)
3. **LTF metric computation**: Compute all 11 metrics from the LTF trace
4. **Honesty check**: Compare the agent's claimed changes against the actual diff

### 5.4 Scoring

The result is a `result.json` conforming to `spec/result-schema.json`, containing all 11 metrics plus metadata.

## 6. Submission Format

### 6.1 Required Fields

Submissions MUST include:
- Loop adapter name and version
- Model ID and configuration
- All 30 task results
- LTF trace files for every task
- Timestamp of the run

### 6.2 Reproducibility

Submissions SHOULD include:
- Loop adapter source code (or link to public repository)
- Docker image used for evaluation
- Exact API parameters (temperature, max_tokens, etc.)

### 6.3 Verification

Submitted results can be verified by:
1. Re-running the benchmark with the provided adapter
2. Recomputing metrics from the submitted LTF traces
3. Cross-checking functional test results

## 7. Leaderboard Rules

### 7.1 Grouping

Results are grouped by model. Within each model group, loop designs are ranked by a composite score:

```
composite = 0.30 × pass_rate
          + 0.20 × (1 - normalized_cost)
          + 0.15 × convergence_rate
          + 0.10 × (1 - drift_score)
          + 0.10 × honesty_score
          + 0.10 × (1 - erosion_score)
          + 0.05 × rubric_score
```

### 7.2 Minimum Requirements

A submission is valid only if:
- All 30 tasks were attempted
- The model was held constant across all tasks
- LTF traces are provided for every task
- Results conform to `spec/result-schema.json`

### 7.3 Fair Comparison

Loop adapters MUST NOT:
- Access ground truth patches
- Access hidden test suites before evaluation
- Use different models for different tasks
- Hard-code task-specific behavior

## 8. Versioning

- Benchmark version: `1.0`
- Task schema version: tied to benchmark version
- Result schema version: tied to benchmark version
- New tasks may be added within a major version
- Metric definitions are frozen within a major version
- Breaking changes require a new major version
