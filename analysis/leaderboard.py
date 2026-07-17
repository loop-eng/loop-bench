"""Leaderboard data generator for loop-bench results."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .compare import load_results, rank_loop_designs


def generate_leaderboard_data(
    results_path: str | Path,
    output_path: str | Path,
    budget_limit: float = 5.0,
) -> dict[str, Any]:
    """Generate leaderboard JSON from benchmark results.

    Returns the leaderboard data dict and writes it to output_path.
    """
    results = load_results(results_path)
    ranked = rank_loop_designs(results, budget_limit=budget_limit)

    models = sorted({r.get("model", "unknown") for r in results})

    leaderboard: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "benchmark_version": "1.0",
        "total_tasks": len({r.get("taskId") for r in results}),
        "total_submissions": len(ranked),
        "models": models,
        "entries": [],
    }

    for entry in ranked:
        m = entry["metrics"]
        leaderboard["entries"].append({
            "rank": entry["rank"],
            "loopDesign": entry["loopDesign"],
            "compositeScore": entry["compositeScore"],
            "passRate": m.get("passRate", 0.0),
            "avgCostPerTask": m.get("costUsd", 0.0),
            "avgIterations": m.get("iterations", 0.0),
            "avgConvergenceRate": m.get("convergenceRate", 0.0),
            "avgDriftScore": m.get("driftScore", 0.0),
            "avgHonestyScore": m.get("honestyScore", 0.0),
            "avgErosionScore": m.get("erosionScore", 0.0),
            "avgRubricScore": m.get("rubricScore", 0.0),
            "totalTasks": int(m.get("totalTasks", 0)),
        })

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(leaderboard, f, indent=2)

    return leaderboard


def format_leaderboard_table(leaderboard: dict[str, Any]) -> str:
    """Format leaderboard data as a text table."""
    entries = leaderboard.get("entries", [])
    if not entries:
        return "No submissions."

    header = (
        f"{'#':>2}  {'Loop Design':<20}  {'Score':>6}  {'Pass':>5}  "
        f"{'$/Task':>7}  {'Iters':>5}  {'Drift':>5}  {'Honest':>6}  {'Erosion':>7}"
    )
    separator = "-" * len(header)
    rows = [header, separator]

    for e in entries:
        row = (
            f"{e['rank']:>2}  {e['loopDesign']:<20}  {e['compositeScore']:>6.3f}  "
            f"{e['passRate'] * 100:>4.0f}%  "
            f"${e['avgCostPerTask']:>6.2f}  "
            f"{e['avgIterations']:>5.1f}  "
            f"{e['avgDriftScore']:>5.2f}  "
            f"{e['avgHonestyScore']:>6.2f}  "
            f"{e['avgErosionScore']:>7.2f}"
        )
        rows.append(row)

    return "\n".join(rows)
