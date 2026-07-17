# Loop-Bench — Implementation Plan

## Vision

**"SWE-bench for loop designs — prove your loop actually works, measure what matters beyond pass/fail."**

Loop-Bench is the first benchmark designed to isolate and measure **loop architecture quality**. Existing benchmarks (SWE-bench, Terminal-Bench, AgentBench) confound model capability with scaffold/harness design. Loop-Bench holds the model constant and varies only the loop design, measuring convergence, cost, verification accuracy, drift, erosion, and honesty — not just pass/fail.

---

## Why Now

1. **SWE-bench is broken** — saturated (88%+ on Verified), contaminated (94% of tasks in training data), and confounds model + scaffold. OpenAI abandoned it in Feb 2026.
2. **No loop benchmark exists** — despite "loop engineering" being coined June 7, 2026 and 160+ GitHub repos tagged, zero standardized benchmarks measure loop design quality.
3. **Cost is the 2026 metric** — same model, two harnesses = 32x cost difference. Artificial Analysis now reports $/task. Loop-Bench makes this central.
4. **SlopCodeBench proved degradation is measurable** — erosion + verbosity across iterations. Loop-Bench extends this to full loop-level metrics.
5. **LTF already exists** — our trace format + metric calculators (`@loop-eng/ltf`) give us a head start no competitor has.

---

## Architectural Decisions

### AD-1: Anti-Contamination by Design
**Decision:** Use custom synthetic repos, NOT public GitHub issues.
**Why:** SWE-bench's fatal flaw is sourcing from public GitHub. 94% of tasks are in training data. Models memorize patches. Loop-Bench creates purpose-built codebases that don't exist on GitHub.
**Trade-off:** More work to create tasks, but eliminates contamination entirely.

### AD-2: Hold-Model-Constant Protocol
**Decision:** The benchmark protocol fixes the model and varies only the loop.
**Why:** This isolates the loop's contribution. SWE-bench scores confound model + scaffold + prompt + config. Loop-Bench's entire thesis is loop isolation.
**How:** Each benchmark run specifies a single `model_id`. Results are grouped by model, then ranked by loop design within each model group.

### AD-3: LTF-Native Traces
**Decision:** Every benchmark run produces LTF v1.0 traces. Metrics computed from traces.
**Why:** LTF is our foundational spec. It already has `computeMetrics()`, `verificationPassRate()`, `convergenceRate()`, `falseCompletionRate()`, `costEfficiency()`, and `driftScore()` (stub). Loop-Bench is the first real consumer of LTF at scale.
**Import:** `@loop-eng/ltf` for TypeScript metrics, `loopeng-ltf` for Python analysis.

### AD-4: Docker Sandboxing
**Decision:** Each task runs in an isolated Docker container.
**Why:** Proven approach (SWE-bench, Terminal-Bench, Harbor). Reproducible, isolated, cross-platform. End-state verification on the container filesystem.
**Architecture:** Two-tier images — base (Node.js/Python/Go runtime) + task (repo snapshot + deps installed).

### AD-5: Multi-Dimensional Scoring
**Decision:** 6 primary + 5 secondary metrics, not just pass/fail.
**Why:** Pass/fail is meaningless when models solve 88% of tasks. The question is HOW efficiently, HOW cleanly, HOW honestly. Cost, convergence, drift, erosion, and honesty are what differentiate loop designs.

### AD-6: TypeScript + Python Dual Stack
**Decision:** Harness/runner in TypeScript, analysis/visualization in Python.
**Why:** TypeScript for the orchestration layer (Node.js async, Docker SDK, LTF integration). Python for statistical analysis (pandas, matplotlib, scipy). Matches the ecosystem pattern (LTF has both TS + Python parsers).

### AD-7: Adapter-Based Loop Integration
**Decision:** Loop designs register via a standard adapter interface. The runner orchestrates.
**Why:** Loops come in many forms — bash scripts, Claude Code /goal, Codex automations, custom Python agents. The adapter translates each into a standard execution contract.

