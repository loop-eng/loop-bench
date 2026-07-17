"""Chart generation for loop-bench results."""


def convergence_curve(results: list[dict], output_path: str) -> None:
    """Plot convergence curves for each loop design."""
    raise NotImplementedError("Phase 8")


def cost_scatter(results: list[dict], output_path: str) -> None:
    """Scatter plot: cost vs. pass rate for each loop design."""
    raise NotImplementedError("Phase 8")


def radar_chart(results: list[dict], output_path: str) -> None:
    """Radar chart comparing loop designs across all metrics."""
    raise NotImplementedError("Phase 8")
