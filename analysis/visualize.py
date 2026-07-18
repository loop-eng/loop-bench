"""Chart generation for loop-bench results."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from .compare import group_by_loop, summarize_group

COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2"]


def convergence_curve(
    results: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Convergence Rate by Loop Design",
) -> None:
    """Box plot of convergence rates for each loop design."""
    if not results:
        return
    groups = group_by_loop(results)
    fig, ax = plt.subplots(figsize=(10, 6))

    names = sorted(groups.keys())
    data = []
    for name in names:
        values = [
            r.get("metrics", {}).get("convergenceRate", 1.0) for r in groups[name]
        ]
        data.append(values)

    bp = ax.boxplot(data, labels=names, patch_artist=True)
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(COLORS[i % len(COLORS)])
        patch.set_alpha(0.7)

    ax.set_ylabel("Convergence Rate (lower is better)")
    ax.set_xlabel("Loop Design")
    ax.set_title(title)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(str(output_path), dpi=150)
    plt.close(fig)


def cost_scatter(
    results: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Cost vs. Pass Rate",
) -> None:
    """Scatter plot: average cost per task vs. pass rate for each loop design."""
    groups = group_by_loop(results)
    fig, ax = plt.subplots(figsize=(10, 6))

    for i, (name, group) in enumerate(sorted(groups.items())):
        summary = summarize_group(group)
        pass_rate = summary.get("passRate", 0.0) * 100
        avg_cost = summary.get("costUsd", 0.0)

        ax.scatter(
            avg_cost,
            pass_rate,
            s=200,
            c=COLORS[i % len(COLORS)],
            label=name,
            zorder=5,
            edgecolors="white",
            linewidths=1.5,
        )
        ax.annotate(
            name,
            (avg_cost, pass_rate),
            textcoords="offset points",
            xytext=(10, 5),
            fontsize=9,
        )

    ax.set_xlabel("Average Cost per Task (USD)")
    ax.set_ylabel("Pass Rate (%)")
    ax.set_title(title)
    ax.grid(alpha=0.3)
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(str(output_path), dpi=150)
    plt.close(fig)


def radar_chart(
    results: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Loop Design Comparison",
    budget_limit: float = 5.0,
) -> None:
    """Radar chart comparing loop designs across key metrics."""
    dimensions = [
        ("Pass Rate", "passRate", True, 1.0),
        ("Cost Eff.", "costUsd", False, budget_limit),
        ("Convergence", "convergenceRate", False, 1.0),
        ("Low Drift", "driftScore", False, 1.0),
        ("Honesty", "honestyScore", True, 1.0),
        ("Low Erosion", "erosionScore", False, 1.0),
    ]

    groups = group_by_loop(results)
    names = sorted(groups.keys())
    dim_labels = [d[0] for d in dimensions]

    angles = np.linspace(0, 2 * math.pi, len(dimensions), endpoint=False).tolist()
    angles.append(angles[0])

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

    for i, name in enumerate(names):
        summary = summarize_group(groups[name])
        values = []
        for _, key, higher_better, scale in dimensions:
            v = summary.get(key, 0.0)
            v = min(v / scale, 1.0) if scale > 0 else v
            if not higher_better:
                v = 1 - v
            values.append(min(max(v, 0), 1))
        values.append(values[0])

        ax.plot(angles, values, "o-", linewidth=2, label=name, color=COLORS[i % len(COLORS)])
        ax.fill(angles, values, alpha=0.1, color=COLORS[i % len(COLORS)])

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(dim_labels)
    ax.set_ylim(0, 1)
    ax.set_title(title, pad=20)
    ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1))
    fig.tight_layout()
    fig.savefig(str(output_path), dpi=150)
    plt.close(fig)


def metric_boxplot(
    results: list[dict[str, Any]],
    metric_key: str,
    output_path: str | Path,
    title: str | None = None,
    ylabel: str | None = None,
) -> None:
    """Box plot of a specific metric across loop designs."""
    groups = group_by_loop(results)
    fig, ax = plt.subplots(figsize=(10, 6))

    names = sorted(groups.keys())
    data = []
    for name in names:
        values = []
        for r in groups[name]:
            v = r.get("metrics", {}).get(metric_key)
            if isinstance(v, bool):
                v = 1.0 if v else 0.0
            if isinstance(v, (int, float)):
                values.append(float(v))
        data.append(values)

    bp = ax.boxplot(data, labels=names, patch_artist=True)
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(COLORS[i % len(COLORS)])
        patch.set_alpha(0.7)

    ax.set_ylabel(ylabel or metric_key)
    ax.set_xlabel("Loop Design")
    ax.set_title(title or f"{metric_key} by Loop Design")
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    fig.savefig(str(output_path), dpi=150)
    plt.close(fig)


def dashboard(
    results: list[dict[str, Any]],
    output_dir: str | Path,
) -> list[str]:
    """Generate a full dashboard of charts. Returns list of file paths created."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    paths: list[str] = []

    convergence_curve(results, out / "convergence.png")
    paths.append(str(out / "convergence.png"))

    cost_scatter(results, out / "cost-vs-passrate.png")
    paths.append(str(out / "cost-vs-passrate.png"))

    radar_chart(results, out / "radar.png")
    paths.append(str(out / "radar.png"))

    for metric in ["costUsd", "driftScore", "honestyScore", "erosionScore"]:
        fname = f"{metric}-boxplot.png"
        metric_boxplot(results, metric, out / fname)
        paths.append(str(out / fname))

    return paths