### AD-8: Rubric-Based + Functional Evaluation
**Decision:** Every task has functional tests AND structural rubrics.
**Why:** SWE-bench uses only functional tests, which miss code quality entirely. SWE Atlas showed 60-80% pass rates on refactoring with functional tests alone; rubrics reveal the real gap. SlopCodeBench proved structural metrics matter.

---

## Architecture

```
loop-bench/
├── spec/
│   ├── BENCHMARK.md              # Methodology document
│   ├── metrics.md                # Metric definitions with formulas
│   ├── task-schema.json          # JSON Schema for task.yaml files
│   └── result-schema.json        # JSON Schema for result.json files
├── tasks/
│   ├── bug-fix/
│   │   ├── wrong-return-type/
│   │   │   ├── task.yaml         # Task definition (id, name, category, difficulty, goal)
│   │   │   ├── repo/             # Self-contained codebase snapshot
│   │   │   ├── ground-truth/     # Expected patch (diff)
│   │   │   ├── rubric.yaml       # Structural rubric (weighted criteria)
│   │   │   └── tests/            # Hidden functional tests (not shown to agent)
│   │   └── ...
│   ├── feature/
│   ├── refactoring/
│   └── multi-step/
├── harness/
│   ├── src/
│   │   ├── runner.ts             # Task execution orchestrator
│   │   ├── evaluator.ts          # Rubric + functional test scorer
│   │   ├── metrics.ts            # Metric calculators (imports from @loop-eng/ltf)
│   │   ├── ltf-collector.ts      # LTF trace collection from loop adapter output
│   │   ├── cost-tracker.ts       # API cost tracking (model pricing table)
│   │   ├── docker.ts             # Docker container management
│   │   ├── adapter.ts            # Loop adapter interface
│   │   ├── report.ts             # Result aggregation and formatting
│   │   └── types.ts              # Shared TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── tsup.config.ts
├── adapters/
│   ├── minimal/                  # Bare act→verify loop (reference baseline)
│   │   ├── adapter.ts
│   │   └── loop.sh
│   ├── reflexion/                # Reflexion-style self-correction
│   │   ├── adapter.ts
│   │   └── loop.sh
│   └── plan-first/               # Plan→execute→verify loop
│       ├── adapter.ts
│       └── loop.sh
├── analysis/
│   ├── compare.py                # Cross-run comparison
│   ├── visualize.py              # Chart generation (matplotlib)
│   ├── statistics.py             # Statistical significance tests
│   └── leaderboard.py            # Leaderboard data generator
├── leaderboard/
│   ├── index.html                # Static site (GitHub Pages)
│   ├── data/                     # Submitted results (JSON)
│   └── assets/                   # CSS, JS, images
├── docker/
│   ├── base/
│   │   ├── Dockerfile.node       # Node.js 20 base image
│   │   ├── Dockerfile.python     # Python 3.12 base image
│   │   └── Dockerfile.go         # Go 1.24 base image
│   └── build.sh                  # Image build script
├── package.json                  # Root package.json
├── pyproject.toml                # Python analysis tools
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .github/
│   └── workflows/
│       └── ci.yml                # Node 20+22 matrix, lint, test, typecheck
├── README.md
├── LICENSE
└── PLAN.md
```

---

## Task Definition Format

```yaml
# tasks/bug-fix/wrong-return-type/task.yaml
id: "bug-fix-001"
name: "Wrong return type in utility function"
category: "bug-fix"           # bug-fix | feature | refactoring | multi-step
difficulty: "easy"            # easy | medium | hard
language: "typescript"        # typescript | python | go
description: |
  The `formatCurrency` function in `src/utils/format.ts` returns
  a number instead of a string. This causes downstream type errors
  in `src/components/PriceDisplay.tsx`.
goal: |
  Fix the return type issue so that `formatCurrency` returns a
  properly formatted string. All existing tests must continue to pass.
repo:
  base_image: "node"          # node | python | go
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
    check: "ast"              # ast | grep | test | manual
  - criterion: "No @ts-ignore or type assertion workarounds"
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

---

## Loop Adapter Interface

```typescript
// adapters/adapter.ts — the contract every loop must implement
export interface LoopAdapter {
  /** Human-readable name for leaderboard display */
  name: string;

