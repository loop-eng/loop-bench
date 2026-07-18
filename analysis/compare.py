"""Cross-run comparison tool for loop-bench results."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

METRIC_KEYS = [
    "resolved",
    "iterations",
    "costUsd",
    "durationSeconds",
    "convergenceRate",
    "verificationAccuracy",
    "driftScore",
    "falseCompletion",
    "firstEditDelay",
    "erosionScore",
    "verbosityScore",
    "rubricScore",
    "honestyScore",
    "contextEfficiency",
    "recoveryRate",
]

HIGHER_IS_BETTER = {
    "resolved",
    "verificationAccuracy",
    "rubricScore",
    "honestyScore",
    "contextEfficiency",
    "recoveryRate",
}

LOWER_IS_BETTER = {
    "iterations",
    "costUsd",
    "durationSeconds",
    "convergenceRate",
    "driftScore",
    "erosionScore",
    "verbosityScore",
    "falseCompletion",
}


def load_results(path: str | Path) -> list[dict[str, Any]]:
    """Load benchmark results from a JSON file or directory containing results.json."""
    p = Path(path)
    if p.is_dir():
        p = p / "results.json"
    if not p.exists():
        raise FileNotFoundError(f"Results not found: {p}")
    with open(p) as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Results file must contain a JSON array")
    return data


def group_by_loop(results: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Group results by loop design name."""
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in results:
        key = r.get("loopDesign", "unknown")
        groups.setdefault(key, []).append(r)
    return groups


def summarize_group(results: list[dict[str, Any]]) -> dict[str, float]:
    """Compute average metrics for a group of results."""
    if not results:
        return {}
    n = len(results)
    summary: dict[str, float] = {}
    for key in METRIC_KEYS:
        values = []
        for r in results:
            v = r.get("metrics", {}).get(key)
            if isinstance(v, bool):
                values.append(1.0 if v else 0.0)
            elif isinstance(v, (int, float)):
                values.append(float(v))
        if values:
            summary[key] = round(sum(values) / len(values), 4)
    summary["passRate"] = round(
        sum(1 for r in results if r.get("metrics", {}).get("resolved")) / n, 4
    )
    summary["totalTasks"] = float(n)
    return summary


def compare_runs(
    baseline: list[dict[str, Any]],
    candidate: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare two benchmark runs and compute deltas for each metric."""
    base_summary = summarize_group(baseline)
    cand_summary = summarize_group(candidate)

    deltas: dict[str, dict[str, Any]] = {}
    for key in METRIC_KEYS:
        b_val = base_summary.get(key, 0.0)
        c_val = cand_summary.get(key, 0.0)
        delta = round(c_val - b_val, 4)
        if key in HIGHER_IS_BETTER:
            improved = delta > 0
        elif key in LOWER_IS_BETTER:
            improved = delta < 0
        else:
            improved = False
        deltas[key] = {"baseline": b_val, "candidate": c_val, "delta": delta, "improved": improved}

    return {
        "baseline": base_summary,
        "candidate": cand_summary,
        "deltas": deltas,
    }


def rank_loop_designs(
    results: list[dict[str, Any]],
    budget_limit: float = 5.0,
) -> list[dict[str, Any]]:
    """Rank loop designs by composite score."""
    groups = group_by_loop(results)
    ranked: list[dict[str, Any]] = []

    for name, group in groups.items():
        summary = summarize_group(group)
        pass_rate = summary.get("passRate", 0.0)
        avg_cost = summary.get("costUsd", 0.0)
        normalized_cost = min(1.0, avg_cost / budget_limit) if budget_limit > 0 else 0.0

        composite = (
            0.30 * pass_rate
            + 0.20 * (1 - normalized_cost)
            + 0.15 * (1 - summary.get("convergenceRate", 1.0))
            + 0.10 * (1 - summary.get("driftScore", 1.0))
            + 0.10 * summary.get("honestyScore", 0.0)
            + 0.10 * (1 - summary.get("erosionScore", 1.0))
            + 0.05 * summary.get("rubricScore", 0.0)
        )

        ranked.append(
            {
                "loopDesign": name,
                "compositeScore": round(composite, 4),
                "metrics": summary,
            }
        )

    ranked.sort(key=lambda x: x["compositeScore"], reverse=True)
    for i, entry in enumerate(ranked):
        entry["rank"] = i + 1
    return ranked
