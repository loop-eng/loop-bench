"""Tests for the loop-bench Python analysis tools."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from analysis.compare import (
    compare_runs,
    group_by_loop,
    load_results,
    rank_loop_designs,
    summarize_group,
)
from analysis.statistics import (
    bootstrap_ci,
    cohens_d,
    metric_summary_table,
    paired_comparison,
)
from analysis.leaderboard import (
    format_leaderboard_table,
    generate_leaderboard_data,
)


def make_result(
    task_id: str = "bug-fix-001",
    loop: str = "minimal",
    model: str = "test-model",
    resolved: bool = True,
    cost: float = 1.0,
    iterations: int = 3,
    convergence: float = 0.15,
    drift: float = 0.1,
    honesty: float = 0.9,
    erosion: float = 0.2,
    rubric: float = 0.8,
) -> dict:
    return {
        "taskId": task_id,
        "loopDesign": loop,
        "model": model,
        "metrics": {
            "resolved": resolved,
            "iterations": iterations,
            "costUsd": cost,
            "durationSeconds": 30.0,
            "convergenceRate": convergence,
            "verificationAccuracy": 0.8,
            "driftScore": drift,
            "falseCompletion": False,
            "firstEditDelay": 2,
            "erosionScore": erosion,
            "verbosityScore": 0.1,
            "rubricScore": rubric,
            "honestyScore": honesty,
            "contextEfficiency": 0.3,
            "recoveryRate": 0.5,
        },
        "ltfTrace": "traces/test.ltf.jsonl",
        "timestamp": "2026-07-18T00:00:00Z",
    }


SAMPLE_RESULTS = [
    make_result("bug-fix-001", "minimal", cost=0.5, resolved=True, convergence=0.1),
    make_result("bug-fix-002", "minimal", cost=0.8, resolved=False, convergence=0.5),
    make_result("bug-fix-001", "reflexion", cost=1.2, resolved=True, convergence=0.15),
    make_result("bug-fix-002", "reflexion", cost=1.5, resolved=True, convergence=0.2),
    make_result("bug-fix-001", "plan-first", cost=2.0, resolved=True, convergence=0.1),
    make_result("bug-fix-002", "plan-first", cost=2.5, resolved=True, convergence=0.15),
]


class TestLoadResults:
    def test_load_from_file(self, tmp_path: Path):
        p = tmp_path / "results.json"
        p.write_text(json.dumps(SAMPLE_RESULTS))
        results = load_results(p)
        assert len(results) == 6

    def test_load_from_directory(self, tmp_path: Path):
        p = tmp_path / "results.json"
        p.write_text(json.dumps(SAMPLE_RESULTS))
        results = load_results(tmp_path)
        assert len(results) == 6

    def test_missing_file_raises(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError):
            load_results(tmp_path / "nope.json")

    def test_invalid_json_raises(self, tmp_path: Path):
        p = tmp_path / "results.json"
        p.write_text('{"not": "an array"}')
        with pytest.raises(ValueError):
            load_results(p)


class TestGroupByLoop:
    def test_groups_correctly(self):
        groups = group_by_loop(SAMPLE_RESULTS)
        assert set(groups.keys()) == {"minimal", "reflexion", "plan-first"}
        assert len(groups["minimal"]) == 2
        assert len(groups["reflexion"]) == 2

    def test_empty_input(self):
        assert group_by_loop([]) == {}


class TestSummarizeGroup:
    def test_computes_averages(self):
        group = [
            make_result(cost=1.0, iterations=3),
            make_result(cost=2.0, iterations=5),
        ]
        summary = summarize_group(group)
        assert summary["costUsd"] == 1.5
        assert summary["iterations"] == 4.0

    def test_pass_rate(self):
        group = [
            make_result(resolved=True),
            make_result(resolved=False),
            make_result(resolved=True),
        ]
        summary = summarize_group(group)
        assert abs(summary["passRate"] - 0.6667) < 0.01

    def test_empty_group(self):
        assert summarize_group([]) == {}


class TestCompareRuns:
    def test_computes_deltas(self):
        baseline = [make_result(cost=2.0)]
        candidate = [make_result(cost=1.0)]
        result = compare_runs(baseline, candidate)
        assert result["deltas"]["costUsd"]["delta"] == -1.0
        assert result["deltas"]["costUsd"]["improved"] is True

    def test_higher_is_better_detection(self):
        baseline = [make_result(honesty=0.5)]
        candidate = [make_result(honesty=0.9)]
        result = compare_runs(baseline, candidate)
        assert result["deltas"]["honestyScore"]["improved"] is True


class TestRankLoopDesigns:
    def test_ranks_by_composite(self):
        ranked = rank_loop_designs(SAMPLE_RESULTS, budget_limit=5.0)
        assert len(ranked) == 3
        assert ranked[0]["rank"] == 1
        assert ranked[0]["compositeScore"] >= ranked[1]["compositeScore"]

    def test_plan_first_beats_minimal(self):
        ranked = rank_loop_designs(SAMPLE_RESULTS, budget_limit=5.0)
        names = [r["loopDesign"] for r in ranked]
        plan_idx = names.index("plan-first")
        min_idx = names.index("minimal")
        assert plan_idx < min_idx

    def test_empty_input(self):
        assert rank_loop_designs([]) == []


class TestBootstrapCI:
    def test_single_value(self):
        ci = bootstrap_ci([5.0])
        assert ci["mean"] == 5.0
        assert ci["lower"] == 5.0

    def test_empty(self):
        ci = bootstrap_ci([])
        assert ci["mean"] == 0.0

    def test_ci_contains_mean(self):
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        ci = bootstrap_ci(values)
        assert ci["lower"] <= ci["mean"] <= ci["upper"]

    def test_deterministic(self):
        values = [1.0, 2.0, 3.0]
        a = bootstrap_ci(values, seed=42)
        b = bootstrap_ci(values, seed=42)
        assert a == b

    def test_narrow_for_identical(self):
        values = [3.0] * 20
        ci = bootstrap_ci(values)
        assert abs(ci["upper"] - ci["lower"]) < 0.01


class TestPairedComparison:
    def test_significant_difference(self):
        baseline = [5.0, 6.0, 5.5, 5.2, 5.8]
        candidate = [2.0, 2.5, 1.8, 2.1, 2.3]
        result = paired_comparison(baseline, candidate)
        assert result["significant"] is True
        assert result["delta"] < 0

    def test_no_significance_for_similar(self):
        baseline = [3.0, 3.1, 2.9, 3.05]
        candidate = [3.02, 2.98, 3.01, 3.03]
        result = paired_comparison(baseline, candidate)
        assert abs(result["delta"]) < 0.5

    def test_empty_inputs(self):
        result = paired_comparison([], [])
        assert result["n"] == 0
        assert result["significant"] is False

    def test_effect_size_included(self):
        result = paired_comparison([1.0, 2.0], [5.0, 6.0])
        assert result["effectSize"] != 0


class TestCohensD:
    def test_no_difference(self):
        assert cohens_d([3.0, 3.0, 3.0], [3.0, 3.0, 3.0]) == 0.0

    def test_large_effect(self):
        d = cohens_d([1.0, 2.0, 3.0], [10.0, 11.0, 12.0])
        assert d > 2.0

    def test_empty_groups(self):
        assert cohens_d([], [1.0]) == 0.0


class TestMetricSummaryTable:
    def test_computes_per_loop_stats(self):
        table = metric_summary_table(SAMPLE_RESULTS, "costUsd")
        assert "minimal" in table
        assert "reflexion" in table
        assert table["minimal"]["mean"] == pytest.approx(0.65, abs=0.01)
        assert table["minimal"]["n"] == 2.0


class TestGenerateLeaderboard:
    def test_generates_valid_json(self, tmp_path: Path):
        results_file = tmp_path / "results.json"
        results_file.write_text(json.dumps(SAMPLE_RESULTS))
        output_file = tmp_path / "leaderboard.json"

        lb = generate_leaderboard_data(results_file, output_file)
        assert output_file.exists()
        assert lb["total_tasks"] > 0
        assert len(lb["entries"]) == 3
        assert lb["entries"][0]["rank"] == 1

    def test_entries_have_required_fields(self, tmp_path: Path):
        results_file = tmp_path / "results.json"
        results_file.write_text(json.dumps(SAMPLE_RESULTS))
        output_file = tmp_path / "lb.json"

        lb = generate_leaderboard_data(results_file, output_file)
        for entry in lb["entries"]:
            assert "rank" in entry
            assert "loopDesign" in entry
            assert "compositeScore" in entry
            assert "passRate" in entry
            assert "avgCostPerTask" in entry


class TestFormatLeaderboardTable:
    def test_formats_table(self, tmp_path: Path):
        results_file = tmp_path / "results.json"
        results_file.write_text(json.dumps(SAMPLE_RESULTS))
        output_file = tmp_path / "lb.json"

        lb = generate_leaderboard_data(results_file, output_file)
        table = format_leaderboard_table(lb)
        assert "Loop Design" in table
        assert "minimal" in table
        assert "reflexion" in table

    def test_empty_leaderboard(self):
        table = format_leaderboard_table({"entries": []})
        assert table == "No submissions."
