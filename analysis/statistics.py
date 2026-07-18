"""Statistical significance tests for loop-bench results."""

from __future__ import annotations

import math
import random
from typing import Any


def bootstrap_ci(
    values: list[float],
    n_bootstrap: int = 10_000,
    ci: float = 0.95,
    seed: int = 42,
) -> dict[str, float]:
    """Compute bootstrap confidence interval for the mean.

    Returns dict with keys: mean, lower, upper, ci.
    """
    if not values:
        return {"mean": 0.0, "lower": 0.0, "upper": 0.0, "ci": ci}
    if len(values) == 1:
        v = values[0]
        return {"mean": v, "lower": v, "upper": v, "ci": ci}

    rng = random.Random(seed)
    n = len(values)
    means: list[float] = []

    for _ in range(n_bootstrap):
        sample = rng.choices(values, k=n)
        means.append(sum(sample) / n)

    means.sort()
    alpha = (1 - ci) / 2
    lo_idx = int(alpha * n_bootstrap)
    hi_idx = int((1 - alpha) * n_bootstrap) - 1

    mean = sum(values) / n
    return {
        "mean": round(mean, 6),
        "lower": round(means[lo_idx], 6),
        "upper": round(means[hi_idx], 6),
        "ci": ci,
    }


def paired_comparison(
    baseline: list[float],
    candidate: list[float],
    ci: float = 0.95,
    seed: int = 42,
) -> dict[str, Any]:
    """Paired comparison between two loop designs on the same tasks.

    Computes paired deltas, bootstrap CI on deltas, and significance.
    """
    n = min(len(baseline), len(candidate))
    if n == 0:
        return {
            "n": 0,
            "baselineMean": 0.0,
            "candidateMean": 0.0,
            "delta": 0.0,
            "ci": {"mean": 0.0, "lower": 0.0, "upper": 0.0, "ci": ci},
            "significant": False,
            "effectSize": 0.0,
        }

    deltas = [candidate[i] - baseline[i] for i in range(n)]
    b_mean = sum(baseline[:n]) / n
    c_mean = sum(candidate[:n]) / n
    delta_ci = bootstrap_ci(deltas, seed=seed, ci=ci)
    significant = delta_ci["lower"] > 0 or delta_ci["upper"] < 0
    effect = cohens_d(baseline[:n], candidate[:n])

    return {
        "n": n,
        "baselineMean": round(b_mean, 6),
        "candidateMean": round(c_mean, 6),
        "delta": round(c_mean - b_mean, 6),
        "ci": delta_ci,
        "significant": significant,
        "effectSize": round(effect, 4),
    }


def cohens_d(group_a: list[float], group_b: list[float]) -> float:
    """Compute Cohen's d effect size between two groups."""
    if not group_a or not group_b:
        return 0.0

    mean_a = sum(group_a) / len(group_a)
    mean_b = sum(group_b) / len(group_b)

    n_a, n_b = len(group_a), len(group_b)
    var_a = sum((x - mean_a) ** 2 for x in group_a) / max(n_a - 1, 1)
    var_b = sum((x - mean_b) ** 2 for x in group_b) / max(n_b - 1, 1)

    pooled_std = math.sqrt(((n_a - 1) * var_a + (n_b - 1) * var_b) / max(n_a + n_b - 2, 1))
    if pooled_std == 0:
        return 0.0

    return (mean_b - mean_a) / pooled_std


def metric_summary_table(
    results: list[dict],
    metric_key: str,
) -> dict[str, dict[str, float]]:
    """Compute per-loop-design summary statistics for a metric."""
    groups: dict[str, list[float]] = {}
    for r in results:
        loop = r.get("loopDesign", "unknown")
        v = r.get("metrics", {}).get(metric_key)
        if isinstance(v, bool):
            v = 1.0 if v else 0.0
        if isinstance(v, (int, float)):
            groups.setdefault(loop, []).append(float(v))

    table: dict[str, dict[str, float]] = {}
    for loop, values in groups.items():
        n = len(values)
        mean = sum(values) / n
        variance = sum((x - mean) ** 2 for x in values) / max(n - 1, 1)
        std = math.sqrt(variance)
        ci = bootstrap_ci(values)
        table[loop] = {
            "mean": round(mean, 4),
            "std": round(std, 4),
            "min": round(min(values), 4),
            "max": round(max(values), 4),
            "n": float(n),
            "ci_lower": ci["lower"],
            "ci_upper": ci["upper"],
        }
    return table
