# loop-bench

**SWE-bench for loop designs — standardized benchmarks that measure loop architecture quality beyond pass/fail.**

[![CI](https://github.com/loop-eng/loop-bench/actions/workflows/ci.yml/badge.svg)](https://github.com/loop-eng/loop-bench/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

Loop design decisions are made on vibes, not data.

Developers don't know: Does my verification gate actually catch failures? Is my loop converging or spinning? How does my loop compare to alternatives on the same tasks? What does my loop cost per successful task?

Existing benchmarks (SWE-bench, Terminal-Bench, AgentBench) confound model capability with loop/harness design. Two reports using the same model can differ by 25+ percentage points purely because of the scaffold.

## The Solution

**loop-bench** holds the model constant and varies only the loop design. It measures what the loop contributes — not what the model can do.

```
┌──────────────────────────────────────────────────────────┐
│                 loop-bench Leaderboard                   │
│  Model: claude-sonnet-4-6                                │
├──────────────┬──────┬────────┬───────┬───────┬──────────┤
│ Loop Design  │ Pass │ $/Task │ Drift │ Honest│ Erosion  │
├──────────────┼──────┼────────┼───────┼───────┼──────────┤
│ plan-first   │  87% │ $1.23  │  0.08 │  0.96 │   0.15   │
│ reflexion    │  83% │ $0.94  │  0.12 │  0.91 │   0.19   │
│ minimal      │  70% │ $0.67  │  0.22 │  0.85 │   0.28   │
└──────────────┴──────┴────────┴───────┴───────┴──────────┘
```

## Key Insight: Isolate the Loop, Not the Model

| Study | Finding |
|-------|---------|
| GPT-5.5 in Codex vs. Cursor | Same model, 25.7pp score difference — scaffold only |
| "Beyond Resolution Rates" (9,374 trajectories) | Framework swaps = 0.9–19.4pp variation |
| SlopCodeBench (196 checkpoints) | Quality degrades in 77% of agent trajectories |
| Artificial Analysis Coding Agent Index | Same model, two harnesses = 32x cost difference |

## What We Measure (11 Metrics)

### Primary Metrics

| Metric | What It Captures |
|--------|-----------------|
| **Convergence Rate** | Iterations to completion |
| **Cost Efficiency** | Dollars per successful task |
| **Verification Accuracy** | Does the verifier catch real failures? |
| **Drift Score** | Did the loop stay on-goal? |
| **False Completion Rate** | Loop said "done" but wasn't |
| **Erosion Score** | Code quality degradation over iterations |

### Secondary Metrics

| Metric | What It Captures |
|--------|-----------------|
| **First-Edit Delay** | Steps before first code modification |
| **Verbosity Score** | Fraction of redundant/duplicated code |
| **Context Efficiency** | Output tokens / total tokens |
| **Recovery Rate** | How often the loop recovers from failed verification |
| **Honesty Score** | What the agent said it changed vs. the actual diff |

## Anti-Contamination by Design

Unlike SWE-bench (94% of tasks in training data, OpenAI abandoned it Feb 2026), loop-bench uses **custom synthetic repositories** that don't exist on GitHub. No model has seen these tasks.

## Task Categories

| Category | Tasks | What It Tests |
|----------|-------|---------------|
| Bug Fix | 10 | Single-file to cross-module fixes |
| Feature | 10 | Spec-driven implementation with rubrics |
| Refactoring | 5 | Structural quality under transformation |
| Multi-Step | 5 | Architectural decisions that compound |

Tasks span TypeScript, Python, and Go.

## Architecture

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ task.yaml │────▶│  Docker   │────▶│   Loop    │────▶│ Evaluator│────▶│ Reporter │
│           │     │  Sandbox  │     │  Adapter  │     │ (rubric  │     │ (metrics │
│           │     │           │     │           │     │ + tests) │     │ + LTF)   │
└──────────┘     └──────────┘     └───────────┘     └──────────┘     └──────────┘
                                       │                                   │
                                       ▼                                   ▼
                                 LTF trace file                     result.json
```

Every run produces [LTF](https://github.com/loop-eng/ltf) traces — the open standard for agent loop telemetry.

## Competitive Differentiation

| Benchmark | Measures | What It Misses |
|-----------|----------|----------------|
| **SWE-bench** | Issue resolution rate | Confounds model + scaffold. Pass/fail only. Contaminated. |
| **Terminal-Bench** | CLI agent capability | No loop-level analysis |
| **SlopCodeBench** | Code quality degradation | No cost. No verification accuracy. |
| **AgentBench** | Cross-domain generalization | Synthetic environments. No loop analysis. |
| **loop-bench** | **Loop architecture quality** | **11 metrics. LTF traces. Hold-model-constant. Anti-contamination.** |

## Baseline Loop Designs

Three reference implementations included:

| Loop | Strategy | Expected Cost | Expected Quality |
|------|----------|---------------|-----------------|
| **Minimal** | Bare act → verify cycle | Low | Low |
| **Reflexion** | Self-correction via reflection memory | Medium | Medium |
| **Plan-First** | Plan → execute → verify with replanning | Higher | Higher |

## Quick Start

```bash
# Install
npm install -g @loop-eng/bench

# List tasks
bench list

# Run benchmark with a loop adapter
bench run --adapter ./my-loop.ts --model claude-sonnet-4-6

# View results
bench report --results ./results
```

## Writing a Loop Adapter

```typescript
import type { LoopAdapter, LoopRunConfig, LoopRunResult } from "@loop-eng/bench";

const myLoop: LoopAdapter = {
  name: "my-custom-loop",
  async run(config: LoopRunConfig): Promise<LoopRunResult> {
    // Your loop implementation here
    // The adapter runs inside a Docker sandbox with access to:
    //   config.repoPath     - the task repository
    //   config.goal         - what to accomplish
    //   config.testCommand  - how to verify
    //   config.modelId      - which model to use
    //   config.constraints  - budget limits
  },
};

export default myLoop;
```

## Part of the loop-eng Ecosystem

| Tool | What It Does | Status |
|------|-------------|--------|
| [ltf](https://github.com/loop-eng/ltf) | Loop Trace Format — the open standard | Shipped |
| [loopguard](https://github.com/loop-eng/loopguard) | Circuit breaker for agent loops | Shipped |
| [loopctl](https://github.com/loop-eng/loopctl) | htop for AI coding agents | Shipped |
| [kit](https://github.com/loop-eng/kit) | Scaffold production-ready loops in 30s | Shipped |
| **loop-bench** | **SWE-bench for loop designs** | **Active** |
| [loopreplay](https://github.com/loop-eng/loopreplay) | Wireshark for agent loops | Planned |

## License

MIT
