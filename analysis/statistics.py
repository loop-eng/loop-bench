"""Statistical significance tests for loop-bench results."""


def bootstrap_ci(
    values: list[float], n_bootstrap: int = 10000, ci: float = 0.95
) -> tuple[float, float]:
    """Compute bootstrap confidence interval."""
    raise NotImplementedError("Phase 8")


def paired_comparison(
    baseline: list[float], candidate: list[float]
) -> dict:
    """Paired t-test between two loop designs on the same tasks."""
    raise NotImplementedError("Phase 8")