  /** Run the loop on a task. Returns when the loop terminates. */
  run(config: LoopRunConfig): Promise<LoopRunResult>;
}

export interface LoopRunConfig {
  /** Absolute path to the task repo (inside Docker container) */
  repoPath: string;
  /** Task goal description (from task.yaml) */
  goal: string;
  /** Test command to verify progress */
  testCommand: string;
  /** Build command (optional) */
  buildCommand?: string;
  /** Model to use (held constant across all loops in a run) */
  modelId: string;
  /** Budget constraints */
  constraints: {
    maxIterations: number;
    maxCostUsd: number;
    timeoutMinutes: number;
  };
  /** Path to write LTF trace output */
  ltfOutputPath: string;
}

export interface LoopRunResult {
  /** Did the loop claim it succeeded? */
  claimedSuccess: boolean;
  /** How did the loop terminate? */
  terminationReason: string;
  /** Total iterations executed */
  iterations: number;
  /** Total cost in USD */
  costUsd: number;
  /** Total duration in ms */
  durationMs: number;
  /** Path to LTF trace file */
  ltfTracePath: string;
  /** Files modified by the loop */
  filesChanged: string[];
}
```

---

## Result Schema

```json
{
  "task_id": "bug-fix-001",
  "loop_design": "reflexion",
  "model": "claude-sonnet-4-6",
  "metrics": {
    "resolved": true,
    "iterations": 4,
    "cost_usd": 0.87,
    "duration_seconds": 45,
    "convergence_rate": 0.25,
    "verification_accuracy": 1.0,
    "drift_score": 0.05,
    "false_completion": false,
    "first_edit_delay": 3,
    "erosion_score": 0.12,
    "verbosity_score": 0.08,
    "rubric_score": 0.95,
    "honesty_score": 1.0,
    "context_efficiency": 0.34,
    "recovery_rate": 0.5
  },
  "ltf_trace": "traces/bug-fix-001-reflexion.ltf.jsonl",
  "timestamp": "2026-07-15T10:30:00Z"
}
```

---

## Metrics

### Primary Metrics (6)

| # | Metric | Formula | What It Captures |
|---|--------|---------|-----------------|
| 1 | **Convergence Rate** | iterations_to_success / max_iterations | How fast the loop reaches a solution |
| 2 | **Cost Efficiency** | total_cost_usd / tasks_resolved | Dollars per successful task |
| 3 | **Verification Accuracy** | (TP + TN) / total_checks | Does the verifier catch real failures? |
| 4 | **Drift Score** | 1 - cosine_similarity(goal, final_diff) | Did the loop stay on-goal? (0 = perfect) |
| 5 | **False Completion Rate** | false_successes / claimed_successes | Loop said "done" but wasn't |
| 6 | **Erosion Score** | complexity_growth across iterations | Code quality degradation (from SlopCodeBench) |

### Secondary Metrics (5)

| # | Metric | What It Captures |
|---|--------|-----------------|
| 7 | **First-Edit Delay** | Steps before first code modification |
| 8 | **Verbosity Score** | Fraction of redundant/duplicated code |
| 9 | **Context Efficiency** | output_tokens / total_tokens |
| 10 | **Recovery Rate** | Recoveries from failed verification / total failures |
| 11 | **Honesty Score** | Semantic match: agent's claimed changes vs. actual diff |

---

## Evaluation Pipeline

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│  task.yaml│────▶│  Docker   │────▶│   Loop    │────▶│ Evaluator│────▶│ Reporter │
│           │     │  Sandbox  │     │  Adapter  │     │ (rubric  │     │ (metrics │
│           │     │  (build + │     │  (runs    │     │  + tests │     │  + LTF   │
│           │     │   setup)  │     │   loop)   │     │  + AST)  │     │  + JSON) │
└──────────┘     └──────────┘     └───────────┘     └──────────┘     └──────────┘
                                       │                                   │
                                       ▼                                   ▼
                                 LTF trace file                     result.json
                                 (per iteration)                 (per task × loop)
```

