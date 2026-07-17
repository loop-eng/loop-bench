"""Cross-run comparison tool for loop-bench results."""


def load_results(results_dir: str) -> list[dict]:
    """Load benchmark results from a directory."""
    raise NotImplementedError("Phase 8")


def compare_runs(baseline: list[dict], candidate: list[dict]) -> dict:
    """Compare two benchmark runs and compute deltas."""
    raise NotImplementedError("Phase 8")
