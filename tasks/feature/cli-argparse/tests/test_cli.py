"""Hidden evaluation tests for CLI argparse feature."""

import subprocess
import sys
import os
import tempfile
import pytest


REPO_DIR = os.path.join(os.path.dirname(__file__), "..", "repo")
APP_PATH = os.path.join(REPO_DIR, "src", "app.py")


def run_app(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run the app with given CLI arguments."""
    return subprocess.run(
        [sys.executable, APP_PATH, *args],
        capture_output=True,
        text=True,
        cwd=REPO_DIR,
        check=check,
    )


class TestInputFlag:
    def test_input_flag_reads_file(self, tmp_path):
        inp = tmp_path / "input.txt"
        out = tmp_path / "output.txt"
        inp.write_text("hello world")
        result = run_app("--input", str(inp), "--output", str(out))
        assert result.returncode == 0
        assert out.read_text() == "HELLO WORLD"

    def test_input_flag_missing_file_errors(self, tmp_path):
        out = tmp_path / "output.txt"
        result = run_app("--input", "/nonexistent/file.txt", "--output", str(out), check=False)
        assert result.returncode != 0


class TestOutputFlag:
    def test_output_flag_writes_file(self, tmp_path):
        inp = tmp_path / "input.txt"
        out = tmp_path / "output.txt"
        inp.write_text("test data")
        run_app("--input", str(inp), "--output", str(out))
        assert out.exists()
        assert out.read_text() == "TEST DATA"

    def test_output_creates_parent_dirs(self, tmp_path):
        inp = tmp_path / "input.txt"
        out = tmp_path / "sub" / "dir" / "output.txt"
        inp.write_text("nested")
        run_app("--input", str(inp), "--output", str(out))
        assert out.read_text() == "NESTED"


class TestVerboseFlag:
    def test_verbose_shows_debug_output(self, tmp_path):
        inp = tmp_path / "input.txt"
        out = tmp_path / "output.txt"
        inp.write_text("data")
        result = run_app("--input", str(inp), "--output", str(out), "--verbose")
        assert "Reading from:" in result.stdout or "reading from:" in result.stdout.lower()

    def test_no_verbose_is_quiet(self, tmp_path):
        inp = tmp_path / "input.txt"
        out = tmp_path / "output.txt"
        inp.write_text("data")
        result = run_app("--input", str(inp), "--output", str(out))
        assert result.stdout.strip() == ""


class TestHelpFlag:
    def test_help_shows_usage(self):
        result = run_app("--help", check=False)
        output = result.stdout.lower()
        assert "usage" in output or "input" in output
        assert result.returncode == 0


class TestInvalidArgs:
    def test_no_args_shows_error(self):
        result = run_app(check=False)
        assert result.returncode != 0

    def test_missing_input_shows_error(self, tmp_path):
        out = tmp_path / "output.txt"
        result = run_app("--output", str(out), check=False)
        assert result.returncode != 0

    def test_missing_output_shows_error(self, tmp_path):
        inp = tmp_path / "input.txt"
        inp.write_text("data")
        result = run_app("--input", str(inp), check=False)
        assert result.returncode != 0