1. **Docker Sandbox**: Build task image, clone repo, install deps, configure environment.
2. **Loop Adapter**: The loop implementation runs inside the sandbox. Emits LTF events.
3. **Evaluator**: After loop terminates — apply tests (hidden), score rubric, compute AST metrics.
4. **Reporter**: Compute all 11 metrics from LTF trace + evaluation results. Write result.json.

---

## Task Suite (30 Tasks Total)

### Category 1: Bug Fix (10 tasks)
Custom synthetic repos with planted bugs. Each bug has a known fix.

| # | Task | Lang | Difficulty | Ground Truth |
|---|------|------|-----------|-------------|
| 1 | Wrong return type in utility | TS | Easy | Type annotation fix |
| 2 | Off-by-one in pagination | TS | Easy | Index correction |
| 3 | Missing null check crashes API | TS | Easy | Null guard addition |
| 4 | Race condition in async handler | TS | Medium | Lock addition |
| 5 | Memory leak in event listener | TS | Medium | Cleanup in teardown |
| 6 | Incorrect date parsing (timezone) | Python | Medium | TZ-aware parsing |
| 7 | SQL injection in query builder | Python | Medium | Parameterized query |
| 8 | Cross-module import cycle | TS | Hard | Dependency inversion |
| 9 | Deadlock in concurrent worker pool | Go | Hard | Channel restructure |
| 10 | Silent data corruption in serializer | Python | Hard | Encoding fix |

### Category 2: Feature Implementation (10 tasks)
Spec-driven features with functional + rubric verification.

| # | Task | Lang | Difficulty |
|---|------|------|-----------|
| 11 | Add rate limiting to API endpoint | TS | Medium |
| 12 | Implement retry with exponential backoff | TS | Medium |
| 13 | Add cursor-based pagination | TS | Medium |
| 14 | Implement webhook signature verification | TS | Hard |
| 15 | Add request validation middleware | TS | Medium |
| 16 | Implement CLI argument parser | Python | Medium |
| 17 | Add structured logging | Python | Medium |
| 18 | Implement cache with TTL | Go | Medium |
| 19 | Add health check endpoint | TS | Easy |
| 20 | Implement file upload with streaming | TS | Hard |

### Category 3: Refactoring (5 tasks)
Before/after pairs with structural quality rubrics.

| # | Task | Lang | Rubric Focus |
|---|------|------|-------------|
| 21 | Extract shared logic into module | TS | No duplicate code, clean imports |
| 22 | Convert callbacks to async/await | TS | No nesting, error handling preserved |
| 23 | Split monolith route handler | TS | Each module < 200 LOC |
| 24 | Replace string manipulation with parser | Python | No regex, proper AST |
| 25 | Consolidate config loading | Go | Single source of truth |

### Category 4: Multi-Step (5 tasks)
Tasks requiring multiple iterations where initial decisions compound.

| # | Task | Lang | Steps | Tests |
|---|------|------|-------|-------|
| 26 | Build CRUD API from spec | TS | 4 endpoints + tests | Loop planning |
| 27 | Add auth to existing app | TS | Model + middleware + routes | Cross-cutting threading |
| 28 | Build CLI tool from scratch | Python | Parser + commands + help | Incremental implementation |
| 29 | Migrate callback API to promises | TS | 5 files, incremental | Strategy selection |
| 30 | Add test suite to untested module | TS | Discovery + writing + coverage | Test quality |

