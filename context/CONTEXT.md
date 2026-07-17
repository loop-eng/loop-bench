# LoopBench — Loop Benchmarks: Development Context

## Project Summary
LoopBench is the standardized benchmarking suite for loop designs — measures convergence rate, cost efficiency, verification accuracy, drift, and false completion rate. The "SWE-bench for loop engineering."

## Origin
- No standardized way to compare loop designs exists
- Loop design decisions are made on vibes, not data
- Being "the benchmark" is a permanent power position (SWE-bench has 3k+ stars)

## Key Design Decisions (Pending)
- [ ] Task format (GitHub issues? Specs? Before/after pairs?)
- [ ] Evaluation harness architecture
- [ ] Leaderboard hosting (GitHub Pages? Separate site?)
- [ ] "Honesty score" methodology
- [ ] LTF integration for result storage

## Technical Stack
- Language: TypeScript + Python
- Task runner: Node.js orchestration
- Evaluation: Python analysis scripts
- Leaderboard: GitHub Pages or Vercel

## Research Status
- Research agent launched covering SWE-bench structure, existing benchmarks, task format design