---

## Baseline Loop Designs (3)

### 1. Minimal Loop (`adapters/minimal/`)
Bare act→verify cycle. No planning, no reflection, no memory.
```
while not done and iteration < max:
  response = llm(goal + repo_state)
  apply_changes(response)
  test_result = run_tests()
  if test_result.passed:
    done = true
  iteration++
```

### 2. Reflexion Loop (`adapters/reflexion/`)
Self-correction via reflection on failures. Maintains reflection memory.
```
reflections = []
while not done and iteration < max:
  response = llm(goal + repo_state + reflections)
  apply_changes(response)
  test_result = run_tests()
  if test_result.passed:
    done = true
  else:
    reflection = llm("reflect on failure: " + test_result.errors)
    reflections.append(reflection)
  iteration++
```

### 3. Plan-First Loop (`adapters/plan-first/`)
Create plan before acting. Revise plan on failure.
```
plan = llm("create step-by-step plan for: " + goal)
while not done and iteration < max:
  next_step = plan.pop()
  response = llm("execute step: " + next_step + repo_state)
  apply_changes(response)
  test_result = run_tests()
  if all_steps_done and test_result.passed:
    done = true
  elif test_result.failed:
    plan = llm("revise plan given failure: " + test_result.errors)
  iteration++
```

---

## Leaderboard

Static site hosted on GitHub Pages. Sortable by any metric. Filterable by task category, model, and difficulty.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        loop-bench Leaderboard                          │
│  Model: claude-sonnet-4-6  ▼    Category: All  ▼    Difficulty: All ▼ │
├───────────────┬──────┬────────┬──────────┬───────┬─────────┬──────────┤
│ Loop Design   │ Pass │ $/Task │ Converge │ Drift │ Honesty │ Erosion  │
│               │ Rate │        │ (iters)  │ Score │ Score   │ Score    │
├───────────────┼──────┼────────┼──────────┼───────┼─────────┼──────────┤
│ plan-first    │  87% │ $1.23  │     4.2  │ 0.08  │   0.96  │   0.15   │
│ reflexion     │  83% │ $0.94  │     5.1  │ 0.12  │   0.91  │   0.19   │
│ minimal       │  70% │ $0.67  │     7.8  │ 0.22  │   0.85  │   0.28   │
│ tree-search   │  90% │ $3.45  │     3.1  │ 0.05  │   0.98  │   0.09   │
└───────────────┴──────┴────────┴──────────┴───────┴─────────┴──────────┘
```

---

## Development Phases

### Phase 0: Scaffold (this phase)
**Goal:** Project structure, CI, config, README skeleton.
- Initialize npm workspace (`@loop-eng/bench`)
- TypeScript config (tsup, vitest, ESLint 9 flat config)
- Python config (pyproject.toml, ruff)
- Directory structure (spec/, tasks/, harness/, adapters/, analysis/, leaderboard/, docker/)
- CI: GitHub Actions (Node 20+22, lint, test, typecheck)
- Git init, push to `loop-eng/loop-bench`
- README with vision statement, competitive table, architecture diagram
- LICENSE (MIT)

### Phase 1: Spec + Schemas
**Goal:** Methodology document + machine-readable schemas.
- `spec/BENCHMARK.md` — full methodology document (hold-model-constant, anti-contamination, metric definitions, evaluation protocol, submission format)
- `spec/metrics.md` — each of the 11 metrics with formula, interpretation, edge cases
- `spec/task-schema.json` — JSON Schema for task.yaml validation
- `spec/result-schema.json` — JSON Schema for result.json validation
- Validation utilities (TS + Python)
- Tests for schema validation

### Phase 2: First 10 Tasks (Bug Fix)
**Goal:** 10 complete bug-fix tasks with synthetic repos, ground truth, rubrics, and hidden tests.
- Create 10 self-contained repo snapshots (TS: 7, Python: 2, Go: 1)
- Each repo: package.json/pyproject.toml/go.mod, source files, existing tests
- Plant bugs with known fixes
- Write ground-truth patches
- Write rubric.yaml per task
- Write hidden test suites (tests agent never sees)
- Write task.yaml per task
- Validate all tasks against task-schema.json

### Phase 3: Docker Sandbox
**Goal:** Container management for isolated task execution.
- Base Dockerfiles (Node.js 20, Python 3.12, Go 1.24)
- Task image builder (base + repo snapshot + deps)
- Container lifecycle management (create, start, exec, copy, stop, remove)
- Volume mounts for LTF output
- Timeout enforcement
- Resource limits (CPU, memory)
- Tests for Docker operations

### Phase 4: Harness Core (Runner + Evaluator)
**Goal:** Execute a loop adapter on a task and evaluate results.
- `runner.ts` — orchestrates: build sandbox → run adapter → collect results
- `evaluator.ts` — score rubric criteria + run hidden tests + compute AST metrics
- `ltf-collector.ts` — parse and validate LTF trace from adapter output
- `cost-tracker.ts` — API cost calculation (model pricing table from LoopCtl)
- `adapter.ts` — adapter interface + adapter loader
- `report.ts` — aggregate results, format JSON, print summary
- `types.ts` — shared types
- CLI entry point (`bench run`, `bench evaluate`, `bench report`)
- Integration tests with mock adapter

### Phase 5: Metrics Engine
**Goal:** All 11 metric calculators, importing from @loop-eng/ltf where possible.
- Import core metrics from `@loop-eng/ltf`: verificationPassRate, convergenceRate, falseCompletionRate, costEfficiency
- Implement new metrics: driftScore (cosine similarity via TF-IDF), erosionScore (cyclomatic complexity tracking), verbosityScore (duplicate code detection), honestyScore (claimed vs actual diff comparison), firstEditDelay, contextEfficiency, recoveryRate
- Aggregate scoring: per-task, per-category, per-loop-design
- Statistical significance testing (bootstrap confidence intervals)
- Tests for every metric with edge cases

### Phase 6: Baseline Adapters (3 Loops)
**Goal:** Three reference loop implementations that can run any task.
- Minimal loop adapter (bare act→verify)
- Reflexion loop adapter (self-correction with reflection memory)
- Plan-first loop adapter (plan→execute→verify)
- Each adapter: TypeScript implementation + bash wrapper + LTF emission
- Run all 3 adapters against all 10 bug-fix tasks
- Generate first real benchmark results
- Validate metrics against expected ranges

### Phase 7: Feature + Refactoring + Multi-Step Tasks (20 tasks)
**Goal:** Expand task suite to full 30 tasks.
- 10 feature implementation tasks (with rubrics)
- 5 refactoring tasks (with structural rubrics)
- 5 multi-step tasks (with checkpoint verification)
- Validate against task-schema.json
- Run baselines against all 30 tasks

### Phase 8: Analysis + Visualization
**Goal:** Cross-run comparison tools and charts.
- `compare.py` — load multiple result sets, compute deltas, rank
- `visualize.py` — convergence curves, cost scatter plots, radar charts, box plots
- `statistics.py` — bootstrap CIs, paired t-tests, effect sizes
- `leaderboard.py` — generate leaderboard JSON from results
- Example analysis notebooks

### Phase 9: Leaderboard + Static Site
**Goal:** GitHub Pages leaderboard with sortable, filterable tables.
- Static HTML/CSS/JS (no framework, vanilla)
- Sortable columns (click to sort by any metric)
- Filter by: model, category, difficulty
- Responsive design
- Data loading from `data/` JSON files
- Submission format documentation

### Phase 10: CLI + Distribution
**Goal:** npm + PyPI packages for local runs.
- npm `@loop-eng/bench` — `bench run`, `bench evaluate`, `bench report`, `bench submit`
- PyPI `loopeng-bench` — analysis tools
- GitHub Actions workflow for automated benchmark runs
- Submission protocol (PR to leaderboard/data/)
- `bench init` — scaffold a custom loop adapter

### Phase 11: Bug Hunt Protocol
**Goal:** Exhaustive multi-pass audit (per handoff.md).
- Pass 1-2: Parallel agent audit (4 agents, different scopes)
- Pass 3: Integration path audit
- Pass 4: Deferred items
- Pass 5: Live system testing (run full benchmark end-to-end)
- Pass 6: Adversarial testing (malformed tasks, broken repos, timeout edge cases)
- Pass 7-9: Edge cases, lint, remaining items
- Pass 10: golangci-lint equivalent (ESLint strict, ruff)
- Pass 11: Integration tests
- Pass 12: Fuzz testing
- Pass 13: Final review + FINDINGS.md

### Phase 12: Launch
**Goal:** Ship to GitHub, npm, PyPI. Launch materials.
- Blog post: "Introducing Loop-Bench: The First Benchmark for Loop Designs"
- Show HN post
- Reddit posts (r/machinelearning, r/programming)
- README with charts, methodology summary, competitive table
- First leaderboard data (3 baselines × 30 tasks)

---

## Technical Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Harness/Runner | TypeScript (Node.js 20) | Async orchestration, Docker SDK, LTF import |
| Evaluator | TypeScript + ts-morph | AST analysis for rubric checks |
| Metrics | TypeScript (@loop-eng/ltf) | Reuse existing metric calculators |
| Analysis | Python (pandas, scipy, matplotlib) | Statistical analysis, visualization |
| Sandboxing | Docker (dockerode) | Proven isolation approach |
| Task format | YAML (yaml npm package) | Human-readable task definitions |
| Schemas | JSON Schema (Ajv) | Machine-readable validation |
| Leaderboard | Static HTML/CSS/JS | GitHub Pages, zero framework |
| CI | GitHub Actions | Node 20+22 matrix |
| Charts | matplotlib + seaborn | Publication-quality figures |
| Build | tsup | ESM+CJS dual output |
| Test | vitest | TS tests |
| Lint | ESLint 9 flat + ruff | TS + Python linting |

---

## Naming + Distribution

| Field | Value |
|-------|-------|
| Repo | `loop-eng/loop-bench` |
| npm | `@loop-eng/bench` |
| PyPI | `loopeng-bench` |
| Binary | `bench` (via npx) |
| License | MIT |
| Author | Raj Firke |

---

## Competitive Differentiation

| Benchmark | Measures | Misses | Loop-Bench Advantage |
|-----------|----------|--------|---------------------|
| **SWE-bench** | Issue resolution rate | Confounds model + scaffold. Pass/fail only. Contaminated. | Isolates loop. 11 metrics. Anti-contamination. |
| **SWE-bench Pro** | Harder issues, multi-language | Still confounds model + scaffold | Loop isolation |
| **Terminal-Bench** | CLI/terminal agent capability | No loop-level analysis | Loop-specific metrics |
| **SlopCodeBench** | Code quality degradation | No cost. No verification accuracy. | Full metric suite |
| **AgentBench** | Cross-domain agent generalization | Synthetic. No loop analysis. | Real coding tasks. Loop focus. |
| **Coding Agent Index** | Full-stack model+harness | Black-box. No metric breakdown. | Open. Transparent. Reproducible. |
| **loop-bench** | **Loop architecture quality** | — | **11 metrics. LTF traces. Hold-model-constant. Anti-contamination.** |

---

## Success Metrics

| Timeline | Target |
|----------|--------|
| Phase 6 complete | 10 tasks, 3 baselines, first real results |
| Phase 9 complete | 30 tasks, leaderboard live |
| Month 2 | First external loop design submitted |
| Month 3 | 500+ GitHub stars |
| Month 6 | 1,000+ stars, cited in loop engineering discussions |
